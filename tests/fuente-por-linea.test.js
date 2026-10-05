/* 002-text-tab D3 (US6) — fuente propia por linea.
 *
 * Fija research R7 y FR-017/FR-018:
 *   - cada linea se MEDE con su propia tipografia: hoy todo se mide con una sola,
 *     y por eso las lineas con fuente distinta ajustan mal;
 *   - el render carga una fuente por linea USADA, cada una una sola vez por
 *     identidad, y sin `preloadAll` (constitucion VI);
 *   - un fallo nombra la linea y la fuente y NO impide el resto (FR-017).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };

// Contexto 2D completo: el motor compone capas internas y pinta sobre ellas.
function ctx2D() {
    const noop = function () {};
    return {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
        clearRect: noop, fillRect: noop, strokeRect: noop, drawImage: noop,
        fillText: noop, strokeText: noop, beginPath: noop, moveTo: noop, lineTo: noop,
        arc: noop, closePath: noop, fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
        measureText: function (t) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return {
                width: String(t).length * px * 0.55,
                actualBoundingBoxAscent: px * 0.8,
                actualBoundingBoxDescent: px * 0.2
            };
        },
        getImageData: function () {
            const d = new Uint8ClampedArray(4);
            d[3] = 255;
            return { data: d, width: 1, height: 1 };
        },
        createImageData: function () { return { data: new Uint8ClampedArray(4) }; },
        createLinearGradient: function () { return { addColorStop: noop }; },
        createRadialGradient: function () { return { addColorStop: noop }; },
        createPattern: function () { return null; },
        toBlob: function (cb) { cb(null); }
    };
}

global.document = {
    fonts: {
        add: function () {},
        load: function (spec) { global.__cargadas.push(spec); return Promise.resolve([{ family: spec }]); }
    },
    createElement: function () {
        const c = { width: 0, height: 0, style: {} };
        c.getContext = function () { return ctx2D(); };
        c.toBlob = function (cb) { cb({ stub: true }); };
        return c;
    },
    head: { appendChild: function () {} },
    getElementsByTagName: function () { return [{ appendChild: function () {} }]; },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
global.__cargadas = [];
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add: function () {} }); }; };
global.window.FontFace = global.FontFace;
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };

// Fuentes simuladas: cada identidad tiene su familia y falla si se marca.
// El stub se define DESPUES de los require: fonts.js define el suyo y lo
// sobrescribiria.
const FALLAN = {};
function instalarFontLoader() {
    global.window.FontLoader = {
        loadFont: function (ref) {
            global.__pedidas.push(ref);
            if (FALLAN[String(ref)]) return Promise.reject(new Error('fonts:' + ref + ':no disponible'));
            return Promise.resolve('Familia' + ref);
        },
        getFontFamily: function (ref) { return '"Familia' + ref + '"'; },
        getFontName: function (ref) { return 'Familia' + ref; },
        resolveFontId: function (ref) { return Number(ref) || ref; }
    };
}
global.__pedidas = [];
global.fetch = function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve({}); } }); };

require('../js/catalog.js');
require('../js/fonts.js');
require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/export.js');
require('../js/api.js');
instalarFontLoader();

const TextEditor = global.window.TextEditor;
const TextMuyAPI = global.window.TextMuyAPI;
// En el navegador los IIFE comparten el ambito global; en Node hay que exponer
// tambien el global (api.js usa `TextEditor` sin `window.`).
global.TextEditor = TextEditor;
global.ExportManager = global.window.ExportManager;
// ExportManager necesita el editor inyectado (en el navegador lo hace main.js).
if (global.window.ExportManager && global.window.ExportManager.init) {
    global.window.ExportManager.init(TextEditor);
}
assert.ok(TextEditor && TextMuyAPI, 'editor y API expuestos');

function base() {
    const s = TextEditor.createDefaultSettings();
    s.text = 'UNO\nDOS\nTRES';
    s.font = { src: 1, size: 100, weight: 'normal' };
    s.lines = {
        activeTarget: 'all',
        inherit: {},
        line: {
            '1': { font: { src: 1, size: 100 } },
            '2': { font: { src: 2, size: 80 } },
            '3': { font: { src: 3, size: 60 } }
        }
    };
    return s;
}

// --- Cada linea se MEASURE con SU tipografia (research R7) ------------------
const s0 = base();
assert.equal(TextEditor.resolveLine(s0, 2).font.src, 2, 'L2 resuelve su propia fuente');
assert.equal(TextEditor.resolveLine(s0, 3).font.src, 3, 'L3 tambien');
// --- El render pide una fuente por linea, cada una una sola vez -------------
global.__pedidas = [];
return TextMuyAPI.renderTextToPNG({ text: 'UNO\nDOS\nTRES', settings: s0 }).then(function () {
    const pedidas = global.__pedidas.slice();
    assert.ok(pedidas.indexOf(2) !== -1, 'el render pide la fuente de L2 (ids: ' + JSON.stringify(pedidas) + ')');
    assert.ok(pedidas.indexOf(3) !== -1, 'y la de L3');
    assert.equal(pedidas.filter(function (p) { return String(p) === '2'; }).length, 1,
        'cada identidad se carga UNA sola vez (cache por id)');

    // --- FR-017: un fallo nombra linea y fuente y no impide el resto --------
    global.__pedidas = [];
    FALLAN['2'] = true;
    return TextMuyAPI.renderTextToPNG({ text: 'UNO\nDOS\nTRES', settings: s0 }).then(function () {
        assert.fail('una fuente por linea que falla debe rechazar con causa');
    }, function (e) {
        const msg = String((e && e.message) || e);
        assert.ok(/fonts:2|fuente.*2/.test(msg), 'el fallo nombra la fuente que falla (got: ' + msg + ')');
        assert.ok(/L2|linea 2|linea L2/i.test(msg), 'y nombra la linea (got: ' + msg + ')');
        delete FALLAN['2'];
        console.log('fuente por linea: OK - cada linea con su tipografia, una carga por identidad, fallo nombrado');
    });
}, function (e) {
    assert.fail('el render con fuentes por linea no deberia fallar: ' + ((e && e.message) || e));
});
const sBase = base();
sBase.lines = { activeTarget: 'all', inherit: {}, line: {} };
assert.equal(TextEditor.resolveLine(sBase, 3).font.src, 1, 'sin configuracion, L3 usa la fuente de la base');

// --- El manifiesto de fuentes por linea solo pide las USADAS ---------------
// (constitucion VI: nada de preloadAll).
const fuentesUsadas = TextEditor.fuentesPorLinea(s0);
assert.ok(Array.isArray(fuentesUsadas), 'fuentesPorLinea debe devolver una lista');
assert.deepEqual(fuentesUsadas.map(function (f) { return f.ref; }), [1, 2, 3],
    'una entrada por linea usada, en orden, sin repetir');
assert.equal(fuentesUsadas[1].linea, 2, 'cada entrada nombra su linea (FR-017)');

const soloBase = TextEditor.fuentesPorLinea(sBase);
assert.equal(soloBase.length, 1, 'sin estilos por linea solo se pide la fuente de la base');
assert.equal(soloBase[0].linea, 0, 'la de la base no es de ninguna linea');

// Una linea que hereda no pide fuente propia: usa la heredada.
const sHered = base();
sHered.lines = { activeTarget: 'all', inherit: { '3': 'L2' }, line: { '1': { font: { src: 1, size: 100 } }, '2': { font: { src: 2, size: 80 } } } };
assert.deepEqual(TextEditor.fuentesPorLinea(sHered).map(function (f) { return f.ref; }), [1, 2],
    'L3 hereda de L2: no hay una fuente nueva que cargar');