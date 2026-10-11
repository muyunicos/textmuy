/* RC66: la sombra exterior se dibujaba como COPIA DURA del texto desplazada
 * abajo-derecha. Causa raiz (medida en navegador real, Chrome con GPU):
 * applyBlur corria clearRect/drawImage con la transformacion CENTRADA del
 * canvas de la sombra (offCtx.setTransform(ctx.getTransform())). El clear
 * solo barria el cuadrante inferior-derecho y el difuminado se pegaba corrido
 * media capa: la copia dura sobrevivia. El blur nativo (ctx.filter) SI
 * funcionaba; el bug era el espacio de coordenadas.
 *
 * Contrato fijado:
 * 1. applyBlur limpia y pega SIEMPRE en espacio identidad
 *    (setTransform(1,0,0,1,0,0) antes de clearRect/drawImage/putImageData).
 * 2. boxBlurData difumina de verdad un buffer RGBA (fallback manual, puro).
 * 3. El modo 'auto' elige el camino MANUAL cuando el auto-test del
 *    cuadradito no se esparce (ctx.filter declarado pero sin efecto). */
const assert = require('node:assert/strict');

global.window = {};
// Canvas simulado que registra la MATRIZ activa en cada clearRect/drawImage
// y arranca con una transformacion NO identidad (como la capa de la sombra
// centrada en el render real).
function makeCanvasSimulado() {
    let mat = { a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 };
    const events = [];
    const ctx = {
        filter: '',
        save: function () {}, restore: function () {},
        setTransform: function (a, b, c, d, e, f) { mat = { a: a, b: b, c: c, d: d, e: e, f: f }; },
        clearRect: function (x, y, w, h) { events.push({ tipo: 'clear', mat: Object.assign({}, mat) }); },
        drawImage: function (img, x, y) { events.push({ tipo: 'draw', mat: Object.assign({}, mat) }); },
        fillRect: function () {}, fillText: function () {},
        getImageData: function () { return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; },
        putImageData: function () {},
        createImageData: function () { return { data: new Uint8ClampedArray(4), set: function (v) { this.data.set(v); } }; },
        measureText: function () { return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; },
        translate: function () {}, scale: function () {}, rotate: function () {}
    };
    return { width: 100, height: 50, getContext: function () { return ctx; }, _events: events };
}
global.document = {
    fonts: { add: function () {}, load: function () { return Promise.resolve([]); } },
    createElement: function (t) { return t === 'canvas' ? makeCanvasSimulado() : {}; },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}, dispatchEvent: function () {}
};
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n }); }; };
global.window.FontFace = global.FontFace;

require('../js/editor.js');
const ED = global.window.TextEditor;
// 1. boxBlurData: difumina un buffer real (math pura, sin canvas).
(function () {
    const w = 24, h = 24;
    const data = new Uint8ClampedArray(w * h * 4);
    function poner(x, y) {
        const i = (y * w + x) * 4;
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
    poner(11, 11); poner(12, 11); poner(11, 12); poner(12, 12);
    const res = ED.boxBlurData(data, w, h, 8);
    const centro = res[(11 * w + 11) * 4 + 3];
    const lejos = res[(8 * w + 11) * 4 + 3];
    assert.ok(centro < 255, 'el centro del puntito pierde opacidad al difuminarse: ' + centro);
    assert.ok(lejos > 0, 'la tinta se esparce fuera del puntito original: ' + lejos);
})();

// 2. applyBlur modo nativo: clearRect/drawImage corren en ESPACIO IDENTIDAD
//    aunque el canvas traiga una transformacion centrada (regresion principal).
(function () {
    const cv = makeCanvasSimulado();
    ED.applyBlur(cv, 6, 'nativo');
    const ops = cv._events.filter(function (e) { return e.tipo === 'clear' || e.tipo === 'draw'; });
    assert.ok(ops.length >= 2, 'debe limpiar y pegar la capa difuminada');
    ops.forEach(function (e) {
        assert.deepEqual(e.mat, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
            'la operacion ' + e.tipo + ' corre en espacio identidad (antes corria en la transformacion centrada y la sombra quedaba dura y corrida)');
    });
})();

// 3. applyBlur modo manual: difumina de verdad y devuelve el resultado por
//    putImageData (el fallback cuando el nativo no aplica).
(function () {
    const w = 24, h = 24;
    const buf = new Uint8ClampedArray(w * h * 4);
    function poner(x, y) {
        const i = (y * w + x) * 4;
        buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255; buf[i + 3] = 255;
    }
    poner(11, 11); poner(12, 11); poner(11, 12); poner(12, 12);
    let recibido = null;
    const ctx = {
        filter: '', save: function () {}, restore: function () {}, setTransform: function () {},
        getImageData: function () { return { data: new Uint8ClampedArray(buf), width: w, height: h }; },
        putImageData: function (nd) { recibido = nd; },
        createImageData: function () {
            return { data: new Uint8ClampedArray(w * h * 4), set: function (v) { this.data.set(v); } };
        }
    };
    const cv = { width: w, height: h, getContext: function () { return ctx; } };
    ED.applyBlur(cv, 8, 'manual');
    assert.ok(recibido && recibido.data, 'el fallback devuelve la capa difuminada por putImageData');
    const centro = recibido.data[(11 * w + 11) * 4 + 3];
    const lejos = recibido.data[(8 * w + 11) * 4 + 3];
    assert.ok(centro < 255, 'centro difuminado: ' + centro);
    assert.ok(lejos > 0, 'tinta esparcida fuera del puntito: ' + lejos);
})();

// 4. modo auto: cuando el auto-test del cuadradito no se esparce (ctx.filter
//    declarado pero sin efecto), la sombra va por el camino MANUAL.
(function () {
    const w = 24, h = 24;
    const buf = new Uint8ClampedArray(w * h * 4);
    buf[((11 * w + 11) * 4) + 3] = 255;
    let getImageDataCalls = 0, putCalls = 0;
    const ctx = {
        filter: '', save: function () {}, restore: function () {}, setTransform: function () {},
        getImageData: function () { getImageDataCalls++; return { data: new Uint8ClampedArray(buf), width: w, height: h }; },
        putImageData: function () { putCalls++; },
        createImageData: function () {
            return { data: new Uint8ClampedArray(w * h * 4), set: function (v) { this.data.set(v); } };
        },
        fillRect: function () {}, drawImage: function () {}, clearRect: function () {}
    };
    const cv = { width: w, height: h, getContext: function () { return ctx; } };
    ED.applyBlur(cv, 6, 'auto');
    assert.ok(getImageDataCalls >= 1, 'el camino manual lee los pixeles (getImageData)');
    assert.ok(putCalls === 1, 'el camino manual devuelve el resultado (putImageData)');
})();

console.log('OK: sombra-blur.test.js (blur en espacio identidad + fallback manual + auto-test)');
