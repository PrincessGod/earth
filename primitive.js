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
            if (value instanceof Array) {
                for (var j = 0; j < value.length; j++) {
                    array[cursor++] = value[j];
                }
            }
            else {
                array[cursor++] = value;
            }
        }
    };
}

PGGL.geojsonProvider = function(url) {
    return fetch(url).then(function(response) {
        return response.json();
    }).then(function(json) {
        var features = json.features;
        var featuresLength = features.length;
        var i;

        var polygons = [];
        for(i = 0; i < featuresLength; i++) {
            var feature = features[i];
            if(feature.geometry.type === 'Polygon') {
                var polygon = feature.geometry.coordinates[0];
                var length = polygon.length;
                if(length < 3) {return;}
                if(polygon[0][0] === polygon[length - 1][0] && polygon[0][1] === polygon[length - 1][1]) {
                    polygon.pop();
                    if(polygon.length < 3) {return;}
                }
                polygons.push(polygon);
            }
            else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(function(polygon) {
                    polygon = polygon[0];
                    if(!polygon || !polygon instanceof Array) {return;}
                    var length = polygon.length;
                    if(length < 3) {return;}
                    if(polygon[0] && polygon[length - 1] && polygon[0][0] === polygon[length - 1][0] && polygon[0][1] === polygon[length - 1][1]) {
                        polygon.pop();
                        if(polygon.length < 3) {return;}
                    }
                    polygons.push(polygon);
                });
            }
        }
        var polygonCount = polygons.length;
        var vertexCount = 0;
        var indexCount = 0;
        for(i = 0; i < polygonCount; i++) {
            vertexCount += polygons[i].length;
            indexCount += 3 * (polygons[i].length - 2);
        }

        var positions = new Float32Array(2 * vertexCount);
        var colors = new Float32Array(3 * vertexCount)
        var independColors = new Float32Array(3 * vertexCount)
        var indices = new Uint16Array(indexCount);
        var boundaryIndices = new Uint16Array(2 * vertexCount);
        asignPush(positions);
        asignPush(colors);
        asignPush(independColors);
        asignPush(indices);
        asignPush(boundaryIndices);
        var cursor = 0;

        var getColorWithHue = function(hue, percentage) {
            var u = percentage;
            var h = (360 + hue + (Math.abs(u - 0.5) * 150)) % 360;
            var s = Math.sin(u * Math.PI * 2) * 0.25 + 0.75;
            var v = 1.0;
            var color = chroma.hsv(h, s, v).gl();
            color.pop();
            return color;
        }

        var hue = Math.random() * 360;
        for(i = 0; i < polygonCount; i++) {
            var color = getColorWithHue(hue, i / polygonCount);
            for(var j = 0; j < polygons[i].length; j++) {
                colors.push(color);
                var newColor = getColorWithHue((360 + hue + (Math.abs(i / polygonCount - 0.5) * 100)) % 360, j / polygons[i].length);
                independColors.push(newColor);
            }

            var polygon = [].concat.apply([], polygons[i]);
            positions.push(polygon);

            var index = earcut(polygon);
            index.forEach(function(value, i) {
                index[i] += cursor;
            });
            indices.push(index);

            var vCount = polygons[i].length;
            for(var l = 0; l < vCount; l++) {
                var next = (l == vCount - 1) ? cursor : cursor + l + 1;
                boundaryIndices.push(cursor + l, next);
            }

            cursor += polygons[i].length;
        }
        return {
            position: positions,
            color: colors,
            independColors: independColors,
            indices: indices,
            boundaryIndices: boundaryIndices
        }
    }).catch(function(err) {
        console.error(err);
    });
}
