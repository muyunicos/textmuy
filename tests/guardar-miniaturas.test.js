/* RC69: flujo de guardar preset y miniaturas. Dos defectos medidos en
 * produccion (muyunicos.com):
 *
 * C1: la preview de un estilo de TEXTURA con ref numerica sin resolver
 *     (id de img.json) emitia `background: url(26)` y el navegador pedia la
 *     URL relativa .../modules/textmuy/26 -> 404. fillStylePreview ahora
 *     resuelve via urlDeImgRef o devuelve un placeholder neutro.
 *
 * C2a: la miniatura de un preset esperaba SOLO la fuente base
 *      (renderToCanvasConFuente). Un preset con fuente propia por linea
 *      (retro-comic: L2/L3) quedaba con la tipografia del sistema en esas
 *      lineas. thumbnailCanvas ahora espera a TextMuyAPI.ensureFontReady
 *      (todas las fuentes usadas, con causa por fallo). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// --- Harness de canvas (patron sombra-posicion) -----------------------------
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
        clearRect: noop, strokeRect: noop, drawImage: noop,
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
    const slot = { w: w, h: h, tag: tag || 'capa' };
    return {
        _slot: slot, style: {},
        get width() { return slot.w; }, set width(v) { slot.w = v; },
        get height() { return slot.h; }, set height(v) { slot.h = v; },
        getContext: function () { return ctxReg(slot, tag || 'capa'); }
    };
}
// Elemento DOM minimo (patron controls-init).
function makeEl(tag) {
    const el = {
        tagName: (tag || 'div').toUpperCase(), type: '', value: '', checked: false,
        hidden: false, disabled: false, dataset: {}, style: {}, children: [],
        parentElement: null, innerHTML: '', textContent: '', id: '',
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        addEventListener: function () {}, dispatchEvent: function () { return true; },
        setAttribute: function (k, v) { el[k] = v; }, getAttribute: function (k) { return el[k]; },
        querySelector: function () { return null; }, querySelectorAll: function () { return []; },
        appendChild: function (c) { el.children.push(c); c.parentElement = el; return c; },
        removeChild: function (c) { el.children = el.children.filter(function (x) { return x !== c; }); return c; },
        closest: function () { return null; }, getContext: function () { return null; }
    };
    return el;
}

let bridgeHandler = null;
global.window = {
    addEventListener: function (type, fn) { if (type === 'message') bridgeHandler = fn; }
};
global.document = {
    fonts: { add() {}, load() { return Promise.resolve([]); } },
    createElement: function (t) { return t === 'canvas' ? makeCanvas(300, 150) : makeEl(t); },
    getElementById: function () { return null; }, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, addEventListener: function () {}, dispatchEvent: function () {},
    body: makeEl('body')
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n }); }; };
global.window.FontFace = global.FontFace;
global.fetch = function () { return Promise.reject(new Error('fetch sin configurar')); };

require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/controls.js');

const TextEditor = global.window.TextEditor;
const PM = global.window.PresetManager;
const Controls = global.window.Controls;
// --- C1: fillStylePreview nunca emite url(<id numerico>) --------------------
assert.equal(typeof Controls.fillStylePreview, 'function', 'fillStylePreview expuesta para la suite');
assert.equal(Controls.fillStylePreview({ type: 'texture', texture: { src: 26 } }), '#2a2a2a',
    'ref numerica (number) -> placeholder, nunca url(26)');
assert.equal(Controls.fillStylePreview({ type: 'texture', texture: { src: '26' } }), '#2a2a2a',
    'ref numerica (string) -> placeholder, nunca url("26")');
assert.equal(Controls.fillStylePreview({ type: 'texture', texture: { src: 'https://test/img/a.webp' } }),
    'url(https://test/img/a.webp) center/cover', 'una URL real sigue mostrandose');

// --- C2a: la miniatura espera TODAS las fuentes (base + por linea) ----------
(async function () {
    assert.ok(bridgeHandler, 'preset-manager debe registrar el listener textmuy-bridge');
    bridgeHandler({ source: global.window, data: { type: 'textmuy-bridge', bridge: {
        urls: { motor: 'http://test/motor', imagenesBase: 'https://test/img/', presetsBase: 'https://test/tm-presets/', fuentesBase: 'https://test/fonts/' },
        nonces: { motor: 'x' }, presets: [], imagenes: [], fuentes: []
    } } });
    const presetsDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'pmu', 'tm-presets');
    const payload = JSON.parse(fs.readFileSync(path.join(presetsDir, 'retro-comic.txm'), 'utf8'));
    global.fetch = function (url) {
        if (/retro-comic\.txm$/.test(url)) {
            return Promise.resolve({ ok: true, json: function () { return Promise.resolve(payload); } });
        }
        return Promise.reject(new Error('fetch inesperado: ' + url));
    };
    const aseguradas = [];
    global.window.TextMuyAPI = {
        urlDeImgRef: function () { return ''; },
        ensureFontReady: function (s) { aseguradas.push(s); return Promise.resolve(); }
    };
    const tile = await PM.renderPresetTile('retro-comic');
    assert.ok(tile, 'la celda de retro-comic se dibuja');
    assert.equal(aseguradas.length, 1, 'la miniatura espera a ensureFontReady (todas las fuentes)');
    const refs = TextEditor.fuentesPorLinea(aseguradas[0]).map(function (f) { return f.ref; }).sort(function (a, b) { return a - b; });
    assert.deepEqual(refs, [1, 2, 3],
        'se aseguran base + fuentes por linea (antes solo la base: L2/L3 salian con la fuente del sistema)');
})().then(function () {
    console.log('OK: guardar-miniaturas.test.js (preview sin url(id) + miniaturas con todas las fuentes)');
}).catch(function (e) {
    console.error(e);
    process.exit(1);
});
