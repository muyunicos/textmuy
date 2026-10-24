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

// --- El tope por linea es % del EJE limitante del area util (2026-10-24) ------
// Ya no es una fraccion de la base: es el MISMO criterio que el global, asi que
// una linea PUEDE superar el tamaño de ALL y el limite lo pone el area.
const s6 = base();
s6.canvas.maxFontSize = 100;
s6.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'canvas', mode: 'fontsize', pct: 150 } } } };
const t6 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s6, 100);
assert.equal(t6[0], 100, 'L1 sigue en el ajuste (got ' + t6[0] + ')');
assert.equal(t6[1], 150, 'L2 al 150% supera a ALL: el limite lo pone el area (got ' + t6[1] + ')');

// Tope por linea contra el EJE (800x600 -> eje 600): 10% = 60 px, y la CASCADA lo
// respeta (antes la pasada 2 lo saltaba: pct>100 con ref:linea esquivaba el techo).
const s7 = base();
s7.lines = { activeTarget: 'all', inherit: {}, line: { '2': { canvas: { maxFontSize: 10 }, sizing: { ref: 'linea', refLine: 1, mode: 'fontsize', pct: 150 } } } };
const t7 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s7, 100);
assert.equal(t7[1], 60, 'el tope mide contra el eje (600 * 10% = 60) y la cascada lo respeta (got ' + t7[1] + ')');

// mode width con ref:canvas: ajusta la linea al ANCHO del area util.
const s9 = base();
s9.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'canvas', mode: 'width', pct: 100 } } } };
const t9 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s9, 100);
assert.equal(t9[1], 500, 'width + canvas: ajusta al ancho del area con el alto restante (600-100) (got ' + t9[1] + ')');

// Fase 2: si la pila no cabe, TODAS se escalan por el mismo factor (ratios intactos).
const s10 = base();
s10.lines = { activeTarget: 'all', inherit: {}, line: {
    '1': { sizing: { ref: 'canvas', mode: 'fontsize', pct: 500 } },
    '2': { sizing: { ref: 'linea', refLine: 1, mode: 'fontsize', pct: 60 } } } };
const t10 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s10, 100);
const ratio10 = t10[0] / t10[1];
assert.ok(Math.abs(ratio10 - (500 / 300)) <= 0.05,
    'la Fase 2 preserva el ratio de la cascada (500/300, got ' + ratio10.toFixed(3) + ')');

// ===== RC78: Proporcion sobre ALL, modo Ancho con `pct` y tope por linea =====
// El defecto que cierran: el panel NO escribia la proporcion (solo el tope), asi que
// "L2 = 50 % de ALL" era inalcanzable, y `mode:'width'` ignoraba el `pct`.

// Proporcional + ref ALL (`canvas`): L2 la MITAD de ALL.
const s11 = base();
s11.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'canvas', mode: 'fontsize', pct: 50 } } } };
const t11 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s11, 100);
assert.equal(t11[1], 50, 'L2 al 50% de ALL (got ' + t11[1] + ')');
assert.equal(t11[0], 100, 'L1 sigue en el tamano de ALL (got ' + t11[0] + ')');

// `ref:'all'` es alias de `ref:'canvas'`: mismo valor, otra etiqueta (el panel dice ALL).
const s11b = base();
s11b.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'all', mode: 'fontsize', pct: 50 } } } };
assert.deepEqual(TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s11b, 100), t11,
    'ref:all y ref:canvas dan el mismo resultado');

// Ancho de tinta con la metrica del ctx falso (len * px por caracter).
function anchoDe(texto, px) {
    const c = ctxFalso();
    c.font = px + 'px sans-serif';
    return c.measureText(texto).width;
}

// Modo Ancho: el `pct` manda sobre el ancho de tinta de la REFERENCIA.
// (a) L1 de 1 caracter: el techo por alto no muerde, asi que se ve el `pct` exacto.
const s12 = base();
s12.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'linea', refLine: 1, mode: 'width', pct: 150 } } } };
const t12 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s12, 100);
const refW12 = anchoDe('A', t12[0]);
assert.ok(Math.abs(anchoDe('B', t12[1]) / (refW12 * 1.5) - 1) <= 0.05,
    'Ancho 150%: el ancho de L2 es 1,5 x el de L1 (L1 ' + refW12 + ' px, L2 ' + anchoDe('B', t12[1]) + ' px)');
assert.notEqual(t12[1], t12[0],
    'y NO copia el tamano de la referencia (RC77 medía el texto propio: got ' + t12[1] + ')');

// Ancho al 50%: la mitad del ancho de la referencia.
const s13 = base();
s13.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'linea', refLine: 1, mode: 'width', pct: 50 } } } };
const t13 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s13, 100);
assert.ok(Math.abs(anchoDe('B', t13[1]) / (refW12 * 0.5) - 1) <= 0.05,
    'Ancho 50%: la mitad del ancho de L1 (L2 ' + anchoDe('B', t13[1]) + ' px)');

// Ancho sin `pct` (presets anteriores) = 100%: retrocompatible (R-L2.7).
const s14 = base();
s14.lines = { activeTarget: 'all', inherit: {}, line: { '2': { sizing: { ref: 'linea', refLine: 1, mode: 'width' } } } };
const t14 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s14, 100);
assert.ok(Math.abs(anchoDe('B', t14[1]) / refW12 - 1) <= 0.05,
    'sin pct, Ancho iguala el ancho de la referencia (got ' + anchoDe('B', t14[1]) + ' px)');

// (b) El ancho objetivo sale del texto de la REFERENCIA, no del propio: L1 es largo
// (12 caracteres al 20% = 240 px) y L2 es "B" -> 150% de 240 = 360 px. Medir el
// propio texto al tamano de la referencia (el defecto de RC77) daria ~20 px.
const s15 = base();
s15.lines = {
    activeTarget: 'all', inherit: {},
    line: {
        '1': { sizing: { ref: 'canvas', mode: 'fontsize', pct: 20 } },
        '2': { sizing: { ref: 'linea', refLine: 1, mode: 'width', pct: 150 } }
    }
};
const t15 = TextEditor.lineFontSizes(ctxFalso(), ['AAAAAAAAAAAA', 'B'], 800, 600, s15, 100);
assert.equal(t15[0], 20, 'L1 resuelve al 20% (got ' + t15[0] + ')');
assert.equal(anchoDe('B', t15[1]), 360,
    'L2 mide 150% del ancho de L1 (240 px), no el tamano de L1 (got ' + anchoDe('B', t15[1]) + ' px)');

// El TOPE por linea es de ESA linea: no toca a ALL (era el defecto reportado:
// "si pongo L2 al 10 % del canvas, ALL se achica").
const s16 = base();
s16.canvas.maxFontSize = 100;
s16.lines = { activeTarget: 'all', inherit: {}, line: { '2': { canvas: { maxFontSize: 10 } } } };
const t16 = TextEditor.lineFontSizes(ctxFalso(), ['A', 'B'], 800, 600, s16, 100);
assert.equal(t16[1], 60, 'L2 topada al 10% del eje (600 * 10% = 60), got ' + t16[1]);
assert.equal(t16[0], 100, 'L1 y ALL conservan su tamano (got ' + t16[0] + ')');

console.log('lineas tamano: OK - proporcional sobre ALL, Ancho con pct, cascada y tope por linea sin tocar a ALL');