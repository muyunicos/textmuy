/* RC68: dos defectos medidos en produccion:
 *
 * A) "La letra queda blanca al cargar un preset con gradiente" (cyber-pop).
 *    loadPreset era el UNICO de los 10 sitios de gradiente que NO copiaba
 *    `fill.gradient.colors`: calculaba startColor/endColor con
 *    rgbToHex(colors[0]) — colors[0] es un stop {color,pos}, no {r,g,b} —
 *    y el array quedaba VACIO. migrateLegacyFillLayers caia al fallback de
 *    color plano (default blanco).
 *
 * B) "Aplicar una imagen desde la galeria da error": el settings guarda el
 *    ID numerico (R2) y los cargadores pedian `img.src = 6` como URL
 *    RELATIVA (GET .../modules/textmuy/6 -> 404). Los cargadores ahora
 *    omiten refs numericas (esRefImgNumerica de modulo) hasta que
 *    prepareImgRefs las resuelve. */
const assert = require('node:assert/strict');

// --- Harness minimo (patron sombra-posicion) --------------------------------
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
    const slot = { w: w, h: h, tag: tag };
    return {
        _slot: slot, style: {},
        get width() { return slot.w; }, set width(v) { slot.w = v; },
        get height() { return slot.h; }, set height(v) { slot.h = v; },
        getContext: function () { return ctxReg(slot, tag); }
    };
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
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n }); }; };
global.window.FontFace = global.FontFace;

// Image simulado: registra cada src asignado (para cazar URLs relativas "6").
const srcsDeImage = [];
function ImageSimulado() {
    let s = null;
    Object.defineProperty(this, 'src', {
        get: function () { return s; },
        set: function (v) { s = v; srcsDeImage.push(String(v)); },
        configurable: true
    });
}
global.Image = ImageSimulado;
global.window.Image = ImageSimulado;

require('../js/editor.js');
require('../js/preset-manager.js');
const ED = global.window.TextEditor;
const PM = global.window.PresetManager;
// --- A: el gradiente del preset carga completo (no blanco) -------------------
(function () {
    const fs = require('node:fs');
    const path = require('node:path');
    const txmPath = path.resolve(__dirname, '..', '..', '..', 'uploads', 'pmu', 'tm-presets', 'cyber-pop.txm');
    const payload = JSON.parse(fs.readFileSync(txmPath, 'utf8'));
    const merged = PM.settingsFromDelta(payload.settings);
    ED.loadPreset(merged);
    const s = ED.getSettings();
    assert.ok(Array.isArray(s.fill.gradient.colors) && s.fill.gradient.colors.length === 3,
        'fill.gradient.colors debe copiarse al cargar (antes quedaba vacio): ' + JSON.stringify(s.fill.gradient && s.fill.gradient.colors));
    assert.equal(s.fill.gradient.colors[0].color, '#00e5ff', 'el primer stop conserva su color');
    const capas = ED.getFillLayers(s);
    assert.ok(capas && capas.length && capas[0].styles && capas[0].styles.length, 'hay capa de relleno');
    assert.equal(capas[0].styles[0].type, 'gradient',
        'la capa migrada es de GRADIENTE, no el fallback de color blanco (antes cargaba color plano)');
    assert.ok(Array.isArray(capas[0].styles[0].gradient.colors) && capas[0].styles[0].gradient.colors.length === 3,
        'la capa lleva los 3 stops del gradiente');
})();

// --- B: refs numericas NUNCA se piden como URL relativa ---------------------
(function () {
    const s = ED.createDefaultSettings();
    s.canvas.width = 300; s.canvas.height = 150;
    s.background.fill.image.active = true;
    s.background.fill.image.src = 6;               // id numerico
    s.icon.active = true;
    s.icon.src = 6;                                // id numerico
    s.fill.texture.active = true;
    s.fill.texture.src = 6;                        // id numerico legacy
    s.fill.layers = [{
        active: true, alpha: 1, repeat: 'letter',
        styles: [{ type: 'texture', texture: { src: 6, repeat: 'repeat' } }]
    }];
    srcsDeImage.length = 0;
    const principal = makeCanvas(300, 150, 'principal');
    ED.renderToCanvas(principal, s);
    const relativas = srcsDeImage.filter(function (v) { return !/^(https?:|data:|blob:)/i.test(v); });
    assert.deepEqual(relativas, [],
        'ningun cargador debe pedir una ref numerica como URL relativa (404 .../textmuy/6): ' + JSON.stringify(relativas));

    // El id escrito como STRING numerica tambien se omite (RC32/RC68).
    const s2 = ED.createDefaultSettings();
    s2.canvas.width = 300; s2.canvas.height = 150;
    s2.background.fill.image.active = true;
    s2.background.fill.image.src = '6';
    srcsDeImage.length = 0;
    ED.renderToCanvas(makeCanvas(300, 150, 'principal'), s2);
    const relativas2 = srcsDeImage.filter(function (v) { return !/^(https?:|data:|blob:)/i.test(v); });
    assert.deepEqual(relativas2, [],
        'el id numerico-STRING tampoco se pide como URL relativa: ' + JSON.stringify(relativas2));

    // Una URL real SI se carga (el guard no sobre-bloquea).
    const s3 = ED.createDefaultSettings();
    s3.canvas.width = 300; s3.canvas.height = 150;
    s3.background.fill.image.active = true;
    s3.background.fill.image.src = 'https://test/img/fondo.webp';
    srcsDeImage.length = 0;
    ED.renderToCanvas(makeCanvas(300, 150, 'principal'), s3);
    assert.ok(srcsDeImage.indexOf('https://test/img/fondo.webp') >= 0,
        'una URL real sigue cargandose: ' + JSON.stringify(srcsDeImage));
})();

console.log('OK: carga-gradient-imgrefs.test.js (gradiente copiado al cargar + refs numericas sin 404)');
