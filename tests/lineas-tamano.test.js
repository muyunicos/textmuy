/* 002-text-tab D1 — US6: dimensionamiento relativo en cascada.
 *
 * Fija R-L2.1 a R-L2.5 (contrato lineas.md):
 *   - `sizing` vive DENTRO de cada linea: {ref:'canvas'|'linea', mode, pct}
 *     (el `sizing` global anterior, de una sola referencia, desaparece);
 *   - el porcentaje se aplica sobre el tamano YA RESUELTO de la referencia, en
 *     cascada: si L1 crece, L2 al 80% crece con ella y L3 sigue a L2
 *     (FR-011, SC-007);
 *   - la dimension va DESPUES de mezclar (R-L1.1): el % se calcula sobre el
 *     tamano ya mezclado de la referencia.
 *
 * `resolveLine` resuelve la regla con referencia a OTRA LINEA (es pura, sin
 * canvas). La regla con referencia al canvas necesita el area util y se aplica
 * en `lineFontSizes`, que es el camino real del pintado: las dos se comprueban.
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
assert.equal(typeof TextEditor.lineFontSizes, 'function', 'lineFontSizes debe estar expuesta');

// Contexto minimo: measureText coherente con el px del ctx.font.
function ctxFalso() {
    return {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        measureText: function (t) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return {
                width: String(t).length * px,
                actualBoundingBoxAscent: px * 0.8,
                actualBoundingBoxDescent: px * 0.2
            };
        }
    };
}

function base() {
    const s = TextEditor.createDefaultSettings();
    s.font.size = 100;
    s.font.weight = 'normal';
    s.canvas.maxFontSize = 100;
    return s;
}
function tamanoDe(resuelta) { return resuelta.font.size; }

// --- Sin sizing, cada linea conserva el tamano de la base -------------------
const s0 = base();
assert.equal(tamanoDe(TextEditor.resolveLine(s0, 1)), 100, 'sin sizing, L1 = base');
assert.equal(tamanoDe(TextEditor.resolveLine(s0, 2)), 100, 'sin sizing, L2 = base');
assert.deepEqual(TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s0, 100), [100, 100],
    'sin reglas, todas las lineas al tamano del ajuste');

// --- Regla con referencia al CANVAS (fase 1 por linea, R-L2.1) --------------
const s1 = base();
s1.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'canvas', pct: 80 } } } };
const t1 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s1, 100);
assert.ok(Math.abs(t1[1] - 80) <= 1, 'L2 al 80% del tamano del ajuste (got ' + t1[1] + ')');
assert.ok(Math.abs(t1[0] - 100) <= 1, 'L1 no se toca (got ' + t1[0] + ')');

// --- Cascada: L2 al 80% de L1, L3 al 50% de L2 -----------------------------
const s2 = base();
s2.lines = {
    activeTarget: 'all',
    inherit: {},
    line: {
        '1': { sizing: { ref: 'canvas', pct: 100 } },
        '2': { sizing: { ref: 'linea', pct: 80, refLine: 1 } },
        '3': { sizing: { ref: 'linea', pct: 50, refLine: 2 } }
    }
};
// El estado guarda la REGLA, no un tamano absoluto (RC59): por eso
// `resolveLine` no calcula el tamano. La cascada se verifica donde se aplica,
// en `lineFontSizes` (el camino real del render).
assert.equal(s2.lines.line['2'].sizing.pct, 80, 'L2 guarda la regla: 80% de L1');
const resuelta2 = TextEditor.resolveLine(s2, 2);
// `sizing` es metadato: no viaja al estilo resuelto, y sobre todo NO deja un
// `font.size` absoluto inventado (era lo que agrandaba las tres lineas).
assert.equal(resuelta2.sizing, undefined, 'la regla no se mezcla en el estilo resuelto');
assert.equal(tamanoDe(resuelta2), 100,
    'y el tamaño NO se inventa aqui: lo decide el render (got ' + tamanoDe(resuelta2) + ')');

const t2c = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B', 'C'], 800, 600, s2, 100);
assert.ok(Math.abs(t2c[1] - 80) <= 1, 'el render pinta L2 al 80% de L1 (got ' + t2c[1] + ')');
assert.ok(Math.abs(t2c[2] - 40) <= 1, 'y L3 al 50% de L2, en cascada (got ' + t2c[2] + ')');

// --- La cascada propaga: agrandar L1 mantiene el 80% exacto (SC-007) -------
const s3 = base();
s3.lines = {
    activeTarget: 'all',
    inherit: {},
    line: { '2': { sizing: { ref: 'linea', pct: 80, refLine: 1 } } }
};
s3.lines.line['1'] = { sizing: { ref: 'canvas', pct: 60 } };
const antes = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s3, 100);
s3.lines.line['1'] = { sizing: { ref: 'canvas', pct: 100 } };
const despues = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s3, 100);
assert.ok(Math.abs(antes[1] - 48) <= 1, 'con L1 al 60%, L2 queda en 48 (60% * 80%), got ' + antes[1]);
assert.ok(Math.abs(despues[1] - 80) <= 1, 'con L1 al 100%, L2 queda en 80, got ' + despues[1]);
// --- Un font.size en px SUSTITUYE a la regla (R-L2.3) ------------------------
const s4 = base();
s4.lines = {
    activeTarget: 'all',
    inherit: {},
    line: { '2': { font: { size: 33 }, sizing: { ref: 'canvas', pct: 80 } } }
};
const t4 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s4, 100);
assert.equal(t4[1], 33,
    'un tamano en px escrito a mano gana sobre el porcentaje (no se combinan), got ' + t4[1]);

// --- Referencia a una linea que no existe (R-L2.5) --------------------------
const s5 = base();
s5.lines = {
    activeTarget: 'all',
    inherit: {},
    line: { '2': { sizing: { ref: 'linea', pct: 60, refLine: 3 } } }
};
let t5 = null;
assert.doesNotThrow(function () {
    t5 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s5, 100);
}, 'una referencia a una linea que no existe no rompe el pintado');
assert.ok(t5 && t5[1] > 0 && t5[1] <= 100,
    'y la linea usa lo guardado o lo de All, sin dispararse (got ' + t5[1] + ')');

console.log('lineas tamano: OK - sizing por linea, cascada de porcentajes y px que sustituye a la regla');