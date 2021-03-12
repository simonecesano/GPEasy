class GPEasy {
    constructor(width, height) {
	console.log('here');

	width  = width || 1;
	height = height || 1;
	
	this.outputSize(width, height)
	this.textures = [];
	return this;
    }

    outputSize(width, height){
	this.createContext(width, height);
	this.width  = width;
	this.height = height;
	return this;
    }
    
    createContext(dstWidth, dstHeight){
	const canvas = document.createElement('canvas');
	canvas.width  = dstWidth;
	canvas.height = dstHeight;
	
	const gl = canvas.getContext('webgl');
	var ext = gl.getExtension('OES_texture_float');
	// return gl;
	this.gl = gl;
    }
    
    createShader(source, type){
	const gl = this.gl;
	
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	this.checkShaderCompile(shader, source)
	
	return shader;
    }

    checkShaderCompile(shader, source){
	var gl = this.gl;
	// console.log(shader instanceof WebGLShader);
	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

	if (compiled) {
	    console.log('Shader compiled successfully');
	} else {
	    var compilationLog = gl.getShaderInfoLog(shader);
	    var m = compilationLog.match(/ERROR:\s*(\d+):(\d+)/)
	    var line = m[2];
	    console.error([ 'Shader compiler log: ' + compilationLog,
			    source.split("\n").slice(parseInt(line) - 3, parseInt(line) + 2).filter(l => !l.match(/^\s*$/)).join("\n")
			  ].join("\n"))
	    throw 'Shader compile error';
	}

    }
    
    createProgram(vs, fs){
	const gl = this.gl;

	const program = gl.createProgram();

	var vs = this.createShader(vs, gl.VERTEX_SHADER);
	var fs = this.createShader(fs, gl.FRAGMENT_SHADER);

	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);


	if ( !gl.getProgramParameter( program, gl.LINK_STATUS) ) {
	    var info = gl.getProgramInfoLog(program);
	    throw new Error('Could not compile WebGL program. \n\n' + info);
	}
	
	this.program = program;
	this.setupBuffer(program);

	return this;
    }
    
    setupBuffer(program) {
	const gl = this.gl;

	//--------------------------------------------
	// setup a full canvas clip space quad
	//--------------------------------------------
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	    -1, -1,
	     1, -1,
	    -1,  1,
	    -1,  1,
	     1, -1,
	     1,  1,
	]), gl.STATIC_DRAW);
	
	//------------------------------------------------------------
	// setup our attributes to tell WebGL how to pull
	// the data from the buffer above to the position attribute
	//------------------------------------------------------------
	
	const positionLoc = gl.getAttribLocation(program, 'position');
	
	gl.enableVertexAttribArray(positionLoc);
	gl.vertexAttribPointer(
	    positionLoc,
	    2,         // size (num components)
	    gl.FLOAT,  // type of data in buffer
	    false,     // normalize
	    0,         // stride (0 = auto)
	    0,         // offset
	);
	gl.useProgram(program);
    }
    
    createTexture(name, data, width, height, position, opts){
	const gl = this.gl;
	const program = this.program;

	var args = Array.from(arguments);

	var opts = {};
	if ('[object Object]' === Object.prototype.toString.call(arguments[arguments.length - 1])) {
	    opts = Object.assign(opts, args.pop());
	}

	[ name, data, width, height, position ] = args;
	
	const loc  = gl.getUniformLocation(program, name);
	if (loc == null){ console.warn(`Variable ${name} not found - possible creation of unused texture`) };

	if ('[object Float32Array]' !== Object.prototype.toString.call(data)) {
	    data = prepare(data.flat(depth(data)), step(data), 4)
	} else {
	    console.log("data is already a Float32Array") 
	}

	const tex = gl.createTexture();

	width    = width    || data.length / 4;
	height   = height   || 1;
	position = position || this.textures.length;

	// console.log(width, height, position);
	
	gl.activeTexture(gl.TEXTURE0 + position);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); // see https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html
	
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA,
		       width, height,
		       0, gl.RGBA, gl.FLOAT,
		       data);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.uniform1i(loc, position);

	this.textures.push({ name: name, location: loc, texture: tex })
	
	var sizeLoc = gl.getUniformLocation(program, name + 'Size')
	if (sizeLoc){
	    this.createUniform(name + 'Size', width, height)
	} else {
	    console.warn(`Variable ${name + 'Size'} does not exist - skipping creation of size uniform`);
	}
	
    }

    createUniform(name, ...args){
	const gl = this.gl;
	const program = this.program;

	const loc = gl.getUniformLocation(program, name);
	if (loc == undefined){ console.warn(`Variable ${name} not found`) }

	var opts = {};
	var vals = [];

	if ('[object Object]' === Object.prototype.toString.call(arguments[arguments.length - 1])) {
	    opts = Object.assign(opts, args.pop());
	}
	
	if ('[object Array]'  === Object.prototype.toString.call(arguments[1])) {
	    var vals = args[0];
	} else {
	    var vals = args;
	}

	// -------------------------------------
	// change to accomodate determining
	// length with opts
	// -------------------------------------	
	const func = `uniform${vals.length}f`;
	gl[func](loc, ...vals);
	return this;
    }

    addVariable(name, ...args){
	var opts = {};
	// --------------------------------------------------------
	// check if last arg is Object - and therefore options
	// --------------------------------------------------------    
	if ('[object Object]' === Object.prototype.toString.call(arguments[arguments.length - 1])) {
	    opts = Object.assign(opts, args.pop());
	}

	if (Object.prototype.toString.call(arguments[1]).match(/Array\]/)) {
	    this.createTexture(name, ...args, opts);
	} else {
	    this.createUniform(name, args, opts);
	}
    }
    
    calc(opts){
	opts = opts || {};
	
	const gl = this.gl;
	gl.drawArrays(gl.TRIANGLES, 0, 6);  // draw 2 triangles (6 vertices)

	var results = new Uint8Array(this.width * this.height * 4);

	gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, results);
	if (opts.raw) {
	    return results;
	} else {
	    results = new Float32Array(results.buffer);
	    return opts.fold
		?
		fold(Array.from(results), this.width)
		:
		Array.from(results)
	    ;
	}
    }
}

function fold (a, l){
    var r = [];
    var m = a.length;
	for (var i = 0; i < m; i += l){
	    r.push(a.slice(i, i + l));
	}
    return r;
}

function prepare(inputArray, inStep, outStep){
    let inLength = inputArray.length;

    const flatArray = [];
    const outputArray = new Float32Array(inLength / inStep * outStep);
    
    for (let i = 0; i < inLength; i += inStep){
	for (let k = 0; k < inStep; k++) {
	    outputArray[(i / inStep * outStep) + k] = inputArray[i + k]
	}
    }
    return outputArray;
}

function depth(value) {
  return Array.isArray(value) ? 
	1 + Math.max(...value.map(depth)) :
	0;
}

function step(value){
    return Math.pow(2, depth(value)-1)
}
