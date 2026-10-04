/* 002-text-tab US1 (P1) - sin WebGL: la API rechaza, el editor degrada.
 *
 * Fija contracts/curva.md R-C2:
 *   - R-C2.1 en la ruta headless (API), sin WebGL, el render RECHAZA con causa
 *     y NO usa el fallback 2D (constitucion II: sin degradacion silenciosa);
 *   - R-C2.2 en el editor visible se conserva el fallback 2D.
 *
 * Node no tiene WebGL: se fuerza document.createElement para que getContext
 * devuelva null siempre, que es exactamente el caso "sin WebGL".
 */
const assert = require('node:assert/strict');

function makeCtx2D() {
    return {
        drawImage: function () {}, setTransform: function () {},
        save: function () {}, restore: function () {},
        clearRect: function () {}, translate: function () {}, scale: function () {}, rotate: function () {},
        fillRect: function () {}, strokeRect: function () {}, fillText: function () {}, strokeText: function () {},
        beginPath: function () {}, moveTo: function () {}, lineTo: function () {}, arc: function () {},
        closePath: function () {}, fill: function () {}, stroke: function () {}, clip: function () {},
        rect: function () {}, quadraticCurveTo: function () {}, bezierCurveTo: function () {},
        measureText: function () { return { width: 40, actualBoundingBoxAscent: 30, actualBoundingBoxDescent: 8 }; },
        getImageData: function () {
            // Un unico pixel opaco: trimTransparent debe encontrar contenido,
            // que es lo que dispara la curva. Sin esto el recorte devuelve
            // null y la ruta de la curva no llega a evaluarse.
            const data = new Uint8ClampedArray(4);
            data[3] = 255;
            return { data: data, width: 1, height: 1 };
        },
        putImageData: function () {}, createImageData: function () { return { data: new Uint8ClampedArray(4) }; },
        fillStyle: '', strokeStyle: '', font: '', textBaseline: '', textAlign: '',
        lineWidth: 0, lineJoin: '', miterLimit: 0, globalCompositeOperation: '',
        filter: '', globalAlpha: 1, shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        createLinearGradient: function () { return { addColorStop: function () {} }; },
        createRadialGradient: function () { return { addColorStop: function () {} }; },
        createPattern: function () { return null; }
    };
}

function makeCanvas(sinWebGL) {
    return {
        width: 0, height: 0, style: {},
        getContext: function (tipo) {
            if (tipo === '2d') return makeCtx2D();
            if (sinWebGL) return null;
            return { getParameter: function () { return 8192; } };
        }
    };
}

const SIN_WEBGL = { valor: true };
global.document = {
    createElement: function (tag) {
        return tag === 'canvas' ? makeCanvas(SIN_WEBGL.valor) : {};
    }
};

const DistortEngine = require('../js/effects/distort-engine.js');
const engine = new DistortEngine();

// editor.js referencia la global `DistortEngine` (en el navegador los scripts
// son globales; en CommonJS hay que exponerla a mano).
global.DistortEngine = DistortEngine;

function fuente() {
    const c = makeCanvas(SIN_WEBGL.valor);
    c.width = 240;
    c.height = 60;
    return c;
}

// El curve() del editor mantiene el fallback 2D cuando no hay WebGL (R-C2.2).
const conFallback = engine.curve(fuente(), 120);
assert.ok(conFallback, 'el editor visible debe poder curviar con el fallback 2D');

// R-C2.1: el mismo engine, en modo salida, NO degrada: devuelve null para que
// el llamador rechace con causa.
const enSalida = engine.curve(fuente(), 120, { requireWebGL: true });
assert.equal(enSalida, null,
    'con requireWebGL (ruta de salida) la curva debe fallar, no degradar al fallback 2D');


// La API debe rechazar con causa antes de intentar renderizar (Const. II,
// H-006). El mensaje nombra WebGL de forma explicita y no sustituye nada.
global.window = {};
global.document.fonts = { add: function () {}, load: function () { return Promise.resolve([]); } };
global.document.head = { appendChild: function () {} };
global.document.getElementsByTagName = function () { return [{ appendChild: function () {} }]; };
global.document.getElementById = function () { return null; };
global.document.querySelector = function () { return null; };
global.document.querySelectorAll = function () { return []; };
global.document.addEventListener = function () {};
global.document.dispatchEvent = function () {};
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add: function () {} }); }; };
global.window.FontFace = global.FontFace;
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
global.fetch = function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve({}); } }); };

require('../js/catalog.js');
require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/fonts.js');
require('../js/export.js');
require('../js/api.js');

const TextEditor = global.window.TextEditor;
assert.equal(typeof TextEditor.renderToCanvas, 'function', 'renderToCanvas debe existir');

function settingsConCurva(angulo) {
    const s = TextEditor.createDefaultSettings();
    s.text = 'HOLA';
    s.distort = { arc: { angle: angulo } };
    return s;
}
function lienzo() {
    return { width: 200, height: 120, style: {}, getContext: function () { return makeCtx2D(); } };
}

// Con angulo 0 la salida no toca WebGL: via rapida, sin rechazo.
const salida = TextEditor.renderToCanvas(lienzo(), settingsConCurva(0), { transparent: true });
assert.ok(salida, 'con angulo 0 la salida no falla (via rapida, sin WebGL)');

// Con curva y sin WebGL, la ruta de SALIDA debe rechazar con causa (R-C2.1).
assert.throws(function () {
    TextEditor.renderToCanvas(lienzo(), settingsConCurva(120), { transparent: true });
}, /curva:webgl/, 'la ruta de salida debe rechazar con causa la curva sin WebGL');

// Y el estado del editor debe quedar limpio tras el rechazo: si isRendering
// quedara en true, el siguiente render no se ejecutaria nunca.
const despues = TextEditor.renderToCanvas(lienzo(), settingsConCurva(0), { transparent: true });
assert.ok(despues, 'tras un rechazo el editor debe volver a renderizar');
require('../js/api.js');

const TextMuyAPI = global.window.TextMuyAPI;
assert.ok(TextMuyAPI, 'TextMuyAPI debe estar expuesta');
assert.equal(typeof TextMuyAPI.renderTextToPNG, 'function');

const params = { text: 'HOLA', settings: { canvas: { width: 200, height: 120 }, font: { size: 40 } } };

return TextMuyAPI.renderTextToPNG(params).then(function () {
    assert.fail('sin WebGL la API debe rechazar, no devolver un PNG');
}, function (e) {
    const msg = String((e && e.message) || e);
    assert.ok(/render:webgl/.test(msg), 'el fallo debe nombrar WebGL (got: ' + msg + ')');
    assert.ok(/no_disponible/.test(msg), 'el fallo debe traer la causa (got: ' + msg + ')');
    // Sin sustitucion: el rechazo ocurre antes de producir ninguna imagen y el
    // motivo explica que la API exige WebGL (no hay fallback silencioso).
    assert.ok(/requiere WebGL/.test(msg), 'el motivo debe explicar la exigencia (got: ' + msg + ')');
    assert.ok(!/fallback/i.test(msg), 'no debe ofrecer fallback en la ruta headless');
    console.log('curva sin WebGL: OK - la API rechaza con causa y el editor conserva el fallback 2D');
});
