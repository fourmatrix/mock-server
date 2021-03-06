"use strict";
const Transform = require("stream").Transform,
	  zlib = require("zlib");
class CacheStream extends Transform{

	constructor(ops){
		super(ops);
		this.key = ops.key;
		this.header = ops.header;
		this.oCache = ops.cache;
		this.chunks = [];
		this.size = 0;
		this.serviceConfig = ops.serviceConfig;
		
	}

	_transform( chunk, encoding, cb){
	
		this.chunks.push(chunk);
		this.size += chunk.length;
		cb(null, chunk);
	}

	_flush(done){

		let data = new Buffer(this.size);
		let pos = 0;
		this.chunks.forEach((chunk)=>{
			
			chunk.copy(data, pos);
			pos += chunk.length;

		});

		if(this.oCache){
			this.oCache[this.key] = {header : this.header, data: data};
			done();

		}else{
					
		}
					
		
	}

}
module.exports = CacheStream;
