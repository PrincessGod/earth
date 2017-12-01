var PGGL = {};

(function createContext() {
    var gl;
    PGGL.getWebglContext = function(id) {
        var canvas = document.getElementById(id);
        PGGL.gl = canvas.getContext('webgl');
        if(!PGGL.gl) {
            console.log('WebgGL not supported, try using experimental-webgl');
            PGGL.gl = canvas.getContext('experimental-webgl');
        }
        if(!PGGL.gl) {
            alert('Your browser does not support WebGl !');
        }
        gl = PGGL.gl;
    }

    PGGL.createShader = function(id, type) {
        var ele = document.getElementById(id);
        if(!ele || ele.textContent == '') {
            console.error(id + ' element does not have text, create shader failed.');
            return null;
        }
        var shader = gl.createShader(type);
        gl.shaderSource(shader, ele.textContent);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('ERROR compiling shader "' + id + '" .', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    PGGL.createProgram = function(vsid, fsid) {
        var program = gl.createProgram();
        gl.attachShader(program, this.createShader(vsid, gl.VERTEX_SHADER));
        gl.attachShader(program, this.createShader(fsid, gl.FRAGMENT_SHADER));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        gl.validateProgram(program);
        if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    function getTypedArray(data, type) {
        if(Array.isArray(data)) {
            return new type(data);
        }
        else if(ArrayBuffer.isView(data)) {
            return data;
        }
        else {
            console.error('Buffer data neither Array nor TypedArray');
            return null;
        }
    }

    PGGL.createBuffer = function(bufferData, bindPoint, type) {
        var typedArray = getTypedArray(bufferData, type);
        var buffer = gl.createBuffer();
        gl.bindBuffer(bindPoint, buffer);
        gl.bufferData(bindPoint, typedArray, gl.STATIC_DRAW);
        gl.bindBuffer(bindPoint, null);
        return buffer;
    }

    // property, bufferData, components, type, normalize
    PGGL.createAttributeInfo = function(program, attribute) {
        var property = attribute.property;
        var bufferData = attribute.bufferData;
        var components = attribute.components;
        var type = !!attribute.type ? attribute.type : gl.FLOAT;
        var normalize = !!attribute.normalize;
        var location = gl.getAttribLocation(program, property);
        return {
            buffer: this.createBuffer(bufferData, gl.ARRAY_BUFFER, Float32Array),
            location: location,
            components: components,
            type: type,
            normalize: normalize
        }
    }

    PGGL.createProgramInfo = function(program, attributes, indices) {
        var attributesInfo = [];
        attributes.forEach(function(attribute) {
            attributesInfo.push(PGGL.createAttributeInfo(program, attribute));
        });
        var count = indices.length || attributes[0].bufferData.length / 3;
        return {
            program: program,
            attrbutesInfo: attributesInfo,
            index: PGGL.createBuffer(indices, gl.ELEMENT_ARRAY_BUFFER, Uint16Array),
            count: count
        };
    }

    PGGL.setAttribute = function(info) {
        gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
        gl.vertexAttribPointer(info.location, info.components, info.type, info.normalize, 0, 0);
        gl.enableVertexAttribArray(info.location);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    PGGL.getSetUniformFun = function(data) {
        if(typeof data === 'number') {
            return function(location, data) {
                gl.uniform1f(location, data);
            }
        }
        if(Array.isArray(data) || ArrayBuffer.isView(data)) {
            var length = data.length;
            switch(length) {
                case 0:
                console.error('Uniform data is an Array with 0 element.');
                return undefined;
                case 1:
                return function(location, data) {
                    gl.uniform1fv(location, data);
                }
                case 2:
                return function(location, data) {
                    gl.uniform2fv(location, data);
                }
                case 3:
                return function(location, data) {
                    gl.uniform3fv(location, data);
                }
                case 4:
                return function(location, data) {
                    gl.uniform4fv(location, data);
                }
                case 16:
                return function(location, data) {
                    gl.uniformMatrix4fv(location, false, data);
                }
            }
        }
        console.error('Unknown uniform data type.');
    }

    // data, property
    PGGL.setUniform = function(program, uniformInfo){
        var data = uniformInfo.data;
        var property = uniformInfo.property;
        var func = this.getSetUniformFun(data);
        var location = gl.getUniformLocation(program, property);
        func(location, data);
    }

    PGGL.getImgTexture = function(url, set, originTex) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([127, 127, 127, 255]));
        var image = new Image();
        image.src = url;
        image.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
            if(set) {
                gl.bindTexture(gl.TEXTURE_2D, texture);            
            }
            else {
                gl.bindTexture(gl.TEXTURE_2D, originTex);
            }
        });
        return texture;
    }
    // color drawMode
    PGGL.getRenderTexture = function(geojson, set, options) {
        var color = (options && options.color) || false;
        var drawMode = (options && options.drawMode) || false;
        var colorArray = geojson.color;
        if(color) {
            colorArray = new Float32Array(geojson.color.length);
            asignPush(colorArray);
            for(var i = 0; i < colorArray.length / 3; i++) {
                colorArray.push(color);
            }
        }
        var texPorgram = PGGL.createProgram('texture-vs', 'texture-fs');
        var texPorgramInfo = PGGL.createProgramInfo(texPorgram, [
            {
                property: 'position',
                bufferData: geojson.position,
                components: 2
            },
            {
                property: 'color',
                bufferData: colorArray,
                components: 3
            }
        ], geojson.indices);

        var renderTextureWidth = 3200;
        var renderTextureHeight = 1600;
        var renderTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, renderTexture);

        var level = 0;
        var internalForamt = gl.RGBA;
        var border = 0;
        var format = gl.RGBA;
        var type = gl.UNSIGNED_BYTE;
        var data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalForamt,
                    renderTextureWidth, renderTextureHeight, border,
                    format, type, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

        var attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, renderTexture, level);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.bindTexture(gl.TEXTURE_2D, renderTexture);
        gl.viewport(0, 0, renderTextureWidth, renderTextureHeight);

        PGGL.draw(texPorgramInfo, {
            cullFace: false,
            drawMode: drawMode,
            color: [0.6, 0.6, 0.6, 1.0],
            width: renderTextureWidth,
            height: renderTextureHeight
        });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (!set) {
            gl.bindTexture(gl.TEXTURE_2D, null);            
        }
        return renderTexture;
    }

    // options: {cullFace, drawMode, color, width, height}
    PGGL.draw = function(info, options) {
        var cullFace = options && options.cullFace === false ? false : true;
        var drawMode = (options && options.drawMode) || gl.TRIANGLES;
        var color = (options && options.color) || [0, 0, 0, 1.0];
        var width = (options && options.width) || gl.canvas.width;
        var height = (options && options.height) || gl.canvas.height;
        this.resizeToFix(gl.canvas);
        gl.viewport(0, 0, width, height);
        gl.enable(gl.DEPTH_TEST);
        if(cullFace) {
            gl.enable(gl.CULL_FACE);
        }
        else {
            gl.disable(gl.CULL_FACE);
        }
        PGGL.gl.clearColor(color[0], color[1], color[2], color[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(info.program);
        info.attrbutesInfo.forEach(function(info) {
            PGGL.setAttribute(info);
        });
        for (var property in info.uniformsInfo) {
            PGGL.setUniform(info.program, {property : property, data: info.uniformsInfo[property]});
        }
        if(info.index) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, info.index);
            gl.drawElements(drawMode, info.count, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.drawArrays(drawMode, 0, info.count);
        }
    }

    PGGL.resizeToFix = function(canvas) {
        var displayWidth = canvas.clientWidth;
        var displayHeight = canvas.clientHeight;
        if(canvas.width != displayWidth || canvas.height != displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
    }
})();
