"use strict";

const http = require("http")
	 ,https = require("https")
	
	 ,path = require("path")
//	 ,Buffer = require("buffer")
	 ,fs = require("fs")
	 ,CacheStream = require("./cacheStream")
	 ,zlib = require('zlib')
	 ,ejs = require("ejs")
	 ,request = require("request");

const cacheLevel = {
	no: 0,
	normal: 1,
	first: 2
};

const MIME = {
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


class ServerConfig{

	static getDefault(){
		var __map =  new Map([
			["port", 8079]
			,["cacheLevel", 1]
			,["endpointServer.address","https://localhost" ]
		//	,["endpointServer.address","https://www3.lenovo.com"]
			,["endpointServer.port", 9002 ]
			,["endpointServer.host", undefined]
			,["cacheFile","proxyCache.json" ]
			,["SSLKey","/Users/i054410/Documents/develop/self-cert/key.pem" ]
			,["SSLCert","/Users/i054410/Documents/develop/self-cert/cert.pem" ]
			,["relativePath","./../test-stuff/hybris-commerce-suite-6.0.0.0/hybris/bin/custom/myTest/myTeststorefront/web/webroot/"]
		//	,["proxy.host","proxy.pal.sap.corp"]
			//	,["proxy.port",8080]

		]);

		ServerConfig.getDefault = function(){
			return __map;
		}
		return __map;

	}

	static get fields(){
		return Array.from(ServerConfig.getDefault().keys());
	}

	get(key){

		if(key ==="endpointServer.host"){
			return this.get("endpointServer.address").match(/^http(?:s)?:\/\/([^\/]+)/)[1];
		}

		if(key.indexOf(".") >= 0){
			let aKeys = key.split(".");
			return this[this.__symbolMap.get(aKeys[0])][this.__symbolMap.get(key)];
		}

		let value = this[this.__symbolMap.get(key)];
		if(typeof value ==="object"){
			let __o = {};
			ServerConfig.fields.forEach((_field)=>{
				if(_field.indexOf(".") >= 0 &&_field.indexOf(key) >= 0 ){
					let aFields = _field.split(".");
					__o[aFields[1]] = this[this.__symbolMap.get(aFields[0])][this.__symbolMap.get(_field)];

				}
			});
			return __o;
		}
		return value;
	}
	hasProxy(){
		return !!this.get("proxy");
	}

	isSSL(){
		return this.get("endpointServer.address").indexOf("https") >= 0;
	}

	constructor(){

		let defaultMap = ServerConfig.getDefault();
		this.__symbolMap = new Map();
		for(let field of ServerConfig.fields){
			this.__assign(field,defaultMap.get(field));		
		}

	}

	__assign(field,value){

		let _s = this.__retrieveSymbol(field);
		if(field.indexOf(".")>=0){
			let _aFields = field.split(".");
			let _subS = this.__retrieveSymbol(_aFields[0]);
			this[_subS] = this[_subS] || {};
			this[_subS][_s] = value;

		}else{
			this[_s] = value;
		}
	}

	__retrieveSymbol(key){
		return  this.__symbolMap.get(key) || this.__symbolMap.set(key, Symbol(key)).get(key);
	}


	loadEnvironmentConfig(){

		const aKeys = ServerConfig.fields;
		var args = {};

		// load from package.json first if start up by npm
		aKeys.forEach((key)=>{
			if(process.env["npm_package_config_" + key]){
				this.__assign(key, process.env["npm_package_config_" + key]);
			}
		});

		// load from command line
		process.argv.slice().reduce((pre, item)=>{
			let matches;
			if((matches = pre.match(/^--(.*)/)) &&( aKeys.indexOf(matches[1].toLowerCase()) >= 0)){
				args[matches[1].toLowerCase()] = item;
			}	
			return item;
		});
		let keys = 	Object.keys(args);
		for(let key of keys){
			this.__assign(key, args[key]);
		};
		return this;
	}

	calConfig(){

		return this;
	}

}

class Cache{

	constructor(config){
		this.cacheLevel = config.get("cacheLevel");
		this.cacheFile = path.normalize(config.get("cacheFile"));
		try{
			this.cache = JSON.parse(fs.readFileSync(this.cacheFile,{encoding: "utf-8"}));

		}catch(e){
			this.cache = {};
		}	
	}	

	tryLoadLocalPage(req, res){
		if(this.cacheLevel > cacheLevel.no){
			let __cacheRes = this.cache[this.generateCacheKey(req)];
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

	generateCacheKey(req){
		return req.method + req.url;
	}

	handlePersistence(req,res){
			fs.writeFile(this.cacheFile, JSON.stringify(this.cache),(err)=>{
			if(err){
				res.statusCode=500;
				res.statusMessage = `persistence cache to file failed: ${err.message} `;
				res.end(res.statusMessage);
				return;
			}
				res.statusCode=200;
				res.statusMessage = `persistence cache to file ${this.cacheFile} succeed`;
				res.end(res.statusMessage);
				
		});
		return;	
	}

}

class Router{

	constructor(){

		this.routeMap = new Map([
			 [new RegExp(".*"),retrieveBody ]
			,[new RegExp("_service_persistent"), bind( oCache.handlePersistence, oCache)]
			,[new RegExp("/__server_config__(.*)"),handleServerConfiguration ]
			,[new RegExp("/_ui/(.*)"), handleResource]
			,[new RegExp(".*"),serverCb]

		]);
	}
	route(req, res){

		var iterator = this.routeMap[Symbol.iterator]();

		function nextCallback(){

			var item = iterator.next();
			if(!item.done){
				var handler = item.value;
				if(handler[0].test(req.url)){
					handler[1](req,res,nextCallback, handler[0]);
				}else{
					nextCallback();
				}
			}
		}
		nextCallback();
	}
}

class View{

	constructor(){
		this.engine = ejs;
	}

	render(viewName,data, ops, cb){

		if(typeof ops === "function"){
			cb = ops;
			ops = {};
		}
		this.engine.renderFile(viewName,data, ops, cb);
		
	}


}



function retrieveBody(req,res,cb){

	if(req.method.toUpperCase() === "POST"){
		var __reqBody = "";
		req.on("data", (data)=>{
			__reqBody += data;
		}).on("end",()=>{
			req.bodyData = __reqBody;
			cb();
		});
	}else{
		cb();
	}

}

function bind(fn, context){
	return function(){
		return fn.apply(context, [].slice.call(arguments));
	}
}

function handleResource(req, res, cb, urlPart){

		let matched  = req.url.match(urlPart)[0];
		let _path = path.normalize(config.get("relativePath") + matched);
		let ext = path.extname(_path).toLowerCase().replace("." , "");
		let mime = MIME[ext] || MIME['text'];
			
		let fileRaw = fs.createReadStream(_path);
		
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

		fileRaw.pipe(zlib.createGzip()).pipe(res);	

}

function handleServerConfiguration(req, res, cb, urlPart){

	let matched = req.url.match(urlPart)[1].trim();
	let viewName = matched || "config";
	let _path = path.join("./",viewName + ".ejs");

	oView.render(_path,{}, (err, str)=>{

		if(err){
			console.error(err.message);
			res.writeHead("500","render error");
			res.end();
			return;	
		}
		zlib.gzip(new Buffer(str), (err, buffer)=>{
			if(!err){
				res.writeHead(200, {
					"Content-Type":"text/html",
					"content-encoding":"gzip"
				});
				res.write(buffer);
			}else{
				console.error(err.message);
				res.writeHead("500","compress error");
			}
			res.end();			
		});	

	} );

}



function retrieveDomainName(url){
	
	var aResults = url.match(/^http(?:s)?:\/\/([^\/]+)\/.*$/);
	return aResults&&aResults[1];

}

function replaceDomain(url, domain){
	
	return url.replace(/^(http(?:s)?:\/\/)(?:[^\/]+)(\/.*)$/, "$1" + domain + "$2");
}

function handleResponse(hostRes, res,req){
		res.statusCode = hostRes.statusCode;

		Object.keys(hostRes.headers).forEach((item)=>{
			res.setHeader(item, hostRes.headers[item] );
		});

		var __status = Math.floor(hostRes.statusCode/100);

		if(__status === 2){

			if(config.get("cacheLevel") > cacheLevel.no){
				hostRes.pipe(new CacheStream({key: oCache.generateCacheKey(req),cache: oCache.cache, header:Object.assign({},hostRes.headers)})).pipe(res);
			}else{
				hostRes.pipe(res);
			}

		}else if(__status === 3){

			console.log(`status is ${__status}`);
			var redirect = res.getHeader("location");

			if(redirect && retrieveDomainName(redirect) && (retrieveDomainName(redirect) === config.get("endpointServer.host"))) {
				res.setHeader("location",replaceDomain(redirect, req.headers.host ));	
			}
			hostRes.pipe(res);
		}else if(__status >= 4){
			console.log(`status is ${__status}`);
			if(oCache.tryLoadLocalPage(req, res)) return;
			hostRes.pipe(res);
		}
}

function errResponse(err, res){
		res.statusCode = 503;
		res.statusMessage = err.message;
		res.end(err.message);

}

function serverCb(req, res) {
	
	//var matched;
	var _reqeustHeader = req.headers;
		
		if(config.get("cacheLevel") === cacheLevel.first){     // cache first
			if(!oCache.tryLoadLocalPage(req, res)){
				res.statusCode = 404;
				res.end(`can not find cache for ${req.url}`);
				return;
			}
		}else{

				var __option = {},
				endServerHost = config.get("endpointServer.host"),
				endServerPort = config.get("endpointServer.port");

				__option.method = req.method;
				__option.headers=Object.assign(__option.headers || {}, _reqeustHeader);
				__option.headers.host = endServerHost;
				if(config.hasProxy()){
					
					let oProxy = config.get("proxy");
					__option.hostname =  oProxy.host;
					__option.port = oProxy.port;
					__option.path = config.get("endpointServer.address") + req.url;
			
				}else{
					__option.hostname = __option.headers.host;
					(endServerPort)&&(__option.port =endServerPort);
					__option.path = req.url;
				}
				
				if(config.isSSL()){
						__option.strictSSL=false;
						__option.agent = new https.Agent({
							  host: endServerHost
							, port: endServerPort
							, path: req.url
							, rejectUnauthorized: false
						});
				}

			if(config.isSSL() && config.hasProxy() ){	// https via proxy
				
					requestViaProxy({
						path: req.url,
						host:endServerHost,
						prot:endServerPort,
						method: req.method,
						bodyData:req.bodyData
					}, (err, endPointRes)=>{
						if(err){
							if(config.get("cacheLevel") > cacheLevel.no){
								if(oCache.tryLoadLocalPage(req, res)) return;
							}
							errResponse(err, res);						
						}else{
							handleResponse(endPointRes, res,req);	
						}

					});

			}else{
				var __req = (config.isSSL()?https:http).request(__option,(hostRes)=>{
						handleResponse(hostRes, res,req);
				});

				__req.on("error", (e)=>{
					if(oCache.tryLoadLocalPage(req, res)) return;
					errResponse(e, res);

				});
				__req.setTimeout(1000000, ()=>{
					if(oCache.tryLoadLocalPage(req, res)) return;
					errResponse({message:"request has timeout : 10000"}, res);
				});	
				req.bodyData&&__req.write(req.bodyData);			// post request body
				__req.end();

			}	
		}
	//}

}
var config = new ServerConfig();
config.loadEnvironmentConfig();
var oCache = new Cache(config);
var oRouter = new Router();	
var oView = new View();
var requestViaProxy = ((fn,proxyOp)=>{
		return function(){
			fn.apply(null, [proxyOp].concat([].slice.call(arguments)));
		};
	})((proxyOp, target, cb)=>{
		
		var targetPort = ":" + (target.port || 443 );

		http.request({
			 hostname:proxyOp.host
			,port:proxyOp.port
			,method:"CONNECT"
			,agent: false
			,path: target.host + targetPort  //"www3.lenovo.com:443"
			,headers:{
				host:target.host + targetPort  //"www3.lenovo.com:443"
			}
		}).on("connect", (proxyRes, socket, head)=>{
			
			let proxyReq = https.request({
				socket:socket,
				agent: false,
				hostname: target.host,
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
		
	}, config.get("proxy")|| {});

	
var server = !config.isSSL() ? http.createServer(bind(oRouter.route,oRouter)) : https.createServer({
    key: fs.readFileSync(path.normalize(config.get("SSLKey"))),
    cert: fs.readFileSync(path.normalize(config.get("SSLCert")))
}, bind(oRouter.route,oRouter));
  
server.listen(config.get("port"));

console.log(`Server is running at 127.0.0.1 , port ${config.get("port")}`);
