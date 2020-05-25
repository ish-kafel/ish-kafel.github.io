LDR.Shader = {};
LDR.Shader.createShaderHeader = function (canBeOld, numberOfColors, c, defaultIsEdge) {
    let ret = 'precision highp float;precision mediump int;';
    if (canBeOld) {
        ret += "  uniform bool old;\n";
        let oldColor = new THREE.Color(defaultIsEdge ? LDR.Colors[16].edge : LDR.Colors[16].value);
        ret += "  const vec4 oldColor = vec4(" + oldColor.r + "," + oldColor.g + "," + oldColor.b + ",1);\n";
    }
    let multiColored = numberOfColors > 1;
    if (multiColored) {
        ret += "  uniform vec4 colors[" + numberOfColors + "];\n";
    } else {
        ret += "  uniform vec4 color;\n";
    }
    return ret;
}
LDR.Shader.createShaderBody = function (canBeOld, multiColored, hasTexmap) {
    let ret = '  uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;\n';
    if (hasTexmap) {
        ret += "  attribute vec2 uv;\n";
        ret += "  varying vec2 vuv;\n";
    }
    if (multiColored)
        ret += "  attribute vec4 position;\n";
    else
        ret += "  attribute vec3 position;\n";
    ret += 'varying vec4 vColor;void main(){';
    ret += "    vColor = ";
    if (canBeOld)
        ret += "old ? oldColor : ";
    if (multiColored) {
        ret += "colors[int(position.w)];\n";
        ret += "    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);";
    } else {
        ret += "color;\n";
        ret += "    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);";
    }
    if (hasTexmap) {
        ret += "  vuv=uv;\n";
    }
    return ret;
}
LDR.Shader.createSimpleVertexShader = function (canBeOld, colors, push, defaultIsEdge, hasTexmap) {
    let numberOfColors = colors.length;
    if (numberOfColors === 0) {
        throw "No colors!";
    }
    let ret = LDR.Shader.createShaderHeader(canBeOld, numberOfColors, colors[0], defaultIsEdge);
    ret += LDR.Shader.createShaderBody(canBeOld, numberOfColors > 1, hasTexmap);
    if (push) {
        ret += "gl_Position.w -= 0.0000005;";
    }
    ret += "  }";
    return ret;
}
//See'http://www.ldraw.org/article/218.html'for specification of optional/conditional lines.
LDR.Shader.createConditionalVertexShader = function (canBeOld, colors, push) {
    let numberOfColors = colors.length;
    let c = colors[0];
    let ret = 'precision highp float;precision mediump int;';
    if (canBeOld) {
        ret += "  uniform bool old;\n";
        let oldColor = new THREE.Color(LDR.Colors[16].edge);
        ret += "  const vec4 oldColor = vec4(" + oldColor.r + "," + oldColor.g + "," + oldColor.b + ",1);\n";
    }
    ret += 'uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;attribute vec3 position;attribute vec3 p2;attribute vec3 p3;attribute vec3 p4;';
    let multiColored = numberOfColors > 1;
    if (multiColored) {
        ret += "  uniform vec4 colors[" + numberOfColors + "];\n";
        ret += "  attribute float colorIndex;\n";
    } else {
        ret += "  uniform vec4 color;\n";
    }
    ret += 'varying vec4 vColor;void main(){mat4 m=projectionMatrix*modelViewMatrix;gl_Position=m*vec4(position,1.0);vec2 xp1=gl_Position.xy;vec2 d12=vec4(m*vec4(p2,1.0)).yx-xp1.yx;d12.y=-d12.y;vec2 d13=vec4(m*vec4(p3,1.0)).xy-xp1;vec2 d14=vec4(m*vec4(p4,1.0)).xy-xp1;vColor=';
    if (canBeOld)
        ret += "old ? oldColor : ";
    if (multiColored)
        ret += "colors[int(colorIndex)];";
    else
        ret += "color;";
    ret += "\n        vColor.a *= sign(dot(d12, d13)*dot(d12, d14));";
    if (push)
        ret += "\n        gl_Position.w -= 0.0000005;";
    ret += "\n      }";
    return ret;
}
LDR.Shader.SimpleFragmentShader = 'precision lowp float;varying vec4 vColor;void main(){gl_FragColor=vColor;}';
LDR.Shader.AlphaTestFragmentShader = 'precision lowp float;varying vec4 vColor;void main(){if(vColor.a <= 0.001)discard;gl_FragColor = vColor;}';
LDR.Shader.TextureFragmentShader = 'precision lowp float;varying vec4 vColor;varying vec2 vuv;uniform sampler2D map;void main(){if(vuv.x >= 0.0 && vuv.x <= 1.0 && vuv.y >= 0.0 && vuv.y <= 1.0){gl_FragColor = texture2D(map,vuv);if(gl_FragColor.a < 1.0){gl_FragColor=mix(gl_FragColor,vColor,1.0-gl_FragColor.a);}}else{gl_FragColor=vColor;}}';
LDR.Colors.getHighContrastColor4 = function (colorID) {
    if (colorID === 0 || colorID === 256 || colorID === 64 || colorID === 32 || colorID === 83) {
        return new THREE.Vector4(1, 1, 1, 1);
    } else if (colorID === 272 || colorID === 70) {
        return new THREE.Vector4(1, 0, 0, 1);
    } else {
        return new THREE.Vector4(0, 0, 0, 1);
    }
}
LDR.Colors.getColor4 = function (colorID) {
    let colorObject = LDR.Colors[colorID >= 0 ? colorID : -colorID - 1];
    if (!colorObject) {
        throw "Unknown color: " + colorID;
    }
    let color = new THREE.Color(colorID >= 0 ? colorObject.value :
        (colorObject.edge ? colorObject.edge : 0x333333));
    let alpha = colorObject.alpha ? colorObject.alpha / 256.0 : 1;
    return new THREE.Vector4(color.r, color.g, color.b, alpha);
}
LDR.Colors.getDesaturatedColor4 = function (colorID) {
    let colorObject = LDR.Colors[colorID >= 0 ? colorID : -colorID - 1];
    if (!colorObject) {
        throw "Unknown color: " + colorID;
    }
    let color = LDR.Colors.desaturateThreeColor(colorID >= 0 ? colorObject.value :
        (colorObject.edge ? colorObject.edge : 0x333333));
    let alpha = colorObject.alpha ? colorObject.alpha / 256.0 : 1;
    return new THREE.Vector4(color.r, color.g, color.b, alpha);
}
LDR.Colors.getColorHex = function (colorID) {
    let colorObject = LDR.Colors[colorID >= 0 ? colorID : -colorID - 1];
    if (!colorObject) {
        throw "Unknown color: " + colorID;
    }
    return colorID >= 0 ? colorObject.value : (colorObject.edge ? colorObject.edge : 0x333333);
}
LDR.Colors.int2RGB = function (i) {
    let b = (i & 0xff);
    i = i >> 8;
    let g = (i & 0xff);
    i = i >> 8;
    let r = i;
    return [r, g, b];
}
LDR.Colors.int2Hex = function (i) {
    let rgb = LDR.Colors.int2RGB(i);
    let ret = '#';
    for (let j = 0; j < 3; j++) {
        rgb[j] = Number(rgb[j]).toString(16);
        if (rgb[j].length == 1) {
            ret += '0';
        }
        ret += rgb[j];
    }
    return ret;
}
LDR.Colors.desaturateThreeColor = function (hex) {
    let threeColor = new THREE.Color(hex);
    let hsl = {};
    threeColor.getHSL(hsl);
    if (hsl.l == 0) {
        hsl.l = 0.3;
    } else {
        hsl.l *= 0.7;
    }
    threeColor.setHSL(hsl.h, hsl.s, hsl.l);
    return threeColor;
}
LDR.Colors.desaturateColor = function (hex) {
    return LDR.Colors.desaturateThreeColor(hex).getHex();
}
LDR.Colors.isTrans = function (colorID) {
    return LDR.Colors[colorID < 0 ? -colorID - 1 : colorID].alpha > 0;
}
LDR.Colors.canBeOld = false;
LDR.ColorMaterialIdx = 0;
LDR.Colors.buildLineMaterial = function (colorManager, color, conditional) {
    colorManager = colorManager.clone();
    colorManager.overWrite(color);
    colorManager.idMaterial = LDR.ColorMaterialIdx++;
    let colors = (LDR.Options && LDR.Options.lineContrast === 0) ?
        colorManager.highContrastShaderColors : colorManager.shaderColors;
    let len = colors.length;
    let uniforms = {};
    if (LDR.Colors.canBeOld) {
        uniforms['old'] = {
            value: false
        };
    }
    if (len > 1) {
        uniforms['colors'] = {
            type: 'v4v',
            value: colors
        };
    } else {
        uniforms['color'] = {
            type: 'v4',
            value: colors[0]
        };
    }
    let ret = new THREE.RawShaderMaterial({
        uniforms: uniforms,
        vertexShader: (conditional ?
            LDR.Shader.createConditionalVertexShader(LDR.Colors.canBeOld, colors, true) :
            LDR.Shader.createSimpleVertexShader(LDR.Colors.canBeOld, colors, true, true, false)),
        fragmentShader: (conditional ?
            LDR.Shader.AlphaTestFragmentShader :
            LDR.Shader.SimpleFragmentShader),
        transparent: false,
        visible: true
    });
    ret.colorManager = colorManager;
    return ret;
}
LDR.Colors.buildTriangleMaterial = function (colorManager, color, texmap) {
    colorManager = colorManager.clone();
    colorManager.overWrite(color);
    let colors = colorManager.shaderColors;
    let len = colors.length;
    let uniforms = {};
    if (LDR.Colors.canBeOld) {
        uniforms['old'] = {
            value: false
        };
    }
    if (len > 1) {
        uniforms['colors'] = {
            type: 'v4v',
            value: colors
        };
    } else {
        uniforms['color'] = {
            type: 'v4',
            value: colors[0]
        };
    }
    if (texmap && texmap !== true) {
        uniforms['map'] = {
            type: 't',
            value: texmap
        };
    }
    let isTrans = colorManager.containsTransparentColors();
    let ret = new THREE.RawShaderMaterial({
        uniforms: uniforms,
        vertexShader: LDR.Shader.createSimpleVertexShader(LDR.Colors.canBeOld, colors, false, false, texmap),
        fragmentShader: texmap ? LDR.Shader.TextureFragmentShader : LDR.Shader.SimpleFragmentShader,
        transparent: isTrans,
        depthWrite: !isTrans
    });
    ret.colorManager = colorManager;
    return ret;
}
LDR.Colors.logoPositions = [
    [-2, -4, 2, -5, 2, -3.5],
    [0, -1, 0, -2.5],
    [-2, 0, -2, -2, 2, -3, 2, -1], ,
    [-1.5, 2.25,
        -2, 1.5, -1.5, 0.5, 1.5, -0.25,
        2, 0.5, 1.5, 1.5, 0, 2, 0, 1
    ],
    [-1.5, 4.75,
        -2, 4, -1.5, 3, 1.5, 2.25,
        2, 3, 1.5, 4, -1.5, 4.75
    ]
];
LDR.Colors.logoCurves = [
    [-1.5, 0.5, -2, 1.5, -1.5, 2.25],
    [1.5, -0.25, 2, 0.5, 1.5, 1.5],
    [-1.5, 3, -2, 4, -1.5, 4.75],
    [1.5, 2.25, 2, 3, 1.5, 4]
];
LDR.Colors.createRandomTexture = function (damage, waves, waveSize, speckle) {
    let size = 512;
    let canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    size--;
    let d = [];
    for (let i = size * size; i > 0; i--) {
        d.push(128);
    }
    let random = [];
    for (let i = 0; i < 3; i++) {
        random.push(0.6 + 0.8 * Math.random());
    }
    let pos = 0;
    if (waveSize > 0) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let X = x + x * Math.sin(x * 5 * random[0] / size);
                let V = random[1] * X + random[2] * y;
                d[pos++] += Math.cos(Math.PI * waves * V / size) * waveSize;
            }
        }
    }
    for (let i = 0; i < damage; i++) {
        let x0 = Math.floor(size * Math.random()),
            y0 = Math.floor(size * Math.random());
        let angle = Math.PI * 2 * Math.random();
        let len = size * 0.05 * Math.random();
        let debth = 0.01 * Math.random();
        for (let j = 0; j < len; j++) {
            let x = Math.floor(x0 + Math.cos(angle) * j);
            let y = Math.floor(y0 + Math.sin(angle) * j);
            d[x * size + y - size - 1] -= debth;
            d[x * size + y - size] -= debth;
            d[x * size + y - size + 1] -= debth;
            d[x * size + y - 1] -= debth;
            d[x * size + y + 1] -= debth;
            d[x * size + y + size - 1] -= debth;
            d[x * size + y + size] -= debth;
            d[x * size + y + size + 1] -= debth;
        }
        debth *= 2;
        for (let j = 0; j < len; j++) {
            let x = Math.floor(x0 + Math.cos(angle) * j);
            let y = Math.floor(y0 + Math.sin(angle) * j);
            d[x * size + y] -= debth;
        }
    }
    let ctx = canvas.getContext("2d");
    pos = 0;
    for (let y = 1; y < size; y++) {
        for (let x = 1; x < size; x++) {
            let a = [-size - 1, -size, -size + 1, -1, 0, 1, size - 1, size, size + 1].map(v => d[pos + v]);
            let v = new THREE.Vector3(-(a[2] + a[8] - a[6] - a[0] + 2 * (a[5] - a[3])),
                (a[6] + a[8] - a[2] - a[0] + 2 * (a[7] - a[1])),
                1);
            v.normalize().multiplyScalar(128).addScalar(128);
            ctx.fillStyle = 'rgb(' + Math.round(v.x) + ',' + Math.round(v.y) + ',' + Math.round(v.z) + ')';
            ctx.fillRect(x, y, 1, 1);
            pos++;
        }
        pos++;
    }
    if (speckle) {
        ctx.fillStyle = 'rgb(0,0,0)';
        const SPECKLE_MULT = 0.9;
        let speckleSize = (speckle.minSize + speckle.maxSize) * SPECKLE_MULT * SPECKLE_MULT;
        let numSpeckles = Math.floor(size * size * speckle.fraction / speckleSize);
        console.log('Applying ' + numSpeckles + ' speckles of average size ' + speckleSize);
        for (let i = 0; i < numSpeckles; i++) {
            ctx.rotate(1);
            let x = size * Math.random();
            let y = size * Math.random();
            let diam = SPECKLE_MULT * (speckle.minSize + Math.random() * (speckle.maxSize - speckle.minSize));
            ctx.fillRect(x, y, diam, diam);
        }
        ctx.rotate(-numSpeckles);
    }
    const LETTER_DX = 2;
    const LETTER_DZ = 5;
    const M = size / 40;
    const r = size / 400,
        R = r * 2.5;
    const rr = r * r,
        RR = R * R;
    let damper = 1;
    let clamp = (x, min, max) => x < min ? min : (x > max ? max : x);
    let toRG = x => Math.round(128 + 127 * x / R * damper);
    let toB = x => Math.round(128 + 127 * x / R);
    const SIZE4 = size / 4;
    LDR.Colors.logoPositions.forEach(letter => {
        for (let i = 0; i < letter.length; i += 2) {
            let X0 = Math.round(SIZE4 + letter[i + 1] * M);
            let Y0 = Math.round(SIZE4 + letter[i] * M);
            for (let dx = -Math.ceil(R); dx <= R; dx++) {
                let dxdx = dx * dx;
                let maxDY = Math.floor(Math.sqrt(RR - dxdx));
                for (let dy = -maxDY; dy <= maxDY; dy++) {
                    let distSq = dxdx + dy * dy;
                    damper = distSq < rr ? 1 : (RR - distSq) / (RR - rr);
                    let dz = R - Math.sqrt(distSq) * damper;
                    ctx.fillStyle = 'rgb(' + toRG(dx) + ',' + toRG(-dy) + ',' + toB(dz) + ')';
                    ctx.fillRect(X0 + dx, Y0 + dy, 1, 1);
                }
            }
        }
        for (let i = 2; i < letter.length; i += 2) {
            let x1 = letter[i - 1],
                y1 = letter[i - 2],
                x2 = letter[i + 1],
                y2 = letter[i];
            if (y1 === y2) {
                if (x1 > x2) {
                    let tmp = x1;
                    x1 = x2;
                    x2 = tmp;
                    tmp = y1;
                    y1 = y2;
                    y2 = tmp;
                }
                let X1 = Math.ceil(SIZE4 + x1 * M),
                    Y1 = Math.round(SIZE4 + y1 * M);
                let DX = Math.ceil(SIZE4 + x2 * M - X1);
                for (let dy = -Math.floor(R); dy <= R; dy++) {
                    let dydy = dy * dy;
                    damper = dydy < rr ? 1 : (RR - dydy) / (RR - rr);
                    let dz = R + (dy < 0 ? dy : -dy) * damper;
                    ctx.fillStyle = 'rgb(128,' + toRG(-dy) + ',' + toB(dz) + ')';
                    ctx.fillRect(X1, Y1 + dy, DX, 1);
                }
            } else {
                if (y1 > y2) {
                    let tmp = x1;
                    x1 = x2;
                    x2 = tmp;
                    tmp = y1;
                    y1 = y2;
                    y2 = tmp;
                }
                let X1 = Math.round(SIZE4 + x1 * M),
                    Y1 = Math.round(SIZE4 + y1 * M);
                let X2 = Math.round(SIZE4 + x2 * M),
                    Y2 = Math.round(SIZE4 + y2 * M);
                let DX = X2 - X1,
                    DY = Y2 - Y1;
                let X1X2 = Math.sqrt(DY * DY + DX * DX);
                let normalizedDX = DX / X1X2;
                let normalizedDY = -DY / X1X2;
                let distance = (x, y) => (DY * x - DX * y + X2 * Y1 - Y2 * X1) / X1X2;
                const SLOPE = (x2 - x1) / (y2 - y1);
                for (let Y = Y1; Y < Y2; Y++) {
                    let X = X1 + SLOPE * (Y - Y1);
                    for (let x = Math.floor(X - R) - 1; x < X + R + 1; x++) {
                        let apy = X1 - x;
                        let apx = Y1 - Y;
                        let scalar = apx * normalizedDX + apy * normalizedDY;
                        let dx = normalizedDX * scalar;
                        let dy = normalizedDY * scalar;
                        let distSq = dx * dx + dy * dy;
                        if (distSq <= RR) {
                            damper = distSq < rr ? 1 : (RR - distSq) / (RR - rr);
                            let dz = R - Math.sqrt(distSq) * damper;
                            ctx.fillStyle = 'rgb(' + toRG(-dy) + ',' + toRG(dx) + ',' + toB(dz) + ')';
                            ctx.fillRect(x, Y, 1, 1);
                        }
                    }
                }
            }
        }
    });
    LDR.Colors.logoCurves.forEach(curve => {
        let [y1, x1, y2, x2, y3, x3] = curve.map(x => SIZE4 + x * M);
        let [yMin, yMax] = y1 < y2 ? [y1, y2 + R] : [y2 - R, y1];
        let [xMin, xMax] = x1 < x3 ? [x1 - R, x3 + R] : [x3 - R, x1 + R];
        let [xMid, yMid] = [(x1 + x3) / 2, y1];
        let rX = 1.1 * Math.abs(x1 - x3) * 0.5;
        let rY = Math.abs(y2 - y1);
        let sigma = y2 > y1 ? -1 : 1;
        for (let y = Math.floor(yMin); y <= yMax; y++) {
            for (let x = Math.floor(xMin); x <= xMax; x++) {
                let [dx, dy] = [x - xMid, y - yMid];
                let DX = dx + Math.abs(x2 - xMid) * (y - y1) / (yMax - yMin);
                let DY = dy - sigma * (rX - rY);
                let dxdy = Math.sqrt(DX * DX + DY * DY);
                let dR = rX - dxdy;
                let distSq = dR * dR;
                if (distSq > 2 * RR) {
                    continue;
                }
                dx = (DX / dxdy) * dR;
                dy = (DY / dxdy) * dR;
                damper = distSq < rr ? 1 : clamp((RR - distSq) / (RR - rr), 0, 1);
                let dz = R - Math.sqrt(distSq) * damper;
                ctx.fillStyle = 'rgb(' + toRG(-dx) + ',' + toRG(dy) + ',' + toB(dz) + ')';
                ctx.fillRect(x, y, 1, 1);
            }
        }
    });
    size = (size + 1) / 2 - 1;
    let sides = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1]
    ];
    sides.forEach(side => {
        ctx.translate((size + 1) * side[0], (size + 1) * side[1]);
        let edgeDiff = 120,
            low = 128 - edgeDiff,
            high = 128 + edgeDiff,
            low2 = (128 + low) / 2,
            high2 = (128 + high) / 2;
        let cornerB = ',180)';
        ctx.fillStyle = 'rgb(' + low + ',128,255)';
        ctx.fillRect(0, 1, 1, size - 1);
        ctx.fillStyle = 'rgb(' + low2 + ',' + high2 + cornerB;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = 'rgb(128,' + high + ',255)';
        ctx.fillRect(1, 0, size - 1, 1);
        ctx.fillStyle = 'rgb(' + high2 + ',' + high2 + cornerB;
        ctx.fillRect(0, size, 1, 1);
        ctx.fillStyle = 'rgb(' + high + ',128,255)';
        ctx.fillRect(size, 0, 1, size);
        ctx.fillStyle = 'rgb(' + high2 + ',' + low2 + cornerB;
        ctx.fillRect(size, size, 1, 1);
        ctx.fillStyle = 'rgb(128,' + low + ',255)';
        ctx.fillRect(0, size, size, 1);
        ctx.fillStyle = 'rgb(' + low2 + ',' + low2 + cornerB;
        ctx.fillRect(size, 0, 1, 1);
    });
    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}
LDR.Colors.envMapPrefix = 'textures/cube/';
LDR.Colors.textureMaterialPrefix = 'textures/materials/';
LDR.Colors.listeningMaterials = {
    trans: [],
    opaque: [],
    pearl: [],
    rubber: [],
    metal: [],
    speckle: {}
};
LDR.Colors.speckleInfo = {};
LDR.Colors.loadEnvMapTextures = function (render) {
    function updateEnvMapsForList(reflectionCube, list) {
        list.forEach(material => {
            material.envMap = reflectionCube;
            material.needsUpdate = true;
        });
    }

    function updateEnvMaps(reflectionCube) {
        updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.trans);
        updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.opaque);
        updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.pearl);
        updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.rubber);
        updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.metal);
        for (let colorID in LDR.Colors.listeningMaterials.speckle) {
            if (LDR.Colors.listeningMaterials.speckle.hasOwnProperty(colorID)) {
                updateEnvMapsForList(reflectionCube, LDR.Colors.listeningMaterials.speckle[colorID]);
            }
        }
        LDR.Colors.reflectionCube = reflectionCube;
        render();
    }
    if (LDR.Colors.reflectionCube) {
        updateEnvMaps(LDR.Colors.reflectionCube);
    } else {
        let sides = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
        new THREE.CubeTextureLoader().load(sides.map(x => LDR.Colors.envMapPrefix + x + '.jpg'), updateEnvMaps);
    }
}
LDR.Colors.loadTextures = function (render) {
    LDR.Colors.loadEnvMapTextures(render);
    let textureLoader = new THREE.TextureLoader();
    textureLoader.setPath(LDR.Colors.textureMaterialPrefix);

    function updateNormalMapsForList(t, list) {
        list.forEach(material => {
            material.normalMap = t;
            material.needsUpdate = true;
            render()
        });
    }

    function setNormalMapsForList(l, textureName) {
        if (l.length === 0) {
            return;
        }
        if (l.t) {
            updateNormalMapsForList(t, l);
        } else {
            textureLoader.load(textureName, t => updateNormalMapsForList(t, l));
        }
    }
    setNormalMapsForList(LDR.Colors.listeningMaterials.trans, 'abs.png');
    setNormalMapsForList(LDR.Colors.listeningMaterials.opaque, 'abs.png');
    setNormalMapsForList(LDR.Colors.listeningMaterials.pearl, 'pearl.png');
    setNormalMapsForList(LDR.Colors.listeningMaterials.rubber, 'rubber.png');
    setNormalMapsForList(LDR.Colors.listeningMaterials.metal, 'metal.png');
    for (let colorID in LDR.Colors.listeningMaterials.speckle) {
        if (LDR.Colors.listeningMaterials.speckle.hasOwnProperty(colorID)) {
            let s = LDR.Colors.speckleInfo[colorID];
            setNormalMapsForList(LDR.Colors.listeningMaterials.speckle[colorID], 'speckle.png');
        }
    }
}
LDR.Colors.generateTextures = function (render) {
    LDR.Colors.loadEnvMapTextures(render);

    function updateNormalMapsForList(t, list) {
        list.forEach(material => {
            material.normalMap = t;
            material.needsUpdate = true;
        });
    }

    function setNormalMapsForList(l, createTexture) {
        if (l.length === 0) {
            return;
        }
        let t = l.t || createTexture();
        l.t = t;
        updateNormalMapsForList(t, l);
    }
    setNormalMapsForList(LDR.Colors.listeningMaterials.trans,
        () => LDR.Colors.createRandomTexture(5, 1.4, 0.1));
    setNormalMapsForList(LDR.Colors.listeningMaterials.opaque,
        () => LDR.Colors.createRandomTexture(10, 1, 0.2));
    setNormalMapsForList(LDR.Colors.listeningMaterials.pearl,
        () => LDR.Colors.createRandomTexture(20, 2.5, 0.05));
    setNormalMapsForList(LDR.Colors.listeningMaterials.rubber,
        () => LDR.Colors.createRandomTexture(10, 0.3, 0.1));
    setNormalMapsForList(LDR.Colors.listeningMaterials.metal,
        () => LDR.Colors.createRandomTexture(100, 0.6, 1.6));
    for (let colorID in LDR.Colors.listeningMaterials.speckle) {
        if (LDR.Colors.listeningMaterials.speckle.hasOwnProperty(colorID)) {
            let s = LDR.Colors.speckleInfo[colorID];
            setNormalMapsForList(LDR.Colors.listeningMaterials.speckle[colorID],
                () => LDR.Colors.createRandomTexture(5, 1.4, 0.1, s));
        }
    }
    render();
}
LDR.Colors.buildStandardMaterial = function (colorID, texmap) {
    let color = LDR.Colors[colorID < 0 ? (-colorID - 1) : colorID];
    if (color.m && !texmap) {
        return color.m;
    }
    let registerTextureListener = () => {};
    let createMaterial = p => new THREE.MeshPhongMaterial(p);
    let params = {
        color: colorID < 0 ? (color.edge ? color.edge : 0x333333) : color.value,
        name: 'Material for color ' + color.name + ' (' + colorID + ')' + (texmap ? ' with texmap' : ''),
    };
    if (texmap) {
        params.color = 0xFFFFFF;
        if (texmap !== true) {
            params.map = texmap;
        }
    }
    if (color.material) {
        createMaterial = p => new THREE.MeshStandardMaterial(p);
        params.metalness = 0.0;
        params.roughness = 0.1;
        params.envMapIntensity = 0.35;
        if (color.material === 'CHROME' || color.material === 'METAL') {
            params.metalness = 1.0;
            params.roughness = 0.25;
            registerTextureListener = m => LDR.Colors.listeningMaterials.metal.push(m);
            params.envMapIntensity = 1.0;
        } else if (color.material === 'RUBBER') {
            params.roughness = 0.9;
            registerTextureListener = m => LDR.Colors.listeningMaterials.rubber.push(m);
        } else if (color.material === 'PEARLESCENT') {
            registerTextureListener = m => LDR.Colors.listeningMaterials.pearl.push(m);
            params.roughness = 0.01;
        } else if (color.material.startsWith('MATERIAL ')) {
            params.roughness = 0.0;
            params.envMapIntensity = 1.0;
            let m = color.material.substring('MATERIAL '.length);
            if (m.startsWith('SPECKLE FRACTION ')) {
                m = m.substring('SPECKLE FRACTION '.length).split(' ');
                if (m.length === 5) {
                    if (!LDR.Colors.speckleInfo.hasOwnProperty(colorID)) {
                        let fraction = parseFloat(m[0]);
                        let minSize = parseInt(m[2]);
                        let maxSize = parseInt(m[4]);
                        LDR.Colors.speckleInfo[colorID] = {
                            fraction: fraction,
                            minSize: minSize,
                            maxSize: maxSize
                        };
                        LDR.Colors.listeningMaterials.speckle[colorID] = [];
                    }
                    registerTextureListener = m => LDR.Colors.listeningMaterials.speckle[colorID].push(m);
                } else {
                    console.warn('Failed to parse speckle definition for color ' + colorID + ': ' + m.join('/'));
                }
            } else if (m.startsWith('GLITTER FRACTION ')) {
                m = m.substring('GLITTER FRACTION '.length).split(' ');
                if (m.length === 5) {
                    if (!LDR.Colors.speckleInfo.hasOwnProperty(colorID)) {
                        let fraction = parseFloat(m[0]);
                        let size = parseInt(m[4]);
                        LDR.Colors.speckleInfo[colorID] = {
                            fraction: fraction,
                            minSize: size,
                            maxSize: size
                        };
                        LDR.Colors.listeningMaterials.speckle[colorID] = [];
                    }
                    registerTextureListener = m => LDR.Colors.listeningMaterials.speckle[colorID].push(m);
                } else {
                    console.warn('Failed to parse glitter definition for color ' + colorID + ': ' + m.join('/'));
                }
            } else {
                console.warn('Unknown material for color ' + colorID + ': ' + m);
            }
        } else {
            console.warn('Unknown material composition for color ' + colorID + ' -> ' + color.material);
        }
    } else if (colorID === 0) {
        registerTextureListener = m => LDR.Colors.listeningMaterials.opaque.push(m);
        params.specular = 0xFFFFFF;
        params.shininess = 82;
        params.reflectivity = 0.9;
    } else if (color.alpha > 0) {
        registerTextureListener = m => LDR.Colors.listeningMaterials.trans.push(m);
        params.shininess = 100;
        params.reflectivity = 0.8;
    } else {
        registerTextureListener = m => LDR.Colors.listeningMaterials.opaque.push(m);
        params.shininess = 100;
        params.reflectivity = 0.1;
    }
    let m = createMaterial(params);
    if (texmap) {
        m.transparent = true;
        m.depthWrite = false;
    } else {
        registerTextureListener(m);
    }
    if (color.alpha > 0) {
        m.transparent = true;
        m.depthWrite = false;
        m.opacity = color.alpha / 255;
        //https://stackoverflow.com/questions/26588568/volume-rendering-in-webgl and https://threejs.org/examples/webgl2_materials_texture3d.html
    }
    if (color.luminance > 0) {
        console.warn('Emissive materials not yet supported. Color: ' + colorID);
    }
    if (!texmap) {
        color.m = m;
    }
    return m;
}
LDR.SVG = LDR.SVG || {};
LDR.SVG.NS = 'http://www.w3.org/2000/svg';
LDR.SVG.makeLeftArrow = function (withCircle) {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 100 100");
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    ret.appendChild(g);
    let pts = "20,50 50,20 50,35 80,35 80,65 50,65 50,80";
    let poly = LDR.SVG.makePolygon(pts);
    g.appendChild(poly);
    if (withCircle) {
        g.appendChild(LDR.SVG.makeCircle(50, 50, 49));
    }
    return ret;
}
LDR.SVG.makeRightArrowLarge = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("class", "next_large");
    ret.setAttribute("viewBox", "0 0 200 200");
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    ret.appendChild(g);
    let pts = "160,100 100,40 100,70 40,70 40,130 100,130 100,160";
    let poly = LDR.SVG.makePolygon(pts);
    g.appendChild(poly);
    g.appendChild(LDR.SVG.makeCircle(100, 100, 99));
    return ret;
}
LDR.SVG.makeRightArrow = function (withCircle) {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("class", "next_normal");
    ret.setAttribute("viewBox", "0 0 100 100");
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    ret.appendChild(g);
    let pts = "80,50 50,20 50,35 20,35 20,65 50,65 50,80";
    let poly = LDR.SVG.makePolygon(pts);
    g.appendChild(poly);
    if (withCircle) {
        g.appendChild(LDR.SVG.makeCircle(50, 50, 49));
    }
    return ret;
}
LDR.SVG.makeCheckMark = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("class", "done");
    ret.setAttribute("viewBox", "-75 -75 150 150");
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    ret.appendChild(g);
    let path = document.createElementNS(LDR.SVG.NS, 'path');
    path.setAttribute("d", "M-48 -5L-35 -15L-20 10L35-48L48-35L-20 50Z");
    path.setAttribute("fill", "#4B4");
    g.appendChild(path);
    g.appendChild(LDR.SVG.makeCircle(0, 0, 74));
    return ret;
}
LDR.SVG.makeUpArrow = function () {
    let pts = "50,20 80,50 65,50 65,80 35,80 35,50 20,50";
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 100 100");
    let poly = LDR.SVG.makePolygon(pts);
    ret.appendChild(poly);
    return ret;
}
LDR.SVG.makeZoom = function (verticalLine, mult) {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 " + (mult * 50) + " " + (50 * mult));
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    ret.appendChild(g);
    g.appendChild(LDR.SVG.makeLine(mult * 10, mult * 25, mult * 40, mult * 25));
    if (verticalLine)
        g.appendChild(LDR.SVG.makeLine(mult * 25, mult * 10, mult * 25, mult * 40));
    g.appendChild(LDR.SVG.makeCircle(mult * 25, mult * 25, mult * 25 - 1));
    return ret;
}
LDR.SVG.makeCamera = function (x, y, w) {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 " + w + " " + w);
    ret.appendChild(LDR.SVG.makeRect(x - w / 3, y - w / 6, w / 2, w / 3));
    let pts = (x - w / 3 + w / 2) + "," + (y - w / 10) + " " +
        (x + w / 3) + "," + (y - w / 6) + " " +
        (x + w / 3) + "," + (y + w / 6) + " " +
        (x - w / 3 + w / 2) + "," + (y + w / 10);
    ret.appendChild(LDR.SVG.makePolygon(pts));
    ret.appendChild(LDR.SVG.makeRect(x - w / 8, y + w / 6, w / 10, w / 4));
    ret.appendChild(LDR.SVG.makeCircle(x - w / 5, y, w / 14));
    ret.appendChild(LDR.SVG.makeCircle(x + w / 24, y, w / 14));
    ret.appendChild(LDR.SVG.makeLine(x - w / 5, y - w / 14, x + w / 24, y - w / 15));
    ret.appendChild(LDR.SVG.makeCircle(x, y + 5, w / 2.1));
    return ret;
}
LDR.SVG.makeHome = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 100 100");
    let edgePoints = "50,20 80,50 75,50 75,80 25,80 25,50 20,50";
    ret.appendChild(LDR.SVG.makePolygon(edgePoints));
    ret.appendChild(LDR.SVG.makeRect(30, 50, 18, 30));
    ret.appendChild(LDR.SVG.makeRect(53, 50, 16, 16));
    return ret;
}
LDR.SVG.makeUpAndBack = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "0 0 100 100");
    let edgePoints = "30,37.5 45,20 45,30 80,30 80,80 65,80 65,45 45,45 45,55";
    ret.appendChild(LDR.SVG.makePolygon(edgePoints));
    return ret;
}
LDR.SVG.makeListIcon = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute('viewBox', '0 0 100 100');
    let startY = 19;
    for (let i = 0; i < 5; i++) {
        let line = LDR.SVG.makeLine(10, startY + i * 16, 90, startY + i * 16);
        ret.appendChild(line);
    }
    return ret;
}
LDR.SVG.makeBigIconsIcon = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute('viewBox', '0 0 100 100');
    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            let rect = LDR.SVG.makeRect(x * 46 + 7, y * 46 + 7, 40, 40);
            rect.setAttribute('rx', '4');
            rect.setAttribute('ry', '4');
            ret.appendChild(rect);
        }
    }
    return ret;
}
LDR.SVG.makeOptions = function () {
    let ret = document.createElement('a');
    ret.setAttribute('href', '#options');
    let svg = document.createElementNS(LDR.SVG.NS, 'svg');
    svg.setAttribute("viewBox", "0 0 100 100");
    ret.appendChild(svg);
    LDR.SVG.makeGear(58, 43, 22, 18, svg);
    LDR.SVG.makeGear(35, 66, 14, 12, svg);
    return ret;
}
LDR.SVG.makePolygon = function (pts) {
    let poly = document.createElementNS(LDR.SVG.NS, 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    return poly;
}
LDR.SVG.makePolyLine = function (pts) {
    let poly = document.createElementNS(LDR.SVG.NS, 'polyline');
    poly.setAttribute('points', pts);
    return poly;
}
LDR.SVG.makeTriangle = function (sideX, pointX) {
    let pts = sideX + ",20 " + sideX + ",80" + " " + pointX + ",50";
    return LDR.SVG.makePolygon(pts);
}
LDR.SVG.makeLine = function (x1, y1, x2, y2, forceStroke) {
    let ret = document.createElementNS(LDR.SVG.NS, 'line');
    if (forceStroke) {
        ret.setAttribute('stroke', 'black');
    }
    ret.setAttribute('x1', x1);
    ret.setAttribute('y1', y1);
    ret.setAttribute('x2', x2);
    ret.setAttribute('y2', y2);
    return ret;
}
LDR.SVG.makeCross = function (parent, x, y, r) {
    parent.append(LDR.SVG.makeLine(x - r, y - r, x + r, y + r));
    parent.append(LDR.SVG.makeLine(x - r, y + r, x + r, y - r));
}
LDR.SVG.makePlus = function (parent, x, y, r) {
    parent.append(LDR.SVG.makeLine(x, y - r, x, y + r));
    parent.append(LDR.SVG.makeLine(x - r, y, x + r, y));
}
LDR.SVG.makeRect = function (x, y, w, h, fill, color) {
    let ret = document.createElementNS(LDR.SVG.NS, 'rect');
    ret.setAttribute('x', x);
    ret.setAttribute('y', y);
    ret.setAttribute('width', w);
    ret.setAttribute('height', h);
    if (!fill) {
        ret.setAttribute('fill', 'none');
    }
    if (color) {
        ret.setAttribute('stroke', color);
    }
    return ret;
}
LDR.SVG.makeRoundRect = function (x, y, w, h, r) {
    let ret = LDR.SVG.makeRect(x, y, w, h);
    ret.setAttribute('class', 'show');
    ret.setAttribute('rx', r);
    ret.setAttribute('ry', r);
    return ret;
}
LDR.SVG.makeCircle = function (x, y, r, forceStroke) {
    let ret = document.createElementNS(LDR.SVG.NS, 'circle');
    if (forceStroke)
        ret.setAttribute('stroke', 'black');
    ret.setAttribute('cx', x);
    ret.setAttribute('cy', y);
    ret.setAttribute('r', r);
    ret.setAttribute('fill', 'none');
    return ret;
}
LDR.SVG.appendRotationCircle = function (x, y, r, svg) {
    let d = r / 3;
    let circle = LDR.SVG.makeCircle(x, y, r, true);
    circle.setAttribute('stroke-dasharray', "0,10,45,10,50");
    svg.appendChild(circle);
    svg.appendChild(LDR.SVG.makeLine(x - r, y, x - r - d, y + d, true));
    svg.appendChild(LDR.SVG.makeLine(x - r, y, x - r + d, y + d, true));
    svg.appendChild(LDR.SVG.makeLine(x + r, y, x + r - d, y - d, true));
    svg.appendChild(LDR.SVG.makeLine(x + r, y, x + r + d, y - d, true));
}
LDR.SVG.makeGear = function (x, y, r, t, svg) {
    svg.appendChild(LDR.SVG.makeGearCrown(x, y, r, r - 4.5, 0.1, 0.1, t));
    svg.appendChild(LDR.SVG.makeCrossAxleHole(x, y));
    if (r > 20) {
        svg.appendChild(LDR.SVG.makeCircle(x, y, r * 0.55));
    }
}
LDR.SVG.makeGearCrown = function (x, y, ro, ri, ao, ai, t) {
    let a = (2 * Math.PI / t - ai - ao) / 2;
    let pts = "M" + (x + ro) + " " + y + " ";
    let angles = [a, ai, a, ao];
    let radii = [ri, ri, ro, ro];
    for (let i = 0; i < t; i++) {
        let A = Math.PI * 2 / t * i;
        for (let j = 0; j < 4; j++) {
            A += angles[j];
            pts += "L" + (x + radii[j] * Math.cos(A)) + " " + (y + radii[j] * Math.sin(A)) + " ";
        }
    }
    pts += "Z";
    let ret = document.createElementNS(LDR.SVG.NS, 'path');
    ret.setAttribute('d', pts);
    ret.setAttribute('fill', 'none');
    return ret;
}
LDR.SVG.makeCrossAxleHole = function (x, y) {
    let d = 3;
    let D = 1.5 * d;
    let pts = "M" + (x + d) + " " + (y - d - D / 2) +
        " v" + d + " h" + d + " v" + D +
        " h-" + d + " v" + d + " h-" + D +
        " v-" + d + " h-" + d + " v-" + D +
        " h" + d + " v-" + d + " Z";
    let ret = document.createElementNS(LDR.SVG.NS, 'path');
    ret.setAttribute('d', pts);
    ret.setAttribute('fill', 'none');
    return ret;
}
LDR.SVG.makeOffIcon = function (x, y, w) {
    let d = w / 10;
    let D = w / 2 - 2 * d;
    let pts = "M" + (x - D - d) + " " + (y - D) +
        " l" + d + " -" + d + " l" + D + " " + D + " l" + D + " -" + D + " l" + d + " " + d +
        " l-" + D + " " + D + " l" + D + " " + D +
        " l-" + d + " " + d + " l-" + D + " -" + D + " l-" + D + " " + D + " l-" + d + " -" + d +
        " l" + D + " -" + D + " Z";
    let ret = document.createElementNS(LDR.SVG.NS, 'path');
    ret.setAttribute('d', pts);
    ret.setAttribute('fill', 'none');
    return ret;
}
LDR.SVG.makeArrow = function (x1, y1, x2, y2, svg, includeBase) {
    svg.append(LDR.SVG.makeLine(x1, y1, x2, y2, true));
    let dx = (x2 - x1) * 0.3,
        dy = (y2 - y1) * 0.3;
    let x3 = x2 - dx,
        y3 = y2 - dy;
    svg.append(LDR.SVG.makeLine(x2, y2, x3 - dy, y3 - dx, true));
    svg.append(LDR.SVG.makeLine(x2, y2, x3 + dy, y3 + dx, true));
    if (includeBase) {
        svg.append(LDR.SVG.makeLine(x1 + dy, y1 + dx, x1 - dy, y1 - dx, true));
    }
}
LDR.SVG.makeBlock3D = function (x, y, parent) {
    let dx2 = 15,
        dy = 25,
        dy2 = dy * 0.3;
    let pts1 = 'M ' + x + ' ' + (y - dy / 2 + dy2) +
        ' l' + dx2 + ' -' + dy2 +
        ' v' + dy +
        ' l-' + dx2 + ' ' + dy2 +
        ' l-' + dx2 + ' -' + dy2 +
        ' v-' + dy +
        ' l' + dx2 + ' ' + dy2 +
        ' v' + dy +
        ' M ' + (x - dx2) + ' ' + (y - dy / 2) +
        ' l' + dx2 + ' -' + dy2 +
        ' l' + dx2 + ' ' + dy2 +
        ' l-' + dx2 + ' ' + dy2 +
        ' Z';
    let p = document.createElementNS(LDR.SVG.NS, 'path');
    p.setAttribute('d', pts1);
    parent.appendChild(p);
}
LDR.SVG.makeEdit = function () {
    let ret = document.createElementNS(LDR.SVG.NS, 'svg');
    ret.setAttribute("viewBox", "-50 -50 100 100");
    let g = document.createElementNS(LDR.SVG.NS, 'g');
    g.setAttribute('transform', 'matrix(0.6 0.5 -0.5 0.6 15 -15)');
    ret.appendChild(g);
    LDR.SVG.makePencil(6, 60, g);
    let pts = "M10,-25 -20,-25 -20,25 20,25 20,-10";
    let p = document.createElementNS(LDR.SVG.NS, 'path');
    p.setAttribute('d', pts);
    ret.appendChild(p);
    return ret;
}
LDR.SVG.makePencil = function (w, h, parent) {
    let h2 = h / 2,
        h6 = h / 6,
        w2 = w / 2;
    let pts = 'M-' + w2 + ' -' + (h2 - h6) + ' h' + w + ' v-' + h6 + ' h-' + w + ' v' + h +
        ' l ' + w2 + ' ' + h6 + ' l ' + w2 + ' -' + h6 + ' v-' + h;
    let p = document.createElementNS(LDR.SVG.NS, 'path');
    p.setAttribute('d', pts);
    parent.appendChild(p);
}
LDR.Options = {};
LDR.Options.initialize = function () {
    this.listeners = [];
    this.showOldColors = 0;
    this.lineContrast = 1;
    this.bgColor = 0xFFFFFF;
    this.pointColor = 0xFF0000;
    this.pointSize = 2;
    this.lineColor = 0x333333;
    this.oldColor = 0xFFFF6F;
    this.showLRButtons = 0;
    this.showCameraButtons = 1;
    this.showStepRotationAnimations = 1;
    this.partsListType = 0;
    this.showNotes = 0;
    this.showPLI = 1;
    this.rotateModel = 0;
    this.showEditor = 0;
    this.studHighContrast = 0;
    this.studLogo = 0;
    if (document.cookie) {
        let cookieParts = decodeURIComponent(document.cookie).split(/\s*;\s*/);
        for (let i = 0; i < cookieParts.length; i++) {
            let part = cookieParts[i];
            let equalAt = part.indexOf('=');
            if (equalAt > 1) {
                let key = part.substring(0, equalAt);
                if (this[key] != undefined)
                    this[key] = parseInt(part.substring(equalAt + 1));
            }
        }
    }
    let options = this;
    this.onChange = function (partGeometriesChanged) {
        for (let i = 0; i < options.listeners.length; i++) {
            options.listeners[i](partGeometriesChanged);
        }
        options.saveOptionsToCookie();
    }
}
LDR.Options.initialize();
LDR.Options.saveOptionsToCookie = function () {
    let options = this;

    function addToKv(v) {
        document.cookie = v + '=' + options[v] + '; SameSite; expires=Wed, 3 Jun 2122 12:00:01 UTC; path=/';
    }
    addToKv("showOldColors");
    addToKv("lineContrast");
    addToKv("showPartsCallouts");
    addToKv("showStepRotationAnimations");
    addToKv("showLRButtons");
    addToKv("showEditor");
    addToKv("studHighContrast");
    addToKv("studLogo");
    addToKv("partsListType");
    addToKv("showNotes");
    addToKv("rotateModel");
    addToKv("pointColor");
    addToKv("pointSize");
    addToKv("bgColor");
}
LDR.Options.setOptionsSelected = function (node, callback) {
    let parent = node.parentNode;
    let children = parent.childNodes;
    for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (child === node) {
            callback(i);
            if (child.getAttribute('class') === 'option')
                child.setAttribute('class', 'option_selected');
        } else {
            if (child.getAttribute('class') === 'option_selected')
                child.setAttribute('class', 'option');
        }
    }
}
LDR.Options.appendHeader = function (optionsBlock) {
    let headerDiv = document.createElement('div');
    headerDiv.setAttribute('id', 'options_header');
    optionsBlock.appendChild(headerDiv);
    let toTop = document.createElement('a');
    toTop.setAttribute('href', '#');
    toTop.appendChild(LDR.SVG.makeUpArrow());
    toTop.id = 'to_top';
    optionsBlock.append(toTop);
    window.onscroll = function () {
        let boundary = window.innerHeight * 0.8;
        if (document.body.scrollTop > boundary ||
            document.documentElement.scrollTop > boundary) {
            toTop.style.display = "block";
        } else {
            toTop.style.display = "none";
        }
    }
    headerDiv.appendChild(LDR.SVG.makeOptions());
}
LDR.Options.appendFooter = function (optionsBlock) {
    let div = document.createElement('div');
    div.setAttribute('class', 'options_footer');
    let a = document.createElement('a');
    a.setAttribute('href', '#top');
    optionsBlock.appendChild(div);
    div.appendChild(a);
    a.appendChild(LDR.SVG.makeUpArrow());
}
LDR.Options.appendDescriptionBar = function (optionsBlock, columns, description) {
    let tr = document.createElement('tr');
    tr.setAttribute('class', 'options_description_header');
    optionsBlock.appendChild(tr);
    let td = document.createElement('td');
    td.setAttribute('class', 'options_description');
    td.setAttribute('colspan', "" + columns);
    tr.appendChild(td);
    let desc = document.createElement('span');
    desc.innerHTML = description;
    td.appendChild(desc);
}
LDR.Options.appendOldBrickColorOptions = function (optionsBlock) {
    let group = this.addOptionsGroup(optionsBlock, 4, "Highlight New Parts");
    let options = this;
    let onOldBrickChange = function (idx) {
        options.showOldColors = idx;
        options.onChange(false);
    };
    let buttons = this.createButtons(group, 4, this.showOldColors, onOldBrickChange);
    let red = () => '#800000';
    let lime = () => '#A0FF00';
    let green = () => '#257A3E';
    let blue = () => '#0055BF';
    let gb = [green, blue];
    let lineColor = options => LDR.Colors.int2Hex(options.lineColor);
    let oldColor = options => LDR.Colors.int2Hex(options.oldColor);
    let svg;

    function drawParts(x, cnt, cntOld, outlineColor) {
        for (let i = 0; i < cnt; i++) {
            options.createSvgBlock(x,
                (-i + 0.5) * LDR.Options.svgBlockHeight,
                i === cnt - 1,
                i < cntOld ? oldColor : gb[i % 2],
                (i == cnt - 1) ? outlineColor : lineColor,
                svg);
        }
    }
    let dst = 60;
    const w = 20;

    function drawBase(idx) {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -40 200 80');
        buttons[idx].appendChild(svg);
        svg.appendChild(LDR.SVG.makeLine(-w, 0, w, 0, true));
        svg.appendChild(LDR.SVG.makeLine(w / 2, w / 2, w, 0, true));
        svg.appendChild(LDR.SVG.makeLine(w / 2, -w / 2, w, 0, true));
        return svg;
    }
    svg = drawBase(0);
    drawParts(-dst, 1, 0, red);
    drawParts(dst, 2, 0, red);
    svg = drawBase(1);
    drawParts(-dst, 1, 0, lime);
    drawParts(dst, 2, 0, lime);
    svg = drawBase(2);
    drawParts(-dst, 1, 0, lineColor);
    drawParts(dst, 2, 0, lineColor);
    svg = drawBase(3);
    drawParts(-dst, 1, 0, lineColor);
    drawParts(dst, 2, 1, lineColor);
}
LDR.Options.appendContrastOptions = function (optionsBlock) {
    let self = this;
    let svg;
    let group = this.addTopOptionsGroup(optionsBlock);
    let onChange = function () {
        self.lineContrast = self.lineContrast === 0 ? 1 : 0;
        if (self.lineContrast === 1) {
            self.lineColor = 0x333333;
        } else {
            self.lineColor = 0;
        }
        self.onChange(false);
        updateSvg();
    };
    let button = this.createButton(group, onChange);
    let red = () => '#C91A09';
    let redEdge1 = () => '#000000';
    let redEdge2 = () => '#333333';
    let black = () => '#05131D';
    let blackEdge1 = () => '#FFFFFF';
    let blackEdge2 = () => '#595959';
    let brown = () => '#582A12';

    function updateSvg() {
        if (svg) {
            button.removeChild(svg);
        }
        svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-60 -30 120 60');
        button.appendChild(svg);
        if (self.lineContrast === 0) {
            self.createSvgBlock(-LDR.Options.svgBlockWidth - 2, 0, true, red, redEdge1, svg);
            self.createSvgBlock(0, 0, true, brown, red, svg);
            self.createSvgBlock(LDR.Options.svgBlockWidth + 2, 0, true, black, blackEdge1, svg);
        } else {
            self.createSvgBlock(-LDR.Options.svgBlockWidth - 2, 0, true, red, redEdge2, svg);
            self.createSvgBlock(0, 0, true, brown, blackEdge2, svg);
            self.createSvgBlock(LDR.Options.svgBlockWidth + 2, 0, true, black, blackEdge2, svg);
        }
    }
    updateSvg();
}
LDR.Options.appendPartColorOptions = function (optionsBlock) {
    let group = this.addOptionsGroup(optionsBlock, 2, "Background and Point Color");
    let options = this;
    let bgColor = function (options) {
        return LDR.Colors.int2Hex(options.bgColor);
    };
    let pointColor = function (options) {
        return LDR.Colors.int2Hex(options.pointColor);
    };
    let oldColor = function (options) {
        return LDR.Colors.int2Hex(options.oldColor);
    };
    let lineColor = function (options) {
        return LDR.Colors.int2Hex(options.lineColor);
    };

    function createPreview(parent, forBG) {
        let preview = document.createElement('td');
        preview.setAttribute('class', 'color_option');
        parent.appendChild(preview);
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -25 200 50');
        preview.appendChild(svg);
        if (forBG)
            options.createSvgBlock(0, 0, true, oldColor, lineColor, svg);
        else
            options.createSvgPoints(0, 0, pointColor, svg, 2);
        let listener = function () {
            svg.style.backgroundColor = bgColor(options);
        };
        options.listeners.push(listener);
        listener();
        return preview;
    }

    function createColorInput(parent, color, onChange) {
        let input = document.createElement('input');
        input.setAttribute('class', 'color_input');
        input.setAttribute('type', 'color');
        input.setAttribute('value', color);
        input.addEventListener("input", onChange, false);
        input.addEventListener("change", onChange, false);
        parent.appendChild(input);
        return input;
    }
    let onChange = function () {
        options.bgColor = parseInt(input1.value.substring(1), 16);
        options.pointColor = parseInt(input2.value.substring(1), 16);
        options.onChange(false);
    }
    let preview1 = createPreview(group, true);
    let input1 = createColorInput(preview1, bgColor(options), onChange);
    let preview2 = createPreview(group, false);
    let input2 = createColorInput(preview2, pointColor(options), onChange);
}
LDR.Options.appendPartPointSizeOptions = function (optionsBlock) {
    let group = this.addOptionsGroup(optionsBlock, 5, "Points");
    let options = this;
    let onChange = function (idx) {
        options.pointSize = idx;
        options.onChange(false);
    };
    let buttons = this.createButtons(group, 5, this.pointSize, onChange);
    let pointColor = function (options) {
        return LDR.Colors.int2Hex(options.pointColor);
    }; {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-25 -25 50 50');
        svg.setAttribute('class', 'ui_toggles');
        svg.appendChild(LDR.SVG.makeOffIcon(0, 0, 50));
        buttons[0].appendChild(svg);
    }
    for (let i = 1; i <= 4; i++) {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-25 -25 50 50');
        options.createSvgPoints(0, 0, pointColor, svg, i);
        buttons[i].appendChild(svg);
    }
}
LDR.Options.appendAnimationOptions = function (optionsBlock) {
    let group = this.addOptionsGroup(optionsBlock, 3, "Animations");
    let options = this;
    let onAnimationChange = function (idx) {
        options.showStepRotationAnimations = idx;
        options.onChange(false);
    };
    let buttons = this.createButtons(group, 3, this.showStepRotationAnimations, onAnimationChange);
    let red = () => '#C91A09';
    let lineColor = () => LDR.Colors.int2Hex(options.lineColor);
    const w = 20; {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -35 200 70');
        buttons[0].appendChild(svg);
        this.createSvgBlock(-50, 0, true, red, lineColor, svg);
        let g1 = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g1);
        LDR.SVG.appendRotationCircle(0, 0, 18, g1);
        let g2 = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g2);
        let turned = this.createSvgBlock(50, 0, true, red, lineColor, g2);
        let a = document.createElementNS(LDR.SVG.NS, 'animateTransform');
        a.setAttribute('id', 'turnerSlow');
        a.setAttribute('attributeName', 'transform');
        a.setAttribute('attributeType', 'XML');
        a.setAttribute('type', 'rotate');
        a.setAttribute('from', '0 50 0');
        a.setAttribute('to', '90 50 0');
        a.setAttribute('dur', '2s');
        a.setAttribute('fill', 'freeze');
        a.setAttribute('begin', '1s;turnerSlow.end+1s');
        g2.appendChild(a);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -35 200 70');
        buttons[1].appendChild(svg);
        this.createSvgBlock(-50, 0, true, red, lineColor, svg);
        let g1 = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g1);
        LDR.SVG.appendRotationCircle(0, 0, 18, g1);
        let g2 = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g2);
        let turned = this.createSvgBlock(50, 0, true, red, lineColor, g2);
        let a = document.createElementNS(LDR.SVG.NS, 'animateTransform');
        a.setAttribute('id', 'turnerNormal');
        a.setAttribute('attributeName', 'transform');
        a.setAttribute('attributeType', 'XML');
        a.setAttribute('type', 'rotate');
        a.setAttribute('from', '0 50 0');
        a.setAttribute('to', '90 50 0');
        a.setAttribute('dur', '1s');
        a.setAttribute('fill', 'freeze');
        a.setAttribute('begin', '1s;turnerNormal.end+2s');
        g2.appendChild(a);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -35 200 70');
        buttons[2].appendChild(svg);
        this.createSvgBlock(-50, 0, true, red, lineColor, svg);
        svg.appendChild(LDR.SVG.makeLine(-w, 0, w, 0, true));
        svg.appendChild(LDR.SVG.makeLine(w / 2, w / 2, w, 0, true));
        svg.appendChild(LDR.SVG.makeLine(w / 2, -w / 2, w, 0, true));
        let g = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g);
        g.setAttribute('transform', 'rotate(90 0 0) translate(-50 -55)');
        let turned = this.createSvgBlock(50, 0, true, red, lineColor, g);
    }
}
LDR.Options.appendShowPLIOptions = function (optionsBlock) {
    console.warn('Show PLI option deprecated');
    return;
    let group = this.addOptionsGroup(optionsBlock, 2, "Parts List");
    let options = this;
    let onPLIChange = function (idx) {
        options.showPLI = idx;
        options.onChange(false);
    };
    let buttons = this.createButtons(group, 2, this.showPLI, onPLIChange);
    let red = () => '#C91A09';
    let lineColor = () => LDR.Colors.int2Hex(options.lineColor); {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -40 200 80');
        buttons[0].appendChild(svg);
        for (let xx = -1; xx <= 1; xx++) {
            this.createSvgBlock(xx * LDR.Options.svgBlockWidth,
                0, true, red, lineColor, svg);
        }
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -40 200 80');
        buttons[1].appendChild(svg);
        svg.appendChild(LDR.SVG.makeRoundRect(-90, -30, 60, 60, 2));
        let txt = document.createElementNS(LDR.SVG.NS, 'text');
        txt.setAttribute('x', '-87');
        txt.setAttribute('y', '24');
        txt.setAttribute('fill', 'black');
        txt.innerHTML = "3x";
        svg.appendChild(txt);
        this.createSvgBlock(-2 * LDR.Options.svgBlockWidth,
            -5, true, red, lineColor, svg);
        for (let xx = 0; xx <= 2; xx++) {
            this.createSvgBlock(xx * LDR.Options.svgBlockWidth,
                0, true, red, lineColor, svg);
        }
    }
}
LDR.Options.appendLROptions = function (optionsBlock, ldrButtons) {
    console.warn('LR button option deprecated');
    return;
    let group = this.addOptionsGroup(optionsBlock, 3, "Button Size");
    let options = this;
    let onLRChange = function (idx) {
        options.showLRButtons = idx;
        options.onChange(false);
        ldrButtons.nextButtonLarge.style.display = (idx != 0) ? 'none' : 'block';
        ldrButtons.nextButton.style.display = (idx != 1) ? 'none' : 'block';
    };
    let buttons = this.createButtons(group, 3, this.showLRButtons, onLRChange); {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.setAttribute('class', 'ui_toggles');
        let r = LDR.SVG.makeRightArrowLarge();
        svg.appendChild(r);
        buttons[0].appendChild(r);
    } {
        let svg = LDR.SVG.makeRightArrow();
        svg.setAttribute('class', 'ui_toggles');
        svg.children[0].setAttribute('transform', 'scale(0.5 0.5) translate(100 100)');
        buttons[1].appendChild(svg);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-200 -100 400 200');
        svg.setAttribute('class', 'ui_toggles');
        svg.appendChild(LDR.SVG.makeOffIcon(0, 0, 200));
        buttons[2].appendChild(svg);
    }
}
LDR.Options.appendCameraOptions = function (optionsBlock, ldrButtons) {
    console.warn('Camera options deprecated');
    return;
    let group = this.addOptionsGroup(optionsBlock, 3, "Camera Buttons");
    let options = this;
    let onCameraChange = function (idx) {
        options.showCameraButtons = idx;
        options.onChange(false);
        console.warn('Change Camera to ' + idx);
        if (idx == 0) {
            ldrButtons.zoomInButtonLarge.style.display = 'none';
            ldrButtons.zoomInButton.style.display = 'inline-block';
            ldrButtons.zoomOutButtonLarge.style.display = 'none';
            ldrButtons.zoomOutButton.style.display = 'inline-block';
            ldrButtons.resetCameraButton.style.visibility = 'visible';
        } else if (idx == 1) {
            ldrButtons.zoomInButtonLarge.style.display = 'inline-block';
            ldrButtons.zoomInButton.style.display = 'none';
            ldrButtons.zoomOutButtonLarge.style.display = 'inline-block';
            ldrButtons.zoomOutButton.style.display = 'none';
            ldrButtons.resetCameraButton.style.visibility = 'visible';
        } else {
            ldrButtons.zoomInButtonLarge.style.display = 'none';
            ldrButtons.zoomOutButtonLarge.style.display = 'none';
            ldrButtons.zoomInButton.style.display = 'none';
            ldrButtons.zoomOutButton.style.display = 'none';
            ldrButtons.resetCameraButton.style.visibility = 'hidden';
        }
    };
    let buttons = this.createButtons(group, 3, this.showCameraButtons, onCameraChange); {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '0 0 300 100');
        svg.setAttribute('class', 'ui_toggles');
        svg.appendChild(LDR.SVG.makeCamera(50, 45, 100));
        let o = LDR.SVG.makeZoom(false, 1);
        o.children[0].setAttribute('transform', 'scale(0.5 0.5) translate(100 50)');
        let i = LDR.SVG.makeZoom(true, 1);
        i.children[0].setAttribute('transform', 'scale(0.5 0.5) translate(100 0)');
        svg.appendChild(o);
        svg.appendChild(i);
        buttons[0].appendChild(svg);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '0 0 300 100');
        svg.setAttribute('class', 'ui_toggles');
        svg.appendChild(LDR.SVG.makeCamera(50, 45, 100));
        let o = LDR.SVG.makeZoom(false, 2);
        o.children[0].setAttribute('transform', 'translate(-100 0)');
        let i = LDR.SVG.makeZoom(true, 2);
        i.children[0].setAttribute('transform', 'translate(100 0)');
        svg.appendChild(o);
        svg.appendChild(i);
        buttons[1].appendChild(svg);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-150 -50 300 100');
        svg.setAttribute('class', 'ui_toggles');
        svg.appendChild(LDR.SVG.makeOffIcon(0, 0, 100));
        buttons[2].appendChild(svg);
    }
}
LDR.Options.appendRotationOptions = function (optionsBlock) {
    let group = this.addOptionsGroup(optionsBlock, 2, "Show FPS and Rotate");
    let options = this;
    let onChange = function (idx) {
        options.rotateModel = idx;
        options.onChange(false);
    };
    let buttons = this.createButtons(group, 2, this.rotateModel, onChange);
    let red = () => '#C91A09';
    let lineColor = () => LDR.Colors.int2Hex(options.lineColor); {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -25 200 50');
        buttons[0].appendChild(svg);
        this.createSvgBlock(0, 0, true, red, lineColor, svg);
    } {
        let svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-100 -25 200 50');
        buttons[1].appendChild(svg);
        let g = document.createElementNS(LDR.SVG.NS, 'g');
        svg.appendChild(g);
        let turned = this.createSvgBlock(0, 0, true, red, lineColor, g);
        let a = document.createElementNS(LDR.SVG.NS, 'animateTransform');
        a.setAttribute('id', 'turnerFull');
        a.setAttribute('attributeName', 'transform');
        a.setAttribute('attributeType', 'XML');
        a.setAttribute('type', 'rotate');
        a.setAttribute('from', '0 0 0');
        a.setAttribute('to', '360 0 0');
        a.setAttribute('dur', '30s');
        a.setAttribute('begin', '1s;turnerFull.end');
        g.appendChild(a);
    }
}
LDR.Options.appendStudHighContrastOptions = function (optionsBlock) {
    let self = this;
    let svg;
    let group = this.addTopOptionsGroup(optionsBlock);
    let onChange = function () {
        self.studHighContrast = self.studHighContrast === 0 ? 1 : 0;
        self.onChange(true);
        updateSvg();
    };
    let button = this.createButton(group, onChange);
    let red = () => '#C91A09';
    let lineColor = () => LDR.Colors.int2Hex(options.lineColor);

    function updateSvg() {
        if (svg) {
            button.removeChild(svg);
        }
        svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-40 -20 80 40');
        button.appendChild(svg);
        if (self.studHighContrast === 0) {
            self.createSvgCylinder(0, 0, false, red, lineColor, svg);
        } else {
            self.createSvgCylinder(0, 0, true, red, lineColor, svg);
        }
    }
    updateSvg();
}
LDR.Options.appendStudLogoOptions = function (optionsBlock) {
    let self = this;
    let svg;
    let group = this.addTopOptionsGroup(optionsBlock);
    let onChange = function () {
        self.studLogo = self.studLogo === 0 ? 1 : 0;
        self.onChange(true);
        updateSvg();
    };
    let button = this.createButton(group, onChange);

    function updateSvg() {
        if (svg) {
            button.removeChild(svg);
        }
        svg = document.createElementNS(LDR.SVG.NS, 'svg');
        svg.setAttribute('viewBox', '-60 -35 120 60');
        svg.setAttribute('class', 'ui_toggles');
        svg.append(LDR.SVG.makeCircle(0, -5, 23, true));
        button.appendChild(svg);
        if (self.studLogo === 1) {
            let lego = document.createElementNS(LDR.SVG.NS, 'text');
            lego.innerHTML = 'LEGO';
            lego.setAttribute('class', 'lego_' + self.studLogo);
            lego.setAttribute('text-anchor', 'middle');
            svg.append(lego);
        }
    }
    updateSvg();
}
LDR.Options.createButtons = function (parent, numberOfButtons, initiallySelected, onChange) {
    let ret = [];
    for (let i = 0; i < numberOfButtons; i++) {
        let button = document.createElement('td');
        button.setAttribute('class', i === initiallySelected ? 'option_selected' : 'option');
        let event = function (e) {
            LDR.Options.setOptionsSelected(e.target, onChange);
        }
        button.addEventListener('click', event);
        ret.push(button);
        parent.appendChild(button);
    }
    return ret;
}
LDR.Options.createButton = function (parent, onChange) {
    let button = document.createElement('td');
    button.setAttribute('class', 'option');
    button.addEventListener('click', onChange);
    parent.appendChild(button);
    return button;
}
LDR.Options.addOptionsGroup = function (optionsBlock, columns, description) {
    let optionsTable = document.createElement('table');
    optionsTable.setAttribute('class', 'options');
    optionsBlock.appendChild(optionsTable);
    this.appendDescriptionBar(optionsTable, columns, description);
    let optionsGroupRow = document.createElement('tr');
    optionsGroupRow.setAttribute('class', 'options_group');
    optionsTable.appendChild(optionsGroupRow);
    return optionsGroupRow;
}
LDR.Options.addTopOptionsGroup = function (optionsBlock) {
    if (this.topOptionsGroup) {
        return this.topOptionsGroup;
    }
    let optionsTable = document.createElement('table');
    optionsTable.setAttribute('class', 'options');
    optionsBlock.appendChild(optionsTable);
    let optionsGroupRow = document.createElement('tr');
    optionsGroupRow.setAttribute('class', 'options_group');
    optionsTable.appendChild(optionsGroupRow);
    this.topOptionsGroup = optionsGroupRow;
    return optionsGroupRow;
}
LDR.Options.svgBlockWidth = 30;
LDR.Options.svgBlockHeight = 25;
LDR.Options.createSvgBlock = function (x, y, closed, getFillColor, getLineColor, parent) {
    let dx2 = LDR.Options.svgBlockWidth / 2;
    let dy = LDR.Options.svgBlockHeight;
    let dy2 = dy * 0.3;
    let pts1 = 'M ' + x + ' ' + (y - dy / 2 + dy2) +
        ' l' + dx2 + ' -' + dy2 +
        ' v' + dy +
        ' l-' + dx2 + ' ' + dy2 +
        ' l-' + dx2 + ' -' + dy2 +
        ' v-' + dy +
        ' l' + dx2 + ' ' + dy2 +
        ' v' + dy;
    let path1 = document.createElementNS(LDR.SVG.NS, 'path');
    path1.setAttribute('d', pts1);
    let options = this;
    let listener1 = function () {
        path1.setAttribute('fill', getFillColor(options));
        path1.setAttribute('stroke', getLineColor(options));
    };
    this.listeners.push(listener1);
    parent.appendChild(path1);
    listener1();
    if (!closed)
        return;
    let pts2 = 'M ' + (x - dx2) + ' ' + (y - dy / 2) +
        ' l' + dx2 + ' -' + dy2 +
        ' l' + dx2 + ' ' + dy2 +
        ' l-' + dx2 + ' ' + dy2 +
        ' Z';
    let path2 = document.createElementNS(LDR.SVG.NS, 'path');
    path2.setAttribute('d', pts2);
    let listener2 = function () {
        path2.setAttribute('fill', getFillColor(options));
        path2.setAttribute('stroke', getLineColor(options));
    }
    this.listeners.push(listener2);
    parent.appendChild(path2);
    listener2();
}
LDR.Options.createSvgPoints = function (x, y, getColor, parent, size) {
    let dx2 = LDR.Options.svgBlockWidth / 2;
    let dy = LDR.Options.svgBlockHeight;
    let dy2 = dy * 0.3;
    let pts1 = 'M ' + x + ' ' + (y - dy / 2 + dy2) +
        ' l' + dx2 + ' -' + dy2 +
        ' v' + dy +
        ' l-' + dx2 + ' ' + dy2 +
        ' l-' + dx2 + ' -' + dy2 +
        ' v-' + dy +
        ' l' + dx2 + ' ' + dy2 +
        ' v' + dy;
    let path1 = document.createElementNS(LDR.SVG.NS, 'path');
    path1.setAttribute('d', pts1);
    path1.setAttribute('stroke-dasharray', '0.1 5');
    path1.setAttribute('fill', 'none');
    path1.style = "stroke-width: " + size / 2;
    let options = this;
    let listener1 = function () {
        path1.setAttribute('stroke', getColor(options));
    };
    this.listeners.push(listener1);
    parent.appendChild(path1);
    listener1();
    let pts2 = 'M ' + (x - dx2) + ' ' + (y - dy / 2) +
        ' l' + dx2 + ' -' + dy2 +
        ' l' + dx2 + ' ' + dy2;
    let path2 = document.createElementNS(LDR.SVG.NS, 'path');
    path2.setAttribute('d', pts2);
    path2.setAttribute('stroke-dasharray', '0.1 5');
    path2.setAttribute('fill', 'none');
    path2.style = "stroke-width: " + size / 2;
    let listener2 = function () {
        path2.setAttribute('stroke', getColor(options));
    }
    this.listeners.push(listener2);
    parent.appendChild(path2);
    listener2();
}
LDR.Options.createSvgCylinder = function (x, y, highContrast, getFillColor, getLineColor, parent) {
    let dx2 = LDR.Options.svgBlockWidth * 0.5;
    let dy = LDR.Options.svgBlockHeight * 0.5;
    let dy2 = dy * 0.3;

    function makeCyli(y) {
        let c = document.createElementNS(LDR.SVG.NS, 'ellipse');
        c.setAttribute('cx', x);
        c.setAttribute('cy', y);
        c.setAttribute('rx', dx2);
        c.setAttribute('ry', dy2);
        return c;
    }
    let base = makeCyli(y + dy / 2);
    let center = LDR.SVG.makeRect(x - dx2, y - dy / 2, LDR.Options.svgBlockWidth, dy);
    let top = makeCyli(y - dy / 2);
    parent.appendChild(base);
    parent.appendChild(center);
    let l1 = LDR.SVG.makeLine(x - dx2, y - dy / 2, x - dx2, y + dy / 2);
    parent.appendChild(l1);
    let l2 = LDR.SVG.makeLine(x + dx2, y - dy / 2, x + dx2, y + dy / 2);
    parent.appendChild(l2);
    if (highContrast) {
        base.setAttribute('fill', '#000000');
        center.setAttribute('fill', '#000000');
        l1.setAttribute('stroke', '#000000');
        l2.setAttribute('stroke', '#000000');
    }
    parent.appendChild(top);
    let options = this;
    let listener = function () {
        base.setAttribute('stroke', getLineColor(options));
        if (!highContrast) {
            l1.setAttribute('stroke', getLineColor(options));
            l2.setAttribute('stroke', getLineColor(options));
            base.setAttribute('fill', getFillColor(options));
            center.setAttribute('fill', getFillColor(options));
        }
        top.setAttribute('fill', getFillColor(options));
        top.setAttribute('stroke', getLineColor(options));
    };
    this.listeners.push(listener);
    listener();
}
LDR.STORAGE = function (onReady) {
    let self = this;
    this.req = indexedDB.open("ldraw", 8);
    this.req.onupgradeneeded = function (event) {
        const db = event.target.result;
        db.onerror = errorEvent => console.dir(errorEvent);
        if (event.oldVersion < 1) {
            db.createObjectStore("parts", {
                keyPath: "ID"
            });
        }
        if (event.oldVersion < 3) {}
        if (event.oldVersion < 4) {
            db.createObjectStore("instructions", {
                keyPath: "key"
            });
        }
        if (event.oldVersion < 5) {}
        if (event.oldVersion < 6) {}
        if (event.oldVersion < 7) {}
        if (event.oldVersion < 8) {
            var pStore = this.transaction.objectStore("parts");
            pStore.clear();
            var iStore = this.transaction.objectStore("instructions");
            iStore.clear();
        }
    };
    this.req.onerror = function (event) {
        console.warn('DB Error: ' + event.target.errorCode);
        console.dir(event);
        onReady(self);
    };
    this.req.onsuccess = function (event) {
        self.db = event.target.result;
        onReady(self);
    };
    this.req.onblocked = function () {
        console.warn('there is another open connection to the ldraw database!');
        onReady(self);
    };
};
LDR.STORAGE.prototype.retrievePartsFromStorage = function (loader, parts, onDone) {
    if (parts.length === 0 || !this.db) {
        onDone([]);
        return;
    }
    let stillToBeBuilt = [];
    let seen = {};
    parts.forEach(partID => seen[partID] = true);
    let transaction = this.db.transaction(["parts"]);
    let objectStore = transaction.objectStore("parts");
    let self = this;
    let remaining = parts.length;

    function onHandled(partID) {
        remaining--;
        let part = loader.getPartType(partID);
        if (part) {
            let toFetch = [];
            let checkSubModel = function (sm) {
                if (!(loader.partTypes.hasOwnProperty(sm.ID) || seen.hasOwnProperty(sm.ID))) {
                    seen[sm.ID] = true;
                    toFetch.push(sm.ID);
                }
            }
            part.steps.forEach(step => step.subModels.forEach(checkSubModel));
            remaining += toFetch.length;
            toFetch.forEach(fetch);
        }
        if (remaining === 0) {
            if (stillToBeBuilt.length > 0) {
                console.warn(stillToBeBuilt.length + " part(s) could not be fetched from indexedDB: " + stillToBeBuilt.slice(0, 10).join('/') + '...');
            }
            onDone(stillToBeBuilt);
        }
    }

    function fetch(partID) {
        if (LDR.Generator) {
            let pt = LDR.Generator.make(partID);
            if (pt) {
                loader.setPartType(pt);
                onHandled(partID);
                return;
            }
        }
        let shortPartID = partID;
        if (partID.endsWith('.dat')) {
            shortPartID = partID.substring(0, partID.length - 4);
        }
        let request = objectStore.get(shortPartID);
        request.onerror = function (event) {
            stillToBeBuilt.push(partID);
            console.warn(shortPartID + " retrieval error from indexedDB!");
            console.dir(event);
            onHandled(partID);
        };
        request.onsuccess = function (event) {
            let result = request.result;
            if (result) {
                try {
                    let pt = new THREE.LDRPartType();
                    pt.unpack(result);
                    loader.setPartType(pt);
                } catch (e) {
                    console.warn(e);
                    stillToBeBuilt.push(partID);
                }
            } else {
                stillToBeBuilt.push(partID);
            }
            onHandled(partID);
        };
    }
    parts.forEach(fetch);
}
LDR.STORAGE.prototype.retrieveInstructionsFromStorage = function (loader, onDone) {
    if (!loader.options.hasOwnProperty('key') || !loader.options.hasOwnProperty('timestamp') || !this.db) {
        onDone(false);
        return;
    }
    let key = loader.options.key;
    let timestamp = loader.options.timestamp;
    let transaction = this.db.transaction(["instructions"]);
    let objectStore = transaction.objectStore("instructions");
    let request = objectStore.get(key);
    request.onerror = function (event) {
        console.warn(shortPartID + " retrieval error from indexedDB for key " + key);
        console.dir(event);
        onDone(false);
    };
    request.onsuccess = function (event) {
        let result = request.result;
        if (result && result.timestamp === timestamp) {
            try {
                let parts = loader.unpack(result);
                onDone(true, parts);
                console.log('Instructions with key ' + key + ' read and unpacked from indexedDB!');
            } catch (e) {
                loader.onWarning({
                    message: 'Error during unpacking of instructions from indexedDB: ' + e,
                    subModel: key
                });
                onDone(false);
            }
        } else {
            console.log('IndexedDB did not contain a current version of instructions with key "' + key + '" - new instructions will be fetched.');
            onDone(false);
        }
    };
}
LDR.STORAGE.prototype.savePartsToStorage = function (parts, loader) {
    if (!this.db) {
        return;
    }
    let partsWritten = 0;
    let transaction = this.db.transaction(["parts"], "readwrite");
    transaction.oncomplete = function (event) {};
    transaction.onerror = function (event) {
        console.warn('Error while writing parts!');
        console.dir(event);
        console.dir(transaction.error);
    };
    let objectStore = transaction.objectStore("parts");

    function savePartType(pt) {
        if (pt.canBePacked()) {
            let packed = pt.pack(loader);
            objectStore.put(packed).onsuccess = function (e) {
                partsWritten++;
            };
        }
    }
    parts.forEach(savePartType);
}
LDR.STORAGE.prototype.saveInstructionsToStorage = function (loader, key, timestamp) {
    if (loader.instructionsSaved || !this.db) {
        return;
    }
    loader.instructionsSaved = true;
    let transaction = this.db.transaction(["instructions"], "readwrite");
    transaction.oncomplete = function (event) {};
    transaction.onerror = function (event) {
        console.warn('Error while writing instructions!');
        console.dir(event);
        console.dir(transaction.error);
    };
    let objectStore = transaction.objectStore("instructions");
    let packed = loader.pack();
    packed.key = key;
    packed.timestamp = timestamp;
    objectStore.put(packed).onsuccess = () => console.log('Instructions saved to indexedDB.');
}
LDR.EPS = 1e-5;
LDR.mergeGeometries = function (geometries) {
    if (geometries.length === 0) {
        return new LDR.LDRGeometry();
    }
    while (geometries.length > 1) {
        let nextGeometries = [];
        if (geometries.length % 2 === 1) {
            nextGeometries.push(geometries[geometries.length - 1]);
        }
        for (let i = 0; i < geometries.length - 1; i += 2) {
            geometries[i].merge(geometries[i + 1]);
            nextGeometries.push(geometries[i]);
        }
        geometries = nextGeometries;
    }
    return geometries[0];
}
LDR.vertexSorter = function (a, b) {
    if (a.x !== b.x) {
        return a.x - b.x;
    }
    if (a.y !== b.y) {
        return a.y - b.y;
    }
    return a.z - b.z;
}
LDR.vertexLessThan = function (a, b) {
    if (a.x !== b.x) {
        return a.x < b.x;
    }
    if (a.y !== b.y) {
        return a.y < b.y;
    }
    return a.z < b.z;
}
LDR.vertexEqual = function (a, b) {
    return Math.abs(a.x - b.x) < LDR.EPS &&
        Math.abs(a.y - b.y) < LDR.EPS &&
        Math.abs(a.z - b.z) < LDR.EPS;
}
LDR.LDRGeometry = function () {
    this.vertices = [];
    this.lines = {};
    this.conditionalLines = {};
    this.triangles = {};
    this.triangles2 = {};
    this.quads = {};
    this.quads2 = {};
    this.lineColorManager;
    this.lineGeometry;
    this.triangleGeometries = {};
    this.texmapGeometries = {};
    this.conditionalLineGeometry;
    this.geometriesBuilt = false;
    this.boundingBox = new THREE.Box3();
}
LDR.LDRGeometry.prototype.buildVertexAttribute = function (r) {
    let vertices = [];
    this.vertices.forEach(v => {
        let p = new THREE.Vector3(v.x, v.y, v.z);
        p.applyMatrix3(r);
        vertices.push(p.x, p.y, p.z);
    });
    return new THREE.Float32BufferAttribute(vertices, 3);
}
LDR.LDRGeometry.prototype.buildGeometriesAndColorsForLines = function () {
    this.lineColorManager = new LDR.ColorManager();
    let allLineColors = [];
    for (let c in this.lines) {
        if (this.lines.hasOwnProperty(c)) {
            allLineColors.push(c);
        }
    }
    for (let c in this.conditionalLines) {
        if (!this.lines.hasOwnProperty(c) && this.conditionalLines.hasOwnProperty(c)) {
            allLineColors.push(c);
        }
    }
    var self = this;
    let colorIdx = 0;
    let handleVertex = function (vertices, idx, fc) {
        let v = self.vertices[idx];
        if (v.c !== colorIdx) {
            v.c = colorIdx;
            v.idx = vertices.length / 4;
            vertices.push(v.x, v.y, v.z, fc);
        }
        return v.idx;
    }
    let lineVertexAttribute, lineVertices = [],
        lineIndices = [];
    if (allLineColors.length === 1) {
        let c = allLineColors[0];
        this.lineColorManager.get(c);
        this.vertices.forEach(v => lineVertices.push(v.x, v.y, v.z));
        lineVertexAttribute = new THREE.Float32BufferAttribute(lineVertices, 3);
        if (this.lines.hasOwnProperty(c)) {
            this.lines[c].forEach(line => lineIndices.push(line.p1, line.p2));
        }
    } else if (allLineColors.length > 1) {
        for (let c in this.lines) {
            colorIdx++;
            if (!this.lines.hasOwnProperty(c)) {
                continue;
            }
            let fc = this.lineColorManager.get(c);
            this.lines[c].forEach(line => {
                lineIndices.push(handleVertex(lineVertices, line.p1, fc));
                lineIndices.push(handleVertex(lineVertices, line.p2, fc));
            });
        }
        lineVertexAttribute = new THREE.Float32BufferAttribute(lineVertices, 4);
    }
    this.lineGeometry = this.buildGeometry(lineIndices, lineVertexAttribute);
    let conditionalLines = [];
    for (let c in this.conditionalLines) {
        if (!this.conditionalLines.hasOwnProperty(c)) {
            continue;
        }
        let fc = this.lineColorManager.get(c);
        this.conditionalLines[c].forEach(p => {
            let p1 = this.vertices[p.p1];
            let p2 = this.vertices[p.p2];
            let p3 = this.vertices[p.p3];
            let p4 = this.vertices[p.p4];
            conditionalLines.push({
                p1: p1,
                p2: p2,
                p3: p3,
                p4: p4,
                fc: fc
            });
        });
    }
    this.buildGeometryForConditionalLines(allLineColors.length > 1, conditionalLines);
}
LDR.LDRGeometry.prototype.buildGeometriesAndColors = function () {
    if (this.geometriesBuilt) {
        return;
    }
    let self = this;
    this.buildGeometriesAndColorsForLines();
    let allTriangleColors = [];
    let seen = {};

    function getColorsFrom(p) {
        for (let c in p) {
            if (!seen.hasOwnProperty(c) && p.hasOwnProperty(c)) {
                allTriangleColors.push(c);
                seen[c] = true;
            }
        }
    }
    getColorsFrom(this.triangles);
    getColorsFrom(this.triangles2);
    getColorsFrom(this.quads);
    getColorsFrom(this.quads2);
    let colorIdx = -1;
    allTriangleColors.forEach(c => {
        let triangleVertices = [],
            triangleIndices = [];
        colorIdx--;
        let tvIdx = 0;
        let hv = function (idx) {
            let v = self.vertices[idx];
            if (v.c !== colorIdx) {
                v.c = colorIdx;
                v.idx = tvIdx++;
                triangleVertices.push(v.x, v.y, v.z);
            }
            return v.idx;
        }

        function handlePrimitives(ps, f) {
            if (ps.hasOwnProperty(c)) {
                ps[c].filter(p => !p.t).forEach(f);
            }
        }
        handlePrimitives(self.triangles, t => triangleIndices.push(hv(t.p1), hv(t.p2), hv(t.p3)));
        handlePrimitives(self.triangles2, t => {
            let i1 = hv(t.p1),
                i2 = hv(t.p2),
                i3 = hv(t.p3);
            triangleIndices.push(i1, i2, i3, i3, i2, i1);
        });
        handlePrimitives(self.quads, q => {
            let i1 = hv(q.p1),
                i2 = hv(q.p2),
                i3 = hv(q.p3),
                i4 = hv(q.p4);
            triangleIndices.push(i1, i2, i4, i2, i3, i4);
        });
        handlePrimitives(self.quads2, q => {
            let i1 = hv(q.p1),
                i2 = hv(q.p2),
                i3 = hv(q.p3),
                i4 = hv(q.p4);
            triangleIndices.push(i1, i2, i4, i2, i3, i4, i4, i3, i2, i4, i2, i1);
        });
        let triangleVertexAttribute = new THREE.Float32BufferAttribute(triangleVertices, 3);
        let triangleGeometry = this.buildGeometry(triangleIndices, triangleVertexAttribute);
        if (triangleGeometry) {
            this.triangleGeometries[c] = triangleGeometry;
        }
    });
    allTriangleColors.forEach(c => self.buildTexmapGeometriesForColor(c));
    this.geometriesBuilt = true;
}
LDR.LDRGeometry.prototype.buildTexmapGeometriesForColor = function (c) {
    let self = this;
    let texmapped = {};

    function check(ps, q, noBFC) {
        if (!ps.hasOwnProperty(c)) {
            return;
        }
        ps[c].filter(p => p.t).forEach(p => {
            if (!texmapped.hasOwnProperty(p.t.idx)) {
                texmapped[p.t.idx] = [];
            }
            texmapped[p.t.idx].push({
                p: p,
                q: q,
                noBFC: noBFC
            });
        });
    }
    check(self.triangles, false, false);
    check(self.triangles2, false, true);
    check(self.quads, true, false);
    check(self.quads2, true, true);
    for (let idx in texmapped) {
        if (!texmapped.hasOwnProperty(idx)) {
            return;
        }
        let primitiveList = texmapped[idx];
        let vertices = [];
        let indices = [];
        let uvs = [];
        let indexMap = {};
        let texmapPlacement;

        function set(a, b, c) {
            let vertex = self.vertices[a];
            let [u, v] = texmapPlacement.getUV(vertex, self.vertices[b], self.vertices[c]);
            if (indexMap.hasOwnProperty(a)) {
                let idx = indexMap[a];
                let oldU = uvs[2 * idx],
                    oldV = uvs[2 * idx + 1];
            }
            let idx = indices.length;
            indexMap[a] = idx;
            vertices.push(vertex.x, vertex.y, vertex.z);
            indices.push(idx);
            uvs.push(u, v);
        }

        function setAll(a, b, c) {
            set(a, b, c);
            set(b, a, c);
            set(c, a, b);
        }
        primitiveList.forEach(ele => {
            let p = ele.p,
                q = ele.q,
                noBFC = ele.noBFC;
            texmapPlacement = p.t;
            setAll(p.p1, p.p2, p.p3);
            if (noBFC) {
                setAll(p.p3, p.p2, p.p1);
            }
            if (q) {
                setAll(p.p1, p.p3, p.p4);
                if (noBFC) {
                    setAll(p.p4, p.p3, p.p1);
                }
            }
        });
        let g = self.buildGeometry(indices, new THREE.Float32BufferAttribute(vertices, 3));
        g.computeVertexNormals();
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        if (!self.texmapGeometries.hasOwnProperty(texmapPlacement.idx)) {
            self.texmapGeometries[texmapPlacement.idx] = [];
        }
        self.texmapGeometries[texmapPlacement.idx].push({
            c: c,
            g: g
        });
    }
}
//Optimized version of the one found in https://github.com/mrdoob/three.js/blob/master/src/core/BufferGeometry.js
THREE.BufferGeometry.prototype.computeVertexNormals = function () {
    var attributes = this.attributes;
    var positions = attributes.position.array;
    this.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
    var normals = attributes.normal.array;
    var vA, vB, vC;
    var pA = new THREE.Vector3(),
        pB = new THREE.Vector3(),
        pC = new THREE.Vector3();
    var cb = new THREE.Vector3(),
        ab = new THREE.Vector3();
    var index = this.index;
    var indices = index.array;
    for (var i = 0, il = index.count; i < il; i += 3) {
        vA = indices[i] * 3;
        vB = indices[i + 1] * 3;
        vC = indices[i + 2] * 3;
        pA.fromArray(positions, vA);
        pB.fromArray(positions, vB);
        pC.fromArray(positions, vC);
        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        cb.cross(ab);
        normals[vA] += cb.x;
        normals[vA + 1] += cb.y;
        normals[vA + 2] += cb.z;
        normals[vB] += cb.x;
        normals[vB + 1] += cb.y;
        normals[vB + 2] += cb.z;
        normals[vC] += cb.x;
        normals[vC + 1] += cb.y;
        normals[vC + 2] += cb.z;
    }
    this.normalizeNormals();
    attributes.normal.needsUpdate = true;
}
LDR.LDRGeometry.UV_WarningWritten = false;
LDR.LDRGeometry.prototype.buildPhysicalGeometriesAndColors = function () {
    if (this.geometriesBuilt) {
        return;
    }
    var self = this;
    let vertices = this.vertices;
    let vLen = vertices.length;
    const VLEN = vLen;
    let key = (a, b) => (a < b) ? (a * VLEN + b) : (b * VLEN + a);
    let b = new THREE.Box3();
    vertices.forEach(v => b.expandByPoint(v));
    let size = new THREE.Vector3();
    b.getSize(size);
    let edges = [];
    for (let c in this.conditionalLines) {
        if (this.conditionalLines.hasOwnProperty(c)) {
            let lines = this.conditionalLines[c];
            lines.forEach(line => edges[key(line.p1, line.p2)] = true);
        }
    }
    for (let c in this.lines) {
        if (this.lines.hasOwnProperty(c)) {
            let lines = this.lines[c];
            lines.forEach(line => vertices[line.p1].hard = vertices[line.p2].hard = true);
            lines.forEach(line => edges[key(line.p1, line.p2)] = false);
        }
    }
    let allTriangleColors = [];
    let seenColors = {};

    function getColorsFrom(p) {
        for (let c in p) {
            if (!seenColors.hasOwnProperty(c) && p.hasOwnProperty(c)) {
                allTriangleColors.push(c);
                seenColors[c] = true;
            }
        }
    }
    getColorsFrom(this.triangles);
    getColorsFrom(this.triangles2);
    getColorsFrom(this.quads);
    getColorsFrom(this.quads2);

    function renew(i) {
        let v = vertices[i];
        vertices.push({
            x: v.x,
            y: v.y,
            z: v.z
        });
        vLen++;
        return vLen - 1;
    }

    function updateTriangleIndices(t) {
        let p1 = t.p1,
            p2 = t.p2,
            p3 = t.p3;
        let h1 = vertices[p1].hard,
            h2 = vertices[p2].hard,
            h3 = vertices[p3].hard;
        let k12 = edges[key(p1, p2)],
            k23 = edges[key(p2, p3)],
            k31 = edges[key(p3, p1)];
        if (h1 && !k12 && !k31) {
            t.p1 = renew(t.p1);
        }
        if (h2 && !k12 && !k23) {
            t.p2 = renew(t.p2);
        }
        if (h3 && !k23 && !k31) {
            t.p3 = renew(t.p3);
        }
    }

    function updateQuadIndices(t) {
        let p1 = t.p1,
            p2 = t.p2,
            p3 = t.p3,
            p4 = t.p4;
        let h1 = vertices[p1].hard,
            h2 = vertices[p2].hard,
            h3 = vertices[p3].hard,
            h4 = vertices[p4].hard;
        let k12 = edges[key(p1, p2)],
            k23 = edges[key(p2, p3)],
            k34 = edges[key(p3, p4)],
            k41 = edges[key(p4, p1)];
        if (h1 && !k12 && !k41) {
            t.p1 = renew(t.p1);
        }
        if (h2 && !k12 && !k23) {
            t.p2 = renew(t.p2);
        }
        if (h3 && !k23 && !k34) {
            t.p3 = renew(t.p3);
        }
        if (h4 && !k41 && !k34) {
            t.p4 = renew(t.p4);
        }
    }
    allTriangleColors.forEach(c => {
        if (self.triangles.hasOwnProperty(c)) {
            self.triangles[c].forEach(updateTriangleIndices);
        }
        if (self.triangles2.hasOwnProperty(c)) {
            self.triangles2[c].forEach(updateTriangleIndices);
        }
        if (self.quads.hasOwnProperty(c)) {
            self.quads[c].forEach(updateQuadIndices);
        }
        if (self.quads2.hasOwnProperty(c)) {
            self.quads2[c].forEach(updateQuadIndices);
        }
    });
    let triangleVertices = [];
    vertices.forEach(v => triangleVertices.push(v.x, v.y, v.z));
    let triangleVertexAttribute = new THREE.Float32BufferAttribute(triangleVertices, 3);
    allTriangleColors.forEach(c => {
        let triangleIndices = [];

        function pushT(a, b, c) {
            triangleIndices.push(a, b, c);
        }

        function pushQ(a, b, c, d) {
            triangleIndices.push(a, b, d);
            triangleIndices.push(b, c, d);
        }
        let triangles = self.triangles.hasOwnProperty(c) ? self.triangles[c].filter(p => !p.t) : [];
        let triangles2 = self.triangles2.hasOwnProperty(c) ? self.triangles2[c].filter(p => !p.t) : [];
        let quads = self.quads.hasOwnProperty(c) ? self.quads[c].filter(p => !p.t) : [];
        let quads2 = self.quads2.hasOwnProperty(c) ? self.quads2[c].filter(p => !p.t) : [];
        triangles.forEach(t => pushT(t.p1, t.p2, t.p3));
        triangles2.forEach(t => {
            pushT(t.p1, t.p2, t.p3);
            pushT(t.p3, t.p2, t.p1);
        });
        quads.forEach(q => pushQ(q.p1, q.p2, q.p3, q.p4));
        quads2.forEach(q => {
            pushQ(q.p1, q.p2, q.p3, q.p4);
            pushQ(q.p4, q.p3, q.p2, q.p1);
        });
        if (triangleIndices.length === 0) {
            return;
        }
        let g = self.buildGeometry(triangleIndices, triangleVertexAttribute);
        g.computeVertexNormals();
        let normals = g.getAttribute('normal').array;
        let uvs = [];
        for (let i = 0; i < vLen; i++) {
            uvs.push(0, 0);
        }
        let dx = v => (v.x - b.min.x) / size.x;
        let dy = v => (v.y - b.min.y) / size.y;
        let dz = v => (v.z - b.min.z) / size.z;
        let [UVU, UVV] = [
            [0.5, 0.5],
            [0, 0],
            [0.5, 0]
        ][Math.floor(Math.random() * 3)];

        function setUVs(indices) {
            const len = indices.length;
            let maxDiff = xs => xs.map((x, idx, a) => Math.abs(x - a[idx === 0 ? len - 1 : idx - 1])).reduce((a, b) => a > b ? a : b, 0);
            let vs = indices.map(i => vertices[i]);
            let ns = indices.map(i => 3 * i).map(idx => new THREE.Vector3(normals[idx], normals[1 + idx], normals[2 + idx]));
            let N = ns.reduce((a, b) => new THREE.Vector3(a.x + b.x, a.y + b.y, a.z + b.z), new THREE.Vector3());
            let NX = N.x * N.x,
                NY = N.y * N.y,
                NZ = N.z * N.z;

            function setUV(fu, fv, force) {
                let ret = vs.map((v, i) => {
                    return {
                        u: fu(v, i),
                        v: fv(v, i)
                    };
                });
                if (!force) {
                    let prevprev = ret[ret.length - 2];
                    let prev = ret[ret.length - 1];
                    let turn = uv => (prev.u - prevprev.u) * (uv.v - prevprev.v) - (prev.v - prevprev.v) * (uv.u - prevprev.u);
                    for (let i = 0; i < ret.length; i++) {
                        let uv = ret[i];
                        if (Math.abs(prev.u - uv.u) < LDR.EPS && Math.abs(prev.v - uv.v) < LDR.EPS ||
                            Math.abs(prevprev.u - uv.u) < LDR.EPS && Math.abs(prevprev.v - uv.v) < LDR.EPS ||
                            Math.abs(turn(uv)) < 1e-7) {
                            if (!LDR.LDRGeometry.UV_WarningWritten) {
                                console.log('UV issue insights for debugging. Underlying data points (vertices and normals):');
                                console.dir(vs);
                                console.dir(ns);
                                console.dir('Computed U`s:');
                                console.dir(ret);
                                console.dir('Turn angle check at failure: ' + turn(uv));
                                console.warn("Degenerate UV! " + uv.u + ', ' + uv.v);
                                LDR.LDRGeometry.UV_WarningWritten = true;
                            }
                            return false;
                        }
                        prevprev = prev;
                        prev = uv;
                    }
                }
                ret.forEach((uv, i) => {
                    let idx = 2 * indices[i];
                    uvs[idx] = 0.5 * uv.u + UVU;
                    uvs[idx + 1] = 0.5 * uv.v + UVV;
                });
                return true;
            }
            let equalVector3 = (a, b) => Math.abs(a.x - b.x) < LDR.EPS && Math.abs(a.y - b.y) < LDR.EPS && Math.abs(a.z - b.z) < LDR.EPS;

            function atLeast3EqualNormals() {
                let a = [...ns];
                a.sort(LDR.vertexSorter);
                if (equalVector3(a[0], a[a.length - 1])) {
                    return true;
                }
                if (a.length !== 4) {
                    return false;
                }
                return equalVector3(a[0], a[2]) || equalVector3(a[1], a[3]);
            }
            if (atLeast3EqualNormals()) {
                let DX, DY, DZ;
                if (vs.some(v => v.o === true)) {
                    let origo = vs.find(v => v.o === true);
                    let anyOther = vs.find(v => v.o !== true);
                    DX = origo.x - anyOther.x;
                    DY = origo.y - anyOther.y;
                    DZ = origo.z - anyOther.z;
                    let radius = 3 * Math.sqrt(DX * DX + DY * DY + DZ * DZ);
                    DX = v => 0.5 + (v.x - origo.x) / radius;
                    DY = v => 0.5 + (v.y - origo.y) / radius;
                    DZ = v => 0.5 + (v.z - origo.z) / radius;
                    setUV = function (fu, fv) {
                        let ret = vs.map((v, i) => {
                            return {
                                u: fu(v, i),
                                v: fv(v, i)
                            };
                        });
                        ret.forEach((uv, i) => {
                            let idx = 2 * indices[i];
                            uvs[idx] = 0.5 * uv.u;
                            uvs[idx + 1] = 0.5 * uv.v + 0.5;
                        });
                    }
                } else {
                    DX = dx;
                    DY = dy;
                    DZ = dz;
                }
                if (maxDiff(vs.map(v => v.x)) < LDR.EPS) {
                    setUV(DY, DZ, true);
                } else if (maxDiff(vs.map(v => v.y)) < LDR.EPS) {
                    setUV(DX, DZ, true);
                } else if (maxDiff(vs.map(v => v.z)) < LDR.EPS) {
                    setUV(DX, DY, true);
                } else if (NX >= NY && NX >= NZ) {
                    setUV(DY, DZ, true);
                } else if (NY >= NX && NY >= NZ) {
                    setUV(DX, DZ, true);
                } else {
                    setUV(DX, DY, true);
                }
                return;
            }
            const PI1 = 0.8 / Math.PI;
            const PI2 = 0.3 / Math.PI;
            let toCircle = (y, x) => (Math.atan2(y, x) + Math.PI) * PI2;
            let toHeight = x => Math.acos(x) * PI1;
            const C3 = 0.2 / (size.x + size.y + size.z);
            let dxyz = v => 0.1 + (v.x + v.y + v.z) * C3;
            if (NY >= Math.max(NX + NZ)) {
                setUV((v, i) => dxyz(v) + toCircle(ns[i].x, ns[i].z),
                        (v, i) => dxyz(v) + toHeight(ns[i].y), false) ||
                    setUV(dx, dz, true);
            } else {
                setUV((v, i) => dxyz(v) + toCircle(ns[i].x, ns[i].y),
                        (v, i) => dxyz(v) + toHeight(ns[i].z), false) ||
                    setUV(dx, dy, true);
            }
        }
        triangles.forEach(t => setUVs([t.p1, t.p2, t.p3]));
        triangles2.forEach(t => setUVs([t.p1, t.p2, t.p3]));
        quads.forEach(q => setUVs([q.p1, q.p2, q.p3, q.p4]));
        quads2.forEach(q => setUVs([q.p1, q.p2, q.p3, q.p4]));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        self.triangleGeometries[c] = g;
    });
    allTriangleColors.forEach(c => self.buildTexmapGeometriesForColor(c));
    this.geometriesBuilt = true;
}
LDR.LDRGeometry.prototype.cleanTempData = function () {
    delete this.vertices;
    delete this.lines;
    delete this.conditionalLines;
    delete this.quads;
    delete this.quads2;
    delete this.triangles;
    delete this.triangles2;
}
LDR.LDRGeometry.prototype.buildGeometry = function (indices, vertexAttribute) {
    if (indices.length === 0) {
        return null;
    }
    let g = new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute('position', vertexAttribute);
    return g;
}
LDR.LDRGeometry.prototype.buildGeometryForConditionalLines = function (multiColored, conditionalLines) {
    if (conditionalLines.length === 0) {
        return;
    }
    this.conditionalLineGeometry = new THREE.BufferGeometry();
    let p1s = [],
        p2s = [],
        p3s = [],
        p4s = [],
        colorIndices = [];
    for (let i = 0; i < conditionalLines.length; i++) {
        let line = conditionalLines[i];
        let p1 = line.p1,
            p2 = line.p2,
            p3 = line.p3,
            p4 = line.p4;
        p1s.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        p2s.push(p2.x, p2.y, p2.z, p1.x, p1.y, p1.z);
        p3s.push(p3.x, p3.y, p3.z, p3.x, p3.y, p3.z);
        p4s.push(p4.x, p4.y, p4.z, p4.x, p4.y, p4.z);
        if (multiColored) {
            colorIndices.push(line.fc, line.fc);
        }
    }
    this.conditionalLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(p1s, 3));
    this.conditionalLineGeometry.setAttribute('p2', new THREE.Float32BufferAttribute(p2s, 3));
    this.conditionalLineGeometry.setAttribute('p3', new THREE.Float32BufferAttribute(p3s, 3));
    this.conditionalLineGeometry.setAttribute('p4', new THREE.Float32BufferAttribute(p4s, 3));
    if (multiColored) {
        this.conditionalLineGeometry.setAttribute('colorIndex', new THREE.BufferAttribute(new Float32Array(colorIndices), 1));
    }
}
LDR.LDRGeometry.prototype.replaceWith = function (g) {
    this.vertices = g.vertices;
    this.lines = g.lines;
    this.conditionalLines = g.conditionalLines;
    this.triangles = g.triangles;
    this.triangles2 = g.triangles2;
    this.quads = g.quads;
    this.quads2 = g.quads2;
    this.boundingBox = g.boundingBox;
}
LDR.LDRGeometry.prototype.replaceWithDeep = function (g) {
    let self = this;
    g.vertices.forEach(v => self.vertices.push({
        x: v.x,
        y: v.y,
        z: v.z,
        o: v.o
    }));
    for (let c in g.lines) {
        if (!g.lines.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.lines[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2
        }));
        this.lines[c] = ps;
    }
    for (let c in g.conditionalLines) {
        if (!g.conditionalLines.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.conditionalLines[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2,
            p3: p.p3,
            p4: p.p4
        }));
        this.conditionalLines[c] = ps;
    }
    for (let c in g.triangles) {
        if (!g.triangles.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.triangles[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2,
            p3: p.p3,
            t: p.t
        }));
        this.triangles[c] = ps;
    }
    for (let c in g.triangles2) {
        if (!g.triangles2.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.triangles2[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2,
            p3: p.p3,
            t: p.t
        }));
        this.triangles2[c] = ps;
    }
    for (let c in g.quads) {
        if (!g.quads.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.quads[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2,
            p3: p.p3,
            p4: p.p4,
            t: p.t
        }));
        this.quads[c] = ps;
    }
    for (let c in g.quads2) {
        if (!g.quads2.hasOwnProperty(c)) {
            continue;
        }
        let ps = [];
        g.quads2[c].forEach(p => ps.push({
            p1: p.p1,
            p2: p.p2,
            p3: p.p3,
            p4: p.p4,
            t: p.t
        }));
        this.quads2[c] = ps;
    }
    this.boundingBox.copy(g.boundingBox);
}
LDR.LDRGeometry.prototype.fromPrimitives = function (lines, conditionalLines, triangles, quads) {
    let geometries = [];
    if (lines.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromLines(lines);
        geometries.push(g);
    }
    if (conditionalLines.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromConditionalLines(conditionalLines);
        geometries.push(g);
    }
    let culledTriangles = triangles.filter(t => t.cull);
    if (culledTriangles.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromTriangles(true, culledTriangles);
        geometries.push(g);
    }
    let unculledTriangles = triangles.filter(t => !t.cull);
    if (unculledTriangles.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromTriangles(false, unculledTriangles);
        geometries.push(g);
    }
    let culledQuads = quads.filter(q => q.cull);
    if (culledQuads.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromQuads(true, culledQuads);
        geometries.push(g);
    }
    let unculledQuads = quads.filter(q => !q.cull);
    if (unculledQuads.length > 0) {
        let g = new LDR.LDRGeometry();
        g.fromQuads(false, unculledQuads);
        geometries.push(g);
    }
    this.replaceWith(LDR.mergeGeometries(geometries));
}
LDR.LDRGeometry.prototype.sortAndBurnVertices = function (vertices, primitives) {
    vertices.sort(LDR.vertexSorter);
    let idx = this.vertices.length - 1;
    let prev;
    for (let i = 0; i < vertices.length; i++) {
        let v = vertices[i];
        if (!(prev && LDR.vertexEqual(prev, v))) {
            this.vertices.push({
                x: v.x,
                y: v.y,
                z: v.z,
                o: false
            });
            idx++;
        }
        let p = primitives[v.c][v.idx];
        p.t = v.t;
        if (v.p === 1) {
            p.p1 = idx;
        } else if (v.p === 2) {
            p.p2 = idx;
        } else if (v.p === 3) {
            p.p3 = idx;
        } else {
            p.p4 = idx;
        }
        prev = v;
    }
}
LDR.LDRGeometry.prototype.fromLines = function (ps) {
    let vertices = [];
    for (let i = 0; i < ps.length; i++) {
        let p = ps[i],
            idx;
        if (this.lines.hasOwnProperty(p.c)) {
            let t = this.lines[p.c];
            idx = t.length;
            t.push({});
        } else {
            this.lines[p.c] = [{}];
            idx = 0;
        }
        vertices.push({
            x: p.p1.x,
            y: p.p1.y,
            z: p.p1.z,
            c: p.c,
            idx: idx,
            p: 1
        }, {
            x: p.p2.x,
            y: p.p2.y,
            z: p.p2.z,
            c: p.c,
            idx: idx,
            p: 2
        });
        this.boundingBox.expandByPoint(p.p1);
        this.boundingBox.expandByPoint(p.p2);
    }
    this.sortAndBurnVertices(vertices, this.lines);
}
LDR.LDRGeometry.prototype.fromConditionalLines = function (ps) {
    let vertices = [];
    for (let i = 0; i < ps.length; i++) {
        let p = ps[i],
            idx;
        if (this.conditionalLines.hasOwnProperty(p.c)) {
            let t = this.conditionalLines[p.c];
            idx = t.length;
            t.push({});
        } else {
            this.conditionalLines[p.c] = [{}];
            idx = 0;
        }
        vertices.push({
            x: p.p1.x,
            y: p.p1.y,
            z: p.p1.z,
            c: p.c,
            idx: idx,
            p: 1
        }, {
            x: p.p2.x,
            y: p.p2.y,
            z: p.p2.z,
            c: p.c,
            idx: idx,
            p: 2
        }, {
            x: p.p3.x,
            y: p.p3.y,
            z: p.p3.z,
            c: p.c,
            idx: idx,
            p: 3
        }, {
            x: p.p4.x,
            y: p.p4.y,
            z: p.p4.z,
            c: p.c,
            idx: idx,
            p: 4
        });
        this.boundingBox.expandByPoint(p.p1);
        this.boundingBox.expandByPoint(p.p2);
    }
    this.sortAndBurnVertices(vertices, this.conditionalLines);
}
LDR.LDRGeometry.prototype.fromTriangles = function (cull, ps) {
    let vertices = [];
    let triangles = cull ? this.triangles : this.triangles2;
    let self = this;
    ps.forEach(p => {
        let idx;
        if (triangles.hasOwnProperty(p.c)) {
            let t = triangles[p.c];
            idx = t.length;
            t.push({});
        } else {
            triangles[p.c] = [{}];
            idx = 0;
        }
        vertices.push({
            x: p.p1.x,
            y: p.p1.y,
            z: p.p1.z,
            c: p.c,
            idx: idx,
            p: 1,
            t: p.tmp
        }, {
            x: p.p2.x,
            y: p.p2.y,
            z: p.p2.z,
            c: p.c,
            idx: idx,
            p: 2,
            t: p.tmp
        }, {
            x: p.p3.x,
            y: p.p3.y,
            z: p.p3.z,
            c: p.c,
            idx: idx,
            p: 3,
            t: p.tmp
        });
        self.boundingBox.expandByPoint(p.p1);
        self.boundingBox.expandByPoint(p.p2);
        self.boundingBox.expandByPoint(p.p3);
    });
    this.sortAndBurnVertices(vertices, triangles);
}
LDR.LDRGeometry.prototype.fromQuads = function (cull, ps) {
    let vertices = [];
    let quads = cull ? this.quads : this.quads2;
    let self = this;
    ps.forEach(p => {
        let idx;
        if (quads.hasOwnProperty(p.c)) {
            let t = quads[p.c];
            idx = t.length;
            t.push({});
        } else {
            quads[p.c] = [{}];
            idx = 0;
        }
        vertices.push({
            x: p.p1.x,
            y: p.p1.y,
            z: p.p1.z,
            c: p.c,
            idx: idx,
            p: 1,
            t: p.tmp
        }, {
            x: p.p2.x,
            y: p.p2.y,
            z: p.p2.z,
            c: p.c,
            idx: idx,
            p: 2,
            t: p.tmp
        }, {
            x: p.p3.x,
            y: p.p3.y,
            z: p.p3.z,
            c: p.c,
            idx: idx,
            p: 3,
            t: p.tmp
        }, {
            x: p.p4.x,
            y: p.p4.y,
            z: p.p4.z,
            c: p.c,
            idx: idx,
            p: 4,
            t: p.tmp
        });
        self.boundingBox.expandByPoint(p.p1);
        self.boundingBox.expandByPoint(p.p2);
        self.boundingBox.expandByPoint(p.p3);
        self.boundingBox.expandByPoint(p.p4);
    });
    this.sortAndBurnVertices(vertices, quads);
}
LDR.LDRGeometry.prototype.fromStep = function (loader, step) {
    let geometries = [];
    if (step.hasPrimitives) {
        let g = new LDR.LDRGeometry();
        g.fromPrimitives(step.lines, step.conditionalLines, step.triangles, step.quads);
        geometries.push(g);
    }

    function handleSubModel(subModel) {
        let g = new LDR.LDRGeometry();
        g.fromPartDescription(loader, subModel);
        geometries.push(g);
    }
    step.subModels.forEach(handleSubModel);
    this.replaceWith(LDR.mergeGeometries(geometries));
}
LDR.LDRGeometry.prototype.fromPartType = function (loader, pt) {
    if (pt.steps.length === 1) {
        this.fromStep(loader, pt.steps[0]);
    } else {
        console.warn('Expected 1 step. Skipping geometry for ' + pt.ID);
    }
}
LDR.LDRGeometry.prototype.fromPartDescription = function (loader, pd) {
    let pt = loader.getPartType(pd.ID);
    if (!pt) {
        throw "Part not loaded: " + pd.ID;
    }
    pt.ensureGeometry(loader);
    this.replaceWithDeep(pt.geometry);
    let m4 = new THREE.Matrix4();
    let m3e = pd.r.elements;
    m4.set(
        m3e[0], m3e[3], m3e[6], pd.p.x,
        m3e[1], m3e[4], m3e[7], pd.p.y,
        m3e[2], m3e[5], m3e[8], pd.p.z,
        0, 0, 0, 1
    );
    this.boundingBox.applyMatrix4(m4);
    let invert = pd.invertCCW !== (pd.r.determinant() < 0);
    let replaceColor;
    if (pd.c === 16) {
        replaceColor = x => '' + x;
    } else if (pd.c === 24) {
        replaceColor = x => x === '16' ? '24' : '' + x;
    } else if (pd.c < 0) {
        let pos = '' + pd.c;
        replaceColor = function (x) {
            if (x === '16' || x === '24') {
                return pos;
            } else {
                return '' + x;
            }
        };
    } else {
        let pos = '' + pd.c;
        let neg = '' + (-pd.c - 1);
        replaceColor = function (x) {
            if (x === '16') {
                return pos;
            } else if (x === '24') {
                return neg;
            } else {
                return '' + x;
            }
        };
    }
    let p = new THREE.Vector3();
    let lp = pd.logoPosition;
    for (let i = 0; i < this.vertices.length; i++) {
        let v = this.vertices[i];
        v.oldIndex = i;
        p.set(v.x, v.y, v.z);
        p.applyMatrix3(pd.r);
        p.add(pd.p);
        v.x = p.x;
        v.y = p.y;
        v.z = p.z;
        v.o = v.o || (lp && lp.x === v.x && lp.y === v.y && lp.z === v.z);
    }
    let newIndices = [];
    this.vertices.sort(LDR.vertexSorter);
    for (let i = 0; i < this.vertices.length; i++) {
        let v = this.vertices[i];
        newIndices[v.oldIndex] = i;
    }
    this.vertices.forEach(v => delete v.oldIndex);

    function t(withColors, transform) {
        let ret = {};
        for (let c in withColors) {
            if (!withColors.hasOwnProperty(c)) {
                continue;
            }
            let primitives = withColors[c].map(transform);
            let toColor = replaceColor(c);
            if (ret.hasOwnProperty(toColor)) {
                ret[toColor].push(...primitives);
            } else {
                ret[toColor] = primitives;
            }
        }
        return ret;
    }
    this.lines = t(this.lines, p => {
        return {
            p1: newIndices[p.p1],
            p2: newIndices[p.p2]
        };
    });
    this.conditionalLines = t(this.conditionalLines, p => {
        return {
            p1: newIndices[p.p1],
            p2: newIndices[p.p2],
            p3: newIndices[p.p3],
            p4: newIndices[p.p4]
        };
    });
    if (invert) {
        this.triangles = t(this.triangles, p => {
            return {
                p1: newIndices[p.p3],
                p2: newIndices[p.p2],
                p3: newIndices[p.p1]
            };
        });
        this.quads = t(this.quads, p => {
            return {
                p1: newIndices[p.p4],
                p2: newIndices[p.p3],
                p3: newIndices[p.p2],
                p4: newIndices[p.p1]
            };
        });
    } else {
        this.triangles = t(this.triangles, p => {
            return {
                p1: newIndices[p.p1],
                p2: newIndices[p.p2],
                p3: newIndices[p.p3]
            };
        });
        this.quads = t(this.quads, p => {
            return {
                p1: newIndices[p.p1],
                p2: newIndices[p.p2],
                p3: newIndices[p.p3],
                p4: newIndices[p.p4]
            };
        });
    }
    this.triangles2 = t(this.triangles2, p => {
        return {
            p1: newIndices[p.p3],
            p2: newIndices[p.p2],
            p3: newIndices[p.p1]
        };
    });
    this.quads2 = t(this.quads2, p => {
        return {
            p1: newIndices[p.p4],
            p2: newIndices[p.p3],
            p3: newIndices[p.p2],
            p4: newIndices[p.p1]
        };
    });
    if (!pd.cull) {
        function mv(from, to) {
            for (let c in from) {
                if (!from.hasOwnProperty(c)) {
                    continue;
                }
                if (!to.hasOwnProperty(c)) {
                    to[c] = [];
                }
                to[c].push(...from[c]);
            }
        }
        mv(this.triangles, this.triangles2);
        this.triangles = [];
        mv(this.quads, this.quads2);
        this.quads = [];
    }
    if (pd.texmapPlacement) {
        function copyDown(ps) {
            for (let c in ps) {
                if (ps.hasOwnProperty(c)) {
                    ps[c].forEach(t => t.t = pd.texmapPlacement);
                }
            }
        }
        copyDown(this.triangles);
        copyDown(this.triangle2);
        copyDown(this.quads);
        copyDown(this.quads2);
    }
}
LDR.LDRGeometry.prototype.mapIndices = function (map) {
    let map2 = function (p, map) {
        p.p1 = map[p.p1];
        p.p2 = map[p.p2];
    }
    let map3 = function (p, map) {
        p.p1 = map[p.p1];
        p.p2 = map[p.p2];
        p.p3 = map[p.p3];
    }
    let map4 = function (p, map) {
        p.p1 = map[p.p1];
        p.p2 = map[p.p2];
        p.p3 = map[p.p3];
        p.p4 = map[p.p4];
    }
    for (let c in this.lines) {
        if (this.lines.hasOwnProperty(c)) {
            this.lines[c].forEach(x => map2(x, map));
        }
    }
    for (let c in this.conditionalLines) {
        if (this.conditionalLines.hasOwnProperty(c)) {
            this.conditionalLines[c].forEach(x => map4(x, map));
        }
    }
    for (let c in this.triangles) {
        if (this.triangles.hasOwnProperty(c)) {
            this.triangles[c].forEach(x => map3(x, map));
        }
    }
    for (let c in this.triangles2) {
        if (this.triangles2.hasOwnProperty(c)) {
            this.triangles2[c].forEach(x => map3(x, map));
        }
    }
    for (let c in this.quads) {
        if (this.quads.hasOwnProperty(c)) {
            this.quads[c].forEach(x => map4(x, map));
        }
    }
    for (let c in this.quads2) {
        if (this.quads2.hasOwnProperty(c)) {
            this.quads2[c].forEach(x => map4(x, map));
        }
    }
}
LDR.LDRGeometry.prototype.merge = function (other) {
    this.boundingBox.min.min(other.boundingBox.min);
    this.boundingBox.max.max(other.boundingBox.max);
    let mergedVertices = [];
    let indexMapThis = [];
    let indexMapOther = [];
    let idxThis = 0,
        idxOther = 0;
    while (idxThis < this.vertices.length && idxOther < other.vertices.length) {
        let pThis = this.vertices[idxThis];
        let pOther = other.vertices[idxOther];
        if (LDR.vertexEqual(pThis, pOther)) {
            indexMapThis.push(mergedVertices.length);
            indexMapOther.push(mergedVertices.length);
            pThis.o = pThis.o || pOther.o;
            mergedVertices.push(pThis);
            ++idxThis;
            ++idxOther;
        } else if (LDR.vertexLessThan(pThis, pOther)) {
            indexMapThis.push(mergedVertices.length);
            mergedVertices.push(pThis);
            ++idxThis;
        } else {
            indexMapOther.push(mergedVertices.length);
            mergedVertices.push(pOther);
            ++idxOther;
        }
    }
    while (idxThis < this.vertices.length) {
        let pThis = this.vertices[idxThis];
        indexMapThis.push(mergedVertices.length);
        mergedVertices.push(pThis);
        ++idxThis;
    }
    while (idxOther < other.vertices.length) {
        let pOther = other.vertices[idxOther];
        indexMapOther.push(mergedVertices.length);
        mergedVertices.push(pOther);
        ++idxOther;
    }
    this.vertices = mergedVertices;
    this.mapIndices(indexMapThis);
    other.mapIndices(indexMapOther);

    function mergePrimitives(thisPrim, otherPrim) {
        for (let c in otherPrim) {
            if (!otherPrim.hasOwnProperty(c)) {
                continue;
            }
            if (thisPrim.hasOwnProperty(c)) {
                thisPrim[c].push(...otherPrim[c]);
            } else {
                thisPrim[c] = otherPrim[c];
            }
        }
    }
    mergePrimitives(this.lines, other.lines);
    mergePrimitives(this.conditionalLines, other.conditionalLines);
    mergePrimitives(this.triangles, other.triangles);
    mergePrimitives(this.triangles2, other.triangles2);
    mergePrimitives(this.quads, other.quads);
    mergePrimitives(this.quads2, other.quads2);
}
THREE.LDRLoader = function (onLoad, storage, options) {
    let self = this;
    this.partTypes = {};
    this.texmaps = {};
    this.texmapListeners = {};
    this.texmapDataurls = [];
    this.unloadedFiles = 0;
    this.onLoad = function () {
        let unloaded = [];
        for (let id in self.partTypes) {
            if (self.partTypes.hasOwnProperty(id)) {
                let partType = self.partTypes[id];
                if (partType === true) {
                    unloaded.push(id);
                }
            }
        }
        unloaded.forEach(id => delete self.partTypes[id]);
        onLoad();
    };

    function backupRetrievePartsFromStorage(loader, toBeFetched, onDone) {
        if (!LDR.Generator) {
            onDone(toBeFetched);
            return;
        }
        let stillToBeFetched = [];
        toBeFetched.forEach(id => {
            let pt = LDR.Generator.make(id)
            if (pt) {
                loader.setPartType(pt);
            } else {
                stillToBeFetched.push(id);
            }
        });
        onDone(stillToBeFetched);
    }
    this.storage = storage || {
        retrievePartsFromStorage: backupRetrievePartsFromStorage
    };
    this.options = options || {};
    this.onProgress = this.options.onProgress || function () {};
    this.onWarning = this.options.onWarning || console.dir;
    this.onError = this.options.onError || console.dir;
    this.loader = new THREE.FileLoader(this.options.manager || THREE.DefaultLoadingManager);
    this.physicalRenderingAge = this.options.physicalRenderingAge || 0;
    this.mainModel;
    this.idToUrl = this.options.idToUrl || function (id) {
        if (!id.endsWith(".dat")) {
            return [id];
        }
        let lowerID = id.toLowerCase();
        return ["ldraw_parts/" + lowerID, "ldraw_unofficial/" + lowerID];
    };
    this.idToTextureUrl = this.options.idToTextureUrl || function (id) {
        return "textures/" + id.toLowerCase();
    };
    this.cleanUpPrimitivesAndSubParts = this.options.cleanUpPrimitivesAndSubParts || false;
}
THREE.LDRLoader.prototype.load = function (id) {
    let urls = this.idToUrl(id);
    id = id.toLowerCase().replace('\\', '/');
    if (this.partTypes[id]) {
        if (this.partTypes[id] !== true) {
            this.reportProgress(id);
        }
        return;
    }
    this.partTypes[id] = true;
    let self = this;
    let onFileLoaded = function (text) {
        self.parse(text, id);
        self.unloadedFiles--;
        self.reportProgress(id);
    }
    let urlID = 0;
    let onError = function (event) {
        urlID++;
        if (urlID < urls.length) {
            self.loader.load(urls[urlID], onFileLoaded, undefined, onError);
        } else {
            self.unloadedFiles--;
            self.reportProgress(id);
            self.onError({
                message: event.currentTarget ? event.currentTarget.statusText : 'Error during loading',
                subModel: id
            });
        }
    }
    this.unloadedFiles++;
    this.loader.load(urls[urlID], onFileLoaded, undefined, onError);
};
THREE.LDRLoader.prototype.loadMultiple = function (ids) {
    let self = this;

    function onStorageFetchingDone(unloadedParts) {
        unloadedParts.forEach(id => self.load(id));
        self.unloadedFiles--;
        self.reportProgress(ids[0]);
    }
    self.unloadedFiles++;
    this.storage.retrievePartsFromStorage(this, ids, onStorageFetchingDone);
}
THREE.LDRLoader.prototype.reportProgress = function (id) {
    this.onProgress(id);
    if (this.unloadedFiles === 0) {
        this.onLoad();
    }
};
THREE.LDRLoader.prototype.parse = function (data, defaultID) {
    let parseStartTime = new Date();
    let self = this;
    let CCW = true;
    let localCull = true;
    let invertNext = false;
    let part = new THREE.LDRPartType();
    let step = new THREE.LDRStep();
    let loadedParts = [];

    function closeStep(keepRotation) {
        part.addStep(step);
        let rot = step.rotation;
        step = new THREE.LDRStep();
        if (keepRotation && rot !== null) {
            step.rotation = rot.clone();
        }
    }
    let modelDescription;
    let inHeader = true;
    let hasFILE = false;
    let skipPart = false;
    let texmapPlacement = null;
    let inTexmapFallback = false;
    let dataLines = data.split(/(\r\n)|\n/);
    for (let i = 0; i < dataLines.length; i++) {
        let line = dataLines[i];
        if (!line) {
            continue;
        }
        let parts = line.split(' ').filter(x => x !== '');
        if (parts.length <= 1) {
            continue;
        }
        let lineType = parseInt(parts[0]);
        if (lineType === 0 && parts.length > 2 && texmapPlacement && parts[1] === '!:') {
            parts = parts.slice(2);
            lineType = parseInt(parts[0]);
        }
        let colorID;
        if (lineType !== 0) {
            colorID = parts[1];
            if (colorID.length === 9 && colorID.substring(0, 3) === '0x2') {
                //Direct color:https://www.ldraw.org/article/218.html
                let hexValue = parseInt(colorID.substring(3), 16);
                LDR.Colors[hexValue] = {
                    name: 'Direct color 0x2' + colorID,
                    value: hexValue,
                    edge: hexValue,
                    direct: colorID
                };
                colorID = hexValue;
            } else if (LDR.Colors[colorID] === undefined) {
                this.onWarning({
                    message: 'Unknown color "' + colorID + '". Black (0) will be shown instead.',
                    line: i,
                    subModel: part.ID
                });
                colorID = 0;
            } else {
                colorID = parseInt(colorID);
            }
        }
        if (texmapPlacement && texmapPlacement.used) {
            texmapPlacement = null;
        }
        let l3 = parts.length >= 3;
        let is = type => l3 && type === parts[1];
        if (!part.modelDescription && modelDescription) {
            part.modelDescription = modelDescription;
            if (modelDescription.startsWith("~Unknown part ")) {
                self.onError({
                    message: 'Unknown part "' + part.ID + '". Please <a href="../upload.php">upload</a> this part for it to be shown correctly in this model. If you do not have it, perhaps you can find it <a href="https://www.ldraw.org/cgi-bin/ptscan.cgi?q=' + part.ID + '">here on LDraw.org</a>. For now it will be shown as a cube. <a href="#" onclick="bump();">Click here</a> once the part has been uploaded to load it into the model.',
                    line: i,
                    subModel: part.ID
                });
            }
            modelDescription = null;
        }
        let p1, p2, p3, p4;
        switch (lineType) {
            case 0:
                let saveThisCommentLine = true;

                function handleFileLine(originalFileName) {
                    let fileName = originalFileName.toLowerCase().replace('\\', '/');
                    localCull = true;
                    saveThisCommentLine = false;
                    let isEmpty = part.steps.length === 0 && step.isEmpty();
                    if (isEmpty && !self.mainModel) {
                        self.mainModel = part.ID = fileName;
                    } else if (isEmpty && self.mainModel && self.mainModel === part.ID) {
                        console.warn("Special case: Main model ID change from " + part.ID + " to " + fileName);
                        self.mainModel = part.ID = fileName;
                    } else {
                        closeStep(false);
                        if (!part.ID) {
                            console.warn(originalFileName, 'No ID in main model - setting default ID', defaultID);
                            console.dir(part);
                            console.dir(step);
                            part.ID = defaultID;
                            if (!self.mainModel) {
                                self.mainModel = defaultID;
                            }
                        }
                        if (!skipPart) {
                            self.setPartType(part);
                            loadedParts.push(part.ID);
                        }
                        skipPart = false;
                        self.onProgress(part.ID);
                        part = new THREE.LDRPartType();
                        inHeader = true;
                        part.ID = fileName;
                    }
                    part.name = originalFileName;
                    modelDescription = null;
                }
                if (is("FILE")) {
                    hasFILE = true;
                    handleFileLine(parts.slice(2).join(" "));
                    saveThisCommentLine = false;
                } else if (!hasFILE && is("file")) {
                    handleFileLine(parts.slice(2).join(" "));
                    saveThisCommentLine = false;
                } else if (is("Name:")) {
                    part.name = parts.slice(2).join(" ");
                    if (part.ID === part.name) {
                        part.consistentFileAndName = true;
                    }
                    saveThisCommentLine = false;
                } else if (is("Author:")) {
                    part.author = parts.slice(2).join(" ");
                    saveThisCommentLine = false;
                } else if (is("!LICENSE")) {
                    part.license = parts.slice(2).join(" ");
                    saveThisCommentLine = false;
                } else if (is("!LDRAW_ORG")) {
                    part.ldraw_org = parts.slice(2).join(" ");
                    saveThisCommentLine = false;
                } else if (is("!CMDLINE")) {
                    part.preferredColor = parseInt(parts[2].substring(2));
                    saveThisCommentLine = false;
                } else if (parts[1] === "BFC") {
                    //BFC documentation:http://www.ldraw.org/article/415
                    let option = parts[2];
                    switch (option) {
                        case "CERTIFY":
                            part.certifiedBFC = true;
                            part.CCW = CCW = true;
                            saveThisCommentLine = false;
                            break;
                        case "NOCERTIFY":
                            part.certifiedBFC = false;
                            part.CCW = CCW = true;
                            saveThisCommentLine = false;
                            break;
                        case "INVERTNEXT":
                            invertNext = true;
                            break;
                        case "CLIP":
                            localCull = true;
                            break;
                        case "NOCLIP":
                            localCull = false;
                            break;
                    }
                    if (parts[parts.length - 1] === "CCW") {
                        part.CCW = CCW = true;
                    } else if (parts[parts.length - 1] === "CW") {
                        part.CCW = CCW = false;
                    }
                } else if (parts[1] === "STEP") {
                    closeStep(true);
                    saveThisCommentLine = false;
                } else if (parts[1] === "ROTSTEP") {
                    if (parts.length >= 5) {
                        step.rotation = new THREE.LDRStepRotation(parts[2], parts[3], parts[4], (parts.length === 5 ? "REL" : parts[5]));
                    } else if (parts.length === 3 && parts[2] === "END") {
                        step.rotation = null;
                    }
                    closeStep(true);
                    saveThisCommentLine = false;
                } else if (parts[1] === "!BRICKHUB_INLINED") {
                    part.inlined = parts.length === 3 ? parts[2] : 'UNKNOWN';
                    saveThisCommentLine = false;
                } else if (parts[1] === "!TEXMAP") {
                    if (texmapPlacement) {
                        if (!(parts.length === 3 && (parts[2] === 'FALLBACK' || parts[2] === 'END'))) {
                            self.onWarning({
                                message: 'Unexpected !TEXMAP line. Expected FALLBACK or END line. Found: "' + line + '".',
                                line: i,
                                subModel: part.ID
                            });
                            inTexmapFallback = false;
                            texmapPlacement = null;
                        } else if (parts[2] === 'FALLBACK') {
                            inTexmapFallback = true;
                        } else {
                            inTexmapFallback = false;
                            texmapPlacement = null;
                        }
                    } else {
                        texmapPlacement = new LDR.TexmapPlacement();
                        texmapPlacement.setFromParts(parts);
                        if (texmapPlacement.error) {
                            self.onWarning({
                                message: texmapPlacement.error + ': "' + line + '"',
                                line: i,
                                subModel: part.ID
                            });
                            texmapPlacement = null;
                        }
                    }
                    saveThisCommentLine = false;
                } else if (parts[1] === "!DATA" && parts.length === 3 && parts[2] === "START") {
                    skipPart = true;
                    let encodedContent = '';
                    for (; i < dataLines.length; i++) {
                        line = dataLines[i];
                        if (!line) continue;
                        parts = line.split(' ').filter(x => x !== '');
                        if (parts.length <= 1) continue;
                        lineType = parseInt(parts[0]);
                        if (lineType !== 0) {
                            self.onWarning({
                                message: 'Unexpected DATA line type ' + lineType + ' is ignored.',
                                line: i,
                                subModel: part.ID
                            });
                            continue;
                        }
                        if (parts.length === 3 && parts[1] === '!DATA' && parts[2] === 'END') break;
                        if (!parts[1].startsWith('!:')) continue;
                        encodedContent += parts[1].substring(2);
                        if (parts.length > 2) encodedContent += parts.slice(2).join('');
                    }
                    console.warn('Inline texmap file encountered - standard not yet finalized, so errors might occur!');
                    let detectMimetype = id => id.endsWith('jpg') || id.endsWith('jpeg') ? 'jpeg' : 'png';
                    let pid = part.ID;
                    let mimetype = detectMimetype(pid);
                    let dataurl = 'data:image/' + mimetype + ';base64,' + encodedContent;
                    self.texmapDataurls.push({
                        id: pid,
                        mimetype: mimetype,
                        content: encodedContent
                    });
                    self.texmaps[pid] = true;
                    self.texmapListeners[pid] = [];
                    let image = new Image();
                    image.onload = function (e) {
                        let texture = new THREE.Texture(this);
                        texture.needsUpdate = true;
                        self.texmaps[pid] = texture;
                        self.texmapListeners[pid].forEach(l => l(texture));
                        self.onProgress(pid);
                    };
                    image.src = dataurl;
                    saveThisCommentLine = false;
                } else if (LDR.STUDIO && LDR.STUDIO.handleCommentLine(part, parts)) {
                    saveThisCommentLine = false;
                } else if (parts[1][0] === "!") {
                    if (is("!THEME") ||
                        is("!HELP") ||
                        is("!KEYWORDS") ||
                        is("!HISTORY") ||
                        is("!LPUB") ||
                        is("!LDCAD") ||
                        is("!LEOCAD") ||
                        is("!CATEGORY")) {} else {
                        invertNext = false;
                        self.onWarning({
                            message: 'Unknown LDraw command "' + parts[1] + '" is ignored.',
                            line: i,
                            subModel: part.ID
                        });
                    }
                } else {
                    invertNext = false;
                    modelDescription = line.substring(2);
                    if (inHeader) {
                        saveThisCommentLine = false;
                    }
                }
                if (saveThisCommentLine) {
                    let fileLine = new LDR.Line0(parts.slice(1).join(' '));
                    if (step.subModels.length > 0) {
                        step.subModels[step.subModels.length - 1].commentLines.push(fileLine);
                    } else {
                        part.headerLines.push(fileLine);
                    }
                }
                break;
            case 1:
                for (let j = 2; j < 14; j++) {
                    parts[j] = parseFloat(parts[j]);
                }
                let position = new THREE.Vector3(parts[2], parts[3], parts[4]);
                let rotation = new THREE.Matrix3();
                rotation.set(parts[5], parts[6], parts[7],
                    parts[8], parts[9], parts[10],
                    parts[11], parts[12], parts[13]);
                let subModelID = parts.slice(14).join(" ").toLowerCase().replace('\\', '/');
                let subModel = new THREE.LDRPartDescription(colorID, position, rotation, subModelID, part.certifiedBFC && localCull, invertNext, texmapPlacement);
                (inTexmapFallback ? texmapPlacement.fallback : step).addSubModel(subModel);
                inHeader = false;
                invertNext = false;
                break;
            case 2:
                p1 = new THREE.Vector3(parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
                p2 = new THREE.Vector3(parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]));
                (inTexmapFallback ? texmapPlacement.fallback : step).addLine(colorID, p1, p2, texmapPlacement);
                inHeader = false;
                invertNext = false;
                break;
            case 3:
                p1 = new THREE.Vector3(parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
                p2 = new THREE.Vector3(parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]));
                p3 = new THREE.Vector3(parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]));
                if (LDR.STUDIO && parts.length === 17) {
                    localCull = false;
                    texmapPlacement = LDR.STUDIO.handleTriangleLine(part, parts);
                }
                (inTexmapFallback ? texmapPlacement.fallback : step).addTriangle(colorID, p1, p2, p3, part.certifiedBFC && localCull, CCW === invertNext, texmapPlacement);
                inHeader = false;
                invertNext = false;
                break;
            case 4:
                p1 = new THREE.Vector3(parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
                p2 = new THREE.Vector3(parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]));
                p3 = new THREE.Vector3(parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]));
                p4 = new THREE.Vector3(parseFloat(parts[11]), parseFloat(parts[12]), parseFloat(parts[13]));
                if (!part.certifiedBFC || !localCull) {
                    step.cull = false;
                }
                (inTexmapFallback ? texmapPlacement.fallback : step).addQuad(colorID, p1, p2, p3, p4, part.certifiedBFC && localCull, CCW === invertNext, texmapPlacement);
                inHeader = false;
                invertNext = false;
                break;
            case 5:
                p1 = new THREE.Vector3(parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
                p2 = new THREE.Vector3(parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]));
                p3 = new THREE.Vector3(parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]));
                p4 = new THREE.Vector3(parseFloat(parts[11]), parseFloat(parts[12]), parseFloat(parts[13]));
                (inTexmapFallback ? texmapPlacement.fallback : step).addConditionalLine(colorID, p1, p2, p3, p4, texmapPlacement);
                inHeader = false;
                invertNext = false;
                break;
            default:
                self.onWarning({
                    message: 'Unknown command "' + parts[1] + '" is ignored.',
                    line: i,
                    subModel: part.ID
                });
                break;
        }
    }
    part.addStep(step);
    if (!part.ID) {
        part.ID = defaultID;
        if (!this.mainModel) {
            this.mainModel = part.ID;
        }
    }
    if (!skipPart) {
        this.setPartType(part);
        loadedParts.push(part.ID);
    }
    loadedParts = loadedParts.map(id => self.partTypes[id]);
    if (LDR.STUDIO) {
        loadedParts.forEach(part => LDR.STUDIO.handlePart(self, part));
    }
    this.onPartsLoaded(loadedParts);
    if (this.storage.db) {
        if (this.options.hasOwnProperty('key') && this.options.hasOwnProperty('timestamp')) {
            self.storage.saveInstructionsToStorage(self, self.options.key, self.options.timestamp);
        }
        self.storage.savePartsToStorage(loadedParts, self);
    }
};
THREE.LDRLoader.prototype.loadTexmaps = function () {
    let self = this;
    if (LDR.TexmapPlacements.length > 0) {
        if (!this.texmapLoader) {
            this.texmapLoader = new THREE.TextureLoader();
        }

        function setTexture(texture, file) {
            self.texmaps[file] = texture;
            self.texmapListeners[file].forEach(listener => listener(texture));
        }
        LDR.TexmapPlacements.forEach(tmp => {
            let file = tmp.file;
            if (!self.texmaps.hasOwnProperty(file)) {
                self.texmaps[file] = true;
                self.texmapListeners[file] = [];
                self.texmapLoader.load(self.idToTextureUrl(file),
                    t => setTexture(t, file),
                    undefined,
                    e => self.onError({
                        error: e,
                        message: e.message,
                        subModel: file
                    }));
            }
        });
    }
}
THREE.LDRLoader.prototype.generate = function (colorID, mc, taskList) {
    this.loadTexmaps();
    let mainModel = this.getMainModel();
    let origo = new THREE.Vector3();
    let inv = new THREE.Matrix3();
    inv.set(1, 0, 0, 0, -1, 0, 0, 0, -1);
    if (this.cleanUpPrimitivesAndSubParts) {
        mainModel.setReferencedFrom(this);
    }
    mainModel.generateThreePart(this, colorID, origo, inv, true, false, mc, null, taskList);
}
THREE.LDRLoader.prototype.onPartsLoaded = function (loadedParts) {
    let self = this;
    if (!loadedParts) {
        loadedParts = [];
        this.applyOnPartTypes(pt => loadedParts.push(pt));
    }
    let unloadedPartsSet = {};
    let unloadedPartsList = [];

    function checkPart(id) {
        if (!(self.partTypes.hasOwnProperty(id) || unloadedPartsSet.hasOwnProperty(id))) {
            unloadedPartsSet[id] = true;
            unloadedPartsList.push(id);
        }
    }
    loadedParts.forEach(pt => pt.steps.forEach(s => s.subModels.forEach(sm => checkPart(sm.ID))));
    loadedParts.forEach(pt => pt.isPart = pt.computeIsPart(self));
    loadedParts.forEach(pt => pt.cleanUp(self));
    loadedParts.forEach(pt => {
        if (pt.steps.length === 0) self.purgePart(pt.ID);
    });
    if (this.options.buildAssemblies) {
        if (!this.assemblyManager) {
            this.assemblyManager = new LDR.AssemblyManager(this);
        }
        const AM = this.assemblyManager;
        loadedParts.forEach(pt => AM.handlePartType(pt));
        let handleAssemblies = pt => {
            if (!pt.isPart) {
                pt.steps.forEach(s => AM.handleStep(s).forEach(checkPart));
            }
        };
        loadedParts.forEach(handleAssemblies);
    }
    if (unloadedPartsList.length > 0) {
        self.loadMultiple(unloadedPartsList);
    }
}
THREE.LDRLoader.prototype.getPartType = function (id) {
    if (!this.partTypes.hasOwnProperty(id)) {
        let pt;
        if (LDR.Generator && (pt = LDR.Generator.make(id))) {
            return this.partTypes[id] = pt;
        }
        return null;
    }
    let pt = this.partTypes[id];
    if (pt === true) {
        return null;
    }
    return pt;
}
THREE.LDRLoader.prototype.setPartType = function (pt) {
    this.partTypes[pt.ID] = pt;
    if (this.options.buildAssemblies) {
        if (!this.assemblyManager) {
            this.assemblyManager = new LDR.AssemblyManager(this);
        }
        this.assemblyManager.handlePartType(pt);
    }
}
THREE.LDRLoader.prototype.getMainModel = function () {
    if (!this.mainModel) {
        throw 'No main model set for ldrLoader!';
    }
    if (!this.partTypes.hasOwnProperty(this.mainModel)) {
        throw 'Inconsistent internal storage for ldrLoader: No main model!';
    }
    let pt = this.partTypes[this.mainModel];
    if (pt === true) {
        throw 'Main model not yet loaded!';
    }
    return pt;
}
THREE.LDRLoader.prototype.applyOnPartTypes = function (f) {
    for (let id in this.partTypes) {
        if (!this.partTypes.hasOwnProperty(id)) {
            continue;
        }
        let pt = this.partTypes[id];
        if (pt === true) {
            continue;
        }
        f(pt);
    }
}
THREE.LDRLoader.prototype.toLDR = function () {
    let self = this;
    let ret = this.getMainModel().toLDR(this);
    let seen = {};

    function see(id) {
        if (seen.hasOwnProperty(id)) {
            return;
        }
        seen[id] = true;
        let pt = self.getPartType(id);
        pt.steps.forEach(step => step.subModels.forEach(sm => see(sm.ID)));
    }
    see(this.mainModel);
    this.applyOnPartTypes(pt => {
        if (seen.hasOwnProperty(pt.ID) &&
            !(pt.inlined || pt.ID === self.mainModel || pt.isOfficialLDraw())) {
            ret += pt.toLDR(self);
            delete seen[pt.ID];
        }
    });
    const CHARACTERS_PER_LINE = 76;

    function outputDataUrl(id, mimetype, content) {
        ret += "0 FILE " + id + "\r\n";
        ret += "0 !DATA START\r\n";
        let lines = Math.ceil(content.length / CHARACTERS_PER_LINE);
        for (let i = 0; i < content.length; i += CHARACTERS_PER_LINE) {
            ret += "0 !:" + content.substr(i, CHARACTERS_PER_LINE) + "\r\n";
        }
        ret += "0 !DATA END\r\n\r\n";
    }
    this.texmapDataurls.forEach(obj => outputDataUrl(obj.id, obj.mimetype, obj.content));
    return ret;
}
THREE.LDRLoader.prototype.substituteReplacementParts = function () {
    let self = this;
    let replacementMap = {};

    function buildReplacementMap(pt) {
        if (pt.replacement) {
            replacementMap[pt.ID] = pt.replacement;
        }
    }
    this.applyOnPartTypes(buildReplacementMap);

    function fixReplacedParts(pt) {
        pt.steps.forEach(step => step.subModels.forEach(sm => {
            if (replacementMap.hasOwnProperty(sm.ID)) {
                sm.ID = replacementMap[sm.ID]
            }
        }));
    }
    this.applyOnPartTypes(fixReplacedParts);
}
THREE.LDRLoader.prototype.unpack = function (obj) {
    let self = this;
    let names = obj['names'].split('¤');
    let parts = [];
    this.mainModel = names[0];
    let arrayI = obj['i'];
    let arrayF = obj['f'];
    let arrayS = obj['s'].split('¤');
    let idxI = 0,
        idxF = 0,
        idxS = 0;
    let numberOfTexmaps = arrayI[idxI++];
    for (let i = 0; i < numberOfTexmaps; i++) {
        let tmp = new LDR.TexmapPlacement();
        [idxI, idxF, idxS] = tmp.unpackFrom(arrayI, arrayF, arrayS, idxI, idxF, idxS, names);
        if (tmp.idx !== LDR.TexmapPlacements.length) {
            console.error('Indexing error on packed texmap. Expected ' + LDR.TexmapPlacements.length + ', found ' + tmp.idx);
        }
        LDR.TexmapPlacements.push(tmp);
    }
    let numberOfDataurls = arrayI[idxI++];
    for (let i = 0; i < numberOfDataurls; i++) {
        let id = arrayS[idxS++];
        let mimetype = arrayS[idxS++];
        let content = arrayS[idxS++];
        self.texmapDataurls.push({
            id: id,
            mimetype: mimetype,
            content: content
        });
        self.texmaps[id] = true;
        self.texmapListeners[id] = [];
        let image = new Image();
        image.onload = function (e) {
            let texture = new THREE.Texture(this);
            texture.needsUpdate = true;
            self.texmaps[id] = texture;
            self.texmapListeners[id].forEach(l => l(texture));
            self.onProgress(id);
        };
        let dataurl = 'data:image/' + mimetype + ';base64,' + content;
        image.src = dataurl;
    }
    names.forEach((name, i) => {
        let numSteps = arrayI[idxI++];
        if (numSteps === 0) {
            parts.push(name);
            return;
        }
        let pt = new THREE.LDRPartType();
        pt.ID = pt.name = name;
        pt.cleanSteps = true;
        for (let j = 0; j < numSteps; j++) {
            let step = new THREE.LDRStep();
            [idxI, idxF, idxS] = step.unpackFrom(arrayI, arrayF, arrayS, idxI, idxF, idxS, names, LDR.TexmapPlacements);
            let r = arrayI[idxI++];
            if (r) {
                step.rotation = new THREE.LDRStepRotation(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++], r === 1 ? 'ABS' : 'REL');
            }
            pt.steps.push(step);
        }
        let numHeaderLines = arrayI[idxI++];
        for (let j = 0; j < numHeaderLines; j++) {
            pt.headerLines.push(new LDR.Line0(arrayS[idxS++]));
        }
        if (obj.hasOwnProperty('d' + i)) {
            pt.modelDescription = obj['d' + i];
        }
        if (obj.hasOwnProperty('n' + i)) {
            let inlined = obj['n' + i];
            pt.inlined = (inlined === -1) ? 'UNOFFICIAL' : inlined;
        }
        if (obj.hasOwnProperty('e' + i)) {
            let encoded = obj['e' + i];
            pt.certifiedBFC = encoded % 2 === 1;
            pt.CCW = Math.floor(encoded / 2) % 2 === 1;
        }
        self.partTypes[name] = pt;
    });
    this.onPartsLoaded();
    return parts;
}
THREE.LDRLoader.prototype.pack = function () {
    let self = this;
    let mainModel = this.getMainModel();
    let nameMap = {};
    nameMap[mainModel.ID] = 0;
    let names = [mainModel.ID];

    function scanName(id) {
        if (nameMap.hasOwnProperty(id)) {
            return;
        }
        nameMap[id] = names.length;
        names.push(id);
        let pt = self.getPartType(id);
        if (pt && !pt.canBePacked()) {
            scanNames(pt);
        }
    }

    function scanNames(pt) {
        pt.steps.forEach(step => step.subModels.forEach(sm => scanName(sm.ID)));
    }
    scanNames(mainModel);
    LDR.TexmapPlacements.forEach(tmp => tmp.fallback.subModels.forEach(sm => scanName(sm.ID)));
    let ret = {
        names: names.join('¤')
    };
    let arrayF = [],
        arrayI = [],
        arrayS = [];
    arrayI.push(LDR.TexmapPlacements.length);
    LDR.TexmapPlacements.forEach(tmp => tmp.packInto(arrayI, arrayF, arrayS, nameMap));
    arrayI.push(this.texmapDataurls.length);
    this.texmapDataurls.forEach(x => arrayS.push(x.id, x.mimetype, x.content));
    names.forEach((id, idx) => {
        let pt = self.getPartType(id);
        if (!pt || pt.canBePacked() || pt.inlined === 'GENERATED' || pt.inlined === 'IDB') {
            arrayI.push(0);
            return;
        }
        arrayI.push(pt.steps.length);
        pt.steps.forEach(step => {
            step.packInto(arrayI, arrayF, arrayS, nameMap, true);
            if (step.rotation) {
                let r = step.rotation;;
                arrayI.push(r.type === 'ABS' ? 1 : 2);
                arrayF.push(r.x, r.y, r.z);
            } else {
                arrayI.push(0);
            }
        });
        arrayI.push(pt.headerLines.length);
        arrayS.push(...pt.headerLines.map(line => line.txt));
        if (pt.isPart) {
            if (pt.modelDescription) {
                ret['d' + idx] = pt.modelDescription;
            }
            if (pt.inlined) {
                ret['n' + idx] = (pt.inlined === 'UNOFFICIAL' ? -1 : pt.inlined);
            }
            let headerCode = (pt.CCW ? 2 : 0) + (pt.certifiedBFC ? 1 : 0);
            ret['e' + idx] = headerCode;
        }
    });
    if (arrayI.some(val => val > 32767)) {
        ret['i'] = new Int32Array(arrayI);
    } else {
        ret['i'] = new Int16Array(arrayI);
    }
    ret['f'] = new Float32Array(arrayF);
    ret['s'] = arrayS.join('¤');
    return ret;
}
THREE.LDRPartDescription = function (colorID, position, rotation, ID, cull, invertCCW, texmapPlacement) {
    this.c = colorID;
    this.p = position;
    this.r = rotation;
    this.ID = ID.toLowerCase();
    this.cull = cull;
    this.invertCCW = invertCCW;
    this.tmp = texmapPlacement;
    this.ghost;
    this.original;
    this.commentLines = [];
    texmapPlacement && texmapPlacement.use();
}
THREE.LDRPartDescription.prototype.cloneColored = function (colorID) {
    if (this.original) {
        console.dir(this);
        throw "Cloning non-original PD to color " + colorID;
    }
    let c = this.c;
    if (this.c === 16) {
        c = colorID;
    } else if (this.c === 24) {
        c = -colorID - 1;
    }
    let ret = new THREE.LDRPartDescription(c, this.p, this.r, this.ID,
        this.cull, this.invertCCW, this.texmapPlacement);
    ret.REPLACEMENT_PLI = this.REPLACEMENT_PLI;
    ret.commentLines.push(...this.commentLines);
    ret.original = this;
    ret.ghost = this.ghost || false;
    return ret;
}
THREE.LDRPartDescription.prototype.placedColor = function (pdColorID) {
    let c = this.c;
    if (c === 16) {
        c = pdColorID;
    } else if (c === 24) {
        c = (pdColorID === 16) ? 24 : pdColorID;
    }
    return c;
}
THREE.LDRPartDescription.prototype.toLDR = function (loader) {
    let pt = loader.getPartType(this.ID);
    let ret = '1 ' + this.c + ' ' + this.p.toLDR() + ' ' + this.r.toLDR() + ' ' + pt.ID + '\r\n';
    this.commentLines.forEach(x => ret += x.toLDR());
    return ret;
}
THREE.LDRPartDescription.prototype.placeAt = function (pd) {
    let c = this.placedColor(pd.c);
    let p = new THREE.Vector3();
    p.copy(this.p);
    p.applyMatrix3(pd.r);
    p.add(pd.p);
    let r = new THREE.Matrix3();
    r.multiplyMatrices(pd.r, this.r);
    let invert = this.invertCCW === pd.invertCCW;
    let ret = new THREE.LDRPartDescription(c, p, r, this.ID, this.cull, invert, this.texmapPlacement);
    ret.commentLines.push(...this.commentLines);
    return ret;
}
THREE.LDRStepRotation = function (x, y, z, type) {
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    this.z = parseFloat(z);
    this.type = type.toUpperCase();
}
THREE.LDRStepRotation.equals = function (a, b) {
    let aNull = !a;
    let bNull = !b;
    if (aNull && bNull) {
        return true;
    }
    if (aNull !== bNull) {
        if (!aNull) {
            return a.isDefault();
        }
        if (!bNull) {
            return b.isDefault();
        }
        return false;
    }
    return (a.x === b.x) && (a.y === b.y) && (a.z === b.z) && (a.type === b.type);
}
THREE.LDRStepRotation.prototype.isDefault = function () {
    return this.type === 'REL' && this.x === 0 && this.y === 0 && this.z === 0;
}
THREE.LDRStepRotation.prototype.clone = function () {
    return new THREE.LDRStepRotation(this.x, this.y, this.z, this.type);
}
THREE.LDRStepRotation.prototype.toLDR = function () {
    return '0 ROTSTEP ' + this.x + ' ' + this.y + ' ' + this.z + ' ' + this.type + '\r\n';
}
THREE.LDRStepRotation.getAbsRotationMatrix = function () {
    let looker = new THREE.Object3D();
    looker.position.set(-10000, -7000, -10000);
    looker.lookAt(new THREE.Vector3());
    looker.updateMatrix();
    let m = new THREE.Matrix4();
    m.extractRotation(looker.matrix);
    return m;
}
THREE.LDRStepRotation.ABS = THREE.LDRStepRotation.getAbsRotationMatrix();
THREE.LDRStepRotation.prototype.getRotationMatrix = function (defaultMatrix) {
    let wx = this.x / 180.0 * Math.PI;
    let wy = -this.y / 180.0 * Math.PI;
    let wz = -this.z / 180.0 * Math.PI;
    let s1 = Math.sin(wx);
    let s2 = Math.sin(wy);
    let s3 = Math.sin(wz);
    let c1 = Math.cos(wx);
    let c2 = Math.cos(wy);
    let c3 = Math.cos(wz);
    let a = c2 * c3;
    let b = -c2 * s3;
    let c = s2;
    let d = c1 * s3 + s1 * s2 * c3;
    let e = c1 * c3 - s1 * s2 * s3;
    let f = -s1 * c2;
    let g = s1 * s3 - c1 * s2 * c3;
    let h = s1 * c3 + c1 * s2 * s3;
    let i = c1 * c2;
    let rotationMatrix = new THREE.Matrix4();
    rotationMatrix.set(a, b, c, 0,
        d, e, f, 0,
        g, h, i, 0,
        0, 0, 0, 1);
    let ret = new THREE.Matrix4();
    if (this.type === "REL") {
        ret.multiplyMatrices(defaultMatrix, rotationMatrix);
    } else if (this.type === "ADD") {
        throw "Unsupported rotation type: ADD!"
    } else {
        ret.multiplyMatrices(THREE.LDRStepRotation.ABS, rotationMatrix);
    }
    return ret;
}
THREE.LDRStepIdx = 0;
THREE.LDRStep = function () {
    this.idx = THREE.LDRStepIdx++;
    this.hasPrimitives = false;
    this.subModels = [];
    this.lines = [];
    this.conditionalLines = [];
    this.triangles = [];
    this.quads = [];
    this.rotation = null;
    this.cnt = -1;
    this.original;
}
THREE.LDRStep.prototype.pack = function (obj, saveCommentLines) {
    let arrayI = [],
        arrayF = [],
        arrayS = [];
    let subModelMap = {};
    let subModelList = [];

    function mapSubModel(sm) {
        let id = sm.ID;
        if (!subModelMap.hasOwnProperty(id)) {
            subModelMap[id] = subModelList.length;
            let shortID = id.substring(0, id.length - 4);
            subModelList.push(shortID);
        }
    }
    this.subModels.forEach(mapSubModel);
    let texmapPlacements = {};
    let numberOfTexmapPlacements = this.getTexmapPlacements(texmapPlacements);
    arrayI.push(numberOfTexmapPlacements);
    for (let idx in texmapPlacements) {
        if (texmapPlacements.hasOwnProperty(idx)) {
            texmapPlacements[idx].fallback.subModels.forEach(mapSubModel);
        }
    }
    for (let idx in texmapPlacements) {
        if (texmapPlacements.hasOwnProperty(idx)) {
            texmapPlacements[idx].packInto(arrayI, arrayF, arrayS, subModelMap);
        }
    }
    if (subModelList.length > 0) {
        obj.sp = subModelList.join('|');
    }
    this.packInto(arrayI, arrayF, arrayS, subModelMap, saveCommentLines);
    if (arrayS.length > 0) {
        obj.sx = arrayS.join('¤');
    }
    if (arrayI.some(val => val > 32767)) {
        obj.ai = new Int32Array(arrayI);
    } else {
        obj.ai = new Int16Array(arrayI);
    }
    obj.af = new Float32Array(arrayF);
}
THREE.LDRStep.prototype.packInto = function (arrayI, arrayF, arrayS, subModelMap, saveCommentLines) {
    arrayI.push(this.subModels.length);

    function handleSubModel(sm) {
        if (!subModelMap.hasOwnProperty(sm.ID)) {
            console.dir(subModelMap);
            throw "Unknown sub model " + sm.ID + ' not in map!';
        }
        arrayI.push(sm.c);
        arrayI.push(sm.texmapPlacement ? sm.texmapPlacement.idx : -1);
        arrayI.push((subModelMap[sm.ID] * 4) +
            (sm.invertCCW ? 2 : 0) +
            (sm.cull ? 1 : 0));
        if (saveCommentLines) {
            arrayI.push(sm.commentLines.length);
            sm.commentLines.forEach(x => arrayS.push(x.txt));
        } else {
            arrayI.push(0);
        }
        arrayF.push(sm.p.x, sm.p.y, sm.p.z);
        let e = sm.r.elements;
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                arrayF.push(e[x + y * 3]);
            }
        }
    }
    this.subModels.forEach(handleSubModel);

    function handle(primitives) {
        arrayI.push(primitives.length);
        primitives.forEach(x => x.pack(arrayI, arrayF));
    }
    handle(this.lines);
    handle(this.triangles);
    handle(this.quads);
    handle(this.conditionalLines);
}
THREE.LDRStep.prototype.unpack = function (obj) {
    let arrayI = obj.ai;
    let arrayF = obj.af;
    let arrayS = obj.sx ? obj.sx.split('¤') : [];
    let subModelList = obj.sp ? obj.sp.split('|').map(x => x += '.dat') : [];
    let idxI = 0,
        idxF = 0,
        idxS = 0;
    let numberOfTexmapPlacements = arrayI[idxI++];
    let texmapPlacementMap = {};
    for (let i = 0; i < numberOfTexmapPlacements; i++) {
        let texmapPlacement = new LDR.TexmapPlacement();
        [idxI, idxF, idxS] = texmapPlacement.unpackFrom(arrayI, arrayF, arrayS, idxI, idxF, idxS, subModelList);
        texmapPlacementMap[texmapPlacement.idx] = texmapPlacement;
        texmapPlacement.idx = LDR.TexmapPlacements.length;
        LDR.TexmapPlacements.push(texmapPlacement);
    }
    this.unpackFrom(arrayI, arrayF, arrayS, idxI, idxF, idxS, subModelList, texmapPlacementMap);
}
THREE.LDRStep.prototype.unpackFrom = function (arrayI, arrayF, arrayS, idxI, idxF, idxS, subModelList, texmapPlacementMap) {
    let self = this;

    function ensureColor(c) {
        if (!LDR.Colors.hasOwnProperty(c)) {
            let hex = c.toString(16);
            LDR.Colors[c] = {
                name: 'Direct color 0x2' + hex,
                value: c,
                edge: c,
                direct: hex
            };
        }
    }
    let numSubModels = arrayI[idxI++];
    for (let i = 0; i < numSubModels; i++) {
        let c = arrayI[idxI++];
        ensureColor(c);
        let texmapIdx = arrayI[idxI++];
        var texmapPlacement = texmapIdx >= 0 ? texmapPlacementMap[texmapIdx] : null;
        let packed = arrayI[idxI++];
        let cull = (packed % 2 === 1);
        packed -= cull ? 1 : 0;
        let invertCCW = (Math.floor(packed / 2) % 2) === 1;
        packed -= invertCCW ? 2 : 0;
        let ID = subModelList[packed / 4];
        let commentLines = arrayI[idxI++];
        let position = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
        let rotation = new THREE.Matrix3();
        rotation.set(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++],
            arrayF[idxF++], arrayF[idxF++], arrayF[idxF++],
            arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
        let subModel = new THREE.LDRPartDescription(c, position, rotation, ID, cull, invertCCW, texmapPlacement);
        for (let j = 0; j < commentLines; j++) {
            subModel.commentLines.push(new LDR.Line0(arrayS[idxS++]));
        }
        this.addSubModel(subModel);
    }

    function handle(makeLine) {
        let ret = [];
        let numPrimitives = arrayI[idxI++];
        for (let i = 0; i < numPrimitives; i++) {
            self.hasPrimitives = true;
            let p = makeLine();
            [idxI, idxF] = p.unpackFrom(arrayI, arrayF, idxI, idxF, texmapPlacementMap);
            ensureColor(p.c);
            ret.push(p);
        }
        return ret;
    }
    this.lines = handle(() => new LDR.Line2());
    this.triangles = handle(() => new LDR.Line3());
    this.quads = handle(() => new LDR.Line4());
    this.conditionalLines = handle(() => new LDR.Line5());
    return [idxI, idxF, idxS];
}
THREE.LDRStep.prototype.getTexmapPlacements = function (seen) {
    let ret = 0;

    function handle(p) {
        if (!p.tmp) {
            return;
        }
        let idx = p.tmp.idx;
        if (seen.hasOwnProperty(idx)) {
            return;
        }
        seen[idx] = p.tmp;
        ret++;
    }
    this.subModels.forEach(handle);
    this.triangles.forEach(handle);
    this.quads.forEach(handle);
    return ret;
}
THREE.LDRStep.prototype.cloneColored = function (colorID) {
    if (this.hasPrimitives) {
        throw "Cannot clone step with primitives!";
    }
    let ret = new THREE.LDRStep();
    ret.hasPrimitives = false;
    ret.subModels = this.subModels.map(subModel => subModel.cloneColored(colorID));
    ret.rotation = this.rotation;
    ret.cnt = this.cnt;
    ret.original = this;
    return ret;
}
THREE.LDRStep.prototype.toLDR = function (loader, prevStepRotation, isLastStep) {
    let ret = '';
    let tmpMap = {};

    function check(line) {
        let tmp = line.tmp;
        if (tmp) {
            let idx = tmp.idx;
            if (!tmpMap.hasOwnProperty(idx)) {
                tmpMap[idx] = [];
            }
            tmpMap[idx].push(line);
        }
    }
    this.subModels.forEach(check);
    this.triangles.forEach(check);
    this.quads.forEach(check);
    for (let idx in tmpMap) {
        if (tmpMap.hasOwnProperty(idx)) {
            let lines = tmpMap[idx];
            ret += LDR.TexmapPlacements[idx].toLDR(lines, loader);
        }
    }

    function output(p) {
        if (!p.tmp) {
            ret += p.toLDR(loader);
        }
    }
    this.subModels.forEach(output);
    this.lines.forEach(output);
    this.triangles.forEach(output);
    this.quads.forEach(output);
    this.conditionalLines.forEach(output);
    if (!this.rotation) {
        if (prevStepRotation) {
            ret += '0 ROTSTEP END\r\n';
        } else if (!isLastStep) {
            ret += '0 STEP\r\n';
        }
    } else {
        if (THREE.LDRStepRotation.equals(this.rotation, prevStepRotation)) {
            ret += '0 STEP\r\n';
        } else {
            ret += this.rotation.toLDR();
        }
    }
    return ret;
}
THREE.LDRStep.prototype.isEmpty = function () {
    return this.subModels.length === 0 && !this.hasPrimitives;
}
THREE.LDRStep.prototype.addSubModel = function (subModel) {
    this.subModels.push(subModel);
}
THREE.LDRStep.prototype.addLine = function (c, p1, p2, texmapPlacement) {
    this.hasPrimitives = true;
    this.lines.push(new LDR.Line2(c, p1, p2, texmapPlacement));
    texmapPlacement && texmapPlacement.use();
}
THREE.LDRStep.prototype.addTriangle = function (c, p1, p2, p3, cull, invert, texmapPlacement) {
    this.hasPrimitives = true;
    this.triangles.push(new LDR.Line3(c, p1, p2, p3, cull, invert, texmapPlacement));
    texmapPlacement && texmapPlacement.use();
}
THREE.LDRStep.prototype.addQuad = function (c, p1, p2, p3, p4, cull, invert, texmapPlacement) {
    this.hasPrimitives = true;
    this.quads.push(new LDR.Line4(c, p1, p2, p3, p4, cull, invert, texmapPlacement));
    texmapPlacement && texmapPlacement.use();
}
THREE.LDRStep.prototype.addConditionalLine = function (c, p1, p2, p3, p4, texmapPlacement) {
    this.hasPrimitives = true;
    this.conditionalLines.push(new LDR.Line5(c, p1, p2, p3, p4, texmapPlacement));
    texmapPlacement && texmapPlacement.use();
}
THREE.LDRStep.prototype.containsNonPartSubModels = function (loader) {
    if (this.subModels.length === 0) {
        return false;
    }
    let firstSubModel = loader.getPartType(this.subModels[0].ID);
    return !(!firstSubModel || firstSubModel.isPart);
}
THREE.LDRStep.prototype.containsPartSubModels = function (loader) {
    if (this.subModels.length === 0) {
        return false;
    }
    let firstSubModel = loader.getPartType(this.subModels[0].ID);
    return firstSubModel.isPart;
}
THREE.LDRStep.prototype.countParts = function (loader) {
    if (this.cnt >= 0) {
        return this.cnt;
    }
    let cnt = 0;
    this.subModels.forEach(function (subModel) {
        if (subModel.REPLACEMENT_PLI === true) {
            return;
        }
        let pt = loader.getPartType(subModel.ID);
        if (!pt) {
            console.warn("Unknown part type: " + subModel.ID);
            return;
        }
        if (pt.isPart) {
            cnt++;
        } else {
            cnt += pt.countParts(loader);
        }
    });
    this.cnt = cnt;
    return cnt;
}
THREE.LDRStep.prototype.cleanUp = function (loader, newSteps) {
    if (this.isEmpty() || this.hasPrimitives) {
        newSteps.push(this);
        return;
    }
    let self = this;
    let parts = [];
    let subModelsByTypeAndColor = {};

    function handleSubModel(subModelDesc) {
        let subModel = loader.getPartType(subModelDesc.ID);
        if (!subModel || subModel.isPart) {
            parts.push(subModelDesc);
        } else {
            subModel.cleanUp(loader);
            let key = subModelDesc.c + '_' + subModel.ID;
            if (subModelsByTypeAndColor.hasOwnProperty(key)) {
                subModelsByTypeAndColor[key].push(subModelDesc);
            } else {
                subModelsByTypeAndColor[key] = [subModelDesc];
            }
        }
    }
    this.subModels.forEach(handleSubModel);

    function push(subModels) {
        let newStep = new THREE.LDRStep();
        newStep.subModels = subModels;
        newStep.rotation = self.rotation ? self.rotation.clone() : null;
        newSteps.push(newStep);
    }
    for (let key in subModelsByTypeAndColor) {
        if (subModelsByTypeAndColor.hasOwnProperty(key)) {
            push(subModelsByTypeAndColor[key]);
        }
    }
    if (parts.length > 0) {
        push(parts);
    }
}
THREE.LDRStep.prototype.generateThreePart = function (loader, colorID, position, rotation, cull, invertCCW, mc, taskList) {
    let ownInversion = (rotation.determinant() < 0) !== invertCCW;

    function transformColor(subColorID) {
        if (subColorID === 16) {
            return colorID;
        } else if (subColorID === 24) {
            return colorID < 0 ? colorID : -colorID - 1;
        }
        return subColorID;
    }

    function transformPoint(p) {
        let ret = new THREE.Vector3(p.x, p.y, p.z);
        ret.applyMatrix3(rotation);
        ret.add(position);
        return ret;
    }

    function handleSubModel(subModelDesc) {
        let subModelInversion = invertCCW !== subModelDesc.invertCCW;
        let subModelCull = subModelDesc.cull && cull;
        let subModelColor = transformColor(subModelDesc.c);
        let subModel = loader.getPartType(subModelDesc.ID);
        if (!subModel) {
            loader.onError({
                message: "Unloaded sub model!",
                subModel: subModelDesc.ID
            });
            return;
        }
        if (subModel.replacement) {
            let replacementSubModel = loader.getPartType(subModel.replacement);
            if (!replacementSubModel) {
                throw {
                    name: "UnloadedSubmodelException",
                    level: "Severe",
                    message: "Unloaded replaced sub model: " + subModel.replacement + " replacing " + subModelDesc.ID,
                    htmlMessage: "Unloaded replaced sub model: " + subModel.replacement + " replacing " + subModelDesc.ID,
                    toString: function () {
                        return this.name + ": " + this.message;
                    }
                };
            }
            subModel = replacementSubModel;
        }
        let nextPosition = transformPoint(subModelDesc.p);
        let nextRotation = new THREE.Matrix3();
        nextRotation.multiplyMatrices(rotation, subModelDesc.r);
        subModel.generateThreePart(loader, subModelColor, nextPosition, nextRotation, subModelCull, subModelInversion, mc, subModelDesc, taskList);
    }
    this.subModels.forEach(handleSubModel);
}
LDR.Line0 = function (txt) {
    this.txt = txt;
}
LDR.Line0.prototype.toLDR = function () {
    return '0 ' + this.txt + '\r\n';
}
LDR.convertFloat = function (x) {
    x = x.toFixed(6);
    for (let i = 0; i <= 6; i++) {
        let tmp = parseFloat(x).toFixed(i);
        if (parseFloat(tmp) === parseFloat(x)) {
            return tmp;
        }
    }
    return x;
}
THREE.Vector3.prototype.toLDR = function () {
    return LDR.convertFloat(this.x) + ' ' + LDR.convertFloat(this.y) + ' ' + LDR.convertFloat(this.z);
}
THREE.Matrix3.prototype.toLDR = function () {
    let e = this.elements;
    let rowMajor = [e[0], e[3], e[6],
        e[1], e[4], e[7],
        e[2], e[5], e[8]
    ]
    return rowMajor.map(LDR.convertFloat).join(' ');
}
LDR.Line2 = function (c, p1, p2, tmp) {
    this.c = c;
    this.p1 = p1;
    this.p2 = p2;
    this.tmp = tmp;
}
LDR.Line2.prototype.pack = function (arrayI, arrayF) {
    arrayI.push(this.c);
    arrayI.push(this.tmp ? this.tmp.idx : -1);
    arrayF.push(this.p1.x, this.p1.y, this.p1.z,
        this.p2.x, this.p2.y, this.p2.z);
}
LDR.Line2.prototype.unpackFrom = function (arrayI, arrayF, idxI, idxF, texmapPlacementMap) {
    this.c = arrayI[idxI++];
    let texmapIdx = arrayI[idxI++];
    if (texmapIdx >= 0) {
        this.tmp = texmapPlacementMap[texmapIdx];
    }
    this.p1 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p2 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    return [idxI, idxF];
}
LDR.Line2.prototype.toLDR = function () {
    return '2 ' + this.c + ' ' + this.p1.toLDR() + ' ' + this.p2.toLDR() + '\r\n';
}
LDR.Line3 = function (c, p1, p2, p3, cull, invert, tmp) {
    this.c = c;
    if (invert) {
        this.p1 = p3;
        this.p2 = p2;
        this.p3 = p1;
    } else {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }
    this.cull = cull;
    this.tmp = tmp;
}
LDR.Line3.prototype.pack = function (arrayI, arrayF) {
    arrayI.push(this.cull ? this.c : -1 - this.c);
    arrayI.push(this.tmp ? this.tmp.idx : -1);
    arrayF.push(this.p1.x, this.p1.y, this.p1.z,
        this.p2.x, this.p2.y, this.p2.z,
        this.p3.x, this.p3.y, this.p3.z);
}
LDR.Line3.prototype.unpackFrom = function (arrayI, arrayF, idxI, idxF, texmapPlacementMap) {
    let packed = arrayI[idxI++];
    if (packed < 0) {
        this.cull = false;
        this.c = -1 - packed;
    } else {
        this.cull = true;
        this.c = packed;
    }
    let texmapIdx = arrayI[idxI++];
    if (texmapIdx >= 0) {
        this.tmp = texmapPlacementMap[texmapIdx];
    }
    this.p1 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p2 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p3 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    return [idxI, idxF];
}
LDR.Line3.prototype.toLDR = function () {
    return '3 ' + this.c + ' ' + this.p1.toLDR() + ' ' + this.p2.toLDR() + ' ' + this.p3.toLDR() + '\r\n';
}
LDR.Line4 = function (c, p1, p2, p3, p4, cull, invert, tmp) {
    this.c = c;
    if (invert) {
        this.p1 = p4;
        this.p2 = p3;
        this.p3 = p2;
        this.p4 = p1;
    } else {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.p4 = p4;
    }
    this.cull = cull;
    this.tmp = tmp;
}
LDR.Line4.prototype.pack = function (arrayI, arrayF) {
    arrayI.push(this.cull ? this.c : -1 - this.c);
    arrayI.push(this.tmp ? this.tmp.idx : -1);
    arrayF.push(this.p1.x, this.p1.y, this.p1.z,
        this.p2.x, this.p2.y, this.p2.z,
        this.p3.x, this.p3.y, this.p3.z,
        this.p4.x, this.p4.y, this.p4.z);
}
LDR.Line4.prototype.unpackFrom = function (arrayI, arrayF, idxI, idxF, texmapPlacementMap) {
    let packed = arrayI[idxI++];
    if (packed < 0) {
        this.cull = false;
        this.c = -1 - packed;
    } else {
        this.cull = true;
        this.c = packed;
    }
    let texmapIdx = arrayI[idxI++];
    if (texmapIdx >= 0) {
        this.tmp = texmapPlacementMap[texmapIdx];
    }
    this.p1 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p2 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p3 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p4 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    return [idxI, idxF];
}
LDR.Line4.prototype.toLDR = function () {
    return '4 ' + this.c + ' ' + this.p1.toLDR() + ' ' + this.p2.toLDR() + ' ' + this.p3.toLDR() + ' ' + this.p4.toLDR() + '\r\n';
}
LDR.Line5 = function (c, p1, p2, p3, p4, tmp) {
    this.c = c;
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.p4 = p4;
    this.tmp = tmp;
}
LDR.Line5.prototype.pack = function (arrayI, arrayF) {
    arrayI.push(this.c);
    arrayI.push(this.tmp ? this.tmp.idx : -1);
    arrayF.push(this.p1.x, this.p1.y, this.p1.z,
        this.p2.x, this.p2.y, this.p2.z,
        this.p3.x, this.p3.y, this.p3.z,
        this.p4.x, this.p4.y, this.p4.z);
}
LDR.Line5.prototype.unpackFrom = function (arrayI, arrayF, idxI, idxF, texmapPlacementMap) {
    this.c = arrayI[idxI++];
    let texmapIdx = arrayI[idxI++];
    if (texmapIdx >= 0) {
        this.tmp = texmapPlacementMap[texmapIdx];
    }
    this.p1 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p2 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p3 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    this.p4 = new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]);
    return [idxI, idxF];
}
LDR.Line5.prototype.toLDR = function () {
    return '5 ' + this.c + ' ' + this.p1.toLDR() + ' ' + this.p2.toLDR() + ' ' + this.p3.toLDR() + ' ' + this.p4.toLDR() + '\r\n';
}
THREE.LDRPartType = function () {
    this.name;
    this.ID = null;
    this.modelDescription;
    this.author;
    this.license;
    this.steps = [];
    this.headerLines = [];
    this.lastRotation = null;
    this.replacement;
    this.inlined;
    this.ldraw_org;
    this.geometry;
    this.cnt = -1;
    this.cleanSteps = false;
    this.certifiedBFC;
    this.CCW;
    this.consistentFileAndName;
    this.referencedFrom = {};
    this.references = 0;
}
THREE.LDRPartType.prototype.setReferencedFrom = function (ldrLoader) {
    let self = this;

    function handle(sm) {
        let pt = ldrLoader.getPartType(sm.ID);
        if (!pt.referencedFrom.hasOwnProperty(self.ID)) {
            pt.referencedFrom[self.ID] = true;
            pt.references++;
        }
    }
    this.steps.forEach(step => step.subModels.forEach(handle));
}
THREE.LDRPartType.prototype.canBePacked = function () {
    return (!this.inlined || (this.inlined === 'OFFICIAL')) &&
        this.isPart &&
        this.license === 'Redistributable under CCAL version 2.0 : see CAreadme.txt' &&
        this.ldraw_org &&
        !this.ldraw_org.startsWith('Unofficial_');
}
THREE.LDRPartType.prototype.pack = function (loader) {
    let ret = {};
    let id = this.ID;
    if (id.endsWith('.dat')) {
        id = id.substring(0, id.length - 4);
    }
    ret.ID = id;
    let step0 = this.steps[0];
    step0.pack(ret, false);
    ret.md = this.modelDescription;
    ret.e = (this.CCW ? 2 : 0) + (this.certifiedBFC ? 1 : 0);
    ret.d = this.ldraw_org;
    return ret;
}
THREE.LDRPartType.prototype.unpack = function (obj) {
    this.ID = this.name = obj.ID + '.dat';
    this.modelDescription = obj.md;
    let step = new THREE.LDRStep();
    step.unpack(obj);
    this.steps = [step];
    this.certifiedBFC = obj.e % 2 === 1;
    this.CCW = Math.floor(obj.e / 2) % 2 === 1;
    this.inlined = 'IDB';
    this.isPart = true;
    this.ldraw_org = obj.d;
}
THREE.LDRLoader.prototype.purgePart = function (ID) {
    let self = this;
    let purged = {};
    let toPurge = [ID];
    while (toPurge.length > 0) {
        let id = toPurge.pop();
        if (purged.hasOwnProperty(id)) {
            continue;
        }
        purged[id] = true;
        delete this.partTypes[id];
        if (this.mainModel === id) {
            delete this.mainModel;
        }

        function handle(pt) {
            pt.purgePart(id);
            if (pt.steps.length === 0) {
                if (pt.ID === self.mainModel) {
                    self.onError({
                        message: 'The main model is empty after removal of empty parts!',
                        subModel: pt.ID
                    });
                } else if (!purged.hasOwnProperty(pt.ID)) {
                    toPurge.push(pt.ID);
                }
            }
        }
        this.applyOnPartTypes(handle);
    }
}
THREE.LDRPartType.prototype.purgePart = function (ID) {
    if (this.isPart) {
        return;
    }
    this.steps.forEach(step => step.subModels = step.subModels.filter(sm => sm.ID !== ID));
    this.steps = this.steps.filter(step => step.subModels.length > 0);
}
THREE.LDRPartType.prototype.cleanUp = function (loader) {
    if (this.cleanSteps) {
        return;
    }
    this.cleanSteps = true;
    if (this.isReplacedPart()) {
        this.replacement = this.steps[0].subModels[0].ID;
    } else {
        let newSteps = [];
        this.steps.forEach(step => step.cleanUp(loader, newSteps));
        this.steps = newSteps;
    }
}
THREE.LDRPartType.prototype.toLDR = function (loader, skipFile) {
    let ret = '';
    if (!skipFile) {
        ret = '0 FILE ' + this.ID + '\r\n';
    }
    if (this.modelDescription) {
        ret += '0 ' + this.modelDescription + '\r\n';
    }
    if (this.name) {
        ret += '0 Name: ' + this.name + '\r\n';
    }
    if (this.author) {
        ret += '0 Author: ' + this.author + '\r\n';
    }
    if (this.ldraw_org) {
        ret += '0 !LDRAW_ORG ' + this.ldraw_org + '\r\n';
    }
    if (this.license) {
        ret += '0 !LICENSE ' + this.license + '\r\n';
    }
    if (this.isPart) {
        if (!this.certifiedBFC) {
            ret += '0 BFC NOCERTIFY\r\n';
        } else {
            ret += '0 BFC CERTIFY ' + (this.CCW ? 'CCW' : 'CW') + '\r\n';
        }
    }
    if (this.headerLines.length > 0) {
        ret += '\r\n';
        let anyHistoryLines = false;

        function printHeaderLine(line0) {
            if (!anyHistoryLines && line0.txt.startsWith('!HISTORY')) {
                ret += '\r\n';
                anyHistoryLines = true;
            }
            ret += line0.toLDR(loader);
        }
        this.headerLines.forEach(printHeaderLine);
    }
    if (this.hasOwnProperty('preferredColor')) {
        ret += '\r\n0 !CMDLINE -c' + this.preferredColor + '\r\n';
    }
    if (this.steps.length > 0) {
        ret += '\r\n';
        this.steps.forEach((step, idx, a) => ret += step.toLDR(loader, idx === 0 ? null : a[idx - 1].rotation, idx === a.length - 1));
    }
    ret += '\r\n';
    return ret;
}
THREE.LDRPartType.prototype.ensureGeometry = function (loader) {
    if (this.geometry) {
        return;
    }
    this.geometry = new LDR.LDRGeometry();
    this.geometry.fromPartType(loader, this);
    if (loader.cleanUpPrimitivesAndSubParts) {
        this.removePrimitivesAndSubParts(loader);
    }
}
THREE.LDRPartType.prototype.removePrimitivesAndSubParts = function (loader, parentID) {
    if (!this.steps) {
        return;
    }
    if (parentID) {
        if (this.referencedFrom.hasOwnProperty(parentID)) {
            delete this.referencedFrom[parentID];
            this.references--;
        }
    }
    let ID = this.ID;

    function handleSM(sm) {
        let pt = loader.getPartType(sm.ID);
        pt.removePrimitivesAndSubParts(loader, ID);
    }
    this.steps.forEach(step => step.subModels && step.subModels.forEach(handleSM));
    if (this.references === 0) {
        delete this.steps;
    }
}
THREE.LDRPartType.prototype.addStep = function (step) {
    if (step.isEmpty() && this.steps.length === 0) {
        return;
    }
    if (step.rotation && step.rotation.type === "ADD") {
        if (!this.lastRotation) {
            step.rotation.type = "REL";
        } else {
            step.rotation = new THREE.LDRStepRotation(step.rotation.x + this.lastRotation.x,
                step.rotation.y + this.lastRotation.y,
                step.rotation.z + this.lastRotation.z,
                this.lastRotation.type);
        }
    }
    let sameRotation = THREE.LDRStepRotation.equals(step.rotation, this.lastRotation);
    if (step.isEmpty() && sameRotation) {
        return;
    }
    if (this.steps.length > 0) {
        let prevStep = this.steps[this.steps.length - 1];
        if (prevStep.isEmpty() && sameRotation) {
            this.steps[this.steps.length - 1] = step;
            return;
        }
    }
    this.steps.push(step);
    this.lastRotation = step.rotation;
}
THREE.LDRPartType.prototype.generateThreePart = function (loader, c, p, r, cull, inv, mc, pd, taskList) {
    if (!this.geometry) {
        if (this.isPart) {
            if (taskList) {
                let self = this;
                taskList.push(() => self.generateThreePart(loader, c, p, r, cull, inv, mc, pd));
                mc.expandBoundingBoxByPoint(p);
                return;
            } else {
                this.ensureGeometry(loader);
            }
        } else {
            this.steps.forEach(step => step.generateThreePart(loader, c, p, r, cull, inv, mc, taskList));
            return;
        }
    }
    if (loader.physicalRenderingAge === 0) {
        this.geometry.buildGeometriesAndColors();
    } else {
        this.geometry.buildPhysicalGeometriesAndColors();
    }
    let m4 = new THREE.Matrix4();
    let m3e = r.elements;
    m4.set(
        m3e[0], m3e[3], m3e[6], p.x,
        m3e[1], m3e[4], m3e[7], p.y,
        m3e[2], m3e[5], m3e[8], p.z,
        0, 0, 0, 1
    );
    if (this.geometry.lineGeometry) {
        let material = new LDR.Colors.buildLineMaterial(this.geometry.lineColorManager, c, false);
        let normalLines = new THREE.LineSegments(this.geometry.lineGeometry, material);
        normalLines.applyMatrix4(m4);
        mc.addLines(normalLines, pd, false);
    }
    if (this.geometry.conditionalLineGeometry) {
        let material = new LDR.Colors.buildLineMaterial(this.geometry.lineColorManager, c, true);
        let conditionalLines = new THREE.LineSegments(this.geometry.conditionalLineGeometry, material);
        conditionalLines.applyMatrix4(m4);
        mc.addLines(conditionalLines, pd, true);
    }
    for (let tc in this.geometry.triangleGeometries) {
        if (!this.geometry.triangleGeometries.hasOwnProperty(tc)) {
            continue;
        }
        let g = this.geometry.triangleGeometries[tc];
        let material;
        if (loader.physicalRenderingAge === 0) {
            let triangleColorManager = new LDR.ColorManager();
            triangleColorManager.get(tc);
            material = new LDR.Colors.buildTriangleMaterial(triangleColorManager, c, false);
        } else {
            tc = tc === '16' ? c : tc;
            material = LDR.Colors.buildStandardMaterial(tc);
        }
        let mesh = new THREE.Mesh(g.clone(), material);
        mesh.castShadow = loader.physicalRenderingAge !== 0;
        mesh.geometry.applyMatrix4(m4);
        mc.addMesh(tc, mesh, pd);
    }
    let self = this;
    for (let idx in this.geometry.texmapGeometries) {
        if (!this.geometry.texmapGeometries.hasOwnProperty(idx)) {
            continue;
        }
        this.geometry.texmapGeometries[idx].forEach(obj => {
            let g = obj.g,
                c2 = obj.c;
            let c3 = c2 === '16' ? c : c2;
            let textureFile = LDR.TexmapPlacements[idx].file;
            let material;
            let buildMaterial, setMap;
            if (loader.physicalRenderingAge === 0) {
                let triangleColorManager = new LDR.ColorManager();
                triangleColorManager.get(c2);
                buildMaterial = t => LDR.Colors.buildTriangleMaterial(triangleColorManager, c3, t);
                setMap = t => material.uniforms.map = {
                    type: 't',
                    value: t
                };
            } else {
                buildMaterial = t => LDR.Colors.buildStandardMaterial(c3, t);
                setMap = t => material.map = t;
            }
            if (loader.texmaps[textureFile] === true) {
                material = buildMaterial(true);

                function setTexmap(t) {
                    setMap(t);
                    material.needsUpdate = true;
                    loader.onProgress(textureFile);
                }
                loader.texmapListeners[textureFile].push(setTexmap);
            } else {
                let texture = loader.texmaps[textureFile];
                material = buildMaterial(texture);
            }
            let mesh = new THREE.Mesh(g.clone(), material);
            mesh.geometry.applyMatrix4(m4);
            mc.addMesh(c3, mesh, pd);
        });
    }
    let b = this.geometry.boundingBox;
    mc.expandBoundingBox(b, m4);
}
THREE.LDRPartType.prototype.isPrimitive = function () {
    if (!this.ldraw_ord) {
        return false;
    }
    let lo = this.ldraw_org.split(' ')[0];
    return lo === 'Primitive' || lo === 'Subpart' || lo === '8_Primitive' || lo === '48_Primitive';
}
THREE.LDRPartType.prototype.computeIsPart = function (loader) {
    if (this.steps.length !== 1) {
        return false;
    }
    let s = this.steps[0];
    if (s.hasPrimitives) {
        return true;
    }
    if (this.isOfficialLDraw()) {
        return true;
    }
    for (let i = 0; i < s.subModels.length; i++) {
        let t = loader.getPartType(s.subModels[i].ID);
        if (t) {
            if (t.isPrimitive()) {
                return true;
            }
            if (t.steps.length !== 1) {
                return false;
            }
        }
    }
    return this.ID.endsWith('.dat');
}
//Official LDraw part types:https://www.ldraw.org/article/398.html
THREE.LDRPartType.prototype.isOfficialLDraw = function () {
    if (!this.ldraw_org) {
        return false;
    }
    let lo = this.ldraw_org.split(' ')[0];
    return lo === 'Part' || lo === 'Primitive' || lo === 'Subpart' ||
        lo === '8_Primitive' || lo === '48_Primitive' || lo === 'Shortcut';
}
THREE.LDRPartType.prototype.isReplacedPart = function () {
    if (!this.isPart) {
        return false;
    }
    let step = this.steps[0];
    if (step.hasPrimitives || step.subModels.length !== 1) {
        return false;
    }
    let sm = step.subModels[0];
    if (sm.c !== 16 || sm.p.x !== 0 || sm.p.y !== 0 || sm.p.z !== 0) {
        return false;
    }
    let e = sm.r.elements;
    let check = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (let i = 0; i < 9; i++) {
        if (e[i] !== check[i]) {
            return false;
        }
    }
    return true;
}
THREE.LDRPartType.prototype.countParts = function (loader) {
    if (this.cnt >= 0 || this.isPart) {
        return this.cnt;
    }
    this.cnt = this.steps.map(step => step.countParts(loader)).reduce((a, b) => a + b, 0);
    return this.cnt;
}
LDR.TexmapPlacements = [];
LDR.TexmapPlacement = function () {
    this.type;
    this.p = [];
    this.file;
    this.fallback = new THREE.LDRStep();
    this.nextOnly = false;
    this.idx;
}
LDR.TexmapPlacement.prototype.setFromParts = function (parts) {
    if (parts.length < 13) {
        this.error = 'Too few arguments on !TEXMAP line';
        return;
    }
    if (parts[2] === 'START') {} else if (parts[2] === 'NEXT') {
        this.nextOnly = true;
    } else {
        this.error = 'Unexpected first !TEXMAP command';
        return;
    }
    let idx = 4;
    for (let i = 0; i < 3; i++) {
        this.p.push(new THREE.Vector3(parseFloat(parts[idx++]), parseFloat(parts[idx++]), parseFloat(parts[idx++])));
    }
    if (parts[3] === 'PLANAR') {
        this.setPlanar();
    } else if (parts[3] === 'CYLINDRICAL' && parts.length > 13) {
        this.a = parseFloat(parts[idx++]) * Math.PI / 180;
        this.setCylindrical();
    } else if (parts[3] === 'SPHERICAL' && parts.length > 14) {
        this.a = parseFloat(parts[idx++]) * Math.PI / 180;
        this.b = parseFloat(parts[idx++]) * Math.PI / 180;
        this.setSpherical();
    } else {
        this.error = 'Unexpected method in !TEXMAP command or not enough parameters';
        return;
    }
    this.file = parts[idx];
    if (parts[parts.length - 2] === 'GLOSSMAP') {
        this.glossmapFile = parts[idx + 2];
    }
    this.idx = LDR.TexmapPlacements.length;
    LDR.TexmapPlacements.push(this);
}
LDR.TexmapPlacement.prototype.use = function () {
    if (this.nextOnly) {
        this.used = true;
    }
}
LDR.TexmapPlacement.prototype.setPlanar = function () {
    this.type = 0;
    this.N1 = new THREE.Vector3();
    this.N1.subVectors(this.p[1], this.p[0]);
    this.N1LenSq = this.N1.lengthSq();
    this.D1 = -this.N1.dot(this.p[0]);
    this.N2 = new THREE.Vector3();
    this.N2.subVectors(this.p[2], this.p[0]);
    this.N2LenSq = this.N2.lengthSq();
    this.D2 = -this.N2.dot(this.p[0]);
    this.getUV = this.getUVPlanar;
}
LDR.TexmapPlacement.prototype.setCylindrical = function () {
    this.type = 1;
    this.n = new THREE.Vector3();
    this.n.subVectors(this.p[1], this.p[0]);
    this.nLen = this.n.length();
    this.n.normalize();
    this.D = -this.n.dot(this.p[1]);
    let p3 = this.projectPointToPlane(this.n, this.p[0], this.p[2]);
    this.m = new THREE.Vector3();
    this.m.subVectors(p3, this.p[0]);
    this.getUV = this.getUVCylindrical;
}
LDR.TexmapPlacement.prototype.setSpherical = function () {
    this.type = 2;
    this.n = new THREE.Vector3();
    this.n.subVectors(this.p[1], this.p[0]);
    this.m = new THREE.Vector3();
    this.m.subVectors(this.p[2], this.p[0]);
    this.N1 = new THREE.Vector3();
    this.N1.crossVectors(this.n, this.m).normalize();
    this.D = -this.N1.dot(this.p[0]);
    this.getUV = this.getUVSpherical;
}
LDR.TexmapPlacement.prototype.packInto = function (arrayI, arrayF, arrayS, subModelMap) {
    arrayI.push(this.idx, this.type);
    this.p.forEach(pt => arrayF.push(pt.x, pt.y, pt.z));
    if (this.type > 0) {
        arrayF.push(this.a);
    }
    if (this.type > 1) {
        arrayF.push(this.b);
    }
    if (this.glossmapFile) {
        arrayI.push(2);
        arrayS.push(this.glossmapFile);
    } else {
        arrayI.push(1);
    }
    arrayS.push(this.file);
    this.fallback.packInto(arrayI, arrayF, arrayS, subModelMap, false);
}
LDR.TexmapPlacement.prototype.unpackFrom = function (arrayI, arrayF, arrayS, idxI, idxF, idxS, subModelList) {
    this.idx = arrayI[idxI++];
    this.type = arrayI[idxI++];
    for (let i = 0; i < 3; i++) {
        this.p.push(new THREE.Vector3(arrayF[idxF++], arrayF[idxF++], arrayF[idxF++]));
    }
    if (this.type > 0) {
        this.a = arrayF[idxF++];
    }
    if (this.type > 1) {
        this.b = arrayF[idxF++];
    }
    let hasGlossmap = arrayI[idxI++] === 2;
    if (hasGlossmap) {
        this.glossmapFile = arrayS[idxS++];
    }
    this.file = arrayS[idxS++];
    if (this.type === 0) {
        this.setPlanar();
    } else if (this.type === 1) {
        this.setCylindrical();
    } else {
        this.setSpherical();
    }
    [idxI, idxF, idxS] = this.fallback.unpackFrom(arrayI, arrayF, arrayS, idxI, idxF, idxS, subModelList, {});
    return [idxI, idxF, idxS];
}
LDR.TexmapPlacement.prototype.projectPointToPlane = function (n, p0, p) {
    let pp0 = new THREE.Vector3();
    pp0.subVectors(p, p0);
    let npp0 = n.dot(pp0);
    let npp0n = new THREE.Vector3();
    npp0n.copy(n);
    npp0n.multiplyScalar(npp0);
    let q = new THREE.Vector3();
    q.subVectors(p, npp0n);
    return q;
}
LDR.TexmapPlacement.prototype.getUVPlanar = function (p) {
    let toPlane = (n, D) => Math.abs(n.x * p.x + n.y * p.y + n.z * p.z + D);
    let U = toPlane(this.N1, this.D1) / this.N1LenSq;
    let V = 1 - toPlane(this.N2, this.D2) / this.N2LenSq;
    return [U, V];
}
LDR.TexmapPlacement.prototype.getUVCylindrical = function (p, pCtx1, pCtx2) {
    let self = this;

    function getU(pt) {
        let q = self.projectPointToPlane(self.n, self.p[0], pt);
        let p1q = new THREE.Vector3();
        p1q.subVectors(self.p[0], q);
        let cross = new THREE.Vector3();
        cross.crossVectors(p1q, self.m);
        let angle = Math.atan2(-cross.dot(self.n), -self.m.dot(p1q));
        let U = 0.5 + angle / self.a;
        return U;
    }
    let U = getU(p);
    if (-1e-4 < U && U < 1e-4 || -1e-4 < U - 1 && U - 1 < 1e-4) {
        let uCtx1 = getU(pCtx1),
            uCtx2 = getU(pCtx2);
        if (Math.abs(uCtx2 - U) > 0.75 || Math.abs(uCtx1 - U) > 0.75) {
            U = 1 - U;
        }
    }
    let distToP1Disc = this.n.x * p.x + this.n.y * p.y + this.n.z * p.z + this.D;
    let V = -distToP1Disc / this.nLen;
    return [U, V];
}
LDR.TexmapPlacement.prototype.getUVSpherical = function (p, pCtx1, pCtx2) {
    let self = this;
    let a = new THREE.Vector3();

    function getAngle(q, b, n) {
        a.subVectors(q, self.p[0]);
        cross.crossVectors(a, b);
        return Math.atan2(-cross.dot(n), a.dot(b));
    }
    let cross = new THREE.Vector3();

    function getU(pt) {
        let q1 = self.projectPointToPlane(self.N1, self.p[0], pt);
        return 0.5 + getAngle(q1, self.n, self.N1) / self.a;
    }
    let U = getU(p);
    if (U < 1e-4) {
        let uCtx1 = getU(pCtx1),
            uCtx2 = getU(pCtx2);
        if (uCtx2 > 0.75 || uCtx1 > 0.75) {
            U = 1 - U;
        }
    }
    let distToP = this.p[0].distanceTo(p);
    let distToP1 = this.N1.x * p.x + this.N1.y * p.y + this.N1.z * p.z + this.D;
    let angle = Math.asin(distToP1 / distToP);
    let V = 0.5 + angle / this.b;
    return [U, V];
}
LDR.TexmapPlacement.prototype.toLDR = function (lines, loader) {
    let nextOnly = lines.length === 1 && this.fallback.isEmpty();
    let method = this.type === 0 ? 'PLANAR' : (this.type === 1 ? 'CYLINDRICAL' : 'SPHERICAL');
    let ret = '0 !TEXMAP ' + (nextOnly ? 'NEXT' : 'START') + ' ' + method + ' ';
    this.p.forEach(pt => ret += pt.toLDR() + ' ');
    if (this.type > 0) {
        ret += parseFloat((this.a * 180 / Math.PI).toFixed(4)) + ' ';
    }
    if (this.type > 1) {
        ret += parseFloat((this.b * 180 / Math.PI).toFixed(4)) + ' ';
    }
    ret += this.file;
    if (this.glossmapFile) {
        ret += ' ' + this.glossmapFile;
    }
    ret += '\r\n';
    lines.forEach(line => ret += '0 !: ' + line.toLDR(loader));
    if (!nextOnly) {
        if (!this.fallback.isEmpty()) {
            ret += '0 !TEXMAP FALLBACK\r\n';
            ret += this.fallback.toLDR(loader, null, true);
        }
        ret += '0 !TEXMAP END\r\n';
    }
    return ret;
}
LDR.ColorManager = function () {
    this.shaderColors = [];
    this.highContrastShaderColors = [];
    this.map = {};
    this.sixteen = -1;
    this.edgeSixteen = -1;
    this.anyTransparentColors = false;
    this.mainColorIsTransparent = false;
}
LDR.ColorManager.prototype.clone = function () {
    let ret = new LDR.ColorManager();
    ret.shaderColors.push(...this.shaderColors);
    ret.highContrastShaderColors.push(...this.highContrastShaderColors);
    ret.sixteen = this.sixteen;
    ret.edgeSixteen = this.edgeSixteen;
    ret.anyTransparentColors = this.anyTransparentColors;
    ret.mainColorIsTransparent = this.mainColorIsTransparent;
    for (let c in this.map) {
        if (this.map.hasOwnProperty(c))
            ret.map[c] = this.map[c];
    }
    return ret;
}
LDR.ColorManager.prototype.overWrite = function (id) {
    if (this.sixteen === -1 && this.edgeSixteen === -1) {
        return;
    }
    let isEdge = id < 0;
    let lowID = isEdge ? -id - 1 : id;
    let colorObject = LDR.Colors[lowID];
    if (!colorObject) {
        throw "Unknown color: " + id;
    }
    let alpha = colorObject.alpha ? colorObject.alpha / 256.0 : 1;
    this.mainColorIsTransparent = alpha < 1;
    if (this.sixteen >= 0) {
        let color = new THREE.Color(isEdge ? colorObject.edge : colorObject.value);
        this.shaderColors[this.sixteen] = new THREE.Vector4(color.r, color.g, color.b, alpha);
    }
    if (this.edgeSixteen >= 0) {
        let color = new THREE.Color(colorObject.edge);
        this.shaderColors[this.edgeSixteen] = new THREE.Vector4(color.r, color.g, color.b, 1);
        this.highContrastShaderColors[this.edgeSixteen] = LDR.Colors.getHighContrastColor4(lowID);
    }
    this.lastSet = id;
}
LDR.ColorManager.prototype.get = function (id) {
    let f = this.map[id];
    if (f) {
        return f;
    }
    if (id == 16) {
        this.sixteen = this.shaderColors.length;
    } else if (id == 10016 || id == 24) {
        this.edgeSixteen = this.shaderColors.length;
    }
    let isEdge = id < 0;
    let lowID = isEdge ? -id - 1 : id;
    let colorObject = LDR.Colors[lowID];
    if (!colorObject) {
        throw "Unknown color " + lowID + " from " + id;
    }
    let color = new THREE.Color(isEdge ? colorObject.edge : colorObject.value);
    let alpha = colorObject.alpha ? colorObject.alpha / 256.0 : 1;
    this.anyTransparentColors = (this.anyTransparentColors || (alpha < 1))
    f = this.shaderColors.length + 0.1;
    this.map[id] = f;
    this.shaderColors.push(new THREE.Vector4(color.r, color.g, color.b, alpha));
    this.highContrastShaderColors.push(LDR.Colors.getHighContrastColor4(lowID));
    return f;
}
LDR.ColorManager.prototype.containsTransparentColors = function () {
    return this.anyTransparentColors || this.mainColorIsTransparent;
}
LDR.MeshCollectorIdx = 0;
LDR.MeshCollector = function (opaqueObject, sixteenObject, transObject, outliner) {
    this.opaqueObject = opaqueObject;
    this.sixteenObject = sixteenObject;
    this.transObject = transObject;
    this.outliner = outliner || false;
    this.lineMeshes = [];
    this.triangleMeshes = [];
    this.old = false;
    this.visible = true;
    this.boundingBox;
    this.isMeshCollector = true;
    this.idx = LDR.MeshCollectorIdx++;
}
LDR.MeshCollector.prototype.addLines = function (mesh, part, conditional) {
    this.lineMeshes.push({
        mesh: mesh,
        part: part,
        conditional: conditional
    });
    this.opaqueObject.add(mesh);
}
LDR.MeshCollector.prototype.addMesh = function (color, mesh, part) {
    let parent;
    if (color === 16) {
        parent = this.sixteenObject;
    } else if (LDR.Colors.isTrans(color)) {
        parent = this.transObject;
    } else {
        parent = this.opaqueObject;
    }
    this.triangleMeshes.push({
        mesh: mesh,
        part: part,
        parent: parent
    });
    parent.add(mesh);
}
LDR.MeshCollector.prototype.removeAllMeshes = function () {
    let self = this;
    this.lineMeshes.forEach(obj => self.opaqueObject.remove(obj.mesh));
    this.triangleMeshes.forEach(obj => obj.parent.remove(obj.mesh));
}
LDR.MeshCollector.prototype.updateMeshVisibility = function () {
    let v = this.visible;
    let lineV = v && LDR.Options && LDR.Options.lineContrast !== 2;
    this.lineMeshes.forEach(obj => obj.mesh.visible = lineV);
    let old = this.old;
    this.triangleMeshes.forEach(obj => obj.mesh.visible = v && (old || !(LDR.Options && LDR.Options.showEditor && obj.part && obj.part.original && obj.part.original.ghost)));
}
LDR.MeshCollector.prototype.expandBoundingBoxByPoint = function (p) {
    if (!this.boundingBox) {
        this.boundingBox = new THREE.Box3();
    }
    this.boundingBox.expandByPoint(p);
}
LDR.MeshCollector.prototype.expandBoundingBox = function (boundingBox, m) {
    let b = new THREE.Box3();
    b.copy(boundingBox);
    b.applyMatrix4(m);
    if (!this.boundingBox) {
        this.boundingBox = b;
    } else {
        this.boundingBox.expandByPoint(b.min);
        this.boundingBox.expandByPoint(b.max);
    }
}
LDR.MeshCollector.prototype.setOldValue = function (old) {
    if (!LDR.Colors.canBeOld) {
        return;
    }
    let o = old && LDR.Options && LDR.Options.showOldColors === 3;
    for (let i = 0; i < this.lineMeshes.length; i++) {
        this.lineMeshes[i].mesh.material.uniforms.old.value = o;
    }
    for (let i = 0; i < this.triangleMeshes.length; i++) {
        this.triangleMeshes[i].mesh.material.uniforms.old.value = o;
    }
    if (!old && this.outliner && !this.outliner.hasSelectedObject(this.idx)) {
        let a = [];
        for (let i = 0; i < this.triangleMeshes.length; i++) {
            a.push(this.triangleMeshes[i].mesh);
        }
        this.outliner.addSelectedObject(this.idx, a);
    }
}
LDR.MeshCollector.prototype.colorLinesLDraw = function () {
    this.lineMeshes.forEach(mesh => {
        let m = mesh.mesh.material;
        let colors = m.colorManager.shaderColors;
        if (colors.length === 1) {
            m.uniforms.color.value = colors[0];
        } else {
            m.uniforms.colors.value = colors;
        }
    });
}
LDR.MeshCollector.prototype.colorLinesHighContrast = function () {
    this.lineMeshes.forEach(mesh => {
        let m = mesh.mesh.material;
        let colors = m.colorManager.highContrastShaderColors;
        if (colors.length === 1) {
            m.uniforms.color.value = colors[0];
        } else {
            m.uniforms.colors.value = colors;
        }
    });
}
LDR.MeshCollector.prototype.updateState = function (old) {
    this.old = old;
    if (LDR.Options) {
        this.lineContrast = LDR.Options.lineContrast;
        this.showOldColors = LDR.Options.showOldColors;
    }
}
LDR.MeshCollector.prototype.update = function (old) {
    if (LDR.Options && this.lineContrast !== LDR.Options.lineContrast) {
        if (LDR.Options.lineContrast === 1) {
            this.colorLinesLDraw();
        } else {
            this.colorLinesHighContrast();
        }
    }
    this.setOldValue(old);
    this.updateState(old);
}
LDR.MeshCollector.prototype.overwriteColor = function (color) {
    if (this.overwrittenColor === color) {
        return;
    }

    function handle(obj, edge) {
        const m = obj.mesh.material;
        const c = m.colorManager;
        c.overWrite(color);
        let colors = !edge || LDR.Options && LDR.Options.lineContrast > 0 ? c.shaderColors : c.highContrastShaderColors;
        if (colors.length === 1) {
            m.uniforms.color.value = colors[0];
        } else {
            m.uniforms.colors.value = colors;
        }
        if (!edge) {
            let isTrans = c.containsTransparentColors();
            m.depthWrite = !isTrans;
            m.transparent = isTrans;
        }
    }
    for (let i = 0; i < this.triangleMeshes.length; i++) {
        let mesh = this.triangleMeshes[i];
        handle(mesh, false);
    }
    for (let i = 0; i < this.lineMeshes.length; i++) {
        handle(this.lineMeshes[i], true);
    }
    this.overwrittenColor = color;
}
LDR.MeshCollector.prototype.draw = function (old) {
    this.update(old);
    this.updateMeshVisibility();
}
LDR.MeshCollector.prototype.isVisible = function () {
    return this.visible;
}
LDR.MeshCollector.prototype.setVisible = function (v) {
    if (this.visible === v && this.old) {
        return;
    }
    this.visible = v;
    this.updateMeshVisibility();
}
LDR.MeshCollector.prototype.getGhostedParts = function () {
    let lineObjects = this.lineMeshes.filter(obj => obj.part && obj.part.original.ghost);
    let triangleObjects = this.triangleMeshes.filter(obj => obj.part && obj.part.original.ghost);
    return [lineObjects, triangleObjects];
}
LDR.STUDIO = {};
LDR.STUDIO.handleCommentLine = function (part, parts) {
    if (parts.length < 3) {
        return false;
    }
    if (parts[1] === 'PE_TEX_PATH') {
        return true;
    }
    if (parts[1] !== "PE_TEX_INFO") {
        return false;
    }
    part.studioTexmap = parts[2];
    return true;
}
LDR.STUDIO.handlePart = function (loader, pt) {
    if (!pt.studioTexmap || pt.steps.length !== 1) {
        return;
    }
    let step = pt.steps[0];
    if (step.triangles.length === 0) {
        return;
    }
    if (step.subModels.length > 0 && step.triangles.length > 0 && step.lines.length === 0) {
        let misalignment = step.subModels[0].p;
        let ok = true;
        step.subModels.forEach(sm => ok = ok && sm.p.equals(misalignment));
        if (ok) {
            step.triangles.forEach(t => {
                t.p1.sub(misalignment);
                t.p2.sub(misalignment);
                t.p3.sub(misalignment);
            });
            let tmps = {};
            step.triangles.forEach(t => tmps[t.tmp.idx] = t.tmp);
            for (let idx in tmps) {
                if (!tmps.hasOwnProperty(idx)) {
                    continue;
                }
                let tmp = tmps[idx];
                tmp.p.forEach(p => p.sub(misalignment));
                tmp.setPlanar();
            }
            step.subModels.forEach(sm => sm.p.set(0, 0, 0));
        }
    }
    let pid = pt.ID + '.png';
    let dataurl = 'data:image/png;base64,' + pt.studioTexmap;
    loader.texmapDataurls.push({
        id: pid,
        mimetype: 'png',
        content: pt.studioTexmap
    });
    delete pt.studioTexmap;
    loader.texmaps[pid] = true;
    if (!loader.texmapListeners.hasOwnProperty(pid)) {
        loader.texmapListeners[pid] = [];
    }
    let image = new Image();
    image.onload = function (e) {
        let texture = new THREE.Texture(this);
        texture.needsUpdate = true;
        loader.texmaps[pid] = texture;
        loader.texmapListeners[pid].forEach(l => l(texture));
        loader.onProgress(pid);
    };
    image.src = dataurl;
}
LDR.STUDIO.handleTriangleLine = function (pt, parts) {
    let q1 = new THREE.Vector3(parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
    let q2 = new THREE.Vector3(parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]));
    let q3 = new THREE.Vector3(parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]));
    let U1 = parseFloat(parts[11]),
        V1 = 1 - parseFloat(parts[12]);
    let U2 = parseFloat(parts[13]),
        V2 = 1 - parseFloat(parts[14]);
    let U3 = parseFloat(parts[15]),
        V3 = 1 - parseFloat(parts[16]);
    let isZero = x => -1e-6 <= x && x <= 1e-6;
    if (LDR.TexmapPlacements.length > 0) {
        let lastTmp = LDR.TexmapPlacements[LDR.TexmapPlacements.length - 1];
        let [u1, v1] = lastTmp.getUV(q1);
        let [u2, v2] = lastTmp.getUV(q2);
        let [u3, v3] = lastTmp.getUV(q3);
        if (lastTmp.file === (pt.ID + '.png') && isZero(u1 - U1) && isZero(u2 - U2) && isZero(u3 - U3) && isZero(1 - v1 - V1) && isZero(1 - v2 - V2) && isZero(1 - v3 - V3)) {
            lastTmp.used = false;
            return lastTmp;
        }
    }

    function getPlanes(r, s, t, R, S, T) {
        let u = new THREE.Vector3();
        u.crossVectors(s, t);
        let v = new THREE.Vector3();
        v.crossVectors(t, r);
        let w = new THREE.Vector3();
        w.crossVectors(r, s);
        let D = w.dot(t);
        if (isZero(D)) {
            D = 1;
        }
        u.divideScalar(D);
        v.divideScalar(D);
        w.divideScalar(D);
        let L = new THREE.Vector3();
        L.addVectors(u, v);
        L.add(w);
        let LL = L.lengthSq();
        let solutions = [];
        let s_t = new THREE.Vector3();
        s_t.subVectors(s, t);
        let t_r = new THREE.Vector3();
        t_r.subVectors(t, r);
        let r_s = new THREE.Vector3();
        r_s.subVectors(r, s);
        [-R, R].forEach(_R => {
            [-S, S].forEach(_S => {
                [-T, T].forEach(_T => {
                    let LxM = new THREE.Vector3();
                    LxM.addScaledVector(s_t, _R);
                    LxM.addScaledVector(t_r, _S);
                    LxM.addScaledVector(r_s, _T);
                    LxM.divideScalar(D);
                    let LxMLxM = LxM.lengthSq();
                    if (LxMLxM > LL) {
                        return;
                    }
                    let M = new THREE.Vector3();
                    M.addScaledVector(u, _R);
                    M.addScaledVector(v, _S);
                    M.addScaledVector(w, _T);
                    [-1, 1].forEach(e => {
                        let esqrt = e * Math.sqrt(LL - LxMLxM);
                        let A = (L.dot(M) + esqrt) / LL;
                        let n = new THREE.Vector3();
                        n.crossVectors(L, LxM);
                        n.addScaledVector(L, esqrt);
                        n.divideScalar(LL);
                        solutions.push({
                            n: n,
                            A: A
                        });
                    });
                });
            });
        });
        return solutions;
    }
    let d12 = q1.distanceTo(q2);
    let d23 = q2.distanceTo(q3);
    let d31 = q3.distanceTo(q1);
    let toPlane = (n, A, p) => n.x * p.x + n.y * p.y + n.z * p.z + A;

    function getPlaneFromUVs(q1, q2, q3, U1, U2, U3) {
        let p1p2 = 1e12;
        if (!isZero(U2 - U1)) {
            p1p2 = Math.min(p1p2, d12 / Math.abs(U2 - U1));
        }
        if (!isZero(U2 - U3)) {
            p1p2 = Math.min(p1p2, d23 / Math.abs(U2 - U3));
        }
        if (!isZero(U3 - U1)) {
            p1p2 = Math.min(p1p2, d31 / Math.abs(U3 - U1));
        }
        let ret = [false, 0];
        while (p1p2 > 1e-3) {
            let d1 = p1p2 * U1;
            let d2 = p1p2 * U2;
            let d3 = p1p2 * U3;
            let solutions = getPlanes(q1, q2, q3, d1, d2, d3);

            function checkSolution(solution) {
                let u1 = toPlane(solution.n, -solution.A, q1) / p1p2;
                let u2 = toPlane(solution.n, -solution.A, q2) / p1p2;
                let u3 = toPlane(solution.n, -solution.A, q3) / p1p2;
                if (u1 < 0 || u2 < 0 || u3 < 0) {
                    return false;
                }
                ret = [solution, p1p2];
                return true;
            }
            if (solutions.some(checkSolution)) {
                return ret;
            }
            p1p2 *= 0.5;
        }
        return ret;
    }
    let [P1, p1p2] = getPlaneFromUVs(q1, q2, q3, U1, U2, U3);
    if (!P1) {
        return;
    }
    let [P2, p1p3] = getPlaneFromUVs(q1, q2, q3, V1, V2, V3);
    if (!P2) {
        return;
    }
    let p1 = new THREE.Vector3(); {
        let A1 = P1.A,
            A2 = P2.A;
        let n1 = P1.n,
            n2 = P2.n;
        let u = new THREE.Vector3();
        u.crossVectors(P1.n, P2.n);
        if (!isZero(u.z) && !((isZero(n2.x) && isZero(n1.x)) || (isZero(n2.y) && isZero(n1.y)))) {
            let x = isZero(n2.y) ? (A2 - (n2.y / n1.y) * A1) / (n2.x - n1.x * (n2.y / n1.y)) : (A1 - (n1.y / n2.y) * A2) / (n1.x - n2.x * (n1.y / n2.y));
            let y = isZero(n2.x) ? (A2 - (n2.x / n1.x) * A1) / (n2.y - n1.y * (n2.x / n1.x)) : (A1 - (n1.x / n2.x) * A2) / (n1.y - n2.y * (n1.x / n2.x));
            p1.set(x, y, 0);
        } else if (!isZero(u.y) && !((isZero(n2.x) && isZero(n1.x)) || (isZero(n2.z) && isZero(n1.z)))) {
            let x = isZero(n2.z) ? (A2 - (n2.z / n1.z) * A1) / (n2.x - n1.x * (n2.z / n1.z)) : (A1 - (n1.z / n2.z) * A2) / (n1.x - n2.x * (n1.z / n2.z));
            let z = isZero(n2.x) ? (A2 - (n2.x / n1.x) * A1) / (n2.z - n1.z * (n2.x / n1.x)) : (A1 - (n1.x / n2.x) * A2) / (n1.z - n2.z * (n1.x / n2.x));
            p1.set(x, 0, z);
        } else if (!isZero(u.x) && !((isZero(n2.y) && isZero(n1.y)) || (isZero(n2.z) && isZero(n1.z)))) {
            let y = isZero(n2.z) ? (A2 - (n2.z / n1.z) * A1) / (n2.y - n1.y * (n2.z / n1.z)) : (A1 - (n1.z / n2.z) * A2) / (n1.y - n2.y * (n1.z / n2.z));
            let z = isZero(n2.y) ? (A2 - (n2.y / n1.y) * A1) / (n2.z - n1.z * (n2.y / n1.y)) : (A1 - (n1.y / n2.y) * A2) / (n1.z - n2.z * (n1.y / n2.y));
            p1.set(0, y, z);
        } else {
            return;
        }
    }
    let p2 = new THREE.Vector3();
    p2.copy(p1);
    p2.addScaledVector(P1.n, p1p2);
    let p3 = new THREE.Vector3();
    p3.copy(p1);
    p3.addScaledVector(P2.n, p1p3);
    let tmp = new LDR.TexmapPlacement();
    tmp.nextOnly = true;
    tmp.p = [p1, p2, p3];
    tmp.setPlanar();
    tmp.file = pt.ID + '.png';
    tmp.idx = LDR.TexmapPlacements.length;
    LDR.TexmapPlacements.push(tmp);
    return tmp;
}
THREE.LDRLoader.prototype.toLDRStudio = function (c) {
    let self = this;

    function setTexmap(pt) {
        if (!pt.isPart) {
            return;
        }
        let step = pt.steps[0];

        function find(list) {
            let x = list.find(y => y.tmp);
            if (x) {
                pt.texmapFile = x.tmp.file;
                return true;
            }
            return false;
        }
        find(step.triangles) || find(step.quads) || find(step.subModels);
    }
    this.applyOnPartTypes(setTexmap);
    let seenColors = {};

    function findColorsFor(id, c) {
        let pt = self.getPartType(id);
        if (pt.isPart) {
            return;
        }
        if (!seenColors.hasOwnProperty(id)) {
            seenColors[id] = {};
        }
        sc = seenColors[id];
        if (sc.hasOwnProperty(c)) {
            return;
        }
        sc[c] = true;
        pt.steps.forEach(step => step.subModels.forEach(sm => findColorsFor(sm.ID, sm.c === 16 ? c : sm.c)));
    }
    findColorsFor(this.mainModel, c);
    let ret = this.getMainModel().toLDRColored(this, c);
    for (let id in seenColors) {
        if (!seenColors.hasOwnProperty(id) || id === self.mainModel) {
            continue;
        }
        let obj = seenColors[id];
        for (let c in obj) {
            if (obj.hasOwnProperty(c)) {
                ret += self.getPartType(id).toLDRColored(self, c);
            }
        }
    }
    return ret;
}
THREE.LDRPartType.prototype.toLDRColored = function (loader, c) {
    let ret = '0 FILE ' + c + '__' + this.ID + '\r\n';
    if (this.modelDescription) {
        ret += '0 ' + this.modelDescription + '\r\n';
    }
    ret += '0 Name: ' + c + '__' + this.ID + '\r\n';
    if (this.author) {
        ret += '0 Author: ' + this.author + '\r\n';
    }
    if (this.ldraw_org) {
        ret += '0 !LDRAW_ORG ' + this.ldraw_org + '\r\n';
    }
    if (this.license) {
        ret += '0 !LICENSE ' + this.license + '\r\n';
    }
    if (this.isPart) {
        if (!this.certifiedBFC) {
            ret += '0 BFC NOCERTIFY\r\n';
        } else {
            ret += '0 BFC CERTIFY ' + (this.CCW ? 'CCW' : 'CW') + '\r\n';
        }
    }
    if (this.headerLines.length > 0) {
        ret += '\r\n';
        this.headerLines.forEach(line => ret += line.toLDR(loader));
    }
    if (this.hasOwnProperty('preferredColor')) {
        ret += '\r\n0 !CMDLINE -c' + this.preferredColor + '\r\n';
    }
    if (this.steps.length > 0) {
        ret += '\r\n';
        this.steps.forEach((step, idx, a) => ret += step.toLDRColored(loader, idx === 0 ? null : a[idx - 1].r, idx === a.length - 1, c));
    }
    ret += '\r\n';
    return ret;
}
THREE.LDRPartDescription.prototype.toLDRColored = function (loader, c) {
    let pt = loader.getPartType(this.ID);
    let c2 = this.c == 16 ? c : this.c;
    let id = pt.isPart ? pt.ID : (c2 + '__' + this.ID);
    return '1 ' + c2 + ' ' + this.p.toLDR() + ' ' + this.r.toLDR() + ' ' + id + '\r\n';
}
THREE.LDRStep.prototype.toLDRColored = function (loader, prevStepRotation, isLastStep, c) {
    let ret = '';
    this.subModels.forEach(sm => ret += sm.toLDRColored(loader, c));
    this.triangles.forEach(x => ret += x.toLDR());
    this.quads.forEach(x => ret += x.toLDR());
    if (!this.r) {
        if (prevStepRotation) {
            ret += '0 ROTSTEP END\r\n';
        } else if (!isLastStep) {
            ret += '0 STEP\r\n';
        }
    } else {
        if (THREE.LDRStepRotation.equals(this.r, prevStepRotation)) {
            ret += '0 STEP\r\n';
        } else {
            ret += this.r.toLDR();
        }
    }
    return ret;
}
THREE.LDRPartType.prototype.toStudioFile = function (ldrLoader) {
    if (!this.isPart) {
        throw 'The part type ' + this.ID + ' cannot be converted to a Studio 2.0 file since it is not a part';
    }
    let step = this.steps[0];
    let tt = [];
    let tmp;
    step.triangles.filter(x => x.tmp).forEach(x => {
        tmp = x.tmp.file;
        tt.push(x);
    });
    step.quads.filter(x => x.tmp).forEach(x => {
        tmp = x.tmp.file;
        tt.push({
            c: x.c,
            p1: x.p1,
            p2: x.p2,
            p3: x.p3,
            tmp: x.tmp
        });
        tt.push({
            c: x.c,
            p1: x.p1,
            p2: x.p3,
            p3: x.p4,
            tmp: x.tmp
        });
    });
    let dataurl = ldrLoader.texmapDataurls.find(obj => obj.id === tmp);
    let ret = '';
    if (dataurl) {
        ret = '0 FILE ' + this.ID + '\r\n';
    }
    ret += '0 ' + (this.modelDescription ? this.modelDescription : '') +
        '\r\n0 Name: ' + this.ID +
        '\r\n0 Author: ' + (this.author ? this.author : '') +
        '\r\n0 !LICENSE ' + (this.license ? this.license : '') +
        '\r\n0 BFC ' + (this.certifiedBFC ? '' : 'NO') + 'CERTIFY ' + (this.CCW ? '' : 'CW') +
        '\r\n';
    if (dataurl) {
        ret += '0 PE_TEX_PATH -1\r\n0 PE_TEX_INFO ' + dataurl.content + '\r\n';
    }
    step.subModels.forEach(x => ret += x.toLDR(ldrLoader));
    step.lines.forEach(x => ret += new LDR.Line2(x.c, x.p1, x.p2).toLDR());
    step.conditionalLines.forEach(x => ret += new LDR.Line5(x.c, x.p1, x.p2, x.p3, x.p4).toLDR());
    tt.forEach(x => {
        ret += '3 ' + x.c + ' ' + x.p1.toLDR() + ' ' + x.p2.toLDR() + ' ' + x.p3.toLDR();
        let [U1, V1] = x.tmp.getUV(x.p1, x.p2, x.p3);
        let [U2, V2] = x.tmp.getUV(x.p2, x.p3, x.p1);
        let [U3, V3] = x.tmp.getUV(x.p3, x.p1, x.p2);
        [U1, V1, U2, V2, U3, V3].map(LDR.convertFloat).forEach(x => ret += ' ' + x);
        ret += '\r\n';
    });
    step.triangles.filter(x => !x.tmp).forEach(x => {
        ret += new LDR.Line3(x.c, x.p1, x.p2, x.p3).toLDR();
    });
    step.quads.filter(x => !x.tmp).forEach(x => {
        ret += new LDR.Line4(x.c, x.p1, x.p2, x.p3, x.p4).toLDR();
    });
    return ret;
}
LDR.StepHandler = function (manager, partDescs, isForMainModel) {
    this.opaqueObject = manager.opaqueObject;
    this.sixteenObject = manager.sixteenObject;
    this.transObject = manager.transObject;
    this.loader = manager.ldrLoader;
    this.manager = manager;
    this.partDescs = partDescs;
    this.isForMainModel = isForMainModel;
    this.part = this.loader.getPartType(partDescs[0].ID);
    this.hasExtraParts = partDescs.length > 1;
    this.rebuild();
}
LDR.StepHandler.prototype.rebuild = function () {
    this.removeGeometries();
    this.current = -1;
    this.length = this.part.steps.length;
    if (this.length === 0) {
        console.dir(this);
        throw "Empty step handler!";
    }
    let partDesc = this.partDescs[0];
    this.steps = [];
    for (let i = 0; i < this.length; i++) {
        let step = this.part.steps[i];
        let sh = null;
        if (step.containsNonPartSubModels(this.loader)) {
            let subDescs = step.subModels.map(subModel => subModel.placeAt(partDesc));
            sh = new LDR.StepHandler(this.manager, subDescs, false);
        }
        this.steps.push(new LDR.StepInfo(sh, step.cloneColored(partDesc.c)));
    }
    this.steps.push(new LDR.StepInfo());
    if (this.isForMainModel) {
        this.recomputeStepIndices(1);
    }
}
LDR.StepInfo = function (stepHandler, step) {
    this.stepHandler = stepHandler;
    this.step = step;
    this.bounds;
    this.accumulatedBounds;
    this.meshCollector;
}
LDR.StepHandler.prototype.recomputeStepIndices = function (firstShownIndex) {
    this.totalNumberOfSteps = this.length;
    this.firstShownIndex = firstShownIndex;
    let shownIndex = firstShownIndex;
    let self = this;
    this.steps.forEach(step => {
        let subHandler = step.stepHandler;
        if (subHandler) {
            subHandler.recomputeStepIndices(shownIndex);
            self.totalNumberOfSteps += subHandler.totalNumberOfSteps;
            shownIndex += subHandler.totalNumberOfSteps + 1;
        } else {
            shownIndex++;
        }
    });
}
LDR.StepHandler.prototype.updateRotations = function () {
    let self = this;
    this.steps.forEach(stepInfo => {
        let step = stepInfo.step;
        if (step) {
            step.rotation = step.original.rotation;
        }
        let subHandler = stepInfo.stepHandler;
        if (subHandler) {
            subHandler.updateRotations();
        }
    });
}
LDR.StepHandler.prototype.removeGeometries = function () {
    if (!this.steps) {
        return;
    }
    this.steps.forEach(stepInfo => stepInfo.meshCollector && stepInfo.meshCollector.removeAllMeshes());
    this.steps.forEach(stepInfo => stepInfo.stepHandler && stepInfo.stepHandler.removeGeometries());
}
LDR.StepHandler.prototype.getCurrentStepIndex = function () {
    if (this.current === -1) {
        return this.firstShownIndex - 1;
    }
    let subStepHandler = this.steps[this.current].stepHandler;
    if (subStepHandler) {
        return subStepHandler.getCurrentStepIndex();
    }
    let ret = this.firstShownIndex;
    for (let i = 0; i < this.current; i++) {
        let subStepHandler = this.steps[i].stepHandler;
        if (subStepHandler) {
            ret += subStepHandler.totalNumberOfSteps + 1;
        } else {
            ret++;
        }
    }
    return ret;
}
LDR.StepHandler.prototype.computeCameraPositionRotation = function (defaultMatrix, currentRotationMatrix, useAccumulatedBounds) {
    if (this.current === -1 || this.current === this.length) {
        throw "Camera position not available for pre step and placement step.";
    }
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (subStepHandler && !subStepHandler.isAtPlacementStep()) {
        return subStepHandler.computeCameraPositionRotation(defaultMatrix, currentRotationMatrix, useAccumulatedBounds);
    }
    let stepRotation = step.step.rotation;
    let pr = this.partDescs[0].r.elements;
    let modelCenter = new THREE.Vector3();
    if (useAccumulatedBounds) {
        step.accumulatedBounds.getCenter(modelCenter);
    } else {
        step.bounds.getCenter(modelCenter);
    }
    let partM4 = new THREE.Matrix4();
    partM4.set(pr[0], pr[3], pr[6], 0,
        pr[1], pr[4], pr[7], 0,
        pr[2], pr[5], pr[8], 0,
        0, 0, 0, 1);
    let invM4 = new THREE.Matrix4();
    invM4.getInverse(partM4);
    let invY = new THREE.Matrix4();
    invY.set(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);
    currentRotationMatrix = new THREE.Matrix4();
    currentRotationMatrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    let rotationMatrix;
    if (stepRotation) {
        rotationMatrix = stepRotation.getRotationMatrix(defaultMatrix);
        currentRotationMatrix.multiply(rotationMatrix);
    }
    currentRotationMatrix.multiply(invY);
    currentRotationMatrix.multiply(invM4);
    modelCenter.applyMatrix4(invM4);
    modelCenter.applyMatrix4(invY);
    if (rotationMatrix) {
        modelCenter.applyMatrix4(rotationMatrix);
    }
    modelCenter.negate();
    return [modelCenter, currentRotationMatrix];
}
LDR.StepHandler.prototype.nextStep = function (doNotEraseForSubModels) {
    if (this.isAtPlacementStep() || (this.isForMainModel && this.isAtLastStep())) {
        return false;
    }
    let step = this.current === -1 ? new LDR.StepInfo() : this.steps[this.current];
    let subStepHandler = step.stepHandler;
    let meshCollector = step.meshCollector;
    let willStep = !subStepHandler || subStepHandler.isAtPlacementStep();
    this.manager.resetSelectedObjects();
    if ((this.current === this.length - 1) && willStep) {
        this.updateMeshCollectors(false);
        this.drawExtras();
        this.current++;
        return true;
    }
    if (willStep) {
        if (subStepHandler) {
            subStepHandler.updateMeshCollectors(true);
        } else if (meshCollector) {
            meshCollector.draw(true);
        }
        this.current++;
        step = this.steps[this.current];
        subStepHandler = step.stepHandler;
    }
    if (!subStepHandler) {
        let meshCollector = step.meshCollector;
        if (!meshCollector) {
            let pd = this.partDescs[0];
            meshCollector = new LDR.MeshCollector(this.opaqueObject, this.sixteenObject, this.transObject, this.manager);
            step.step.generateThreePart(this.loader, pd.c, pd.p, pd.r, true, false, meshCollector);
            step.meshCollector = meshCollector;
            this.setCurrentBounds(meshCollector.boundingBox);
            meshCollector.setOldValue(false);
        } else {
            meshCollector.draw(false);
            meshCollector.setVisible(true);
        }
    } else {
        if (subStepHandler.current === -1) {
            if (!doNotEraseForSubModels) {
                this.setVisibleUpTo(false, this.current);
            }
        }
        subStepHandler.nextStep(doNotEraseForSubModels);
        if (subStepHandler.isAtPlacementStep()) {
            if (!step.bounds) {
                let b = subStepHandler.steps[subStepHandler.length].accumulatedBounds;
                this.setCurrentBounds(b);
            }
            if (!doNotEraseForSubModels) {
                this.setVisibleUpTo(true, this.current);
            }
        }
    }
    return true;
}
LDR.StepHandler.prototype.prevStep = function (doNotEraseForSubModels) {
    if (this.isAtPreStep()) {
        return false;
    }
    this.manager.resetSelectedObjects();
    if (this.isAtPlacementStep()) {
        if (this.hasExtraParts) {
            let mc = this.steps[this.length].meshCollector;
            mc.setVisible(false);
        }
        for (let i = 0; i < this.length - 1; i++) {
            let step = this.steps[i];
            let mc = step.meshCollector;
            if (mc) {
                mc.draw(true);
            }
            let sh = step.stepHandler;
            if (sh) {
                sh.updateMeshCollectors(true);
            }
        }
        if (this.length > 0) {
            let step = this.steps[this.length - 1];
            if (step.meshCollector) {
                step.meshCollector.setOldValue(false);
            }
        }
        this.current--;
        return true;
    }
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (!subStepHandler) {
        let meshCollector = step.meshCollector;
        meshCollector.setVisible(false);
        this.stepBack();
    } else {
        if (subStepHandler.isAtPlacementStep() && !doNotEraseForSubModels) {
            this.setVisibleUpTo(false, this.current);
        }
        subStepHandler.prevStep(doNotEraseForSubModels);
        if (subStepHandler.isAtPreStep()) {
            if (!doNotEraseForSubModels) {
                this.setVisibleUpTo(true, this.current);
            }
            this.stepBack();
        }
    }
    return true;
}
LDR.StepHandler.prototype.stepBack = function () {
    this.current--;
    if (this.current === -1) {
        if (this.isForMainModel) {
            this.nextStep();
        }
        return;
    }
    let step = this.steps[this.current];
    let mc = step.meshCollector;
    if (mc) {
        mc.draw(false);
    }
    let sh = step.stepHandler;
    if (sh) {
        sh.updateMeshCollectors(false);
    }
}
LDR.StepHandler.prototype.moveTo = function (to, onDone) {
    let self = this;
    let currentStep = this.getCurrentStepIndex();
    let steps = to - currentStep;
    const oneStep = steps > 0 ? 1 : -1;
    let step = steps > 0 ? () => self.nextStep(true) : () => self.prevStep(true);
    while (steps !== 0 && step()) {
        steps -= oneStep;
    }
    this.cleanUpAfterWalking();
    onDone();
}
LDR.StepHandler.prototype.cleanUpAfterWalking = function (level = 0) {
    let step = this.current === -1 ? new LDR.StepInfo() : this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (subStepHandler) {
        subStepHandler.cleanUpAfterWalking(level + 1);
    }
    if (subStepHandler && !subStepHandler.isAtPlacementStep()) {
        for (let i = 0; i < this.length; i++) {
            let s = this.steps[i];
            let mc = s.meshCollector;
            if (mc && mc.isVisible()) {
                mc.setVisible(false);
            }
            let sh = s.stepHandler;
            if (sh && i !== this.current) {
                sh.setVisible(false);
            }
        }
        if (this.hasExtraParts) {
            let s = this.steps[this.length];
            if (s.meshCollector) {
                s.meshCollector.setVisible(false);
            }
        }
    } else {
        for (let i = 0; i < this.length; i++) {
            let v = i <= this.current;
            let s = this.steps[i];
            let mc = s.meshCollector;
            if (mc) {
                mc.setVisible(v);
            }
            let sh = s.stepHandler;
            if (sh) {
                sh.setVisible(v);
            }
        }
        if (this.hasExtraParts) {
            let s = this.steps[this.length];
            if (s.meshCollector) {
                s.meshCollector.setVisible(this.isAtPlacementStep());
            }
        }
    }
}
LDR.StepHandler.prototype.getCurrentStepInfo = function () {
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (!subStepHandler || subStepHandler.isAtPlacementStep()) {
        return [this.part, this.current, step];
    }
    return subStepHandler.getCurrentStepInfo();
}
LDR.StepHandler.prototype.getCurrentStepHandler = function () {
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (!subStepHandler || subStepHandler.isAtPlacementStep()) {
        return this;
    }
    return subStepHandler.getCurrentStepHandler();
}
LDR.StepHandler.prototype.getCurrentStep = function () {
    return this.getCurrentStepInfo()[2].step;
}
LDR.StepHandler.prototype.getMultiplierOfCurrentStep = function () {
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    let ret = this.partDescs.length;
    if (!subStepHandler || subStepHandler.isAtPlacementStep()) {
        return ret;
    }
    return ret * subStepHandler.getMultiplierOfCurrentStep();
}
LDR.StepHandler.prototype.getShowRotatorForCurrentStep = function () {
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (subStepHandler && !subStepHandler.isAtPlacementStep()) {
        return subStepHandler.getShowRotatorForCurrentStep();
    }
    if (this.current === 0) {
        return false;
    }
    if (THREE.LDRStepRotation.equals(step.step.rotation, this.steps[this.current - 1].step.rotation)) {
        return false;
    }
    return (step.step && step.step.rotation) || this.steps[this.current - 1].step.rotation;
}
LDR.BackgroundColors = Array("FFFFFF", "FFFF88", "CCFFCC", "FFBB99", "99AAFF", "FF99FF", "D9FF99", "FFC299");
LDR.StepHandler.prototype.getBackgroundColorOfCurrentStep = function () {
    let level = this.getLevelOfCurrentStep();
    return LDR.BackgroundColors[level % LDR.BackgroundColors.length];
}
LDR.StepHandler.prototype.getLevelOfCurrentStep = function () {
    if (this.current === -1) {
        console.warn('Level of pre-step is not valid!');
        return 0;
    }
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (!subStepHandler || subStepHandler.isAtPlacementStep()) {
        return 0;
    }
    return 1 + subStepHandler.getLevelOfCurrentStep();
}
LDR.StepHandler.prototype.getAccumulatedBounds = function () {
    if (this.isAtPreStep()) {
        throw "Can't get bounds for pre step!";
    }
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (subStepHandler && !subStepHandler.isAtPlacementStep()) {
        let ret = subStepHandler.getAccumulatedBounds();
        if (ret) {
            return ret;
        }
    }
    return step.accumulatedBounds;
}
LDR.StepHandler.prototype.getBounds = function () {
    let step = this.steps[this.current];
    let subStepHandler = step.stepHandler;
    if (subStepHandler && !subStepHandler.isAtPlacementStep()) {
        let ret = subStepHandler.getBounds();
        if (ret) {
            return ret;
        }
    }
    return step.bounds;
}
LDR.StepHandler.prototype.setCurrentBounds = function (b) {
    let step = this.steps[this.current];
    if (this.current === 0) {
        if (!b) {
            throw "Illegal state: Empty first step!";
        }
        step.accumulatedBounds = step.bounds = b;
        return;
    }
    step.bounds = b;
    let prevAccumulatedBounds = new THREE.Box3();
    prevAccumulatedBounds.copy(this.steps[this.current - 1].accumulatedBounds);
    step.accumulatedBounds = prevAccumulatedBounds;
    if (b) {
        step.accumulatedBounds.expandByPoint(b.min);
        step.accumulatedBounds.expandByPoint(b.max);
    }
}
LDR.StepHandler.prototype.drawExtras = function () {
    let step = this.steps[this.length];
    if (!this.hasExtraParts) {
        if (!step.bounds) {
            let prevStep = this.steps[this.length - 1];
            step.accumulatedBounds = prevStep.accumulatedBounds;
            step.bounds = prevStep.bounds;
        }
        return;
    }
    if (!step.meshCollector) {
        let meshCollector = new LDR.MeshCollector(this.opaqueObject, this.sixteenObject, this.transObject, this.manager);
        step.meshCollector = meshCollector;
        let prevAccumulatedBounds = new THREE.Box3();
        prevAccumulatedBounds.copy(this.steps[this.length - 1].accumulatedBounds);
        step.bounds = step.accumulatedBounds = prevAccumulatedBounds;
        for (let i = 1; i < this.partDescs.length; i++) {
            let pd = this.partDescs[i];
            this.part.generateThreePart(this.loader, pd.c, pd.p, pd.r, true, false, step.meshCollector);
        }
        meshCollector.setOldValue(false);
        let b = step.meshCollector.boundingBox;
        step.accumulatedBounds.expandByPoint(b.min);
        step.accumulatedBounds.expandByPoint(b.max);
    } else if (this.hasExtraParts) {
        step.meshCollector.setVisible(true);
    }
}
LDR.StepHandler.prototype.isAtPreStep = function () {
    return this.current === -1;
}
LDR.StepHandler.prototype.isAtFirstStep = function () {
    if (this.current !== 0) {
        return false;
    }
    let subStepHandler = this.steps[0].stepHandler;
    return !subStepHandler || subStepHandler.isAtFirstStep();
}
LDR.StepHandler.prototype.isAtPlacementStep = function () {
    return this.current === this.length;
}
LDR.StepHandler.prototype.isAtLastStep = function () {
    if (this.isAtPlacementStep()) {
        return true;
    }
    if (this.current < this.length - 1) {
        return false;
    }
    let subStepHandler = this.steps[this.current].stepHandler;
    return !subStepHandler || subStepHandler.isAtPlacementStep();
}
LDR.StepHandler.prototype.setVisibleUpTo = function (v, idx) {
    for (let i = 0; i < idx; i++) {
        let step = this.steps[i];
        let mc = step.meshCollector;
        if (mc) {
            mc.setVisible(v);
            continue;
        }
        let sh = step.stepHandler;
        if (sh) {
            sh.setVisible(v);
        }
    }
}
LDR.StepHandler.prototype.setVisible = function (v) {
    this.setVisibleUpTo(v, this.length);
    if (!this.hasExtraParts) {
        return;
    }
    let mc = this.steps[this.length].meshCollector;
    if (mc) {
        mc.setVisible(v);
    }
}
LDR.StepHandler.prototype.updateMeshCollectors = function (old) {
    for (let i = 0; i < this.length; i++) {
        let step = this.steps[i];
        let mc = step.meshCollector;
        if (mc) {
            let tOld = old;
            if (tOld === undefined) {
                tOld = mc.old;
            }
            mc.draw(tOld);
        }
        let sh = step.stepHandler;
        if (sh) {
            sh.updateMeshCollectors(old);
        }
    }
    if (this.hasExtraParts) {
        let mc = this.steps[this.length].meshCollector;
        if (mc) {
            let tOld = old;
            if (tOld === undefined) {
                tOld = mc.old;
            }
            mc.draw(tOld);
        }
    }
}
var Algorithm = Algorithm || {};
Algorithm.PackPlis = function (fillHeight, maxWidth, maxHeight, plis, textHeight) {
    if (plis.length === 0) {
        return [0, 0];
    }
    const WIDTH_ADD = 4;
    const TEXT_WIDTH_TO_HEIGHT_RATIO = 0.6;
    plis.forEach(r => r.MULT_DX = (1 + ('' + r.mult).length) * textHeight * TEXT_WIDTH_TO_HEIGHT_RATIO);
    let minPliWidth = 1;
    let maxPliSideLength = Math.max.apply(null, plis.map(r => Math.max(r.dx, r.dy)));
    let maxPliWidth = maxWidth;
    let w, h;

    function lineSetDist(topLines, topWidth, bottomLines, bottomWidth) {
        let min = 9999999;

        function lineDist(topLine, bottomLine) {
            let minWidth = Math.min(topWidth, bottomWidth);
            let pt1 = topLine.eval(topWidth - minWidth),
                pt2 = topLine.eval(topWidth);
            let pb1 = bottomLine.eval(bottomWidth - minWidth),
                pb2 = bottomLine.eval(bottomWidth);
            return Math.max(pt1 - pb1, pt2 - pb2);
        }
        topLines.forEach(topLine => min = Math.min(min, Math.min.apply(null, bottomLines.map(bottomLine => lineDist(topLine, bottomLine)))));
        return min;
    }

    function textBoxDist(prev, r) {
        if (r.DX < prev.FULL_DX - prev.MULT_DX) {
            return -999999;
        }
        let x1 = r.DX - prev.FULL_DX;
        let x2 = x1 + prev.MULT_DX;
        let y12 = prev.MULT_Y + textHeight;
        let pts = [{
            x: x1,
            y: y12
        }, {
            x: x2,
            y: y12
        }];

        function linePointsDist(line) {
            let boxPoints = pts.map(p => line.eval(p.x) + p.y);
            return Math.max.apply(null, boxPoints);
        }
        let ret = Math.min.apply(null, r.LINES_BELOW.map(line => linePointsDist(line, pts)));
        return Math.min(prev.MULT_Y + textHeight, ret);
    }

    function run(pliWidth) {
        let scale = pliWidth / maxPliSideLength;
        plis.forEach(r => {
            r.DX = scale * r.dx;
            r.DY = scale * r.dy;
            r.LINES_BELOW = r.linesBelow.map(line => line.clone().scaleY(scale));
            r.LINES_ABOVE = r.linesAbove.map(line => line.clone().scaleY(scale));
            let lines = r.LINES_ABOVE.filter(line => line.a > 0);
            let linesAtMultDx = lines.map(line => line.eval(r.MULT_DX));
            r.MULT_Y = Math.min(r.DY, Math.min.apply(null, linesAtMultDx));
            r.FULL_DX = Math.max(r.DX, r.MULT_DX);
            r.FULL_DY = Math.max(r.DY, r.MULT_Y + textHeight);
            if (r.annotation) {
                r.ANNO_Y = Math.min.apply(null, r.LINES_ABOVE.map(line => line.eval(r.DX)));
                r.FULL_DY = Math.max(r.FULL_DY, r.ANNO_Y + textHeight);
            }
        });
        let firstInColumn = 0;
        let alignInColumn = to => {
            let maxAnno = 0;
            for (let j = firstInColumn; j < to; j++) {
                let r2 = plis[j];
                r2.x = w - r2.FULL_DX;
                if (r2.annotation) {
                    maxAnno = Math.max(maxAnno, r2.annotation.length);
                }
            }
            firstInColumn = to;
            maxAnno *= textHeight * TEXT_WIDTH_TO_HEIGHT_RATIO * 0.89;
            maxW += WIDTH_ADD + maxAnno;
            w += maxAnno;
        };
        let r = plis[0];
        r.x = r.y = 0;
        let maxW = w = r.FULL_DX;
        h = r.FULL_DY;
        for (let i = 1; i < plis.length && w < maxWidth && h < maxHeight; i++) {
            let prev = r;
            r = plis[i];
            r.x = prev.x;
            r.y = prev.y + Math.max(textBoxDist(prev, r),
                lineSetDist(prev.LINES_ABOVE, prev.FULL_DX, r.LINES_BELOW, r.FULL_DX));
            if (r.y < 0) {
                r.y = 0;
            }
            if (r.y + r.FULL_DY > maxHeight) {
                alignInColumn(i);
                r.x += maxW;
                r.y = 0;
                w = r.x + r.FULL_DX;
                h = Math.max(h, r.FULL_DY);
                maxW = r.FULL_DX;
            } else {
                w = Math.max(w, r.x + r.FULL_DX);
                h = Math.max(h, r.y + r.FULL_DY);
                maxW = Math.max(maxW, r.FULL_DX);
            }
        }
        alignInColumn(plis.length);
        if (w < maxWidth && h < maxHeight) {
            minPliWidth = pliWidth;
            return true;
        } else {
            maxPliWidth = pliWidth;
            return false;
        }
    }
    let currentPlacementIsOK = false;
    while (minPliWidth + 5 < maxPliWidth) {
        let pliWidth = (minPliWidth + maxPliWidth) * 0.5;
        currentPlacementIsOK = run(pliWidth);
    }
    if (!currentPlacementIsOK) {
        run(minPliWidth);
    }
    return [w, h];
}
LDR = LDR || {};
LDR.PLIBuilder = function (loader, canEdit, mainModelID, canvas, renderer) {
    this.loader = loader;
    this.canEdit = canEdit;
    this.canvas = canvas;
    this.renderer = renderer;
    this.fillHeight = false;
    this.groupParts = true;
    this.clickMap;
    let self = this;
    if (LDR.Options) {
        LDR.Options.listeners.push(function () {
            if (self.lastStep) {
                self.drawPLIForStep(self.fillHeight, self.lastStep,
                    self.lastMaxWidth, self.lastMaxHeight, 0, true);
            }
        });
    }
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000000);
    this.camera.position.set(10000, 7000, 10000);
    this.camera.lookAt(new THREE.Vector3());
    this.measurer = new LDR.Measurer(this.camera);
    this.scene = new THREE.Scene();
}
LDR.PLIBuilder.prototype.getPartType = function (id) {
    let pt = this.loader.getPartType(id);
    if (!pt.mesh) {
        pt.mesh = new THREE.Group();
        let opaqueObject = new THREE.Group();
        let sixteenObject = new THREE.Group();
        let transObject = new THREE.Group();
        pt.mesh.add(opaqueObject);
        pt.mesh.add(sixteenObject);
        pt.mesh.add(transObject);
        pt.pliMC = new LDR.MeshCollector(opaqueObject, sixteenObject, transObject);
        let p = new THREE.Vector3();
        let r = new THREE.Matrix3();
        r.set(1, 0, 0, 0, -1, 0, 0, 0, -1);
        pt.generateThreePart(this.loader, 16, p, r, true, false, pt.pliMC);
        pt.pliMC.draw(false);
        let elementCenter = new THREE.Vector3();
        let b = pt.pliMC.boundingBox;
        b.getCenter(elementCenter);
        pt.mesh.position.sub(elementCenter);
        let [width, height, linesBelow, linesAbove] = this.measurer.measureConvexHull(b, pt.mesh.matrixWorld);
        pt.dx = width;
        pt.dy = height;
        pt.linesBelow = linesBelow;
        pt.linesAbove = linesAbove;
    }
    return pt;
}
LDR.PLIBuilder.prototype.updateCamera = function (w, h) {
    this.camera.left = -w * 0.51;
    this.camera.right = w * 0.51;
    this.camera.top = h * 0.51;
    this.camera.bottom = -h * 0.51;
    this.camera.updateProjectionMatrix();
}
LDR.PLIBuilder.prototype.renderIcon = function (partID, c, w, h) {
    let pt = this.getPartType(partID);
    pt.pliMC.overwriteColor(c);
    pt.pliMC.draw(false);
    this.scene.add(pt.mesh);
    this.renderer.setSize(w + 1, h + 1);
    this.updateCamera(pt.dx, pt.dy);
    this.renderer.render(this.scene, this.camera);
    this.scene.remove(pt.mesh);
}
LDR.PLIBuilder.prototype.createClickMap = function (step) {
    let icons = {};
    this.clickMap = [];
    for (let i = 0; i < step.subModels.length; i++) {
        let dat = step.subModels[i];
        if (this.groupParts && dat.REPLACEMENT_PLI === true) {
            continue;
        }
        let partID = (this.groupParts && dat.REPLACEMENT_PLI) ? dat.REPLACEMENT_PLI : dat.ID;
        let partType = this.loader.getPartType(partID);
        if (!partType) {
            continue;
        }
        let c = dat.c;
        let key = partID.endsWith('.dat') ? partID.substring(0, partID.length - 4) : partID;
        let pliID = key;
        if (LDR.PLI && LDR.PLI.hasOwnProperty(pliID)) {
            let pliInfo = LDR.PLI[pliID];
            partID = "pli_" + partType.ID;
            if (!this.loader.partTypes.hasOwnProperty(partID)) {
                let r = new THREE.Matrix3();
                r.set(pliInfo[0], pliInfo[1], pliInfo[2],
                    pliInfo[3], pliInfo[4], pliInfo[5],
                    pliInfo[6], pliInfo[7], pliInfo[8]);
                let step = new THREE.LDRStep();
                step.addSubModel(new THREE.LDRPartDescription(16, new THREE.Vector3(), r,
                    partType.ID, true, false));
                let pt = new THREE.LDRPartType();
                pt.ID = partID;
                pt.modelDescription = partType.modelDescription;
                pt.author = partType.author;
                pt.license = partType.license;
                pt.inlined = partType.inlined;
                pt.isPart = partType.isPart;
                pt.steps.push(step);
                this.loader.partTypes[partID] = pt;
            }
            dat.ID = partID;
        }
        key += '_' + c;
        let icon = icons[key];
        if (this.groupParts && icon) {
            icon.mult++;
        } else {
            let pt = this.getPartType(partID);
            let b = pt.pliMC.boundingBox;
            icon = {
                key: key,
                partID: partID,
                c: c,
                mult: 1,
                desc: pt.modelDescription,
                annotation: LDR.Annotations ? LDR.Annotations[pliID] : null,
                dx: pt.dx,
                dy: pt.dy,
                linesBelow: pt.linesBelow,
                linesAbove: pt.linesAbove,
                size: b.min.distanceTo(b.max),
                inlined: pt.inlined,
                part: dat,
            };
            icons[key] = icon;
            this.clickMap.push(icon);
        }
    }
    let sorter = function (a, b) {
        if (a.dx != b.dx) {
            return a.dx < b.dx ? -1 : 1;
        }
        let ca = a.desc;
        let cb = b.desc;
        if (ca !== cb) {
            return ca < cb ? -1 : 1;
        }
        return a.c - b.c;
    }
    this.clickMap.sort(sorter);
}
LDR.PLIBuilder.prototype.drawPLIForStep = function (fillHeight, step, maxWidth, maxHeight, force) {
    let groupParts = !(this.canEdit && LDR.Options && LDR.Options.showEditor);
    if (!force &&
        this.lastStep && this.lastStep.idx === step.idx && this.groupParts === groupParts &&
        this.lastMaxWidth === maxWidth && this.lastMaxHeight === maxHeight &&
        this.fillHeight === fillHeight) {
        return;
    }
    const LOWER_LIMIT = 10;
    if (maxWidth < LOWER_LIMIT || maxHeight < LOWER_LIMIT) {
        this.canvas.style.display = 'none';
        return;
    }
    this.canvas.style.display = 'inline-block';
    this.groupParts = groupParts;
    this.fillHeight = fillHeight;
    this.lastStep = step;
    this.lastMaxWidth = maxWidth;
    this.lastMaxHeight = maxHeight;
    this.createClickMap(step);
    let textHeight = (!fillHeight ? maxHeight : maxWidth) / Math.sqrt(this.clickMap.length) * 0.19;
    let [W, H] = Algorithm.PackPlis(fillHeight, maxWidth - 4, maxHeight - 4, this.clickMap, textHeight);
    const DPR = window.devicePixelRatio;
    if (fillHeight) {
        let h = Math.max(100, 12 + H);
        this.canvas.width = maxWidth * DPR;
        this.canvas.height = h * DPR;
        this.canvas.style.width = maxWidth + "px";
        this.canvas.style.height = h + "px";
    } else {
        let w = Math.max(100, 12 + W);
        this.canvas.width = w * DPR;
        this.canvas.height = maxHeight * DPR;
        this.canvas.style.width = w + "px";
        this.canvas.style.height = maxHeight + "px";
    }
    let context = this.canvas.getContext('2d');
    if (!context) {
        console.warn('2D context for PLI not yet ready.');
        return;
    }
    const scaleDown = 0.98;
    let self = this;
    context.clearRect(0, 0, context.width, context.height);
    context.translate(6, 6);
    for (let i = 0; i < self.clickMap.length; i++) {
        let icon = self.clickMap[i];
        let x = icon.x * DPR;
        let y = icon.y * DPR;
        let w = parseInt(icon.DX * scaleDown);
        let h = parseInt(icon.DY * scaleDown);
        self.renderIcon(icon.partID, icon.c, w, h);
        context.drawImage(self.renderer.domElement, x, y);
    }
    context.fillStyle = "#000";
    context.lineWidth = "1";
    if (self.groupParts) {
        context.font = parseInt(textHeight * 1.1 * DPR) + "px sans-serif";
        context.fillStyle = "black";

        function drawMultiplier(icon) {
            let x = icon.x * DPR;
            let y = (icon.y + icon.MULT_Y) * DPR;
            let w = icon.MULT_DX * DPR;
            let h = textHeight * DPR;
            context.fillText(icon.mult + "x", x, y + h * 0.84);
        }
        self.clickMap.forEach(drawMultiplier);
    }
    context.font = parseInt(textHeight * 0.8 * DPR) + "px monospace";
    self.clickMap.filter(icon => icon.annotation).forEach(icon => {
        let len = icon.annotation.length;
        let x = (icon.x + icon.FULL_DX + 1) * DPR;
        let y = (icon.y + icon.ANNO_Y) * DPR;
        let w = (len * textHeight * 0.54) * DPR;
        let h = textHeight * DPR;
        context.beginPath();
        context.fillStyle = "#CFF";
        if (icon.desc && icon.desc.startsWith('Technic Axle')) {
            context.arc(x + w * 0.45, y + h * 0.5, w * 0.7, 0, 2 * Math.PI, false);
        } else {
            context.rect(x, y, w, h);
        }
        context.fill();
        context.stroke();
        context.fillStyle = "#25E";
        y += textHeight * DPR * 0.79;
        context.fillText(icon.annotation, x, y);
    });
    if (LDR.Options && LDR.Options.showEditor) {
        context.strokeStyle = "#5DD";
        context.lineWidth = '4';
        let hoveredIcon = null;
        self.clickMap.forEach(icon => {
            if (icon.part.original.ghost) {
                let x = parseInt((icon.x) * DPR);
                let y = parseInt((icon.y) * DPR);
                let w = parseInt((icon.DX) * DPR);
                let h = parseInt((icon.DY) * DPR);
                context.strokeRect(x, y, w, h);
            }
            if (icon.part.original.hover) {
                hoveredIcon = icon;
            }
        });
        if (hoveredIcon) {
            context.strokeStyle = "#000";
            context.setLineDash([10, 10]);
            self.clickMap.forEach(icon => {
                let x = parseInt((hoveredIcon.x) * DPR);
                let y = parseInt((hoveredIcon.y) * DPR);
                let w = parseInt((hoveredIcon.DX) * DPR);
                let h = parseInt((hoveredIcon.DY) * DPR);
                context.strokeRect(x, y, w, h);
            });
        }
    }
}
LDR.PliPreviewer = function (modelID, canvas, renderer) {
    if (!renderer || !canvas) {
        throw "Missing canvas or renderer";
    }
    this.modelID = modelID;
    this.canvas = canvas;
    this.renderer = renderer;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000000);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFFFFF);
    this.resetCameraPosition();
    this.subjectSize = 1;
    this.controls;
}
LDR.PliPreviewer.prototype.enableControls = function () {
    let self = this;
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.addEventListener('change', () => self.render());
}
LDR.PliPreviewer.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
}
LDR.PliPreviewer.prototype.onResize = function () {
    let w = window.innerWidth * 0.80;
    let h = (window.innerHeight - 180);
    this.renderer.setSize(w, h);
    this.renderer.domElement.parentElement.style.width = w + "px";
    this.renderer.domElement.parentElement.style.height = h + "px";
    this.camera.left = -w;
    this.camera.right = w;
    this.camera.top = h;
    this.camera.bottom = -h;
    this.resetCameraZoom();
    this.render();
}
LDR.PliPreviewer.prototype.resetCameraZoom = function () {
    let sizeMin = Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
    this.camera.zoom = sizeMin / this.subjectSize;
    this.camera.updateProjectionMatrix();
}
LDR.PliPreviewer.prototype.resetCameraPosition = function () {
    this.camera.position.set(10000, 7000, 10000);
    this.camera.lookAt(new THREE.Vector3());
    this.resetCameraZoom();
    this.render();
}
LDR.PliPreviewer.prototype.zoomIn = function () {
    if (!this.controls) {
        return;
    }
    this.controls.dollyIn(1.2);
    this.render();
}
LDR.PliPreviewer.prototype.zoomOut = function () {
    if (!this.controls) {
        return;
    }
    this.controls.dollyOut(1.2);
    this.render();
}
LDR.PliPreviewer.prototype.showPliPreview = function (icon) {
    if (icon) {
        let c = icon.c;
        let color = LDR.Colors[c];
        let nameEle = document.getElementById('preview_info_name');
        let partIdNoDat = icon.partID.slice(0, -4);
        if (partIdNoDat.startsWith('pli_')) {
            partIdNoDat = partIdNoDat.substring(4);
        }
        let partIdBricklink;
        if (LDR.BL && LDR.BL.hasOwnProperty(partIdNoDat)) {
            partIdBricklink = LDR.BL[partIdNoDat];
        } else {
            partIdBricklink = partIdNoDat;
        }
        let desc = icon.desc || partIdNoDat;
        nameEle.innerHTML = desc + " (" + partIdNoDat + ")";
        let blA = document.getElementById('preview_info_bl_link');
        if (color.bricklink_name) {
            blA.setAttribute('href', 'https://www.bricklink.com/catalogItemIn.asp?P=' + partIdBricklink + '&c=' + color.bricklink_id + '&in=A');
        } else {
            blA.setAttribute('href', 'https://www.bricklink.com/catalogItem.asp?P=' + partIdBricklink);
        }
        let bhA = document.getElementById('preview_info_bh_link');
        if (icon.inlined && !isNaN(icon.inlined)) {
            bhA.setAttribute('href', "http://brickhub.org/p/part.php?user_id=" + icon.inlined + "&id=" + encodeURI(partIdNoDat));
            blA.style.visibility = "hidden";
        } else if (!(icon.ldraw_org && !icon.ldraw_org.startsWith('Unofficial_')) && (icon.inlined === undefined || icon.inlined === 'undefined')) {
            bhA.setAttribute('href', "http://brickhub.org/p/part.php?from=" + this.modelID + "&id=" + encodeURI(partIdNoDat));
            blA.style.visibility = "hidden";
        } else {
            bhA.setAttribute('href', 'http://brickhub.org/p/' + partIdNoDat);
            blA.style.visibility = "visible";
        }
        document.getElementById('preview_info_color_ldraw').innerHTML = color.name + " (" + c + ")";
        document.getElementById('preview_info_color_lego').innerHTML = color.lego_name ? (color.lego_name + " (" + color.lego_id + ")") : 'Unknown official LEGO color';
        document.getElementById('preview_info_id_bricklink').innerHTML = partIdBricklink;
        document.getElementById('preview_info_color_bricklink').innerHTML = color.bricklink_name ? (color.bricklink_name + " (" + color.bricklink_id + ")") : 'Unknown Bricklink color';
    }
    let fadeInTime = 400;
    $('#preview_holder, #preview_background, #preview').fadeIn(fadeInTime);
}
LDR.PliPreviewer.prototype.hidePliPreview = function () {
    let fadeOutTime = 400;
    $('#preview_holder, #preview_background, #preview').fadeOut(fadeOutTime);
}
LDR.Buttons = function (actions, element, addTopButtons, homeLink, mainImage, options) {
    let self = this;
    this.cameraButtons = this.createDiv('camera_buttons');
    this.cameraButtons.setAttribute('class', 'ui_control');
    this.zoomOutButtonLarge = this.createDiv('zoom_out_button_large', actions.zoomOut);
    this.zoomOutButtonLarge.appendChild(LDR.SVG.makeZoom(false, 2));
    this.cameraButtons.appendChild(this.zoomOutButtonLarge);
    this.resetCameraButton = this.createDiv('reset_camera_button', actions.resetCameraPosition);
    this.resetCameraButton.appendChild(LDR.SVG.makeCamera(50, 45, 100));
    this.cameraButtons.appendChild(this.resetCameraButton);
    this.zoomInButton = this.createDiv('zoom_in_button', actions.zoomIn);
    this.zoomInButton.appendChild(LDR.SVG.makeZoom(true, 1));
    this.cameraButtons.appendChild(this.zoomInButton);
    this.zoomOutButton = this.createDiv('zoom_out_button', actions.zoomOut);
    this.zoomOutButton.appendChild(LDR.SVG.makeZoom(false, 1));
    this.cameraButtons.appendChild(this.zoomOutButton);
    this.zoomInButtonLarge = this.createDiv('zoom_in_button_large', actions.zoomIn);
    this.zoomInButtonLarge.appendChild(LDR.SVG.makeZoom(true, 2));
    this.cameraButtons.appendChild(this.zoomInButtonLarge);
    element.appendChild(this.cameraButtons);
    if (actions.prevStep) {
        this.backButton = this.createDiv('prev_button', actions.prevStep);
        this.backButton.appendChild(LDR.SVG.makeLeftArrow(!addTopButtons));
        if (!addTopButtons) {
            element.appendChild(this.backButton);
        }
    }
    if (actions.nextStep) {
        this.nextButton = this.createDiv('next_button', actions.nextStep);
        this.nextButton.append(LDR.SVG.makeRightArrow(!addTopButtons));
        if (!addTopButtons) {
            element.appendChild(this.nextButton);
        } else {
            this.nextButtonLarge = this.createDiv('next_button_large', actions.nextStep);
            this.nextButtonLarge.setAttribute('class', 'ui_control');
            this.doneButton = this.createDiv('done_button', actions.clickDone);
            this.nextButtonLarge.append(LDR.SVG.makeRightArrowLarge());
            this.doneButton.append(LDR.SVG.makeCheckMark());
            element.appendChild(this.nextButtonLarge);
            element.appendChild(this.doneButton);
        }
    }
    if (addTopButtons) {
        this.addTopButtonElements(actions, element, homeLink, mainImage, options);
    }
    this.hideElementsAccordingToOptions();
    this.fadeOutHandle;
    let fadeOut = function () {
        self.fadeOutHandle = null;
        $('.ui_control').fadeTo(1000, 0);
    }
    let onFadeInComplete = function () {
        self.fadeOutHandle = setTimeout(fadeOut, 1000);
    }
    fadeOut();
    let runUIFading = function () {
        $('.ui_control').stop();
        if (self.fadeOutHandle) {
            clearTimeout(self.fadeOutHandle);
        }
        self.fadingIn = true;
        $('.ui_control').css('opacity', 1);
        onFadeInComplete();
    };
    $("#main_canvas, #preview, #next_button_large, #next_button, .ui_control").mousemove(runUIFading);
    $(".ui_control").on('tap', runUIFading);
}
LDR.Buttons.prototype.addTopButtonElements = function (actions, element, homeLink, mainImage, options) {
    this.topButtons = this.createDiv('top_buttons');
    this.backButton.setAttribute('class', 'top_button');
    this.topButtons.appendChild(this.backButton);
    this.stepToButton = this.createDiv('stepToContainer');
    this.stepToButton.appendChild(this.makeStepTo());
    this.topButtons.appendChild(this.stepToButton);
    if (options.showNumberOfSteps) {
        let stepsEle = this.createDiv('numberOfSteps');
        this.topButtons.appendChild(stepsEle);
        stepsEle.innerHTML = "/ ?";
    }
    this.homeButton = this.create('a', 'home_button', null, 'top_button');
    this.homeButton.setAttribute('href', homeLink);
    if (mainImage) {
        let img = document.createElement('img');
        img.setAttribute('src', mainImage);
        this.homeButton.appendChild(img);
    } else {
        this.homeButton.appendChild(LDR.SVG.makeUpAndBack());
    }
    this.topButtons.appendChild(this.homeButton);
    if (options.canEdit) {
        let editButton = this.createDiv('editButton');
        editButton.appendChild(LDR.SVG.makeEdit());
        editButton.addEventListener('click', actions.toggleEditor);
        this.topButtons.appendChild(editButton);
    }
    if (options.setUpOptions) {
        this.optionsButton = this.createDiv('optionsButton');
        this.optionsButton.setAttribute('class', 'top_button');
        this.optionsButton.appendChild(LDR.SVG.makeOptions());
        this.topButtons.appendChild(this.optionsButton);
    }
    this.nextButton.setAttribute('class', 'top_button');
    this.topButtons.appendChild(this.nextButton);
    element.appendChild(this.topButtons);
}
LDR.Buttons.prototype.hideElementsAccordingToOptions = function () {
    if (LDR.Options.showCameraButtons == 2) {
        this.zoomInButtonLarge.style.display = 'none';
        this.zoomOutButtonLarge.style.display = 'none';
        this.zoomInButton.style.display = 'none';
        this.zoomOutButton.style.display = 'none';
        this.resetCameraButton.style.visibility = 'hidden';
    } else if (LDR.Options.showCameraButtons == 0) {
        this.zoomInButtonLarge.style.display = 'none';
        this.zoomOutButtonLarge.style.display = 'none';
        this.zoomInButton.style.display = 'inline-block';
        this.zoomOutButton.style.display = 'inline-block';
        this.resetCameraButton.style.visibility = 'inline-block';
    } else {
        this.zoomInButton.style.display = 'none';
        this.zoomOutButton.style.display = 'none';
        this.zoomInButtonLarge.style.display = 'inline-block';
        this.zoomOutButtonLarge.style.display = 'inline-block';
        this.resetCameraButton.style.visibility = 'inline-block';
    }
}
LDR.Buttons.prototype.makeStepTo = function () {
    this.stepInput = document.createElement("input");
    this.stepInput.setAttribute("id", "pageNumber");
    this.stepInput.setAttribute("onClick", "this.select();");
    return this.stepInput;
}
LDR.Buttons.prototype.createDiv = function (id, onclick, classA) {
    return this.create('div', id, onclick, classA);
}
LDR.Buttons.prototype.create = function (type, id, onclick, classA) {
    let ret = document.createElement(type);
    ret.setAttribute('id', id);
    if (onclick) {
        ret.addEventListener('click', onclick);
    }
    if (classA) {
        ret.setAttribute('class', classA);
    }
    return ret;
}
LDR.Buttons.prototype.atFirstStep = function () {
    this.backButton.style.visibility = 'hidden';
    this.nextButton.style.visibility = 'visible';
    if (this.nextButtonLarge) {
        this.nextButtonLarge.style.visibility = 'visible';
    }
    if (this.doneButton) {
        this.doneButton.style.visibility = 'hidden';
    }
}
LDR.Buttons.prototype.atLastStep = function () {
    this.backButton.style.visibility = 'visible';
    this.nextButton.style.visibility = 'hidden';
    if (this.nextButtonLarge) {
        this.nextButtonLarge.style.visibility = 'hidden';
    }
    if (this.doneButton) {
        this.doneButton.style.visibility = 'visible';
    }
}
LDR.Buttons.prototype.atAnyOtherStep = function () {
    this.backButton.style.visibility = 'visible';
    this.nextButton.style.visibility = 'visible';
    if (this.nextButtonLarge) {
        this.nextButtonLarge.style.visibility = 'visible';
    }
    if (this.doneButton) {
        this.doneButton.style.visibility = 'hidden';
    }
}
LDR.Buttons.prototype.setShownStep = function (step) {
    this.stepInput.value = "" + step;
}
LDR.Measurer = function (camera) {
    this.camera = camera;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
    this.m = new THREE.Matrix4();
    this.m.copy(this.camera.projectionMatrix);
    this.m.multiply(this.camera.matrixWorldInverse);
}
LDR.Measurer.prototype.measure = function (b, matrixWorld) {
    let m = new THREE.Matrix4();
    m.copy(this.m);
    m.multiply(matrixWorld);
    let pts = [new THREE.Vector3(b.min.x, b.min.y, b.min.z),
        new THREE.Vector3(b.max.x, b.max.y, b.max.z),
        new THREE.Vector3(b.min.x, b.min.y, b.max.z),
        new THREE.Vector3(b.min.x, b.max.y, b.min.z),
        new THREE.Vector3(b.max.x, b.min.y, b.min.z),
        new THREE.Vector3(b.min.x, b.max.y, b.max.z),
        new THREE.Vector3(b.max.x, b.min.y, b.max.z),
        new THREE.Vector3(b.max.x, b.max.y, b.min.z)
    ];
    pts.forEach(p => p.applyMatrix4(m));
    let minx = pts[0].x;
    let maxx = pts[0].x;
    let miny = pts[0].y;
    let maxy = pts[0].y;
    for (let i = 1; i < 8; i++) {
        minx = Math.min(minx, pts[i].x);
        maxx = Math.max(maxx, pts[i].x);
        miny = Math.min(miny, pts[i].y);
        maxy = Math.max(maxy, pts[i].y);
    }
    let dx = maxx - minx;
    let dy = maxy - miny;
    return [dx, dy];
}
LDR.EPS = 0.00001;
LDR.equals = function (a, b) {
    let d = a - b;
    return -LDR.EPS < d && d < LDR.EPS;
}
LDR.MeasuringLine = function (p1, p2) {
    if (!p1) {
        return;
    }
    if (p1.x > p2.x) {
        let tmp = p1;
        p1 = p2;
        p2 = tmp;
    }
    this.a = (p2.y - p1.y) / (p2.x - p1.x);
    this.y0 = p1.y - p1.x * this.a;
}
LDR.MeasuringLine.prototype.eval = function (x) {
    return this.y0 + this.a * x;
}
LDR.MeasuringLine.prototype.toString = function () {
    return 'f(x)=' + this.y0 + (this.a > 0 ? '+' : '') + this.a + '*x';
}
LDR.MeasuringLine.prototype.setOrigoTo = function (x, y) {
    this.y0 = this.eval(x) - y;
    return this;
}
LDR.MeasuringLine.prototype.scaleY = function (scale) {
    this.y0 *= scale;
    return this;
}
LDR.MeasuringLine.prototype.clone = function () {
    let ret = new LDR.MeasuringLine();
    ret.y0 = this.y0;
    ret.a = this.a;
    return ret;
}
LDR.Measurer.prototype.measureConvexHull = function (b, matrixWorld) {
    let m = new THREE.Matrix4();
    m.copy(this.m);
    m.multiply(matrixWorld);
    let pts = [new THREE.Vector3(b.min.x, b.min.y, b.min.z),
        new THREE.Vector3(b.max.x, b.max.y, b.max.z),
        new THREE.Vector3(b.min.x, b.min.y, b.max.z),
        new THREE.Vector3(b.min.x, b.max.y, b.min.z),
        new THREE.Vector3(b.max.x, b.min.y, b.min.z),
        new THREE.Vector3(b.min.x, b.max.y, b.max.z),
        new THREE.Vector3(b.max.x, b.min.y, b.max.z),
        new THREE.Vector3(b.max.x, b.max.y, b.min.z)
    ];
    pts.forEach(p => {
        p.applyMatrix4(m);
        p.x = -p.x;
    });
    let minx = Math.min.apply(null, pts.map(p => p.x));
    let maxx = Math.max.apply(null, pts.map(p => p.x));
    let miny = Math.min.apply(null, pts.map(p => p.y));
    let maxy = Math.max.apply(null, pts.map(p => p.y));
    let edges = [{
            p1: pts[0],
            p2: pts[2]
        },
        {
            p1: pts[0],
            p2: pts[3]
        },
        {
            p1: pts[0],
            p2: pts[4]
        },
        {
            p1: pts[1],
            p2: pts[5]
        },
        {
            p1: pts[1],
            p2: pts[6]
        },
        {
            p1: pts[1],
            p2: pts[7]
        },
        {
            p1: pts[2],
            p2: pts[5]
        },
        {
            p1: pts[2],
            p2: pts[6]
        },
        {
            p1: pts[3],
            p2: pts[5]
        },
        {
            p1: pts[3],
            p2: pts[7]
        },
        {
            p1: pts[4],
            p2: pts[6]
        },
        {
            p1: pts[4],
            p2: pts[7]
        }
    ];
    edges = edges.filter(e => !LDR.equals(e.p1.x, e.p2.x));
    let toLine = e => new LDR.MeasuringLine(e.p1, e.p2).setOrigoTo(minx, miny);
    let linesBelow = edges.filter(e => LDR.equals(e.p1.y, miny) || LDR.equals(e.p2.y, miny)).map(toLine);
    let linesAbove = edges.filter(e => LDR.equals(e.p1.y, maxy) || LDR.equals(e.p2.y, maxy)).map(toLine);
    let width = maxx - minx;
    let height = maxy - miny;
    return [width, height, linesBelow, linesAbove];
}
LDR.Generator = {};
LDR.Generator.map = {
    '1-4edge.dat': () => LDR.Generator.makeCircle4(1),
    '2-4edge.dat': () => LDR.Generator.makeCircle4(2),
    '4-4edge.dat': () => LDR.Generator.makeCircle4(4),
    '1-4cyli.dat': () => LDR.Generator.makeCylinder(true, 1),
    '1-4cyli2.dat': () => LDR.Generator.makeCylinder(false, 1),
    '2-4cyli.dat': () => LDR.Generator.makeCylinder(true, 2),
    '2-4cyli2.dat': () => LDR.Generator.makeCylinder(false, 2),
    '4-4cyli.dat': () => LDR.Generator.makeCylinder(true, 4),
    '4-4cyli2.dat': () => LDR.Generator.makeCylinder(false, 4),
    '1-4cylc.dat': () => LDR.Generator.makeCylinderClosed(1),
    '2-4cylc.dat': () => LDR.Generator.makeCylinderClosed(2),
    '4-4cylc.dat': () => LDR.Generator.makeCylinderClosed(4),
    '1-4cyls.dat': () => LDR.Generator.makeCylinderSloped(1),
    '2-4cyls.dat': () => LDR.Generator.makeCylinderSloped(2),
    '4-4cyls.dat': () => LDR.Generator.makeCylinderSloped(4),
    '1-4disc.dat': () => LDR.Generator.makeDisc(1),
    '2-4disc.dat': () => LDR.Generator.makeDisc(2),
    '4-4disc.dat': () => LDR.Generator.makeDisc(4),
    '2-4ring1.dat': () => LDR.Generator.makeRing(2, 1),
    '4-4ring2.dat': () => LDR.Generator.makeRing(4, 2),
    '4-4ring3.dat': () => LDR.Generator.makeRing(4, 3),
    '4-4ring5.dat': () => LDR.Generator.makeRing(4, 5),
    '4-4ring6.dat': () => LDR.Generator.makeRing(4, 6),
    'logo.dat': () => LDR.Generator.makeLogo1(),
    'empty.dat': () => LDR.Generator.makeEmpty()
};
LDR.Generator.make = function (id) {
    if (LDR.Generator.map.hasOwnProperty(id)) {
        return LDR.Generator.map[id]();
    } else {
        return null;
    }
}
LDR.Generator.makeP = function (desc, name) {
    let pt = new THREE.LDRPartType();
    pt.name = pt.ID = name;
    pt.modelDescription = desc;
    pt.author = 'LDRGenerator.js';
    pt.license = 'Redistributable under CCAL version 2.0 : see CAreadme.txt';
    pt.inlined = 'GENERATED';
    pt.ldraw_org = 'Primitive';
    pt.cleanSteps = pt.certifiedBFC = pt.CCW = pt.consistentFileAndName = true;
    pt.isPart = true;
    return pt;
}
LDR.Generator.makeR = function (a, b) {
    let ret = new THREE.Matrix3();
    ret.set(a, 0, 0, 0, b, 0, 0, 0, a)
    return ret;
}
LDR.Generator.addLinesToStep = function (step, lines) {
    for (let i = 0; i < lines.length; i += 6) {
        step.addLine(24,
            new THREE.Vector3(lines[i], lines[i + 1], lines[i + 2]),
            new THREE.Vector3(lines[i + 3], lines[i + 4], lines[i + 5]));
    }
}
LDR.Generator.addConditionalLinesToStep = function (step, lines) {
    for (let i = 0; i < lines.length; i += 12) {
        step.addConditionalLine(24,
            new THREE.Vector3(lines[i], lines[i + 1], lines[i + 2]),
            new THREE.Vector3(lines[i + 3], lines[i + 4], lines[i + 5]),
            new THREE.Vector3(lines[i + 6], lines[i + 7], lines[i + 8]),
            new THREE.Vector3(lines[i + 9], lines[i + 10], lines[i + 11]));
    }
}
LDR.Generator.addTrianglesToStep = function (step, triangles, color = 16) {
    for (let i = 0; i < triangles.length; i += 9) {
        step.addTriangle(color,
            new THREE.Vector3(triangles[i], triangles[i + 1], triangles[i + 2], true),
            new THREE.Vector3(triangles[i + 3], triangles[i + 4], triangles[i + 5], true),
            new THREE.Vector3(triangles[i + 6], triangles[i + 7], triangles[i + 8]), true);
    }
}
LDR.Generator.addQuadsToStep = function (step, quads, color = 16) {
    for (let i = 0; i < quads.length; i += 12) {
        step.addQuad(color,
            new THREE.Vector3(quads[i], quads[i + 1], quads[i + 2]),
            new THREE.Vector3(quads[i + 3], quads[i + 4], quads[i + 5]),
            new THREE.Vector3(quads[i + 6], quads[i + 7], quads[i + 8]),
            new THREE.Vector3(quads[i + 9], quads[i + 10], quads[i + 11]),
            true);
    }
}
LDR.Generator.makeEmpty = function (id = 'empty.dat') {
    let pt = LDR.Generator.makeP(id, id);
    pt.steps.push(new THREE.LDRStep());
    return pt;
}
LDR.Generator.makeCylinderClosed = function (sections) {
    let pt = LDR.Generator.makeP('Cylinder Closed ' + (sections * 0.25),
        sections + '-4cylc.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let p1 = new THREE.Vector3(0, 1, 0);
    let r = LDR.Generator.makeR(1, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r, sections + '-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p1, r, sections + '-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r, sections + '-4disc.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r, sections + '-4cyli.dat', true, false));
    pt.steps.push(step);
    return pt;
}
LDR.Generator.makeCircle4 = function (sections) {
    let pt = LDR.Generator.makeP('Circle ' + (sections * 0.25),
        sections + '-4edge.dat');
    let step = new THREE.LDRStep();
    let prev = new THREE.Vector3(1, 0, 0);
    for (let i = 1; i <= 4 * sections; i++) {
        let angle = i * Math.PI / 8;
        let c = Math.cos(angle),
            s = Math.sin(angle);
        let p = new THREE.Vector3(c, 0, s);
        step.addLine(24, prev, p);
        prev = p;
    }
    pt.steps.push(step);
    return pt;
}
LDR.Generator.makeCylinder = function (cond, sections) {
    let desc = 'Cylinder ' + (sections * 0.25);
    if (!cond) {
        desc += ' without Conditional Lines';
    }
    let pt = LDR.Generator.makeP(desc,
        sections + (cond ? '-4cyli.dat' : '-4cyli2.dat'));
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3(1, 0, 0),
        p1 = new THREE.Vector3(1, 1, 0);
    let angle = Math.PI / 8;
    let c = Math.cos(angle),
        s = Math.sin(angle);
    let next0 = new THREE.Vector3(c, 0, s);
    let next1 = new THREE.Vector3(c, 1, s);
    for (let i = 2; i < 4 * sections + 2; i++) {
        let prev0 = p0,
            prev1 = p1;
        p0 = next0;
        p1 = next1;
        angle = i * Math.PI / 8;
        c = Math.cos(angle);
        s = Math.sin(angle);
        next0 = new THREE.Vector3(c, 0, s);
        next1 = new THREE.Vector3(c, 1, s);
        step.addQuad(16, prev1, p1, p0, prev0, true);
        if (cond) {
            step.addConditionalLine(24, p0, p1, prev0, next0);
        }
    }
    pt.steps.push(step);
    return pt;
}
LDR.Generator.makeCylinderSloped = function (sections) {
    let desc = 'Cylinder Sloped ' + (sections * 0.25);
    let pt = LDR.Generator.makeP(desc, sections + '-4cyls.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3(1, 0, 0),
        p1 = new THREE.Vector3(1, 0, 0);
    let angle = Math.PI / 8;
    let c = Math.cos(angle),
        s = Math.sin(angle);
    let next0 = new THREE.Vector3(c, 0, s);
    let next1 = new THREE.Vector3(c, 1 - c, s);
    for (let i = 2; i < 4 * sections + 2; i++) {
        let prev0 = p0,
            prev1 = p1;
        p0 = next0;
        p1 = next1;
        angle = i * Math.PI / 8;
        c = Math.cos(angle);
        s = Math.sin(angle);
        next0 = new THREE.Vector3(c, 0, s);
        next1 = new THREE.Vector3(c, 1 - c, s);
        if (i === 2) {
            step.addTriangle(16, prev1, p1, p0, true);
        } else if (i === 17) {
            step.addTriangle(16, prev1, p1, prev0, true);
        } else {
            step.addQuad(16, prev1, p1, p0, prev0, true);
        }
        step.addConditionalLine(24, p0, p1, prev0, next0);
    }
    pt.steps.push(step);
    return pt;
}
LDR.Generator.makeDisc = function (sections) {
    let pt = LDR.Generator.makeP('Disc ' + (sections * 0.25),
        sections + '-4disc.dat');
    let step = new THREE.LDRStep();
    let zero = new THREE.Vector3(0, 0, 0);
    let prev = new THREE.Vector3(1, 0, 0);
    for (let i = 1; i <= 4 * sections; i++) {
        let angle = i * Math.PI / 8;
        let c = Math.cos(angle),
            s = Math.sin(angle);
        let p = new THREE.Vector3(c, 0, s);
        step.addTriangle(16, zero, prev, p, true);
        prev = p;
    }
    pt.steps.push(step);
    return pt;
}
LDR.Generator.makeRing = function (sections, size) {
    let pt = LDR.Generator.makeP('Ring ' + size + ' x ' + (0.25 * sections),
        sections + '-4ring' + size + '.dat');
    let step = new THREE.LDRStep();
    let SIZE = size + 1;
    let prev1 = new THREE.Vector3(size, 0, 0);
    let prev2 = new THREE.Vector3(SIZE, 0, 0);
    for (let i = 1; i <= 4 * sections; i++) {
        let angle = i * Math.PI / 8;
        let c = Math.cos(angle),
            s = Math.sin(angle);
        let p1 = new THREE.Vector3(SIZE * c, 0, SIZE * s);
        let p2 = new THREE.Vector3(size * c, 0, size * s);
        step.addQuad(16, p1, p2, prev1, prev2, true);
        prev1 = p2;
        prev2 = p1;
    }
    pt.steps.push(step);
    return pt;
}
LDR.Generator.logoPositions = [
    [-2, -4, 2, -5, 2, -3.5],
    [-2, 0, -2, -2, 2, -3, 2, -1],
    [0, -1, 0, -2.5], ,
    [-1.5, 2.25, -2, 2, -2, 1, -1.5, 0.5, 1.5, -0.25, 2, 0, 2, 1, 1.5, 1.5, 0, 2, 0, 1],
    [-1.5, 4.75, -2, 4.5, -2, 3.5, -1.5, 3, 1.5, 2.25, 2, 2.5, 2, 3.5, 1.5, 4, -1.5, 4.75]
];
LDR.Generator.makeLogo1 = function () {
    let pt = LDR.Generator.makeP('LEGO Logo for Studs - Non-3D Thin Lines', 'logo.dat');
    pt.ldraw_org = 'Unofficial_Primitive';
    let step = new THREE.LDRStep();
    LDR.Generator.logoPositions.forEach(letter => {
        for (let i = 2; i < letter.length; i += 2) {
            let p1 = new THREE.Vector3(letter[i - 2], 0, letter[i - 1]);
            let p2 = new THREE.Vector3(letter[i], 0, letter[i + 1]);
            step.addLine(24, p1, p2);
        }
    });
    pt.steps.push(step);
    return pt;
}
'use strict'
LDR.Studs = {};
LDR.Studs.all = [
    (hc, logoType, force) => LDR.Studs.makeStud1(hc, logoType, force, true),
    (hc, logoType, force) => LDR.Studs.makeStud1(hc, logoType, force, false),
    (hc, logoType, force) => LDR.Studs.makeStud2(hc, logoType, force),
    (hc, logoType, force) => LDR.Studs.makeStud2a(hc, force),
    (hc, logoType, force) => LDR.Studs.makeStud6(hc, logoType, force, true),
    (hc, logoType, force) => LDR.Studs.makeStud6(hc, logoType, force, false),
    (hc, logoType, force) => LDR.Studs.makeStud10(hc, logoType, force),
    (hc, logoType, force) => LDR.Studs.makeStud13(hc, logoType, force),
    (hc, logoType, force) => LDR.Studs.makeStud15(hc, logoType, force),
    (hc, logoType, force) => LDR.Studs.makeStud17(hc, logoType, force, true),
    (hc, logoType, force) => LDR.Studs.makeStud17(hc, logoType, force, false),
    (hc, logoType, force) => LDR.Studs.makeStudP01(hc, logoType, force),
    (hc, logoType, force) => LDR.Studs.makeStudEl(hc, logoType, force),
];
LDR.Studs.makeGenerators = function (force, highContrast, logoType) {
    if (!LDR.Generator) {
        console.warn('Generators not enabled - skipping stud generation.');
        return;
    }
    LDR.Studs.all.forEach(f => LDR.Generator.map[f(false, 0, false).ID] = () => f(highContrast, logoType, force));
}
LDR.Studs.setStuds = function (loader, highContrast, logoType, onDone) {
    let partTypes = loader.partTypes;
    let force = loader.options.force ? (loader.options.force + '/') : '';
    let idb = [];
    let seen = {};
    LDR.Studs.all.forEach(f => {
        let s = f(highContrast, logoType, force);
        if (partTypes.hasOwnProperty(s.ID)) {
            partTypes[s.ID] = s;
            s.steps.forEach(step => step.subModels.forEach(sm => {
                if (!seen.hasOwnProperty(sm.ID)) {
                    idb.push(sm.ID);
                    seen[sm.ID] = true;
                }
            }));
        }
    });
    if (idb.length === 0) {
        onDone();
    } else {
        let options = {};
        for (let option in loader.options) {
            if (option === 'key' || option === 'timestamp') {
                continue;
            }
            if (loader.options.hasOwnProperty(option)) {
                options[option] = loader.options[option];
            }
        }
        let loader2 = new THREE.LDRLoader(onDone, loader.storage, options);
        loader2.partTypes = partTypes;
        loader2.loadMultiple(idb);
    }
}
LDR.Studs.makeStud1 = function (highContrast, logoType, force, withoutBaseEdge) {
    let pt = LDR.Generator.makeP('Stud' + (withoutBaseEdge ? ' without Base Edges' : ''), withoutBaseEdge ? 'studa.dat' : 'stud.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let r11 = LDR.Generator.makeR(1, 1);
    let r61 = LDR.Generator.makeR(6, 1);
    let p4 = new THREE.Vector3(0, -4, 0);
    let r64 = LDR.Generator.makeR(6, -4);
    if (!withoutBaseEdge) {
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '4-4edge.dat', true, false));
    }
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '4-4edge.dat', true, false));
    let logoSM = new THREE.LDRPartDescription(16, p4, r61, force + '4-4disc.dat', true, false);;
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (highContrast) {
        step.addSubModel(new THREE.LDRPartDescription(0, p0, r64, force + '4-4cyli2.dat', true, false));
    } else {
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r64, force + '4-4cyli.dat', true, false));
    }
    if (logoType === 1) {
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud2a = function (highContrast, force) {
    let pt = LDR.Generator.makeP('Stud Open without Base Edges', 'stud2a.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r41 = LDR.Generator.makeR(4, 1);
    let r61 = LDR.Generator.makeR(6, 1);
    let r44 = LDR.Generator.makeR(4, 4);
    let r64 = LDR.Generator.makeR(6, 4);
    let r21 = LDR.Generator.makeR(2, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r41, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r44, force + '4-4cyli2.dat', true, true));
    if (highContrast) {
        step.addSubModel(new THREE.LDRPartDescription(0, p4, r64, force + '4-4cyli2.dat', true, false));
    } else {
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r64, force + '4-4cyli.dat', true, false));
    }
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r21, force + '4-4ring2.dat', true, false));
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud2 = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud Open', 'stud2.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r41 = LDR.Generator.makeR(4, 1);
    let r61 = LDR.Generator.makeR(6, 1);
    let r44 = LDR.Generator.makeR(4, 4);
    let r64 = LDR.Generator.makeR(6, 4);
    let r21 = LDR.Generator.makeR(2, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r41, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r21, force + '4-4ring2.dat', true, false));
    if (highContrast) {
        step.addSubModel(new THREE.LDRPartDescription(0, p4, r64, force + '4-4cyli2.dat', true, false));
    } else {
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r64, force + '4-4cyli.dat', true, false));
    }
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r41, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r44, force + '4-4cyli2.dat', true, true));
    if (logoType === 1) {
        let r061 = LDR.Generator.makeR(0.6, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r061, 'logo.dat', true, false));
    } else if (logoType === 2) {
        let p5 = new THREE.Vector3(0, -0.5, 0);
        let logoSM = new THREE.LDRPartDescription(16, p5, r41, force + '4-4disc.dat', true, false);;
        step.addSubModel(logoSM);
        logoSM.logoPosition = p5;
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStudP01 = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud with Dot Pattern', 'studp01.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r61 = LDR.Generator.makeR(6, 1);
    let r64 = LDR.Generator.makeR(6, -4);
    let r21 = LDR.Generator.makeR(2, 1);
    let r41 = LDR.Generator.makeR(4, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '4-4edge.dat', true, false));
    if (highContrast) {
        step.addSubModel(new THREE.LDRPartDescription(0, p0, r64, force + '4-4cyli2.dat', true, false));
    } else {
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r64, force + '4-4cyli.dat', true, false));
    }
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r21, force + '4-4ring2.dat', true, false));
    let logoSM = new THREE.LDRPartDescription(16, p4, r41, force + '4-4disc.dat', true, false);;
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (logoType === 1) {
        let r11 = LDR.Generator.makeR(1, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStudEl = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud with Electric Contact', 'studel.dat');
    let step = new THREE.LDRStep();
    let p0 = new THREE.Vector3();
    let p3 = new THREE.Vector3(0, -3, 0);
    let p4 = new THREE.Vector3(0, -4, 0);
    let contrastColor = highContrast ? 0 : 16;
    let r61 = LDR.Generator.makeR(6, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '4-4edge.dat', true, false));
    let r063 = new THREE.Matrix3();
    r063.set(0, 0, 6, 0, -3, 0, -6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p0, r063, force + '3-4cyli.dat', true, false));
    let r061 = new THREE.Matrix3();
    r061.set(0, 0, 6, 0, -1, 0, -6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p3, r061, force + '4-4cyli.dat', true, false));
    let r63 = LDR.Generator.makeR(-6, -3);
    step.addSubModel(new THREE.LDRPartDescription(494, p0, r63, force + '1-4cyli.dat', true, false));
    let rn61 = LDR.Generator.makeR(-6, 1);
    step.addSubModel(new THREE.LDRPartDescription(16, p3, rn61, force + '1-4edge.dat', true, false));
    step.addLine(24, new THREE.Vector3(-6, 0, 0), new THREE.Vector3(-6, -3, 0));
    step.addLine(24, new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, -3, -6));
    let logoSM = new THREE.LDRPartDescription(16, p4, r61, force + '4-4disc.dat', true, false);;
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (logoType === 1) {
        let r11 = new THREE.Matrix3();
        r11.set(0, 0, -1, 0, 1, 0, 1, 0, 0);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud10 = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud For Round 2 x 2 Parts', 'stud10.dat');
    let step = new THREE.LDRStep();
    let contrastColor = highContrast ? 0 : 16;
    LDR.Generator.addLinesToStep(step, [6, 0, 0, 5.6145, 0, 1.9397,
        1.9387, 0, 5.6145, 0, 0, 6,
        5.6145, -4, 1.9397, 5.6145, 0, 1.9397,
        6, -4, 0, 5.6145, -4, 1.9397,
        5.6145, -4, 1.9397, 4.142, -4, 4.142,
        4.142, -4, 4.142, 1.9397, -4, 5.6145,
        1.9397, -4, 5.6145, 0, -4, 6,
        1.9397, -4, 5.6145, 1.9387, 0, 5.6145
    ]);
    LDR.Generator.addConditionalLinesToStep(step, [
        4.142, -4, 4.142, 4.142, 0, 4.142, 1.9397, -4, 5.6145, 5.6145, -4, 1.9397,
        6, -4, 0, 6, 0, 0, 5.5434, -4, -2.2962, 5.6145, -4, 1.9397,
        0, -4, 6, 0, 0, 6, 1.9397, -4, 5.6145, -2.2962, -4, 5.5434
    ]);
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r64 = new THREE.Matrix3();
    r64.set(0, 0, -6, 0, 4, 0, 6, 0, 0);
    let r61 = new THREE.Matrix3();
    r61.set(0, 0, -6, 0, 1, 0, 6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r64, force + '3-4cyli.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '3-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '3-4edge.dat', true, false));
    let logoSM = new THREE.LDRPartDescription(16, p4, r61, force + '3-4disc.dat', true, false);
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (logoType === 1) {
        let r11 = new THREE.Matrix3();
        r11.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    LDR.Generator.addTrianglesToStep(step, [6, -4, 0, 5.6145, -4, 1.9397, 0, -4, 0,
        5.6145, -4, 1.9397, 4.142, -4, 4.142, 0, -4, 0,
        4.142, -4, 4.142, 1.9397, -4, 5.6145, 0, -4, 0,
        1.9397, -4, 5.6145, 0, -4, 6, 0, -4, 0
    ], 16);
    LDR.Generator.addQuadsToStep(step, [6, 0, 0, 5.6145, 0, 1.9397, 5.6145, -4, 1.9397, 6, -4, 0,
        5.6145, 0, 1.9397, 4.142, 0, 4.142, 4.142, -4, 4.142, 5.6145, -4, 1.9397,
        4.142, 0, 4.142, 1.9387, 0, 5.6145, 1.9397, -4, 5.6145, 4.142, -4, 4.142,
        1.9387, 0, 5.6145, 0, 0, 6, 0, -4, 6, 1.9397, -4, 5.6145
    ], contrastColor);
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud15 = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud for Round 2 x 2 Parts, 1 Face, Complete Edges', 'stud15.dat');
    let step = new THREE.LDRStep();
    let contrastColor = highContrast ? 0 : 16;
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r64 = new THREE.Matrix3();
    r64.set(0, 0, -6, 0, 4, 0, 6, 0, 0);
    let r61 = new THREE.Matrix3();
    r61.set(0, 0, -6, 0, 1, 0, 6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '3-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '3-4edge.dat', true, false));
    let r0 = new THREE.Matrix3();
    r0.set(-0.9694, -1.542, 0, 0, 0, -2, 0.1928, -7.7548, 0);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, new THREE.Vector3(0.9694, -2, 5.8072), r0, force + 'rect2p.dat', true, false));
    let r1 = new THREE.Matrix3();
    r1.set(0, -1.0502, -1.8379, 2, 0, 0, 0, -1.0502, 1.8379);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, new THREE.Vector3(3.7766, -2, 3.7766), r1, force + 'rect3.dat', true, false));
    let r2 = new THREE.Matrix3();
    r2.set(0, -7.7548, -0.1928, 2, 0, 0, 0, -1.542, 0.9694);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, new THREE.Vector3(5.8072, -2, 0.9694), r2, force + 'rect3.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r64, force + '3-4cyli.dat', true, false));
    let logoSM = new THREE.LDRPartDescription(16, p4, r61, force + '3-4disc.dat', true, false);
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (logoType === 1) {
        let r11 = new THREE.Matrix3();
        r11.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    LDR.Generator.addTrianglesToStep(step, [6, -4, 0, 0, -4, 6, 0, -4, 0], 16);
    LDR.Generator.addQuadsToStep(step, [0, -4, 6, 6, -4, 0, 5.6145, -4, 1.9387, 1.9387, -4, 5.6145], 16);
    LDR.Generator.addConditionalLinesToStep(step, [6, -4, 0, 6, 0, 0, 5.6145, -4, 1.9387, 5.5434, 0, -2.2962,
        0, -4, 6, 0, 0, 6, 1.9387, -4, 5.6145, -2.2962, 0, 5.5434
    ]);
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud17 = function (highContrast, logoType, force, withoutBaseEdges) {
    let pt = LDR.Generator.makeP('Stud Open For Octagonal Parts' + (withoutBaseEdges ? ' without Base Edges' : ''), (withoutBaseEdges ? 'stud17a.dat' : 'stud17.dat'));
    let step = new THREE.LDRStep();
    let contrastColor = highContrast ? 0 : 16;
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r44 = LDR.Generator.makeR(4, 4);
    let r41 = LDR.Generator.makeR(4, 1);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r44, force + '4-4cyli.dat', true, true));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r41, force + '4-4edge.dat', true, false));
    let r0 = new THREE.Matrix3();
    r0.set(2.296, 0, -5.543, 0, 1, 0, 5.543, 0, 2.296);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r0, force + '7-8edge.dat', true, false));
    let r1 = new THREE.Matrix3();
    r1.set(2.296, 0, -5.543, 0, 4, 0, 5.543, 0, 2.296);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r1, force + '7-8cyli.dat', true, false));
    let r2 = new THREE.Matrix3();
    r2.set(0.765, 0, -1.848, 0, 1, 0, 1.848, 0, 0.765);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r2, force + '2-4ring2.dat', true, false));
    let r3 = new THREE.Matrix3();
    r3.set(-0.765, 0, 1.848, 0, 1, 0, -1.848, 0, -0.765);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r3, force + '3-8ring2.dat', true, false));
    if (!withoutBaseEdges) {
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r41, force + '4-4edge.dat', true, false));
        let r4 = new THREE.Matrix3();
        r4.set(2.296, 0, -5.543, 0, 1, 0, 5.543, 0, 2.296);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r4, force + '7-8edge.dat', true, false));
        LDR.Generator.addLinesToStep(step, [2.296, 0, 5.543, 2.78, 0, 5.22,
            5.22, 0, 2.78, 5.543, 0, 2.296
        ]);
    }
    LDR.Generator.addLinesToStep(step, [2.78, -4, 5.22, 5.22, -4, 2.78,
        2.296, -4, 5.543, 2.78, -4, 5.22,
        5.22, -4, 2.78, 5.543, -4, 2.296
    ]);
    LDR.Generator.addTrianglesToStep(step, [5.22, -4, 2.78, 2.78, -4, 5.22, 2.828, -4, 2.828], 16);
    LDR.Generator.addQuadsToStep(step, [2.78, 0, 5.22, 2.78, -4, 5.22, 5.22, -4, 2.78, 5.22, 0, 2.78,
        2.296, 0, 5.543, 2.296, -4, 5.543, 2.78, -4, 5.22, 2.78, 0, 5.22,
        5.543, -4, 2.296, 5.543, 0, 2.296, 5.22, 0, 2.78, 5.22, -4, 2.78
    ], contrastColor);
    LDR.Generator.addQuadsToStep(step, [2.296, -4, 5.543, 1.531, -4, 3.696, 2.828, -4, 2.828, 2.78, -4, 5.22,
        3.696, -4, 1.531, 5.543, -4, 2.296, 5.22, -4, 2.78, 2.828, -4, 2.828
    ], 16);
    LDR.Generator.addConditionalLinesToStep(step, [5.22, -4, 2.78, 5.22, 0, 2.78, 2.78, -4, 5.22, 5.543, -4, 2.296,
        2.78, -4, 5.22, 2.78, 0, 5.22, 5.22, -4, 2.78, 2.296, -4, 5.543,
        2.296, -4, 5.543, 2.296, 0, 5.543, 2.78, -4, 5.22, 0, -4, 6,
        5.543, -4, 2.296, 5.543, 0, 2.296, 5.22, -4, 2.78, 6, -4, 0
    ]);
    if (!withoutBaseEdges && logoType === 1) {
        let r061 = LDR.Generator.makeR(0.6, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r061, 'logo.dat', true, false));
    } else if (logoType === 2) {
        let p5 = new THREE.Vector3(0, -0.5, 0);
        let logoSM = new THREE.LDRPartDescription(16, p5, r41, force + '4-4disc.dat', true, false);
        logoSM.logoPosition = p5;
        step.addSubModel(logoSM);
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud13 = function (highContrast, logoType, force) {
    let pt = LDR.Generator.makeP('Stud for Electric Light & Sound Brick  2 x  2 x  1.333', 'stud13.dat');
    let step = new THREE.LDRStep();
    let contrastColor = highContrast ? 0 : 16;
    LDR.Generator.addLinesToStep(step, [6, 0, 0, 5.782, 0, 1.095,
        5.782, 0, 1.095, 1.095, 0, 5.782,
        1.095, 0, 5.782, 0, 0, 6,
        5.782, 0, 1.095, 5.782, -4, 1.095,
        1.095, 0, 5.782, 1.095, -4, 5.782,
        6, -4, 0, 5.782, -4, 1.095,
        5.782, -4, 1.095, 1.095, -4, 5.782,
        1.095, -4, 5.782, 0, -4, 6
    ]);
    LDR.Generator.addQuadsToStep(step, [6, -4, 0, 6, 0, 0, 5.782, 0, 1.095, 5.782, -4, 1.095,
        1.095, 0, 5.782, 1.095, -4, 5.782, 5.782, -4, 1.095, 5.782, 0, 1.095,
        1.095, -4, 5.782, 1.095, 0, 5.782, 0, 0, 6, 0, -4, 6
    ], contrastColor);
    LDR.Generator.addTrianglesToStep(step, [6, -4, 0, 5.782, -4, 1.095, 0, -4, 0,
        5.782, -4, 1.095, 1.095, -4, 5.782, 0, -4, 0,
        0, -4, 6, 0, -4, 0, 1.095, -4, 5.782
    ], 16);
    LDR.Generator.addConditionalLinesToStep(step, [6, 0, 0, 6, -4, 0, 5.782, 0, 1.095, 5.543, -4, -2.296,
        0, 0, 6, 0, -4, 6, 1.095, 0, 5.782, -2.296, -4, 5.543
    ]);
    let p0 = new THREE.Vector3();
    let p4 = new THREE.Vector3(0, -4, 0);
    let r64 = new THREE.Matrix3();
    r64.set(0, 0, -6, 0, 4, 0, 6, 0, 0);
    let r61 = new THREE.Matrix3();
    r61.set(0, 0, -6, 0, 1, 0, 6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r64, force + '3-4cyli.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '3-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '3-4edge.dat', true, false));
    let logoSM = new THREE.LDRPartDescription(16, p4, r61, force + '3-4disc.dat', true, false);
    step.addSubModel(logoSM);
    if (logoType === 2) {
        logoSM.logoPosition = p4;
    }
    if (logoType === 1) {
        let r11 = new THREE.Matrix3();
        r11.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p4, r11, 'logo.dat', true, false));
    }
    pt.steps.push(step);
    return pt;
}
LDR.Studs.makeStud6 = function (highContrast, logoType, force, withoutBaseEdges) {
    let pt = LDR.Generator.makeP('Stud Open For Round 2x2 Parts' + (withoutBaseEdges ? ' without Base Edges' : ''), withoutBaseEdges ? 'stud6a.dat' : 'stud6.dat');
    let step = new THREE.LDRStep();
    let contrastColor = highContrast ? 0 : 16;
    LDR.Generator.addLinesToStep(step, [5.6145, -4, 1.9397, 5.6145, 0, 1.9397,
        6, -4, 0, 5.6145, -4, 1.9397,
        5.6145, -4, 1.9397, 4.142, -4, 4.142,
        4.142, -4, 4.142, 1.9387, -4, 5.6145,
        1.9387, -4, 5.6145, 0, -4, 6,
        1.9387, -4, 5.6145, 1.9387, 0, 5.6145
    ]);
    let p0 = new THREE.Vector3(0, 0, 0);
    let p4 = new THREE.Vector3(0, -4, 0);
    let r41 = LDR.Generator.makeR(4, 1);
    let r21 = LDR.Generator.makeR(-2, 1);
    let r44 = LDR.Generator.makeR(4, 4);
    let r61 = new THREE.Matrix3();
    r61.set(0, 0, -6, 0, 1, 0, 6, 0, 0);
    let r64 = new THREE.Matrix3();
    r64.set(0, 0, -6, 0, 4, 0, 6, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r61, force + '3-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r41, force + '4-4edge.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r44, force + '4-4cyli.dat', true, true));
    let r021 = new THREE.Matrix3();
    r021.set(0, 0, -2, 0, 1, 0, 2, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r021, force + '1-4ring2.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(16, p4, r21, force + '1-4ring2.dat', true, false));
    let x021 = new THREE.Matrix3();
    x021.set(0, 0, 2, 0, 1, 0, -2, 0, 0);
    step.addSubModel(new THREE.LDRPartDescription(16, p4, x021, force + '1-4ring2.dat', true, false));
    step.addSubModel(new THREE.LDRPartDescription(contrastColor, p4, r64, force + '3-4cyli.dat', true, false));
    if (!withoutBaseEdges) {
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r41, force + '4-4edge.dat', true, false));
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r61, force + '3-4edge.dat', true, false));
        LDR.Generator.addLinesToStep(step, [6, 0, 0, 5.6145, 0, 1.9397,
            1.9387, 0, 5.6145, 0, 0, 6
        ]);
    }
    LDR.Generator.addQuadsToStep(step, [6, -4, 0, 5.615, -4, 1.94, 3.695, -4, 1.531, 4, -4, 0,
        5.615, -4, 1.94, 4.142, -4, 4.142, 2.828, -4, 2.828, 3.695, -4, 1.531,
        4.142, -4, 4.142, 1.94, -4, 5.615, 1.531, -4, 3.695, 2.828, -4, 2.828,
        1.94, -4, 5.615, 0, -4, 6, 0, -4, 4, 1.531, -4, 3.695
    ], 16);
    LDR.Generator.addQuadsToStep(step, [6, 0, 0, 5.6145, 0, 1.9397, 5.6145, -4, 1.9397, 6, -4, 0,
        5.6145, 0, 1.9397, 4.142, 0, 4.142, 4.142, -4, 4.142, 5.6145, -4, 1.9397,
        4.142, 0, 4.142, 1.9387, 0, 5.6145, 1.9387, -4, 5.6145, 4.142, -4, 4.142,
        1.9387, 0, 5.6145, 0, 0, 6, 0, -4, 6, 1.9387, -4, 5.6145
    ], contrastColor);
    LDR.Generator.addConditionalLinesToStep(step, [4.142, -4, 4.142, 4.142, 0, 4.142, 2.2962, -4, 5.5434, 5.5434, -4, 2.2962]);
    if (!withoutBaseEdges && logoType === 1) {
        let r061 = LDR.Generator.makeR(0.6, 1);
        step.addSubModel(new THREE.LDRPartDescription(16, p0, r061, 'logo.dat', true, false));
    } else if (logoType === 2) {
        let p5 = new THREE.Vector3(0, -0.5, 0);
        let logoSM = new THREE.LDRPartDescription(16, p5, r41, force + '4-4disc.dat', true, false);
        logoSM.logoPosition = p5;
        step.addSubModel(logoSM);
    }
    pt.steps.push(step);
    return pt;
}
LDR.AssemblyManager = function (loader) {
    this.loader = loader;
    let self = this;
    this.partTypeHandlers = {};
    this.map = {};

    function addToMap(mainPart, obj) {
        if (self.map.hasOwnProperty(mainPart)) {
            self.map[mainPart].push(obj);
        } else {
            self.map[mainPart] = [obj];
        }
    }
    for (ID in LDR.Assemblies) {
        if (!LDR.Assemblies.hasOwnProperty(ID)) {
            continue;
        }
        let parts = LDR.Assemblies[ID];
        let mainPart = parts[0] + '.dat',
            mainColor = parts[1];
        parts = parts.slice(2);
        let keys = [];
        for (let i = 0; i < parts.length; i += 2) {
            keys.push(parts[i] + '.dat_' + parts[i + 1]);
        }
        let obj = {
            ID: ID + '.dat',
            c: mainColor,
            keys: keys
        };
        addToMap(mainPart, obj);
    }
    this.handleTorsosInStep = function (step) {
        let torso = step.subModels.find(sm => sm.ID.length >= 7 && sm.ID.startsWith('973') && sm.ID.endsWith('.dat'));
        if (!torso) {
            return;
        }
        let ID = torso.ID.substring(0, torso.ID.length - 4) + 'c' + torso.c + '.dat';
        if (self.loader.partTypes.hasOwnProperty(ID)) {
            return;
        }
        let armLeft = step.subModels.find(sm => sm.ID.startsWith('3819') && sm.ID.endsWith('.dat'));
        if (!armLeft) return;
        let armRight = step.subModels.find(sm => sm.ID.startsWith('3818') && sm.ID.endsWith('.dat'));
        if (!armRight) return;
        let hand = step.subModels.find(sm => sm.ID.startsWith('3820') && sm.ID.endsWith('.dat'));
        if (!hand) return;
        let torsoStep = new THREE.LDRStep();
        let zeroVector = new THREE.Vector3();
        let idMatrix = new THREE.Matrix3();
        idMatrix.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
        torsoStep.addSubModel(new THREE.LDRPartDescription(torso.c, zeroVector, idMatrix, torso.ID, true, false));
        let armMatrix1 = new THREE.Matrix3();
        armMatrix1.set(1, 0.17, 0, -0.17, 1, 0, 0, 0, 1);
        torsoStep.addSubModel(new THREE.LDRPartDescription(armLeft.c, new THREE.Vector3(15.5, 8, 0), armMatrix1, armLeft.ID, true, false));
        let armMatrix2 = new THREE.Matrix3();
        armMatrix2.set(1, -0.17, 0, 0.17, 1, 0, 0, 0, 1);
        torsoStep.addSubModel(new THREE.LDRPartDescription(armRight.c, new THREE.Vector3(-15.5, 8, 0), armMatrix2, armRight.ID, true, false));
        let handMatrix1 = new THREE.Matrix3();
        handMatrix1.set(1, 0.12, -0.12, -0.17, 0.697, -0.697, 0, 0.707, 0.707);
        torsoStep.addSubModel(new THREE.LDRPartDescription(hand.c, new THREE.Vector3(23.658, 25.851, -10), handMatrix1, hand.ID, true, false));
        let handMatrix2 = new THREE.Matrix3();
        handMatrix2.set(1, -0.12, 0.12, 0.17, 0.697, -0.697, 0, 0.707, 0.707);
        torsoStep.addSubModel(new THREE.LDRPartDescription(hand.c, new THREE.Vector3(-23.658, 25.851, -10), handMatrix2, hand.ID, true, false));
        let torsoPT = new THREE.LDRPartType();
        torsoPT.name = torsoPT.ID = ID;
        let md0 = LDR.Colors[torso.c].name + ' ';
        let md2 = ' / ';
        if (armLeft.c === armRight.c) {
            md2 += LDR.Colors[armLeft.c].name + ' Arms';
        } else {
            md2 += LDR.Colors[armLeft.c].name + ' Left Arm / ' + LDR.Colors[armRight.c].name + ' Right Arm';
        }
        md2 += ' / ' + LDR.Colors[hand.c].name + ' Hands';
        let pt = loader.getPartType(torso.ID);
        let md1;
        if (pt) {
            md1 = pt.modelDescription;
        } else {
            md1 = 'Minifig Torso';
            self.partTypeHandlers[torso.ID] = {
                handle: p => torsoPT.modelDescription = md0 + p.modelDescription + md2
            };
        }
        torsoPT.modelDescription = md0 + md1 + md2;
        torsoPT.author = 'LDRAssemblies.js';
        torsoPT.license = 'Redistributable under CCAL version 2.0 : see CAreadme.txt';
        torsoPT.ldraw_org = 'Unofficial_Part';
        torsoPT.inlined = 'GENERATED';
        torsoPT.cleanSteps = torsoPT.certifiedBFC = torsoPT.CCW = torsoPT.consistentFileAndName = true;
        torsoPT.steps = [torsoStep];
        torsoPT.isPart = true;
        self.loader.partTypes[ID] = torsoPT;
        let keys = [armLeft.ID + '_' + armLeft.c,
            armRight.ID + '_' + armRight.c,
            hand.ID + '_' + hand.c,
            hand.ID + '_' + hand.c
        ];
        let obj = {
            ID: ID,
            c: 16,
            keys: keys
        };
        addToMap(torso.ID, obj);
    }
}
LDR.AssemblyManager.prototype.handleStep = function (step) {
    let self = this;
    let ret = [];

    function handleSubModel(sm, idx) {
        if (sm.REPLACEMENT_PLI || !self.map.hasOwnProperty(sm.ID)) {
            return;
        }
        let aList = self.map[sm.ID];
        for (let i = 0; i < aList.length; i++) {
            let obj = aList[i];
            if (obj.c !== 16 && obj.c !== sm.c) {
                continue;
            }
            let remainingParts = {};
            obj.keys.forEach(key => {
                if (remainingParts.hasOwnProperty(key)) {
                    remainingParts[key] = remainingParts[key] + 1;
                } else {
                    remainingParts[key] = 1;
                }
            });

            function decrease(key) {
                if (remainingParts.hasOwnProperty(key)) {
                    let cnt = remainingParts[key] - 1;
                    if (cnt === 0) {
                        delete remainingParts[key];
                    } else {
                        remainingParts[key] = cnt;
                    }
                    return true;
                }
                return false;
            }
            let found = [];
            step.subModels.forEach((sm2, idx2) => {
                if (idx2 === idx || sm2.REPLACEMENT_PLI) {
                    return;
                }
                if (sm2.c !== 16) {
                    if (decrease(sm2.ID + '_' + sm2.c)) {
                        found.push({
                            idx: idx2,
                            c: sm2.c
                        });
                        return;
                    }
                }
                if (sm2.c === sm.c && decrease(sm2.ID + '_16')) {
                    found.push({
                        idx: idx2,
                        c: 16
                    });
                }
            });
            if (found.length !== obj.keys.length) {
                continue;
            }
            found.forEach(f => step.subModels[f.idx].REPLACEMENT_PLI = true);
            sm.REPLACEMENT_PLI = obj.ID;
            if (!self.loader.partTypes.hasOwnProperty(obj.ID)) {
                ret.push(obj.ID);
            }
        }
    }
    step.subModels.forEach(handleSubModel);
    return ret;
}
LDR.AssemblyManager.prototype.handlePartType = function (pt) {
    let self = this;
    if (!pt.isPart) {
        pt.steps.forEach(step => self.handleTorsosInStep(step));
    }
    if (this.partTypeHandlers.hasOwnProperty(pt.ID)) {
        this.partTypeHandlers[pt.ID].handle(pt);
    }
}
LDR.InstructionsManager = function (modelUrl, modelID, modelColor, mainImage, refreshCache, baseURL, stepFromParameters, options) {
    let startTime = new Date();
    let self = this;
    options = options || {};
    this.stepEditor;
    this.canEdit = options.canEdit === true;
    this.modelID = modelID;
    this.modelColor = modelColor;
    this.refreshCache = refreshCache;
    this.baseURL = baseURL;
    this.pliMaxWidthPercentage = options.hasOwnProperty('pliMaxWidthPercentage') ? options.pliMaxWidthPercentage : 40;
    this.pliMaxHeightPercentage = options.hasOwnProperty('pliMaxHeightPercentage') ? options.pliMaxHeightPercentage : 35;
    this.animateUIElements = options.hasOwnProperty('animateUIElements') ? options.animateUIElements : false;
    LDR.Colors.canBeOld = true;
    this.scene = new THREE.Scene();
    this.defaultZoom = 1;
    this.currentStep = 1;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000000);
    let pixelRatio = window.devicePixelRatio;
    this.canvas = document.getElementById('main_canvas');
    this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: this.canvas
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.secondaryCanvas = document.getElementById('secondary_canvas');
    this.secondaryRenderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: this.secondaryCanvas,
        alpha: true
    });
    this.secondaryRenderer.setPixelRatio(pixelRatio);
    let canvasHolder = document.getElementById('main_canvas_holder');
    let actions = {
        prevStep: () => self.prevStep(),
        nextStep: () => self.nextStep(),
        zoomIn: () => self.zoomIn(),
        zoomOut: () => self.zoomOut(),
        resetCameraPosition: () => self.resetCameraPosition(),
        clickDone: () => self.clickDone(),
        toggleEditor: () => self.stepEditor && self.stepEditor.toggleEnabled(),
    };
    this.ldrButtons = new LDR.Buttons(actions, canvasHolder, true, modelID, mainImage, options);
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.noTriggerSize = 0.1;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', () => self.render());
    this.topButtonsHeight = 100;
    this.resetCameraPosition();
    window.addEventListener('resize', () => self.onWindowResize(), false);
    this.adPeek = options.hasOwnProperty('adPeek') ? options.adPeek : 0;
    let storagePLIW = localStorage.getItem('pliW');
    if (storagePLIW !== null && storagePLIW >= 0) {
        this.pliW = storagePLIW;
    } else {
        this.pliW = (window.innerWidth - 20) * this.pliMaxWidthPercentage / 100;
    }
    let clampW = () => self.pliW = Math.min(Math.max(self.pliW, 0), window.innerWidth - 70);
    clampW();
    let storagePLIH = localStorage.getItem('pliH');
    if (storagePLIH !== null && storagePLIH >= 0) {
        console.log('storage', storagePLIH);
        this.pliH = storagePLIH;
    } else {
        this.pliH = (window.innerHeight - this.adPeek) * this.pliMaxHeightPercentage / 100;
    }
    let clampH = () => self.pliH = Math.min(Math.max(self.pliH, 0), window.innerHeight - self.adPeek - 50);
    clampH();
    this.lastRefresh = new Date();
    this.currentRotationMatrix = new THREE.Matrix4();
    this.currentRotationMatrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.defaultMatrix = new THREE.Matrix4();
    this.defaultMatrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.ldrLoader;
    this.stepHandler;
    this.pliElement = document.getElementById('pli');
    this.emptyElement = document.getElementById('empty_step');
    this.pliBuilder;
    this.pliHighlighted;
    this.outlinePass;
    this.composer;
    this.resetSelectedObjects();
    this.baseObject = new THREE.Group();
    this.opaqueObject = new THREE.Group();
    this.sixteenObject = new THREE.Group();
    this.transObject = new THREE.Group();
    this.baseObject.add(this.opaqueObject);
    this.baseObject.add(this.sixteenObject);
    this.baseObject.add(this.transObject);
    this.scene.add(this.baseObject);
    this.pliPreviewer = new LDR.PliPreviewer(modelID, this.secondaryCanvas, this.secondaryRenderer);
    this.showPLI = false;
    this.hovered = false;
    this.oldMultiplier = 1;
    this.currentMultiplier = 1;
    this.currentRotation = false;
    this.initialConfiguration = true;
    this.doneShown = false;
    this.accHelper;
    this.helper;

    function handleKeyDown(e) {
        e = e || window.event;
        if (e.altKey) {
            return;
        }
        if (e.keyCode === 13) {
            let stepToGoTo = parseInt(self.ldrButtons.stepInput.value);
            self.goToStep(stepToGoTo);
        } else if (e.keyCode === 37) {
            self.prevStep();
        } else if (e.keyCode === 39) {
            self.nextStep();
        } else if (e.keyCode === 27) {
            self.hidePliPreview();
            self.hideDone();
        } else if (LDR.Options && LDR.Options.showEditor && self.canEdit) {
            self.stepEditor.handleKeyDown(e);
        }
    }
    document.onkeydown = handleKeyDown;
    let onLoad = function () {
        console.log("Done loading at " + (new Date() - startTime) + "ms.");
        self.ldrLoader.substituteReplacementParts();
        let mainModel = self.ldrLoader.mainModel;
        let origo = new THREE.Vector3();
        let inv = new THREE.Matrix3();
        inv.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
        let pd = new THREE.LDRPartDescription(self.modelColor, origo, inv, mainModel, false);
        self.pliBuilder = new LDR.PLIBuilder(self.ldrLoader, self.canEdit, mainModel,
            document.getElementById('pli'), self.secondaryRenderer);
        self.stepHandler = new LDR.StepHandler(self, [pd], true);
        self.stepHandler.nextStep(false);
        self.realignModel(0);
        self.updateUIComponents(false);
        self.render();
        console.log("Render done after " + (new Date() - startTime) + "ms.");
        if (options.showNumberOfSteps) {
            document.getElementById('numberOfSteps').innerHTML = '/ ' + self.stepHandler.totalNumberOfSteps;
        }
        if (stepFromParameters > 1) {
            self.stepHandler.moveTo(stepFromParameters, () => self.handleStepsWalked());
        }
        self.pliPreviewer.enableControls();
        if (self.canEdit) {
            function removeGeometries() {
                self.ldrLoader.applyOnPartTypes(pt => {
                    if (!pt.isPart) {
                        pt.geometry = null;
                    }
                });
            }

            function onEditDone() {
                self.ignoreViewPortUpdate = true;
                self.handleStepsWalked();
                self.ignoreViewPortUpdate = false;
            }
            self.stepEditor = new LDR.StepEditor(self.ldrLoader, self.stepHandler,
                self.pliBuilder, removeGeometries,
                onEditDone, self.modelID);
            self.stepEditor.createGuiComponents(document.getElementById('editor'));
            if (LDR.Options && LDR.Options.showEditor === 1) {
                $("#editor").show();
            }
        }
    }
    let onInstructionsLoaded = function (ok, parts) {
        if (ok) {
            if (parts.length === 0) {
                onLoad();
            } else {
                self.ldrLoader.loadMultiple(parts);
            }
        } else {
            self.ldrLoader.load(modelUrl);
        }
    }
    let onStorageReady = function () {
        if (LDR.Options) {
            LDR.Studs.makeGenerators('', LDR.Options.studHighContrast, LDR.Options.studLogo);
        }
        self.ldrLoader = new THREE.LDRLoader(onLoad, self.storage, options);
        if (self.storage) {
            self.storage.retrieveInstructionsFromStorage(self.ldrLoader, onInstructionsLoaded);
        } else {
            onInstructionsLoaded(false);
        }
    }
    let pli = document.getElementById("pli");
    pli.addEventListener('click', e => self.onPLIClick(e));
    pli.addEventListener('mousemove', e => self.onPLIMove(e));
    pli.addEventListener('mouseover', e => self.onPLIMove(e));
    pli.addEventListener('mouseout', () => self.onPLIMove(false));
    if (options.setUpOptions && LDR.Options) {
        this.setUpOptions();
    }
    this.onWindowResize();
    if (LDR.STORAGE) {
        this.storage = new LDR.STORAGE(onStorageReady);
    } else {
        onStorageReady();
    }
    this.dh = document.getElementById('pli_drag_horizontal');
    this.dv = document.getElementById('pli_drag_vertical');
    let p = document.getElementById('instructions_decorations');
    let resizingV = false,
        resizingH = false;
    let x, y, pliW, pliH;
    let mouseStart = e => {
        x = e.clientX;
        y = e.clientY;
        pliH = self.pliH;
        pliW = self.pliW
    };
    let touchStart = e => {
        if (e.touches.length > 0) {
            x = e.touches[0].pageX;
            y = e.touches[0].pageY;
            pliH = self.pliH;
            pliW = self.pliW
        }
    };
    let stop = e => {
        resizingV = resizingH = false;
    };
    this.dv.addEventListener('mousedown', () => resizingV = true);
    this.dv.addEventListener('touchstart', () => resizingV = true);
    this.dh.addEventListener('mousedown', () => resizingH = true);
    this.dh.addEventListener('touchstart', () => resizingH = true);
    p.addEventListener('mousedown', mouseStart);
    p.addEventListener('touchstart', touchStart);
    p.addEventListener('mouseup', stop);
    p.addEventListener('touchend', stop);

    function resize(x2, y2) {
        if (resizingH) {
            let newW = pliW + (x2 - x);
            if (self.pliW != newW) {
                self.pliW = newW;
                clampW();
                localStorage.setItem('pliW', self.pliW);
                self.onWindowResize();
            }
            return true;
        }
        if (resizingV) {
            let newH = pliH + (y2 - y);
            if (self.pliH != newH) {
                self.pliH = newH;
                clampH();
                localStorage.setItem('pliH', self.pliH);
                self.onWindowResize();
            }
            return true;
        }
        return false;
    }
    p.addEventListener('mousemove', e => resize(e.clientX, e.clientY));
    p.addEventListener('touchmove', e => {
        if (e.touches.length > 0 && resize(e.touches[0].pageX, e.touches[0].pageY)) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}
LDR.InstructionsManager.prototype.updateRotator = function (zoom) {
    let rotator = document.getElementById("rotator");
    let showRotator = this.stepHandler.getShowRotatorForCurrentStep();
    if (showRotator) {
        rotator.style.visibility = "visible";
        let rotatorAnimation = document.getElementById("rotator_animation");
        if (this.animateUIElements) {
            rotatorAnimation.beginElement();
        }
    } else {
        rotator.style.visibility = "hidden";
    }
}
LDR.InstructionsManager.prototype.updateMultiplier = function (zoom) {
    let changes = this.oldMultiplier !== this.currentMultiplier;
    if (!changes) {
        return;
    }
    let multiplier = $('#multiplier');
    if (this.currentMultiplier === 1) {
        multiplier[0].style.visibility = "hidden";
        multiplier[0].innerHTML = '';
    } else {
        multiplier[0].style.visibility = "visible";
        multiplier[0].innerHTML = "x" + this.currentMultiplier;
        if (this.animateUIElements) {
            multiplier[0].style['font-size'] = "20vw";
            setTimeout(() => multiplier.animate({
                fontSize: "8vw"
            }, 200), 100);
        } else {
            multiplier[0].style['font-size'] = "8vw";
        }
    }
    this.oldMultiplier = this.currentMultiplier;
}
LDR.InstructionsManager.prototype.updateCameraZoom = function (zoom) {
    zoom = zoom || this.defaultZoom;
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
}
LDR.InstructionsManager.prototype.resetSelectedObjects = function () {
    this.selectedObjects = [];
    this.inSelectedObjects = {};
}
LDR.InstructionsManager.prototype.addSelectedObject = function (idx, a) {
    this.selectedObjects.push(...a);
    this.inSelectedObjects[idx] = true;
}
LDR.InstructionsManager.prototype.hasSelectedObject = function (idx) {
    return this.inSelectedObjects.hasOwnProperty(idx);
}
LDR.InstructionsManager.prototype.render = function () {
    if (LDR.Options && LDR.Options.showOldColors <= 1) {
        if (this.outlinePass && this.composer) {
            this.outlinePass.selectedObjects = this.selectedObjects;
            this.composer.render();
        }
    } else {
        this.renderer.render(this.scene, this.camera);
    }
}
LDR.InstructionsManager.prototype.setBackgroundColor = function (c) {
    this.scene.background = new THREE.Color(parseInt("0x" + c));
    document.body.style.backgroundColor = '#' + c;
}
LDR.InstructionsManager.prototype.buildOutlinePass = function (w, h) {
    this.outlinePass = new OutlinePass(new THREE.Vector2(w, h),
        this.scene, this.camera, this.selectedObjects);
    this.outlinePass.hiddenEdgeColor.set('#000000');
    this.outlinePass.edgeStrength = 20;
    if (LDR.Options && LDR.Options.showOldColors === 0) {
        this.outlinePass.visibleEdgeColor.set('#200000');
    } else {
        this.outlinePass.visibleEdgeColor.set('#20F000');
    }
}
LDR.InstructionsManager.prototype.onWindowResize = function (force) {
    this.topButtonsHeight = document.getElementById('top_buttons').offsetHeight;
    let w = (window.innerWidth - 20);
    let h = (window.innerHeight - this.adPeek);
    if (force || this.canvas.width !== w || this.canvas.height !== h) {
        this.renderer.setSize(w, h, true);
        if (LDR.Options && LDR.Options.showOldColors <= 1) {
            this.composer = new THREE.EffectComposer(this.renderer);
            this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
            this.buildOutlinePass(w, h);
            this.composer.addPass(this.outlinePass);
        }
    }
    this.camera.left = -this.canvas.clientWidth * 0.95;
    this.camera.right = this.canvas.clientWidth * 0.95;
    this.camera.top = this.canvas.clientHeight * 0.95;
    this.camera.bottom = -this.canvas.clientHeight * 0.95;
    this.updateViewPort();
    this.updateCameraZoom();
    if (this.stepHandler) {
        this.realignModel(0);
        this.updateUIComponents(false);
    }
}
LDR.InstructionsManager.prototype.resetCameraPosition = function () {
    this.controls.reset();
    this.updateCameraZoom();
    this.updateViewPort();
    this.camera.lookAt(new THREE.Vector3());
    this.camera.updateProjectionMatrix();
    this.updateViewPort();
    this.render();
}
LDR.InstructionsManager.prototype.zoomIn = function () {
    this.controls.dollyIn(1.2);
    this.render();
}
LDR.InstructionsManager.prototype.zoomOut = function () {
    this.controls.dollyOut(1.2);
    this.render();
}
LDR.InstructionsManager.prototype.updateUIComponents = function (force) {
    if (!this.stepHandler) {
        return;
    }
    this.currentMultiplier = this.stepHandler.getMultiplierOfCurrentStep();
    this.updateMultiplier();
    this.updateRotator();
    this.setBackgroundColor(this.stepHandler.getBackgroundColorOfCurrentStep());
    if (this.stepHandler.isAtLastStep()) {
        this.ldrButtons.atLastStep();
    } else if (this.stepHandler.isAtFirstStep()) {
        this.ldrButtons.atFirstStep();
    } else {
        this.ldrButtons.atAnyOtherStep();
    }
    this.ldrButtons.setShownStep(this.currentStep);
    this.updatePLI(force);
    this.updateViewPort();
    this.updateCameraZoom();
    this.render();
    this.stepEditor && this.stepEditor.updateCurrentStep();
}
LDR.InstructionsManager.prototype.updatePLI = function (force) {
    let step = this.stepHandler.getCurrentStep();
    let edit = LDR.Options && LDR.Options.showEditor && this.canEdit;
    this.showPLI = edit || step.containsPartSubModels(this.ldrLoader);
    let e = this.pliElement;
    this.emptyElement.style.display = (!edit || this.showPLI || step.containsNonPartSubModels(this.ldrLoader)) ? 'none' : 'inline-block';
    if (!this.showPLI) {
        e.style.display = this.dh.style.display = this.dv.style.display = 'none';
        return;
    }
    e.style.display = 'inline-block';
    let maxWidth = window.innerWidth - e.offsetLeft - 18;
    let maxHeight = window.innerHeight - 130 - this.adPeek;
    if (this.fillHeight()) {
        let w = this.pliW;
        let h = maxHeight;
        this.pliBuilder.drawPLIForStep(true, step, w, h, force);
        this.dh.style.display = 'inline-block';
        this.dh.style.height = this.pliBuilder.canvas.style.height;
        this.dv.style.display = 'none';
        this.dv.style.width = '0px';
    } else {
        let w = maxWidth;
        let h = this.pliH;
        this.pliBuilder.drawPLIForStep(false, step, w, h, force);
        this.dv.style.display = 'block';
        this.dv.style.width = this.pliBuilder.canvas.style.width;
        this.dh.style.display = 'none';
        this.dh.style.height = '0px';
    }
}
LDR.InstructionsManager.prototype.fillHeight = function () {
    return window.innerWidth > window.innerHeight;
}
LDR.InstructionsManager.prototype.updateViewPort = function (overwriteSize) {
    if (this.ignoreViewPortUpdate) {
        return;
    }
    let c = this.camera;
    let W = this.canvas.clientWidth * 0.95;
    let H = this.canvas.clientHeight * 0.95;
    c.position.set(10000, 7000, 10000);
    let dx = 0;
    let dy = this.topButtonsHeight;
    if (!overwriteSize && !this.showPLI) {} else if (this.fillHeight()) {
        dx += overwriteSize ? overwriteSize[0] : this.pliW;
    } else {
        dy += overwriteSize ? overwriteSize[1] : this.pliH;
    }
    c.clearViewOffset();
    c.setViewOffset(W, H, -dx / 2, -dy / 2, W, H);
    c.updateProjectionMatrix();
    this.controls.update();
}
LDR.InstructionsManager.prototype.realignModel = function (stepDiff, onRotated, onDone) {
    let self = this;
    let oldRotationMatrix = this.currentRotationMatrix;
    let oldPosition = new THREE.Vector3();
    oldPosition.copy(this.baseObject.position);
    let oldPLIW = this.showPLI ? this.pliW : 0;
    let oldPLIH = this.showPLI ? this.pliH : 0;
    let oldLevel = this.stepHandler.getLevelOfCurrentStep();
    let newLevel = oldLevel;
    let goBack = function () {};
    if (stepDiff === 1 && this.stepHandler.nextStep(true)) {
        goBack = function () {
            newLevel = self.stepHandler.getLevelOfCurrentStep();
            self.stepHandler.prevStep(true);
        };
    } else if (stepDiff === -1 && this.stepHandler.prevStep(true)) {
        goBack = function () {
            newLevel = self.stepHandler.getLevelOfCurrentStep();
            self.stepHandler.nextStep(true);
        };
    }
    let viewPortWidth = window.innerWidth;
    let viewPortHeight = window.innerHeight - this.adPeek;
    if (this.pliH > 0) {
        if (this.fillHeight()) {
            viewPortWidth -= this.pliW;
        } else {
            viewPortHeight -= this.pliH;
        }
    }
    let useAccumulatedBounds = true;
    let b = this.stepHandler.getAccumulatedBounds();
    let size = b.min.distanceTo(b.max);
    let viewPortSize = 0.75 * Math.sqrt(viewPortWidth * viewPortWidth + viewPortHeight * viewPortHeight);
    if (size > viewPortSize) {
        useAccumulatedBounds = false;
        b = this.stepHandler.getBounds();
        size = b.min.distanceTo(b.max);
        if (size < viewPortSize) {
            let bDiff = new THREE.Vector3();
            bDiff.subVectors(b.max, b.min);
            bDiff.multiplyScalar(0.10 * (viewPortSize / size - 1));
            b.max.add(bDiff);
            b.min.sub(bDiff);
            size = viewPortSize;
        }
    }
    let newPosition;
    [newPosition, this.currentRotationMatrix] = this.stepHandler.computeCameraPositionRotation(this.defaultMatrix, this.currentRotationMatrix, useAccumulatedBounds);
    this.baseObject.setRotationFromMatrix(this.currentRotationMatrix);
    this.baseObject.updateMatrixWorld(true);
    let measurer = new LDR.Measurer(this.camera);
    let [dx, dy] = measurer.measure(b, this.baseObject.matrixWorld);
    this.updatePLI(false);
    let newPLIW = this.showPLI ? this.pliW : 0;
    let newPLIH = this.showPLI ? this.pliH : 0;
    goBack();
    let rotationChanges = !this.currentRotationMatrix.equals(oldRotationMatrix);
    let ignorePos = new THREE.Vector3();
    let newRot = new THREE.Quaternion();
    let ignoreScale = new THREE.Vector3();
    this.currentRotationMatrix.decompose(ignorePos, newRot, ignoreScale);
    let positionChanges = !oldPosition.equals(newPosition) || oldPLIW !== newPLIW || oldPLIH !== newPLIH;
    let oldDefaultZoom = this.defaultZoom;
    viewPortWidth = window.innerWidth;
    viewPortHeight = window.innerHeight - this.adPeek - this.topButtonsHeight;
    if (this.fillHeight()) {
        viewPortWidth -= newPLIW;
    } else {
        viewPortHeight -= newPLIH;
    }
    let scaleX = (window.innerWidth) / viewPortWidth * 1.1;
    let scaleY = (window.innerHeight - this.adPeek) / viewPortHeight * 1.1;
    if (dx * scaleX > dy * scaleY) {
        this.defaultZoom = 2 * this.camera.zoom / (dx * scaleX);
    } else {
        this.defaultZoom = 2 * this.camera.zoom / (dy * scaleY);
    }
    let newDefaultZoom = this.defaultZoom;
    let zoomChanges = oldDefaultZoom !== newDefaultZoom;

    function finalize() {
        self.initialConfiguration = false;
        onRotated && onRotated();
        onRotated = false;
        self.baseObject.setRotationFromMatrix(self.currentRotationMatrix);
        self.baseObject.position.x = newPosition.x;
        self.baseObject.position.y = newPosition.y;
        self.baseObject.position.z = newPosition.z;
        self.defaultZoom = newDefaultZoom;
        self.updateViewPort();
        self.updateCameraZoom();
        self.render();
        onDone && onDone();
        onDone = false;
        if (new Date() - self.lastRefresh > 1000 * 60) {
            self.refreshCache();
            self.lastRefresh = new Date();
        }
    }
    let animationID;
    let startTime = new Date();
    let showAnimations = LDR.Options ? LDR.Options.showStepRotationAnimations : 2;
    let animationTimeRotationMS = rotationChanges ? (2 - showAnimations) * 300 : 0;
    let animationTimePositionMS = positionChanges ? (2 - showAnimations) * 150 : 0;
    if (stepDiff != 0 && newLevel !== oldLevel && newLevel - oldLevel === stepDiff) {
        animationTimeRotationMS = 0;
        animationTimePositionMS = 0;
    }
    let animationTimeMS = animationTimePositionMS + animationTimeRotationMS;
    let lastPosition = oldPosition;

    function animate() {
        animationID = requestAnimationFrame(animate);
        let diffMS = new Date() - startTime;
        if (diffMS >= animationTimeMS) {
            cancelAnimationFrame(animationID);
            finalize();
            return;
        }
        let progress = diffMS / animationTimeMS;
        self.defaultZoom = oldDefaultZoom + (newDefaultZoom - oldDefaultZoom) * progress;
        let pw = oldPLIW + (newPLIW - oldPLIW) * progress;
        let ph = oldPLIH + (newPLIH - oldPLIH) * progress;
        self.updateViewPort([pw, ph]);
        self.updateCameraZoom();
        if (diffMS < animationTimeRotationMS) {
            progress = diffMS / animationTimeRotationMS;
            let oldPos = new THREE.Vector3();
            let oldRot = new THREE.Quaternion();
            let oldScale = new THREE.Vector3();
            oldRotationMatrix.decompose(oldPos, oldRot, oldScale);
            let angleToTurn = oldRot.angleTo(newRot);
            oldRot.rotateTowards(newRot, angleToTurn * progress * 1.1);
            let invOldM4 = new THREE.Matrix4();
            invOldM4.getInverse(oldRotationMatrix);
            let tmpM4 = new THREE.Matrix4();
            tmpM4.compose(oldPos, oldRot, oldScale);
            oldPos.copy(oldPosition);
            oldPos.negate();
            oldPos.applyMatrix4(invOldM4);
            oldPos.applyMatrix4(tmpM4);
            oldPos.negate();
            lastPosition = oldPos;
            self.baseObject.setRotationFromMatrix(tmpM4);
            self.baseObject.position.x = oldPos.x;
            self.baseObject.position.y = oldPos.y;
            self.baseObject.position.z = oldPos.z;
        } else {
            onRotated && onRotated();
            onRotated = false;
            progress = (diffMS - animationTimeRotationMS) / animationTimePositionMS;
            let tmpPosition = new THREE.Vector3();
            tmpPosition.subVectors(newPosition, lastPosition).multiplyScalar(progress).add(lastPosition);
            self.baseObject.position.x = tmpPosition.x;
            self.baseObject.position.y = tmpPosition.y;
            self.baseObject.position.z = tmpPosition.z;
        }
        self.render();
        self.stats && self.stats.update();
    }
    if (showAnimations < 2 &&
        Math.abs(stepDiff) === 1 &&
        !this.initialConfiguration &&
        (zoomChanges || rotationChanges || positionChanges)) {
        animate();
    } else {
        finalize();
    }
}
LDR.InstructionsManager.prototype.handleStepsWalked = function () {
    this.currentStep = this.stepHandler.getCurrentStepIndex();
    window.history.replaceState(this.currentStep, null, this.baseURL + this.currentStep);
    this.realignModel(0);
    this.onPLIMove(true);
    this.updateUIComponents(false);
    localStorage.setItem('last_step_' + this.modelID, this.currentStep);
};
LDR.InstructionsManager.prototype.goToStep = function (step) {
    if (this.pliHighlighted) {
        return;
    }
    console.log("Going to " + step + " from " + this.currentStep);
    let self = this;
    this.stepHandler.moveTo(step, () => self.handleStepsWalked());
}
LDR.InstructionsManager.prototype.nextStep = function () {
    if (this.pliHighlighted) {
        return;
    }
    if (this.stepHandler.isAtLastStep()) {
        return;
    }
    let self = this;
    this.realignModel(1, () => self.stepHandler.nextStep(false), () => self.handleStepsWalked());
}
LDR.InstructionsManager.prototype.prevStep = function () {
    if (this.pliHighlighted) {
        return;
    }
    let self = this;
    this.realignModel(-1, () => self.stepHandler.prevStep(false), () => self.handleStepsWalked());
}
LDR.InstructionsManager.prototype.clickDone = function () {
    let fadeInTime = 400;
    $('#done_holder, #done_background').fadeIn(fadeInTime);
    if (this.doneShown) {
        return;
    }
    this.doneShown = true;
    $('#done_holder').load('ajax/done.php', {
        model: '' + this.modelID
    });
}
LDR.InstructionsManager.prototype.onPLIClick = function (e) {
    let x = e.layerX || e.clientX;
    let y = e.layerY || e.clientY;
    if (!this.pliBuilder || !this.pliBuilder.clickMap) {
        return;
    }
    let hits = this.pliBuilder.clickMap.filter(icon => x >= icon.x && y >= icon.y && x <= icon.x + icon.DX && y <= icon.y + icon.DY);
    if (hits.length === 0) {
        console.log('No icon was hit at ' + x + ', ' + y);
        return;
    }
    let distSq = (x1, y1) => (x1 - x) * (x1 - x) + (y1 - y) * (y1 - y);
    let icon, bestDist;
    hits.forEach(candidate => {
        if (!icon) {
            icon = candidate;
        } else {
            let d = distSq(icon.x + candidate.DX * 0.5, icon.y + candidate.DY * 0.5);
            if (d < bestDist) {
                bestDist = d;
                icon = candidate;
            }
        }
    });
    if (this.canEdit && LDR.Options && LDR.Options.showEditor) {
        icon.part.original.ghost = !icon.part.original.ghost;
        this.stepHandler.updateMeshCollectors();
        this.updateUIComponents(true);
    } else {
        this.pliPreviewer.scene.remove(this.pliHighlighted);
        let pt = this.pliBuilder.getPartType(icon.partID);
        this.pliHighlighted = pt.mesh;
        this.pliPreviewer.scene.add(this.pliHighlighted);
        pt.pliMC.overwriteColor(icon.part.c);
        this.pliPreviewer.showPliPreview(icon);
        let b = pt.pliMC.boundingBox;
        let size = b.min.distanceTo(b.max) * 0.6;
        this.pliPreviewer.subjectSize = size;
        this.pliPreviewer.onResize();
    }
}
LDR.InstructionsManager.prototype.onPLIMove = function (e) {
    if (!(this.canEdit && LDR.Options && LDR.Options.showEditor &&
            this.pliBuilder && this.pliBuilder.clickMap)) {
        return;
    }
    let self = this;

    function update() {
        self.stepHandler && self.stepHandler.updateMeshCollectors();
        self.updatePLI(true);
        self.stepEditor && self.stepEditor.updateCurrentStep();
        self.render();
    }

    function unset() {
        if (self.hovered) {
            self.hovered.hover = false;
            self.hovered = false;
        }
        update();
    }
    if (!e) {
        this.lastPLIMoveX = this.lastPLIMoveY = -1e6;
        unset();
        return;
    }
    let x, y;
    if (e === true) {
        x = this.lastPLIMoveX;
        y = this.lastPLIMoveY;
    } else {
        x = this.lastPLIMoveX = e.layerX || e.clientX;
        y = this.lastPLIMoveY = e.layerY || e.clientY;
    }
    let hits = this.pliBuilder.clickMap.filter(icon => x >= icon.x && y >= icon.y && x <= icon.x + icon.DX && y <= icon.y + icon.DY);
    if (hits.length === 0) {
        unset();
        return;
    }
    let distSq = (x1, y1) => (x1 - x) * (x1 - x) + (y1 - y) * (y1 - y);
    let icon, bestDist;
    hits.forEach(candidate => {
        if (!icon) {
            icon = candidate;
        } else {
            let d = distSq(icon.x + candidate.DX * 0.5, icon.y + candidate.DY * 0.5);
            if (d < bestDist) {
                bestDist = d;
                icon = candidate;
            }
        }
    });
    if (icon.part.original !== self.hovered || e === true) {
        if (self.hovered) {
            self.hovered.hover = false;
        }
        self.hovered = icon.part.original;
        self.hovered.hover = true;
        update();
    }
}
LDR.InstructionsManager.prototype.hidePliPreview = function () {
    this.pliPreviewer.hidePliPreview();
    this.pliPreviewer.scene.remove(this.pliHighlighted);
    this.pliHighlighted = null;
}
LDR.InstructionsManager.prototype.hideDone = function () {
    let fadeOutTime = 400;
    $('#done_holder, #done_background').fadeOut(fadeOutTime);
}
LDR.InstructionsManager.prototype.setUpOptions = function () {
    let self = this;
    let optionsDiv = document.getElementById('options');
    LDR.Options.appendHeader(optionsDiv);
    LDR.Options.appendContrastOptions(optionsDiv);
    LDR.Options.appendStudHighContrastOptions(optionsDiv);
    LDR.Options.appendStudLogoOptions(optionsDiv);
    LDR.Options.appendOldBrickColorOptions(optionsDiv);
    LDR.Options.appendAnimationOptions(optionsDiv);
    LDR.Options.appendFooter(optionsDiv);
    LDR.Options.listeners.push(function (partGeometriesChanged) {
        if (partGeometriesChanged) {
            self.ldrLoader.applyOnPartTypes(pt => {
                if (pt.isPart) {
                    pt.geometry = pt.mesh = null;
                }
            });

            function callBack() {
                self.stepHandler.rebuild();
                self.stepHandler.moveTo(self.currentStep, () => {});
                self.handleStepsWalked();
                self.stepHandler.updateMeshCollectors();
                self.updateUIComponents(true);
            }
            LDR.Studs.setStuds(self.ldrLoader, LDR.Options.studHighContrast,
                LDR.Options.studLogo, callBack);
        } else {
            self.stepHandler.updateMeshCollectors();
            self.updateUIComponents(true);
        }
        self.ldrButtons.hideElementsAccordingToOptions();
        self.onWindowResize(true);
    });
}