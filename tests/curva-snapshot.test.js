/* 002-text-tab US1 (P1) - la curva no borra el texto.
 *
 * Fija contracts/curva.md:
 *   - el orden es dibujar -> COPIAR A 2D -> perder el contexto -> devolver la
 *     copia (R-C1.3). Antes se llamaba loseContext() y se devolvia el canvas
 *     WebGL: el contexto muerto dejaba el resultado vacio (0 px de tinta con
 *     angulo 120).
 *   - lo devuelto es 2D y autocontenido (R-C1.2);
 *   - angulo 0 no crea contexto WebGL (R-C1.4);
 *   - el signo del angulo espeja la curva (R-C1.5).
 *
 * Node no tiene WebGL ni canvas reales: se simula un contexto GL minimo que
 * registra el orden de las operaciones (drawArrays / drawImage del snapshot /
 * loseContext) y un canvas 2D que cuenta sus llamadas.
 */
const assert = require('node:assert/strict');

const operaciones = [];

function makeCtx2D(etiqueta) {
    return {
        drawImage: function () { operaciones.push('drawImage:' + etiqueta); },
        setTransform: function () {},
        save: function () {}, restore: function () {}
    };
}

function makeGL() {
    const gl = {
        MAX_TEXTURE_SIZE: 0x0fff,
        COMPILE_STATUS: 1, LINK_STATUS: 1,
        UNPACK_FLIP_Y_WEBGL: 1,
        TRIANGLE_STRIP: 5, COLOR_BUFFER_BIT: 1,
        getParameter: function () { return 8192; },
        createShader: function () { return {}; },
        shaderSource: function () {},
        compileShader: function () {},
        getShaderParameter: function () { return true; },
        getShaderInfoLog: function () { return ''; },
        createProgram: function () { return {}; },
        attachShader: function () {}, linkProgram: function () {},
        getProgramParameter: function () { return true; },
        bindAttribLocation: function () {},
        createBuffer: function () { return {}; },
        bindBuffer: function () {}, bufferData: function () {},
        createTexture: function () { return {}; },
        bindTexture: function () {}, texParameteri: function () {},
        pixelStorei: function () {}, texImage2D: function () {},
        useProgram: function () {}, enableVertexAttribArray: function () {},
        vertexAttribPointer: function () {},
        getUniformLocation: function () { return {}; },
        uniform1i: function () {}, uniform2f: function () {}, uniform1f: function () {},
        viewport: function () {}, clearColor: function () {}, clear: function () {},
        drawArrays: function () { operaciones.push('drawArrays'); },
        getExtension: function (nombre) {
            if (nombre === 'WEBGL_lose_context') {
                return { loseContext: function () { operaciones.push('loseContext'); } };
            }
            return null;
        }
    };
    return gl;
}

function makeCanvas() {
    const canvas = {
        width: 0, height: 0,
        _ctx2d: null,
        _gl: null,
        getContext: function (tipo) {
            if (tipo === '2d') {
                if (!this._ctx2d) this._ctx2d = makeCtx2D('snapshot');
                return this._ctx2d;
            }
            if (tipo === 'webgl2' || tipo === 'webgl') {
                if (!this._gl) this._gl = makeGL();
                return this._gl;
            }
            return null;
        }
    };
    return canvas;
}

global.document = { createElement: function (tag) { return tag === 'canvas' ? makeCanvas() : {}; } };

const DistortEngine = require('../js/effects/distort-engine.js');
const engine = new DistortEngine();

// --- R-C1.3: el snapshot ocurre ANTES de perder el contexto ---------------
operaciones.length = 0;
const fuente = makeCanvas();
fuente.width = 240;
fuente.height = 60;
const salida = engine.curve(fuente, 120);
assert.ok(salida, 'curve() debe devolver un canvas');
const iDraw = operaciones.indexOf('drawArrays');
const iSnap = operaciones.indexOf('drawImage:snapshot');
const iLose = operaciones.indexOf('loseContext');
assert.notEqual(iDraw, -1, 'debe ejecutar drawArrays');
assert.notEqual(iSnap, -1, 'debe copiar el resultado a un canvas 2D (snapshot)');
assert.notEqual(iLose, -1, 'debe liberar el contexto WebGL');
assert.ok(iDraw < iSnap, 'el snapshot es posterior al dibujado');
assert.ok(iSnap < iLose, 'R-C1.3: el loseContext() va DESPUES del snapshot');
assert.equal(operaciones[operaciones.length - 1], 'loseContext',
    'el loseContext() es lo ultimo antes de devolver');

// --- R-C1.2: lo devuelto es 2D y autocontenido ---------------------------
assert.notEqual(salida, null, 'debe devolver la copia');
assert.ok(salida.getContext('2d'), 'el canvas devuelto debe tener contexto 2D (autocontenido)');

// --- R-C1.4: angulo 0 es via rapida, sin contexto WebGL --------------------
operaciones.length = 0;
const recta = makeCanvas();
recta.width = 240;
recta.height = 60;
const sinCurva = engine.curve(recta, 0);
assert.equal(sinCurva, recta, 'con angulo 0 se devuelve la capa sin tocar');
assert.equal(operaciones.length, 0, 'con angulo 0 no se toca nada (ni WebGL ni copia)');

// --- R-C1.5: el signo espeja la curva --------------------------------------
const geoPos = DistortEngine.getArcGeometry(240, 60, 120);
const geoNeg = DistortEngine.getArcGeometry(240, 60, -120);
assert.equal(geoPos.direction, 1);
assert.equal(geoNeg.direction, -1, 'el signo negativo invierte la direccion (espejo)');
assert.equal(geoPos.width, geoNeg.width, 'misma anchura en ambos signos');
assert.equal(geoPos.height, geoNeg.height, 'misma altura en ambos signos');
assert.notEqual(geoPos.centerAngle, geoNeg.centerAngle, 'los centros son opuestos');

// --- El recorte centrado conserva el origen del bloque (US5 vs US4) ---------
// El recorrido integrado en WordPress (Chrome real, fuente Bangers del
// catalogo) mostro que recortar la tinta y volver a centrar la capa movia el
// origen del bloque: con dos lineas, subir el interlineado desplazaba tambien
// L1. `centrar` devuelve el menor rectangulo con el MISMO centro que el lienzo.
function makeCanvasConTinta(w, h, x0, y0, tw, th) {
    const c = makeCanvas();
    c.width = w;
    c.height = h;
    c.getContext = function (tipo) {
        if (tipo === '2d') {
            return {
                drawImage: function () {},
                setTransform: function () {}, save: function () {}, restore: function () {},
                getImageData: function () {
                    const data = new Uint8ClampedArray(w * h * 4);
                    for (let y = y0; y < y0 + th; y++) {
                        for (let x = x0; x < x0 + tw; x++) data[(y * w + x) * 4 + 3] = 255;
                    }
                    return { data: data, width: w, height: h };
                }
            };
        }
        return c._gl || (c._gl = makeGL());
    };
    return c;
}

// Tinta MUY asimetrica: pegada a la esquina inferior derecha del lienzo.
const W = 400, H = 300;
const cx = (W - 1) / 2, cy = (H - 1) / 2;
const asimetrica = makeCanvasConTinta(W, H, 300, 200, 80, 60);
const normal = engine.trimTransparent(asimetrica, 2);
assert.ok(normal, 'el recorte normal devuelve una capa');
assert.equal(normal.trimLeft, 298, 'sin centrar la caja se ajusta a la tinta (y recentra)');
const centrado = engine.trimTransparent(asimetrica, 2, { centrar: true });
assert.ok(centrado, 'el recorte centrado devuelve una capa');
// La propiedad que importa: el origen del lienzo (el centro, donde vive el
// anclaje del bloque) queda en el CENTRO de la capa recortada.
assert.equal(centrado.trimLeft + (centrado.width - 1) / 2, cx,
    'con `centrar` el centro del lienzo queda en el centro de la capa recortada');
assert.equal(centrado.trimTop + (centrado.height - 1) / 2, cy,
    'igual en vertical: el origen no se desplaza');
assert.ok(centrado.width >= 84 && centrado.height >= 64, 'el recorte centrado contiene toda la tinta');
assert.ok(centrado.width > normal.width, 'la caja centrada crece para preservar el origen');

console.log('curva: OK - snapshot antes de loseContext, canvas 2D, angulo 0 sin GL y espejo por signo');
