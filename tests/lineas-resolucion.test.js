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
global.document = {
    createElement: function () { return { width: 0, height: 0, style: {}, getContext: function () { return {}; } }; },
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
assert.notEqual(r6.lineHeight, 9, 'lineHeight es global del bloque');
assert.notEqual(r6.rotate, 45, 'rotate es global hasta el spec de R9');
assert.equal(r6.canvas.width, s6.canvas.width, 'Canvas Size es global');

// --- alineacion y espaciado SI pasan a ser por linea -------------------------
const s7 = base();
s7.align = 'center';
s7.letterSpacing = 0;
s7.lines = { activeTarget: 'all', inherit: {}, line: { '2': { align: 'right', letterSpacing: 5 } } };
const r7 = TextEditor.resolveLine(s7, 2);
assert.equal(r7.align, 'right', 'align por linea');
assert.equal(r7.letterSpacing, 5, 'letterSpacing por linea');
assert.equal(TextEditor.resolveLine(s7, 1).align, 'center', 'L1 conserva el align de la base');

console.log('lineas resolucion: OK - heredar -> mezclar -> dimensionar, claves 1-based, target no filtra');