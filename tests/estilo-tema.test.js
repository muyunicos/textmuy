/* 002-text-tab — EL TEXTO ES UNA MUESTRA, NO EL CONTENIDO FINAL.
 *
 * La herramienta sirve para diseñado un estilo. El texto del cuadro es una
 * muestra; lo que viaja al PDF es el texto que escribe el cliente, que puede
 * ser largo, de una o de varias lineas, y en general DISTINTO del que se uso
 * para diseñado. Nunca se habia probado ese recorrido: todas las pruebas usaban
 * el mismo texto para diseñado y para renderizar, asi que un estilo que solo
 * funciona con su texto de muestra pasaba inadvertido.
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
// El motor usa `ctx.canvas` (tamano real del lienzo) en algunos motores, asi
// que el stub debe exponerlo como el navegador.
global.__lienzoActual = { width: 600, height: 400 };
function ctx2D() {
    const noop = function () {};
    const ctx = {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
        clearRect: noop, fillRect: noop, strokeRect: noop, drawImage: noop,
        fillText: noop, strokeText: noop,
        beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop,
        fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
        // El motor espeja la transformacion actual en la capa del contorno.
        getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
        measureText: function (text) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return {
                width: String(text).length * px * 0.55,
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
        toBlob: function (cb) { cb({ stub: true }); }
    };
    ctx.canvas = global.__lienzoActual;
    return ctx;
}
global.document = {
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
    dispatchEvent: function () {},
    fonts: { add: function () {}, load: function () { return Promise.resolve([]); } }
};
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add: function () {} }); }; };
global.window.FontFace = global.FontFace;
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };

require('../js/editor.js');
require('../js/preset-manager.js');

const TextEditor = global.window.TextEditor;
const PresetManager = global.window.PresetManager;
assert.ok(TextEditor && PresetManager, 'editor y PresetManager expuestos');

// --- El ESTILO se diseña con un texto de muestra -----------------------------
// Un estilo compuesto: fuente por linea, outline, depth 3D y herencia.
const muestra = 'TOY\nSTORY';
const estilo = TextEditor.createDefaultSettings();
estilo.canvas.width = 600;
estilo.canvas.height = 400;
estilo.font = { src: 1, size: 100, weight: 'normal' };
estilo.lineHeight = 1.1;
estilo.fill.color = { r: 255, g: 255, b: 255 };
estilo.outline.first.active = true;
estilo.outline.first.width = 6;
estilo.depth.active = true;
estilo.depth.length = 12;
estilo.lines = {
    activeTarget: 'all',
    inherit: { '3': 'L2' },
    line: {
        '1': { font: { src: 1 } },
        '2': { font: { src: 2 }, outline: { first: { width: 10 } } },
        '3': { font: { src: 3 } }
    }
};
estilo.text = muestra;

// Guardar el preset: delta contra los defaults (constitucion IV).
const delta = PresetManager.diffSettings(TextEditor.createDefaultSettings(), estilo);
assert.ok(delta && delta.lines && delta.lines.line['2'], 'el preset guarda el estilo por linea');
assert.equal(delta.text, muestra, 'el texto de muestra tambien viaja (el cliente lo reemplaza)');

// --- El CLIENTE escribe OTRO texto y recibe el mismo estilo ------------------
// Esta es la parte que nunca se habia probado.
function aplicar(textoCliente) {
    const s = PresetManager.settingsFromDelta(JSON.parse(JSON.stringify(delta)));
    s.text = textoCliente;
    global.__lienzoActual = { width: s.canvas.width, height: s.canvas.height };
    const lienzo = {
        width: s.canvas.width, height: s.canvas.height, style: {},
        getContext: function () { return ctx2D(); }
    };
    return TextEditor.renderToCanvas(lienzo, s, { transparent: true });
}

// 1. Una sola linea larga: el estilo completo, una linea.
assert.doesNotThrow(function () { aplicar('PALABRA MUY LARGA DE UNA SOLA LINEA'); },
    'el cliente con una sola linea larga no debe fallar');

// 2. Tres lineas cortas: se aplica lo configurado en L1/L2/L3 al diseñado.
const tres = PresetManager.settingsFromDelta(JSON.parse(JSON.stringify(delta)));
tres.text = 'UNO\nDOS\nTRES';
assert.equal(TextEditor.resolveLine(tres, 2).font.src, 2,
    'L2 conserva su fuente aunque el texto de muestra tuviera 2 lineas');
assert.equal(TextEditor.resolveLine(tres, 3).font.src, 3,
    'L3 tambien, aunque no estuviera en el texto de muestra (FR-015)');
assert.equal(TextEditor.resolveLine(tres, 3).outline.first.width, 10,
    'L3 hereda de L2: hereda tambien su outline');
assert.doesNotThrow(function () { aplicar('UNO\nDOS\nTRES'); }, 'el render con 3 lineas no falla');

// 3. Cuatro lineas: L4 no es direccionable y resuelve como All.
const cuatro = PresetManager.settingsFromDelta(JSON.parse(JSON.stringify(delta)));
cuatro.text = 'UNO\nDOS\nTRES\nCUATRO';
assert.equal(TextEditor.resolveLine(cuatro, 4).font.src, 1,
    'L4 resuelve como All: hereda la fuente de la base');
assert.doesNotThrow(function () { aplicar('UNO\nDOS\nTRES\nCUATRO'); },
    'con cuatro lineas el render no falla');

// 4. Textos muy distintos: vacio, minimo, multiples, con acentos.
['', 'X', 'UN\nDOS\nTRES\nCUATRO\nQUINTO\nSEXTO',
    'Ñandú ÁÉÍÓÚ con acentos y eñes',
    'UNA FRASE MUY LARGA QUE NO ENTRA NI EN UNA LINEA NI EN TRES'
].forEach(function (t) {
    assert.doesNotThrow(function () { aplicar(t); },
        'el cliente con ' + JSON.stringify(t.slice(0, 22)) + ' no debe fallar');
});

// 5. El estilo sobrevive al viaje completo: guardar -> cargar -> otro texto.
const reCargado = PresetManager.settingsFromDelta(delta);
reCargado.text = 'TEXTO DEL CLIENTE';
assert.equal(reCargado.outline.first.width, 6, 'el outline del estilo sobrevive al round-trip');
assert.equal(reCargado.depth.length, 12, 'el depth 3D tambien');
assert.equal(reCargado.font.src, 1, 'la fuente base del estilo tambien');

// Convencion de las suites (AGENTS.md §9): cada una anuncia su OK, asi el
// runner que frena en la primera que falla deja rastro de cual corrio.
console.log('estilo-tema: OK - el estilo disenado con una muestra se aplica a CUALQUIER texto');

