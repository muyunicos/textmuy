/* RC63: la sombra exterior (y la extrusion 3D) NO deben recortarse en el borde
 * del tile. Defecto visto en las miniaturas de la galeria (muyunicos.com): un
 * "fantasma" del texto, en el color de la sombra, cortado en la esquina inferior
 * derecha de cada tile que tenia shadow.outer.
 *
 * Causa: textLayer (la capa donde se compone texto+sombra) solo se dimensionaba
 * por su contenido real (sourceWidth/sourceHeight, que incluyen el extra de la
 * sombra via calcExtraWidth) cuando habia rotacion o curva. Con solo shadow.outer
 * media EXACTO el canvas, la sombra proyectada se salia del borde y se recortaba.
 *
 * Contrato fijado: con un efecto desbordante (shadow.outer/outer2/depth/depth2)
 * la capa compuesta debe EXCEDER el tamano del canvas (hay gutter para la
 * sombra); sin efectos desbordantes, media exacta (no se infla de mas). */
const assert = require('node:assert/strict');

// ctx minimo que registra el tamano de la capa que el encaje dibuja sobre el
// lienzo principal (la capa compuesta ya trimmeada). No necesita pintar de verdad:
// basta con ver las dimensiones que le llegan a drawImage.
function ctxReg(slot, tag) {
    const noop = function () {};
    return {
        _tag: tag,
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        canvas: { width: slot.w, height: slot.h },
        save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
        clearRect: noop, strokeRect: noop,
        drawImage: function (img) { if (tag === 'principal' && img && img.width) { (slot.capas = slot.capas || []).push({ w: img.width, h: img.height }); } },
        fillText: noop, strokeText: noop, beginPath: noop, moveTo: noop, lineTo: noop,
        arc: noop, closePath: noop, fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
        transform: noop, resetTransform: noop,
        getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
        measureText: function (t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font || ''); const px = m ? parseFloat(m[1]) : 10; return { width: String(t).length * px * 0.55, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2 }; },
        getImageData: function () { const d = new Uint8ClampedArray(4); d[3] = 255; return { data: d, width: 1, height: 1 }; },
        createImageData: function () { return { data: new Uint8ClampedArray(4) }; },
        createLinearGradient: function () { return { addColorStop: noop }; },
        createRadialGradient: function () { return { addColorStop: noop }; },
        createPattern: function () { return null; },
        fillRect: noop
    };
}
function makeCanvas(w, h, tag) {
    const slot = { w: w, h: h, tag: tag };
    const cv = {
        _slot: slot, style: {},
        get width() { return slot.w; }, set width(v) { slot.w = v; },
        get height() { return slot.h; }, set height(v) { slot.h = v; },
        getContext: function () { return ctxReg(slot, tag); }
    };
    return cv;
}

global.window = {};
global.document = {
    fonts: { add() {}, load() { return Promise.resolve([]); } },
    createElement: function (t) { return t === 'canvas' ? makeCanvas(300, 150, 'capa') : {}; },
    getElementById: function () { return null; }, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, addEventListener: function () {}, dispatchEvent: function () {}
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add() {} }); }; };
global.window.FontFace = global.FontFace;

require('../js/editor.js');
const ED = global.window.TextEditor;

// Mide la mayor capa compuesta que el encaje dibuja sobre un tile 200x100.
function capaCompuesta(settings) {
    const s = JSON.parse(JSON.stringify(settings));
    s.canvas = s.canvas || {}; s.canvas.width = 200; s.canvas.height = 100;
    const principal = makeCanvas(200, 100, 'principal');
    ED.renderToCanvas(principal, s);
    const capas = principal._slot.capas || [];
    return capas.reduce((m, c) => (!m || c.w * c.h > m.w * m.h) ? c : m, null);
}

// 1. CON shadow.outer: la capa compuesta EXCEDE el alto del tile (gutter para la
//    sombra). Sin el fix media 200x100 y la sombra se recortaba.
const conSombra = ED.createDefaultSettings();
conSombra.text = 'NEON';
conSombra.shadow.outer.active = true;
conSombra.shadow.outer.distance = 0.03;
conSombra.shadow.outer.fill.color = '#ff00ff';
const capaSombra = capaCompuesta(conSombra);
assert.ok(capaSombra, 'debe dibujar una capa compuesta');
assert.ok(capaSombra.h > 100, 'con shadow.outer la capa debe pasar de 100px de alto (hay sitio para la sombra): ' + capaSombra.h);

// 2. SIN efecto desbordante: la capa NO se infla (media del canvas).
const sinSombra = ED.createDefaultSettings();
sinSombra.text = 'HOLA';
const capaLisa = capaCompuesta(sinSombra);
assert.ok(capaLisa, 'debe dibujar una capa compuesta tambien sin sombra');
assert.ok(capaLisa.h <= 100 && capaLisa.w <= 200, 'sin efectos desbordantes la capa no crece mas que el tile: ' + capaLisa.w + 'x' + capaLisa.h);

console.log('OK: sombra-no-recortada.test.js (la capa se expande con shadow.outer/depth, no se recorta la sombra)');
