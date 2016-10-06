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
 const SERVER_CONFIG = './_config/serverConfig.json';
 const SERVICE_CONFIG = './_config/serviceConfig.json';


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

 Map.prototype.copyFrom = function(...aMap){	  

	 aMap.forEach((_map)=>{
		 _map.forEach((v, k)=>{
			 this.set(k, v);
		 }); 
	 });


 };

 Map.prototype.toJson = function(){
	return JSON.stringify([...this]);
 };

 Map.fromJson = function(jsonStr){
	return new Map(JSON.parse(jsonStr));
 };


 class ServerConfig{

	 static getDefault(){
		 var __map =  new Map([
			 ["port", 8079]
			,["cacheLevel", 1]
			,["endpointServer.address","http://baidu.com" ]
		//	,["endpointServer.address","https://www3.lenovo.com"]
			,["endpointServer.port", 9002 ]
			,["endpointServer.host", undefined]
			,["endpointServer.user", undefined]
			,["endpointServer.password", undefined]
			,["cacheFile","proxyCache.json" ]
			,["SSLKey","/Users/i054410/Documents/develop/self-cert/key.pem" ]
			,["SSLCert","/Users/i054410/Documents/develop/self-cert/cert.pem" ]
			,["relativePath","./../gitaws/hybris/bin/custom/ext-b2c/b2cstorefront/web/webroot"]
		//	,["proxy.host","proxy.pal.sap.corp"]
			//	,["proxy.port",8080]
			,["proxy.host",undefined]
			,["proxy.port",undefined]

		 ]);
	
		 let __defaultConfig = {};

		 for (let [key, val] of __map){
			
			 let tmp = __defaultConfig;
			key.split('.').forEach((K, inx, arr)=>{
				
				if(inx === arr.length -1){
					tmp[K] = val;
				}else{
					tmp = tmp[K]?tmp[K]:tmp[K]={};
				}
			
			});
		 
		 }

		 //		 let __defaultConfig = {
		 //			port: 8079
		 //			 ,cacheLevel:1
		 //			 ,cacheFile: ".data/proxyCache.json"
		 //			 ,SSLKey: "/Users/i054410/Documents/develop/self-cert/key.pem"
		 //			 ,SSLCert: "/Users/i054410/Documents/develop/self-cert/cert.pem"
		 //			 ,relativePath: "./../gitaws/hybris/bin/custom/ext-b2c/b2cstorefront/web/webroot"
		 //		 };
		 //
		 //		 __defaultConfig.endpointServer = {
		 //			 address: "http://baidu.com"
		 //			 ,port: 9002
		 //			 ,host: undefined
		 //			 ,user: undefined
		 //			 ,password: undefined
		 //		 };
		 //
		 //		 __defaultConfig.proxy={
		 //			 //	host: "proxy.pal.sap.corp"
		 //			 //,port: 8080
		 //			 host: undefined
		 //			 ,port: undefined
		 //
		 //
		 //		 };

		 __defaultConfig.keys = function(){
		 
			return __map.keys();
		 }

		 ServerConfig.getDefault = function(){
			 return __defaultConfig;
		 }
		 return __defaultConfig;

	 }

	 static get fields(){

		 return Array.from(ServerConfig.getDefault().keys());
	 }


	 set (key, val){
		 if(ServerConfig.fields.indexOf(key) >= 0){
			let _o = this.serverMap;
			key.split('.').some((key, inx, arr)=>{
				if(inx === arr.length-1){

					if(_o[key] !== val){
						this.isChanged = true;
						_o[key] = val;
					}
						return true;
				}else{
					_o = _o[key];
				}
			
			});	
		 }
		 return this;
	 }

	 save(){
		 return  new Promise((resolve, reject)=>{
			 if(this.isChanged){
				 fs.writeFile(SERVER_CONFIG, JSON.stringify(this.serverMap),(err)=>{

					 if(err){
						 reject(err);

					 }else{
						 resolve('success');
						 this.isChanged = false;
					 }
				 }) 

			 }else{
				 resolve('no change');
			 }

		 });

	 }

	 get(key){

		 if(key ==="endpointServer.host"){
			 return this.get("endpointServer.address").match(/^http(?:s)?:\/\/([^\/]+)/)[1];
		 }

		 var _o = this.serverMap;

		 key.split('.').forEach(key=>{
			_o = _o[key];
		 });

		 return _o;

		 //	 if(key.indexOf(".") >= 0){
		 //	 if(    let aKeys = key.split(".");
		 //	 if(    return this[this.__symbolMap.get(aKeys[0])][this.__symbolMap.get(key)];
		 //	 if(}

		 //	 if(let value = this[this.__symbolMap.get(key)];
		 //	 if(if(typeof value ==="object"){
		 //	 if(    let __o = {};
		 //	 if(    ServerConfig.fields.forEach((_field)=>{
		 //	 if(   	 if(_field.indexOf(".") >= 0 &&_field.indexOf(key) >= 0 ){
		 //	 if(   		 let aFields = _field.split(".");
		 //	 if(   		 __o[aFields[1]] = this[this.__symbolMap.get(aFields[0])][this.__symbolMap.get(_field)];

		 //	 if(   	 }
		 //	 if(    });
		 //	 if(    return __o;
		 //	 if(}
		 // return value;
	 }
	 hasProxy(){
		 return !!this.get("proxy");
	 }

	 isSSL(){
		 return this.get("endpointServer.address").indexOf("https") >= 0;
	 }

	 //	 constructor(){
	 //
	 //		 let defaultMap = ServerConfig.getDefault();
	 //		 this.__symbolMap = new Map();
	 //		 for(let field of ServerConfig.fields){
	 //			 this.__assign(field,defaultMap.get(field));		
	 //		 }
	 //
	 //	 }


	 //	 __assign(field,value){
	 //
	 //		 let _s = this.__retrieveSymbol(field);
	 //		 if(field.indexOf(".")>=0){
	 //			 let _aFields = field.split(".");
	 //			 let _subS = this.__retrieveSymbol(_aFields[0]);
	 //			 this[_subS] = this[_subS] || {};
	 //			 this[_subS][_s] = value;
	 //
	 //		 }else{
	 //			 this[_s] = value;
	 //		 }
	 //	 }

	 __retrieveSymbol(key){
		 return  this.__symbolMap.get(key) || this.__symbolMap.set(key, Symbol(key)).get(key);
	 }



	 __loadEnvironmentConfig(){

		 const aKeys = ServerConfig.fields;
		 var args = {}, envmap = {};

		 // load from package.json first if start up by npm
		 aKeys.forEach((key)=>{
			 if(process.env["npm_package_config_" + key]){
				 //	 envmap.set(key, process.env["npm_package_config_" + key]);
				 assignValue(key, process.env["npm_package_config_" + key], envmap )
				 
			 }
		 });

		 // load from command line
		 process.argv.slice().reduce((pre, item)=>{
			 let matches;
			 if((matches = pre.match(/^--(.*)/)) &&( aKeys.indexOf(matches[1].toLowerCase()) >= 0)){
				 //envmap.set(matches[1].toLowerCase(), item);
				 //envmap[matches[1].toLowerCase()] = item;
				assignValue(matches[1].toLowerCase(), item,envmap);

			 }	
			 return item;
		 });
		 return envmap;
	 }


	 calConfig(){

		 return this;
	 }

	 loadConfigFile(){
		 try{
			  fs.statSync(SERVER_CONFIG);
			  var __config = fs.readFileSync(SERVER_CONFIG,'utf-8');
			  return __config.length > 0 ? JSON.parse(__config): {};
			  //  return Map.fromJson(__config);

		 }catch(e){

			 try{
				 var stat = fs.statSync('./_config');

			 }catch(e){
				fs.mkdirSync('./_config');
			 }
				fs.writeFile(SERVER_CONFIG, '');
				return {};
			
		  }	
	 }

	 constructor(){
		 this.isChanged = false;
		 let defaultMap = ServerConfig.getDefault();
		 this.serverMap = {};
		 Object.assign(this.serverMap,defaultMap, this.loadConfigFile(), this.__loadEnvironmentConfig() );
		 //	 this.serverMap.copyFrom(defaultMap,this.loadConfigFile(),this.__loadEnvironmentConfig());
	 }


 }

  class ServiceConfig{
 
	  constructor(){

		this.serviceMap = [];

		try{
			var _file =  fs.readFileSync(SERVICE_CONFIG);
			this.serviceMap = _file.length > 0? JSON.parse(_file):[];
		
		}catch(e){
			fs.writeFile(SERVICE_CONFIG, '');
			return [];
		}
	  }

	  getServiceList(){
		return this.serviceMap;
	  }

	  //	  hasService(url){
	  //		  return this.serviceMap.some(service=>service === url);
	  //	  }

	  __saveServiceList(oService){

		  return new Promise((resolve, reject)=>{
				fs.writeFile(SERVICE_CONFIG, JSON.stringify(this.serviceMap), (err)=>{
					if(err){
						reject(err);
					}else{
						resolve(oService);
					}
				});

		  
		  });

	  
	  }

	  addServiceURL(oService){

		  return new Promise((resolve, reject)=>{
		  
		  	if(!this.serviceMap.some(service=>service.url === oService.url && service.method === oService.method&& service.param === oService.param)){
				this.serviceMap.push(oService);

				this.__saveServiceList(oService).then((data)=>{
					resolve(data);
				}).catch(err=>{
					reject(err);
				});

				//			fs.writeFile(SERVICE_CONFIG, JSON.stringify(this.serviceMap), (err)=>{
				//			fs.writeF	if(err){
				//			fs.writeF		reject(err);
				//			fs.writeF	}else{
				//			fs.writeF		resolve(serviceUrl);
				//			fs.writeF	}
				//			fs.writeF});
			  
			}else{
				resolve("no_change");
			
			}

			
		  });

	  }

	  generatePath(oService){
		return path.join("./_config",oService.method + oService.path) + ".json";
	  }

	  __generateKey(oService){
		JSON.stringify(oService.param);
	  }



	  addService(oService){

		  var _path = this.generatePath(oService);
		  // support multi-param only for GET method
		
		  var _key = (oService.method === "get" && oService.param.length > 0)? oService.param: "data";

		  return new Promise((resolve, reject)=>{
			
				  fs.readFile(_path,(err,data)=>{

					  if(err){
						  fs.writeFile(_path, JSON.stringify({_key: oService.data}),'utf-8', (err)=>{
							  if(err){
								  reject(err);
							  }else{
								  resolve(oService);
							  }
						  });

					  }else{
							
						  let cacheData = JSON.parse(data);
						  cacheData[_key] = oService.data;	
						  fs.writeFile(_path,JSON.stringify(cacheData), 'utf-8',(err)=>{
							  if(err){
								  reject(err);
							  }else{
								  resolve(oService);
							  }
						  } );
					  }
				  }); 
		  });
	  }

	  __deleteFile(_path){

		  return new Promise((resolve, reject)=>{
			  fs.unlink(_path, (err)=>{
				  if(err){
					reject(err);
				  }else{
					resolve();
				  }
			  });
		  });
	  
	  }
	  deleteService(_url){
		  return new Promise((resolve, reject)=>{
				
			  if(!this.serviceMap.some(service=>service === _url)){
					resolve("no_change");	
			  }else{
				  this.serviceMap.splice(this.serviceMap.indexOf(_url), 1);
				
				  var _path = this.generatePath(_url.replace(/\//g, "_"));
					  Promise.all([this.__saveServiceList(_url), this.__deleteFile(_path)]).then(data=>{
						resolve(_url);
					  }).catch(err=>{
						reject(err);
					  });
			  }
		  });
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
			,[new RegExp("/public/"), handleStatic]
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

 function handleStatic(req,res,cb,urlPart){
	
	 let url = req.url;
	 let _path = path.join(".", url);

	 sendFile(_path, res);

 }

  function assignValue(key, val, oo){
	 
		 key.split('.').forEach((key, inx, arr)=>{
			 if(inx === arr.length -1 ){
				oo[key] = val;
			 }else{
				 if(oo[key] === undefined){
					oo[key] = {};
				 }
			 }
		 });
	 
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

	 sendFile(_path, res);
 }

 function sendFile(_path, res){
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
		 console.error(err);
		 res.statusCode = 404;
		 res.statusMessage = "file not found by proxy";
		 res.end(res.statusMessage);

	 });

	 fileRaw.pipe(zlib.createGzip()).pipe(res);	

 }

 const handleViewModel = (viewName)=>{
		
	 let _path = path.join("./public",viewName + ".ejs");
	 let model = {};
	 switch (viewName){

	case 'config':

	 ServerConfig.fields.forEach(field=>{
		model[field] = config.get(field);
	 });

	 
	
	 return {
		 path:_path,
		 model:{
			 model: model,
			 serviceList: serviceConfig.getServiceList()
		 }
	 };


  default:
	 return {
		 path:_path,
		 model:{
			model: model
		 }
	 
	 };
	 }
 };

 function handleServerConfiguration(req, res, cb, urlPart){

	 let matched = req.url.match(urlPart)[1].trim();
	 if(matched.indexOf('/view') === 0){

		 let viewName = matched.slice(1).split("/")[1] || "config" ;
		 // let _path = path.join("./public",viewName + ".ejs");

		 let viewModel = handleViewModel(viewName);
		 oView.render(viewModel.path, viewModel.model , (err, str)=>{

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

	 }else{
		 // handle action from configuration page
		 switch(matched){
			 case '/save_server_config':

				 extractParam(req).map(pair=>{
					 config.set(pair.key, pair.val);
				 });

				 //				 req.bodyData.split("&").map(pair=>{
				 //					 let aParam = pair.split("=");
				 //					 return {
				 //						 key: aParam[0],
				 //						 val: decodeURIComponent(aParam[1])
				 //					 };
				 //				 });
				 //				 req.bodyData.split("&").map(pair=>{
				 //					 let aParam = pair.split("=");
				 //					 config.set(aParam[0], decodeURIComponent(aParam[1]));
				 //
				 //				 });

				 config.save().then(()=>{

					 res.writeHead(200,{
						 "Content-Type":MIME.json
					 });
					 res.end(JSON.stringify({"status":"sucess"}));		
				 }).catch((err)=>{
					 res.writeHead(200,{
						 "Content-Type":MIME.json
					 });

					 res.end(JSON.stringify({"status":"sucess","content":err.message}));		
				 });
				 break;

			 case '/save_service_config':

				 let _path = '', rootKey = 'data', _data, _url, _method, _param, oService = {};
				 extractParam(req).map(pair=>{
					 if(pair.key === 'serviceUrl'){
						 //	 let _k = pair.val.split("?");
						 oService.url = pair.val;
						 oService.path = pair.val.replace(/\//g, "_");
							 //	 rootKey = _k[1] || rootKey;
					 }else if(pair.key === 'serviceData'){
						 if(pair.val && pair.val.length > 0){
							 oService.data = pair.val;		
						 }		 
					 }else if (pair.key === 'serviceMethod'){
						oService.method = pair.val.toLowerCase();	
					 
					 }else if (pair.key === 'serviceParam'){
						oService.param = pair.val;	
					 }
				 });

				 if(oService.data){
					 Promise.all([serviceConfig.addServiceURL(oService),serviceConfig.addService(oService )]).then(args=>{
							 res.writeHead(200,{
							 "Content-Type":MIME.json
							 });
						 res.end(JSON.stringify({data: args[0]}));		

					 }).catch(err=>{
						 res.statusCode=500;
						 res.statusMessage = err.message;
						 res.end(res.statusMessage);	
					 });
				 }else{
					 serviceConfig.addServiceURL(oService).then(args=>{
						 res.writeHead(200,{
							 "Content-Type":MIME.json
						 });
						 res.end(JSON.stringify({url: args[0]}));			
					 }).catch(err=>{
						 res.statusCode=500;
						 res.statusMessage = err.message;
						 res.end(res.statusMessage);		
					 });
				 }
				 break;
			 case "/delete_service_config":	
				
				 var serviceUrl = extractParam(req)[0]['val'];
				 serviceConfig.deleteService(serviceUrl).then(data=>{
						res.writeHead(200,{
							 "Content-Type":MIME.json
						 });
						 res.end(JSON.stringify({url: data}));	 
				 }).catch(err=>{
						 res.statusCode=500;
						 res.statusMessage = err.message;
						 res.end(res.statusMessage);	
				 }); 
				 break;

			 case 'load_service':
				 
		 }
	 }

	 function extractParam(req){
				return req.bodyData.split("&").map(pair=>{
					 let aParam = pair.split("=");
					 return {
						 key: aParam[0],
						 val: decodeURIComponent(aParam[1])
					 };
				 });

	 }	


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

		 var  endServerHost = config.get("endpointServer.host"),
			 endServerPort = config.get("endpointServer.port"),
				 oAuth;

				 if(config.get("endpointServer.user")){
					 oAuth ='Basic ' + new Buffer(config.get("endpointServer.user") + ':' + config.get("endpointServer.password")).toString('base64');		
				 }

				 /* 
				  * https via proxy, request via tunnel.
				  * this kind of request have to create socket to proxy first, the use this as
				  * tunnel to connect to end point server
				  */
				 if(config.isSSL() && config.hasProxy() ){
					 requestViaProxy({
						 path: req.url,
						 host:endServerHost,
						 prot:endServerPort,
						 method: req.method,
						 auth: oAuth,
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

					 var __option = {};
					 __option.method = req.method;
					 __option.headers=Object.assign(__option.headers || {}, _reqeustHeader);
					 __option.headers.host = endServerHost;
					 oAuth&&(__option.headers.Authorization = oAuth);
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
						 // by this way, to get rid of untruseted https site
						 __option.strictSSL=false;
						 __option.agent = new https.Agent({
							 host: endServerHost
							, port: endServerPort
							, path: req.url
							, rejectUnauthorized: false
						 });
					 }

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
 }
 var config = new ServerConfig();
 //config.loadEnvironmentConfig();
 var serviceConfig = new ServiceConfig();
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

		 let ops = {
			 socket:socket,
			 agent: false,
			 hostname: target.host,
			 path: target.path,
			 method: target.method
		 };
		 target.auth&&(ops.headers = {Authorization: target.auth});
		 let proxyReq = https.request(ops, (res)=>{
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
