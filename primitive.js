PGGL.createSphereVertices = function(radius, subAlpha, subTheta) {
    var numVertices = (subAlpha + 1) * (subTheta + 1);
    var positions = new Float32Array(3 * numVertices);
    var normals = new Float32Array(3 * numVertices);
    var texcoords = new Float32Array(3 * numVertices);
    asignPush(positions);
    asignPush(normals);
    asignPush(texcoords);
    for (var y = 0; y <= subTheta; y++) {
        for(var x = 0; x <= subAlpha; x ++) {
            var u = x / subAlpha;
            var v = y / subTheta;
            var alpha = 2 * Math.PI * u;
            var theta = Math.PI * v;
            var sinAlpha = Math.sin(alpha);
            var cosAlpha = Math.cos(alpha);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            var ux = cosAlpha * sinTheta;
            var uy = cosTheta;
            var uz = sinAlpha * sinTheta;
            positions.push(radius * ux, radius * uy, radius * uz);
            normals.push(ux, uy, uz);
            texcoords.push(1 - u, v);
        }
    }

    var numVertAlpha = subAlpha + 1;
    var indices = new Uint16Array(6 * subAlpha * subTheta);
    asignPush(indices);
    for(var x = 0; x < subAlpha; x++) {
        for(var y = 0; y < subTheta; y++) {
            indices.push(
                (y + 0) * numVertAlpha + x,
                (y + 0) * numVertAlpha + x + 1,
                (y + 1) * numVertAlpha + x
            );
            indices.push(
                (y + 1) * numVertAlpha + x,
                (y + 0) * numVertAlpha + x + 1,
                (y + 1) * numVertAlpha + x + 1
            );
        }
    }

    return {
        position: positions,
        normal: normals,
        texcoord: texcoords,
        indices: indices
    };
}

function asignPush(array) {
    var cursor = 0;
    array.push = function () {
        for (var i = 0; i < arguments.length; ++i) {
            var value = arguments[i];
            array[cursor++] = value;
        }
    };
}
