/* RC67: las capas compuestas desde un canvas offscreen (sombra exterior,
 * sombra interior, relieve WebGL) se pegaban con drawImage(img, 0, 0) bajo la
 * transformacion CENTRADA del lienzo: el contenido (dibujado en el CENTRO de
 * la imagen) caia corrido media capa hacia la esquina inferior-derecha.
 * Medido en navegador: la sombra de retro-comic quedaba centrada en (516,310)
 * de un lienzo 600x400, con el texto en (300,200).
 *
 * Contrato fijado: el composite de estas capas se hace en (-w/2, -h/2), asi
 * el contenido (centrado en la imagen) queda centrado en el lienzo con solo
 * el offset propio del efecto. */
const assert = require('node:assert/strict');

// Cada drawImage se registra con la etiqueta del ctx y el tamano de la imagen.
const eventos = [];

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
        drawImage: function (img, x, y) {
            eventos.push({ tag: tag, w: (img && img.width) || 0, h: (img && img.height) || 0, x: x, y: y });
        },
        fillText: noop, strokeText: noop, beginPath: noop, moveTo: noop, lineTo: noop,
        arc: noop, closePath: noop, fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
        transform: noop, resetTransform: noop,
        getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
        measureText: function (t) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return { width: String(t).length * px * 0.55, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2 };
        },
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
    createElement: function (t) { return t === 'canvas' ? makeCanvas(200, 100, 'capa') : {}; },
    getElementById: function () { return null; }, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, addEventListener: function () {}, dispatchEvent: function () {}
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n }); }; };
global.window.FontFace = global.FontFace;
// Stub del motor WebGL de relieve: devuelve un canvas del MISMO tamano cuyo
// contenido esta centrado (como el motor real), para regresar el composite
// sin GPU en Node.
global.BevelWebGLEngine = function () {
    this.init = function () { return true; };
    this.apply = function (temp) { return makeCanvas(temp.width, temp.height, 'bevel'); };
};

require('../js/editor.js');
const ED = global.window.TextEditor;
// Los composites centrados (-w/2, -h/2) viven en los ctx de las capas
// offscreen (tag 'capa'); el encaje final dibuja sobre 'principal'.
function composicionesCentradas() {
    return eventos.filter(function (e) {
        return e.tag === 'capa' && e.w > 0 && e.h > 0 &&
            Math.abs(e.x + e.w / 2) < 2 && Math.abs(e.y + e.h / 2) < 2;
    });
}

function base() {
    const s = ED.createDefaultSettings();
    s.canvas.width = 200;
    s.canvas.height = 100;
    return s;
}

function renderizar(s) {
    eventos.length = 0;
    const principal = makeCanvas(200, 100, 'principal');
    ED.renderToCanvas(principal, s);
    return principal;
}

// 1. Sombra exterior: el composite se hace en (-w/2, -h/2).
{
    const s = base();
    s.shadow.outer.active = true;
    s.shadow.outer.distance = 0.06;
    s.shadow.outer.angle = 45;
    s.shadow.outer.fill = { color: '#332211', alpha: 1 };
    renderizar(s);
    assert.ok(composicionesCentradas().length >= 1,
        'la sombra exterior se compone centrada en (-w/2, -h/2), no en (0,0)');
}

// 2. Sombra interior: idem (layer con identidad + translate(w/2,h/2)).
{
    const s = base();
    s.shadow.inner.active = true;
    s.shadow.inner.size = 0.1;
    s.shadow.inner.fill = { color: '#112233', alpha: 1 };
    renderizar(s);
    assert.ok(composicionesCentradas().length >= 1,
        'la sombra interior se compone centrada en (-w/2, -h/2)');
}

// 3. Relieve WebGL (stub): el composite del bevel tambien va centrado.
{
    const s = base();
    s.bevel.inner.active = true;
    s.bevel.inner.size = 0.05;
    s.bevel.inner.highlight = { color: '#ffffff', alpha: 1 };
    s.bevel.inner.shadow = { color: '#000000', alpha: 1 };
    renderizar(s);
    const deBevel = eventos.some(function (e) {
        return e.tag === 'capa' && e.w > 0 && e.h > 0 &&
            Math.abs(e.x + e.w / 2) < 2 && Math.abs(e.y + e.h / 2) < 2;
    });
    assert.ok(deBevel, 'el relieve WebGL se compone centrado en (-w/2, -h/2)');
}

console.log('OK: sombra-posicion.test.js (composites offscreen centrados en -w/2,-h/2)');
