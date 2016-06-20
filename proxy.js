"use strict";

const http = require("http")
	 ,https = require("https")
	 ,url = require("url")
	 ,path = require("path")
	 ,fs = require("fs")
	 ,crypto = require("crypto")
	 ,CacheStream = require("./cacheStream")
	 ,gzipTranform = require('zlib').createGzip()
	 ,request = require("request");

const cacheLevel = {
	no: 0,
	normal: 1,
	first: 2
};
const cacheFile = "proxyCache.json";

var argv = process.argv.slice();
var httpMode = true;
var cacheMode = false;

argv.forEach(function(item){
    if (/^--/.test(item)) {
      switch(item) {
        case "--http":
        httpMode = true;
        break;
        case "--https":
        httpMode = false;
        break;
      }
      console.log(item);
    }
});

var __defaultSetting = {

	port: 8079
	,cacheLevel: 0
//	,proxy:{
//		hostname:"proxy.pal.sap.corp",
//		port:8080
//	}
	,persistent:"_service_persistent"
	,onfig:"_service_config" 

};


argv = argv.filter(function(item){
    return !/^--/.test(item);
});

var port = parseInt(argv[2]) || 8079;

var targetHostSetting = {
 // hostname: argv[3] || "http://www3.lenovo.com",
hostname: argv[3] || "https://10.128.245.103",
  port: parseInt(argv[4]) || 9002,
  https: false

};



if (/^https:\/\//.test(targetHostSetting.hostname)) {
  targetHostSetting.hostname = targetHostSetting.hostname.replace(/^https:\/\//, "");
  targetHostSetting.https = true;
  httpMode = false;
} else if (/^http:\/\//.test(targetHostSetting.hostname)) {
  targetHostSetting.hostname = targetHostSetting.hostname.replace(/^http:\/\//, "");
}

/*
 * this can disable all SSL related check for entire node process
 * */

//if(targetHostSetting.https){
//	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";  
//}

var MIME = {
    "js": "application/javascript",
    "json": "application/json",
    "mp3": "audio/mpeg",
    "ogg": "audio/ogg",
    "wav": "audio/x-wav",
    "gif": "image/gif",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",
    "ico": "image/x-icon",
    "html": "text/html",
    "htm": "text/html",
    "txt": "text/plain",
    "text": "text/plain",
    "css": "text/css",
    "csv": "text/csv",
    "less": "text/css",
    "mp4": "video/mp4"
};

var routeMap = new Map([
	[new RegExp("_service_persistent"),  handlePersistence]
	,[new RegExp(".*"),serverCb]

]);

const HMC_PATH = /\/resources66666\/(.*)/;

function startProxy(req,res){
	
	if(req.method.toUpperCase() === "POST"){
		var __reqBody = "";
		req.on("data", (data)=>{
			__reqBody += data;
		}).on("end",()=>{
			req.bodyData = __reqBody;
			serverCb(req,res);
		});
	}else{
		serverCb(req,res);
	}
}

class Proxy{

	constructor(){
	  this.aRoutes = [
		{
			
		}
	  
	  ];
	}

	config(){
	
	
	}

	
		

}

function routes(req,res){
	
	for(var entry of routeMap.entries()){
		if(req.url.search(new Regexp(entry.key)) >= 0){
			entry.value(req.res);
			return;
		}
	}
		res.statusCode = 404;
		res.end(`no handler found for your request URL ${req.url}`);
}

function isResource( sMatch, url){

	let aMatch = url.match(sMatch);
	return aMatch?aMatch[1]:aMatch;
}

function needCompress(accept){
	return accept.search(/gzip|deflate/) >= 0;
}

function generateCacheKey(req){
	return req.method + req.url;
}

function retrieveDomainName(url){
	
	var aResults = url.match(/^http(?:s)?:\/\/([^\/]+)\/.*$/);
	return aResults&&aResults[1];

}

function replaceDomain(url, domain){
	
	return url.replace(/^(http(?:s)?:\/\/)(?:[^\/]+)(\/.*)$/, "$1" + domain + "$2");
}

function loadFromCache(req, cache){
	return cache[generateCacheKey(req)];
}

function tryLoadLocalPage(req,res){
		if(__defaultSetting.cacheLevel > cacheLevel.no){
						let __cacheRes = loadFromCache(req, __cache);
						if(__cacheRes){
							res.statusCode = "200";
						Object.keys(__cacheRes.header).forEach((item)=>{
							res.setHeader(item, __cacheRes.header[item] );
						});

							res.end(__cacheRes.data);
							return true;
						}	
					}
			return false;
}

function handleResponse(hostRes, res,req){
		res.statusCode = hostRes.statusCode;

		Object.keys(hostRes.headers).forEach((item)=>{
			res.setHeader(item, hostRes.headers[item] );
		});

		var __status = Math.floor(hostRes.statusCode/100);

		if(__status === 2){

			if(__defaultSetting.cacheLevel > cacheLevel.no){
				hostRes.pipe(new CacheStream({key: generateCacheKey(req),cache: __cache, header:Object.assign({},hostRes.headers)})).pipe(res);
			}else{
				hostRes.pipe(res);
			}

		}else if(__status === 3){

			console.log(`status is ${__status}`);
			var redirect = res.getHeader("location");

			if(redirect && retrieveDomainName(redirect) && (retrieveDomainName(redirect) === targetHostSetting.hostname)) {
				res.setHeader("location",replaceDomain(redirect, req.headers.host ));	
			}
			hostRes.pipe(res);
		}else if(__status >= 4){
			console.log(`status is ${__status}`);
			if(tryLoadLocalPage(req, res)) return;
			hostRes.pipe(res);
		}
}

function errResponse(err, res){
		res.statusCode = 503;
		res.statusMessage = err.message;
		res.end(err.message);

}

function handlePersistence(req, res){
		
		fs.writeFile(cacheFile, JSON.stringify(__cache),(err)=>{
			if(err){
			
				res.statusCode=500;
				res.statusMessage = `persistence cache to file failed: ${err.message} `;
				res.end(res.statusMessage);
				return;
			}
				res.statusCode=200;
				res.statusMessage = `persistence cache to file ${cacheFile} succeed`;
				res.end(res.statusMessage);
				
		});
		return;


}

function serverCb(req, res) {
	
	if(req.url.match(__defaultSetting.persistent)){
	
		fs.writeFile(cacheFile, JSON.stringify(__cache),(err)=>{
			if(err){
			
				res.statusCode=500;
				res.statusMessage = `persistence cache to file failed: ${err.message} `;
				res.end(res.statusMessage);
				return;
			}
				res.statusCode=200;
				res.statusMessage = `persistence cache to file ${cacheFile} succeed`;
				res.end(res.statusMessage);
				
		});
		return;
		
	}

	
	var matched;
	var _reqeustHeader = req.headers;
	var _shouldCompress = needCompress(_reqeustHeader["accept-encoding"]);

	if(matched = isResource(HMC_PATH, req.url)){

		var _path = path.normalize("./" + matched);
		var ext = path.extname(_path).toLowerCase().replace("." , "");
		var mime = MIME[ext] || MIME['text'];
			
		var fileRaw = fs.createReadStream(_path);
		
		fileRaw.on("open", ()=>{
			res.writeHead(200,{
				"Cache-Control":"no-cache",
				"Content-Type": mime,
				"content-encoding":"gzip"
			});

		}).on("error",(err)=>{
			console.log(err);
			res.statusCode = 404;
			res.statusMessage = "file not found by proxy";
			res.end(res.statusMessage);

		});

		fileRaw.pipe(gzipTranform).pipe(res);
				
	}else{
		
		if(__defaultSetting.cacheLevel === cacheLevel.first){     // cache first
			if(!tryLoadLocalPage(req, res)){
				res.statusCode = 404;
				res.end(`can not find cache for ${req.url}`);
				return;
			}
			
		}else{
			
			if(!httpMode && __defaultSetting.proxy ){	// https via proxy
				
					requestViaProxy({
						path: req.url,
						host:targetHostSetting.hostname,
						method: req.method,
						bodyData:req.bodyData
					}, (err, endPointRes)=>{
							
						if(err){
							if(__defaultSetting.cacheLevel > cacheLevel.no){
								if(tryLoadLocalPage(req, res)) return;
							}
							errResponse(err, res);						
						}else{
							handleResponse(endPointRes, res,req);	

						}

					});

//			request({'url':'https://www3.lenovo.com/au/en/login',
//					 'proxy':'http://proxy.pal.sap.corp:8080'}, function (error, response, body) {
//			  if (!error && response.statusCode == 200) {
//				console.log(body) // Print the google web page.
//			  }
//			});

			}else{

				var __option = Object.assign({},__defaultSetting.proxy);
				__option.method = req.method;
				__option.headers=Object.assign(__option.headers || {}, _reqeustHeader);
				__option.headers.host = targetHostSetting.hostname;

				if(__option.hostname){
						__option.path = (targetHostSetting.https?"https://":"http://") +  targetHostSetting.hostname + req.url;
			
				}else{
					__option.hostname = targetHostSetting.hostname;
					targetHostSetting.port&&(__option.port =targetHostSetting.port);
					__option.path = req.url;
				}
				
				if(targetHostSetting.https){
						__option.strictSSL=false;
						__option.agent = new https.Agent({
							host: targetHostSetting.hostname
							, port: targetHostSetting.port
							, path: req.url
							, rejectUnauthorized: false
						});
				}

				var __req = (httpMode?http:https).request(__option,(hostRes)=>{
						handleResponse(hostRes, res,req);
				});

				__req.on("error", (e)=>{
					if(tryLoadLocalPage(req, res)) return;
					errResponse(e, res);

				});
				__req.setTimeout(10000, ()=>{
					if(tryLoadLocalPage(req, res)) return;
					errResponse({message:"request has timeout : 30000"}, res);
				});	
				req.bodyData&&__req.write(req.bodyData);			// post request body
				__req.end();

			}	
		}
				
	
	}

}

	var __sContent, __cache;
	try{
		__sContent = fs.readFileSync("./proxyCache.json",{encoding: "utf-8"});
	//	__cache = eval(`(${__sContent})`)||{};
			__cache = JSON.parse(__sContent);

	}catch(e){
		__cache = {};
	}
	
	var requestViaProxy = ((fn,proxyOp)=>{
		return function(){
			fn.apply(null, [proxyOp].concat([].slice.call(arguments)));
		};
	})((proxyOp, target, cb)=>{
		
		http.request({
			 host:proxyOp.hostname
			,port:proxyOp.port
			,method:"CONNECT"
			,agent: false
			,path: target.host + ":443"  //"www3.lenovo.com:443"
			,headers:{
				host:target.host + ":443"  //"www3.lenovo.com:443"
			}
		}).on("connect", (proxyRes, socket, head)=>{
			
			let proxyReq = https.request({
				socket:socket,
				agent: false,
				host: target.host,
				path: target.path,
				method: target.method
			}, (res)=>{
				cb.call(null,null,res);
			}).on("error",(err)=>{
				reportError(err, cb);		
			})
			
			target.bodyData&&proxyReq.write(target.bodyData);
			proxyReq.end();

		}).on("error",(err)=>{
			   reportError(err, cb);			
		}).end();
	
		function reportError(err , cb){
				console.error("error when connect to endpoint site via proxy");
				console.error(err);
				cb.call(null, err);	
		}
		
	}, __defaultSetting.proxy);
	
var server = httpMode ? http.createServer(startProxy) : https.createServer({
    key: fs.readFileSync('/Users/i054410/Documents/develop/self-cert/key.pem'),
    cert: fs.readFileSync('/Users/i054410/Documents/develop/self-cert/cert.pem')
}, startProxy);
  
server.listen(port);

console.log(`Server is running at 127.0.0.1, port ${port}`);
