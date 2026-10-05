/* 002-text-tab D1 — US6: resolucion de linea en tres pasos (contrato lineas.md).
 *
 * Fija R-L1.1 a R-L1.5 y el alcance de contracts/lineas.md §4:
 *   - el orden es fijo: heredar -> mezclar lo propio -> dimensionar (R-L1.1);
 *   - heredar de ALL parte de la base; heredar de otra linea parte de su
 *     estilo RESUELTO (R-L1.2);
 *   - los ajustes propios son delta disperso (R-L1.3);
 *   - las claves de linea son 1-based: line["1"] = L1 (FR-019);
 *   - el target activo NO participa en la resolucion (R-L1.5, FR-009).
 */
const assert = require('node:assert/strict');

global.window = {};
// Contexto 2D minimo que REGISTRA la Y de cada texto pintado: permite
// comprobar que se pintan TODAS las lineas y cada una en su baseline.
global.__pintadas = null;
function makeCtx2D() {
    const registro = global.__pintadas;
    const noop = function () {};
    return {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
        clearRect: noop, fillRect: noop, strokeRect: noop, drawImage: noop,
        fillText: function (ch, x, y) { if (registro) registro.push(y); },
        strokeText: function (ch, x, y) { if (registro) registro.push(y); },
        beginPath: noop, moveTo: noop, lineTo: noop,
        arc: noop, closePath: noop, fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
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
        createPattern: function () { return null; }
    };
}

global.document = {
    createElement: function () {
        const c = { width: 0, height: 0, style: {} };
        c.getContext = function () { return makeCtx2D(); };
        return c;
    },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
require('../js/editor.js');

const TextEditor = global.window.TextEditor;
assert.equal(typeof TextEditor.resolveLine, 'function', 'resolveLine debe estar expuesta');

// Base minima: el color de relleno identifica el estilo resultante.
function base() {
    const s = TextEditor.createDefaultSettings();
    s.fill.color = { r: 10, g: 20, b: 30 };
    s.font.size = 100;
    s.font.weight = 'normal';
    s.outline.first.width = 0;
    return s;
}
function colorDe(s) {
    return s.fill.color.r + '/' + s.fill.color.g + '/' + s.fill.color.b;
}

// --- Sin configuracion por linea, todo resuelve como All ---------------------
const s0 = base();
assert.equal(colorDe(TextEditor.resolveLine(s0, 1)), '10/20/30', 'L1 sin nada propio = base');
assert.equal(colorDe(TextEditor.resolveLine(s0, 2)), '10/20/30', 'L2 sin nada propio = base');
assert.equal(colorDe(TextEditor.resolveLine(s0, 3)), '10/20/30', 'L3 sin nada propio = base');
assert.equal(colorDe(TextEditor.resolveLine(s0, 9)), '10/20/30', 'una linea fuera de rango resuelve como All');

// --- Delta disperso (R-L1.3): solo cambia la ruta presente --------------------
const s1 = base();
s1.lines = { activeTarget: 'all', inherit: {}, line: { '2': { fill: { color: { r: 200, g: 0, b: 0 } } } } };
const r2 = TextEditor.resolveLine(s1, 2);
assert.equal(colorDe(r2), '200/0/0', 'L2 toma su propio color');
assert.equal(r2.font.size, 100, 'lo ausente del delta conserva la base');
assert.equal(r2.outline.first.width, 0, 'una rama del delta no toca las otras');
assert.equal(colorDe(TextEditor.resolveLine(s1, 1)), '10/20/30', 'L1 intacta');
assert.equal(colorDe(TextEditor.resolveLine(s1, 3)), '10/20/30', 'L3 intacta');

// --- 1-based (FR-019): line["0"] NO existe ------------------------------------
const s2 = base();
s2.lines = { activeTarget: 'all', inherit: {}, line: { '0': { fill: { color: { r: 1, g: 1, b: 1 } } } } };
assert.equal(colorDe(TextEditor.resolveLine(s2, 1)), '10/20/30', 'la clave "0" es la linea 1 y no existe en el formato');
assert.equal(colorDe(TextEditor.resolveLine(s2, 2)), '10/20/30', 'la clave "0" no configura L2');

// --- Herencia de ALL explicita (R-L1.2) -------------------------------------
const s3 = base();
s3.fill.color = { r: 50, g: 50, b: 50 };
s3.lines = {
    activeTarget: 'all',
    inherit: { '2': 'ALL' },
    line: { '2': { fill: { color: { r: 1, g: 2, b: 3 } } } }
};
assert.equal(colorDe(TextEditor.resolveLine(s3, 2)), '1/2/3', 'heredar de ALL + ajuste propio: gana lo propio');

// --- Herencia de OTRA LINEA (R-L1.2): parte del estilo RESUELTO --------------
// L3 hereda de L2, que a su vez hereda de ALL y tiene su propio color.
const s4 = base();
s4.lines = {
    activeTarget: 'all',
    inherit: { '3': 'L2' },
    line: {
        '2': { fill: { color: { r: 7, g: 7, b: 7 } }, outline: { first: { width: 9 } } },
        '3': { font: { size: 55 } }
    }
};
const r3 = TextEditor.resolveLine(s4, 3);
assert.equal(colorDe(r3), '7/7/7', 'L3 toma el color de L2 por herencia');
assert.equal(r3.outline.first.width, 9, 'y tambien sus otros ajustes');
assert.equal(r3.font.size, 55, 'su propio ajuste de tamano manda sobre lo heredado');

// --- El target activo NO filtra (R-L1.5 / FR-009) ---------------------------
const s5 = base();
s5.lines = {
    activeTarget: 'L2',
    inherit: {},
    line: { '1': { fill: { color: { r: 11, g: 0, b: 0 } } } }
};
assert.equal(colorDe(TextEditor.resolveLine(s5, 1)), '11/0/0',
    'con el target en L2, lo configurado en L1 SIGUE aplicandose: el tab solo indica que se edita');

// --- Alcance: las rutas globales nunca entran en el delta de linea (R-L4.1) ----
const s6 = base();
s6.lines = {
    activeTarget: 'L1',
    inherit: {},
    line: { '1': { text: 'TEXTO PROHIBIDO', lineHeight: 9, rotate: 45, canvas: { width: 999 } } }
};
const r6 = TextEditor.resolveLine(s6, 1);
assert.equal(r6.text, s6.text, 'el texto es global: el delta de linea no lo cambia');
assert.equal(r6.lineHeight, 9, 'lineHeight es POR LINEA (FR-016)');
assert.equal(r6.rotate, s6.rotate, 'rotate sigue global hasta el bloque D4');
assert.equal(r6.canvas.width, s6.canvas.width, 'Canvas Size es global');

// Line height por linea: L2 manda sin tocar L1 ni L3.
const sLh = base();
sLh.text = 'UNO\nDOS\nTRES';
sLh.lineHeight = 0;
sLh.lines = { activeTarget: 'all', inherit: {}, line: { '2': { lineHeight: 200 } } };
assert.equal(TextEditor.resolveLine(sLh, 1).lineHeight, 0, 'L1 usa el valor de la base');
assert.equal(TextEditor.resolveLine(sLh, 2).lineHeight, 200, 'L2 con valor propio');
assert.equal(TextEditor.resolveLine(sLh, 3).lineHeight, 0, 'L3 vuelve a la base');

// --- alineacion y espaciado SI pasan a ser por linea -------------------------
const s7 = base();
s7.align = 'center';
s7.letterSpacing = 0;
s7.lines = { activeTarget: 'all', inherit: {}, line: { '2': { align: 'right', letterSpacing: 5 } } };
const r7 = TextEditor.resolveLine(s7, 2);
assert.equal(r7.align, 'right', 'align por linea');
assert.equal(r7.letterSpacing, 5, 'letterSpacing por linea');
assert.equal(TextEditor.resolveLine(s7, 1).align, 'center', 'L1 conserva el align de la base');

// --- El pintado por linea debe pintar TODAS las lineas ------------------------
// El recorrido integrado en WordPress (Chrome real, capturas) showed que con
// tres lineas configuradas solo se pintaba L1: `forEachLineSetting` pasaba un
// array de UNA linea con el indice global como filtro, y en `drawTextLines` el
// filtro nunca coincidia para L2/L3 (medido: el lienzo mostraba solo "UNO").
const registro = [];
global.__pintadas = registro;
const lienzo = { width: 480, height: 320, style: {}, getContext: function () { return makeCtx2D(); } };
const sMulti = base();
sMulti.text = 'UNO\nDOS\nTRES';
sMulti.canvas.width = 480;
sMulti.canvas.height = 320;
sMulti.font = { src: 1, size: 80, weight: 'normal' };
sMulti.lines = {
    activeTarget: 'all',
    inherit: {},
    line: {
        '1': { fill: { layers: [{ id: 'A', repeat: 'none', alpha: 1, styles: [{ type: 'color', color: '#ffffff' }] }] } },
        '2': { fill: { layers: [{ id: 'B', repeat: 'none', alpha: 1, styles: [{ type: 'color', color: '#ffffff' }] }] } },
        '3': { fill: { layers: [{ id: 'C', repeat: 'none', alpha: 1, styles: [{ type: 'color', color: '#ffffff' }] }] } }
    }
};
TextEditor.renderToCanvas(lienzo, sMulti, { transparent: true });
const unicas = [];
registro.forEach(function (y) { if (unicas.indexOf(y) === -1) unicas.push(y); });
unicas.sort(function (a, b) { return a - b; });
assert.equal(unicas.length, 3,
    'con estilo por linea deben pintarse LAS TRES lineas (got ' + unicas.length + ' baselines: ' + unicas.join(',') + ')');
assert.ok(unicas[2] > unicas[1] && unicas[1] > unicas[0], 'y cada una en su baseline');

// --- "Max Font Size": global en All, de la linea activa con L1/L2/L3 --------
// Decision del usuario (2026-10-04). El valor SIEMPRE es un PORCENTAJE relativo:
// el canvas es dinamico (500 px o 5000 px) y el texto debe seguir al tamano que
// necesite el cliente, nunca a pixeles fijos.
const sMax = base();
sMax.text = 'UNO\nDOS\nTRES';
sMax.canvas.maxFontSize = 100;
assert.equal(TextEditor.isGlobalPath('canvas'), true, 'Canvas Size sigue siendo global');
assert.equal(TextEditor.isGlobalPath('canvas.width'), true, 'el ancho del lienzo es global');
assert.equal(TextEditor.isGlobalPath('canvas.height'), true, 'el alto del lienzo es global');
assert.equal(TextEditor.isGlobalPath('canvas.maxFontSize'), false,
    'EXCEPCION: el tope de tamano puede ser por linea');
assert.equal(TextEditor.isGlobalPath('canvas.zoom'), true, 'el zoom es global');

// Con linea activa, un tope por linea NO se pisa con el de la base.
sMax.lines = {
    activeTarget: 'all', inherit: {},
    line: { '2': { canvas: { maxFontSize: 50 } } }
};
assert.equal(TextEditor.resolveLine(sMax, 1).canvas.maxFontSize, 100,
    'L1 sin tope propio usa el global');
assert.equal(TextEditor.resolveLine(sMax, 2).canvas.maxFontSize, 50,
    'L2 con tope propio manda sobre el global');
assert.equal(TextEditor.resolveLine(sMax, 3).canvas.maxFontSize, 100,
    'L3 sin tope propio vuelve al global');

// Y sin ninguna regla por linea, `lineFontSizes` deja el tamano que le pasa
// `render()` (que ya viene con el tope GLOBAL aplicado aguas arriba).
const sinReglas = base();
sinReglas.text = 'UNO';
sinReglas.font.size = 100;
sinReglas.canvas.maxFontSize = 5;
sinReglas.lines = { activeTarget: 'all', inherit: {}, line: {} };
const t2 = TextEditor.lineFontSizes(makeCtx2D(), ['UNO'], 1000, 800, sinReglas, 40);
assert.equal(t2[0], 40, 'sin reglas por linea no se toca el tamano (el global ya lo aplico render())');

// El tope por linea manda sobre la linea y solo sobre ella: L1 con tope 10%
// queda por debajo de una base sin tope, y L3 (sin tope propio) sigue en su
// tamano normal.
const conTopeAlto = base();
conTopeAlto.text = 'UNO\nDOS\nTRES';
conTopeAlto.font.size = 100;
conTopeAlto.canvas.maxFontSize = 100;                 // tope global: no limita
conTopeAlto.lines = {
    activeTarget: 'all', inherit: {},
    line: { '1': { canvas: { maxFontSize: 10 } } }    // L1 al 10% -> tope de 80 px
};
const t3 = TextEditor.lineFontSizes(makeCtx2D(), ['UNO', 'DOS', 'TRES'], 1000, 800, conTopeAlto, 100);
assert.ok(t3[0] < 100, 'L1 con tope propio queda por debajo (got ' + t3[0] + ')');
assert.ok(t3[1] >= 100, 'L2 sin tope propio NO se ve afectada (got ' + t3[1] + ')');

// El tope por linea manda SOLO sobre esa linea: es una fraccion de SU PROPIO
// tamano base, no del lado del lienzo. Antes se media contra el lado del lienzo
// (320 px), asi que un tope del 50% (=160) nunca llegaba a afectar un tamano de
// 115 y el control no hacia nada (medido en el laboratorio).
assert.equal(t3[0], 10, 'L1 al 10% queda en el 10% de su tamano base (got ' + t3[0] + ')');
assert.equal(t3[1], 100, 'L2 sin tope propio NO se ve afectada (got ' + t3[1] + ')');
assert.equal(t3[2], 100, 'L3 tampoco (got ' + t3[2] + ')');

// Y sigue siendo RELATIVO: duplicar el tamano base duplica el tope. Nunca un px
// fijo, porque el lienzo es dinamico (500 px o 5000 px).
const t4 = TextEditor.lineFontSizes(makeCtx2D(), ['UNO', 'DOS', 'TRES'], 1000, 800, conTopeAlto, 200);
assert.equal(t4[0], 20, 'con base 200 el tope del 10% da 20, no un px fijo (got ' + t4[0] + ')');
assert.equal(t4[1], 200, 'y L2 sigue sin tope propio (got ' + t4[1] + ')');

console.log('lineas resolucion: OK - heredar -> mezclar -> dimensionar, claves 1-based, target no filtra');