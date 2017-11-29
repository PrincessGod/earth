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

    PGGL.createBuffer = function(bufferData) {
        var typedArray;
        if(Array.isArray(bufferData)) {
            typedArray = this.createBuffer(bufferData);
        }
        else if(ArrayBuffer.isView(bufferData)) {
            typedArray = bufferData;
        }
        else {
            console.error('Buffer data neither Array nor TypedArray');
            return null;
        }
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, typedArray, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return buffer;
    }

    PGGL.createAttributeInfo = function(program, property, bufferData, components) {
        var location = gl.getAttribLocation(program, property);
        return {
            program: program,
            buffer: this.createBuffer(bufferData),
            location: location,
            components: components
        }
    }

    PGGL.setAttribute = function(info) {
        gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
        gl.vertexAttribPointer(info.location, info.components, gl.FLOAT, gl.FALSE, 0, 0);
        gl.enableVertexAttribArray(info.location);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    PGGL.draw = function(info) {
        this.resizeToFix(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(info.program);
        this.setAttribute(info);
        gl.drawArrays(gl.POINTS, 0, 66);
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
