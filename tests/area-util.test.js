/* 002-text-tab Bloque B — US3 (P2) y base de la geometria unica.
 *
 * Fija contracts/geometria.md R-G1.4 (area util) y el requisito de que exista
 * UN SOLO calculo:
 *   - el margen se mide contra el LADO MENOR del canvas, no contra el ancho
 *     (con 800x200 el margen por anchura colapsaba al 13%);
 *   - el area util tiene un MINIMO garantizado: con margen al maximo el texto
 *     se achica pero NO desaparece (hoy `avail = canvas - 2*padding` sin tope
 *     llegaba a cero o negativa);
 *   - el ajuste (autoFitText), el render y el tamano por linea usan el MISMO
 *     helper, asi lo calculado es lo pintado (R-G1.1).
 */
const assert = require('node:assert/strict');

global.window = {};
global.document = { createElement: function () { return { width: 0, height: 0, getContext: function () { return {}; } }; } };
require('../js/editor.js');

const TextEditor = global.window.TextEditor;
assert.ok(TextEditor, 'TextEditor debe estar expuesto');
assert.equal(typeof TextEditor.areaUtil, 'function', 'areaUtil debe estar expuesta para tests');

function settings(margen) {
    const s = TextEditor.createDefaultSettings();
    s.canvas.width = 480;
    s.canvas.height = 320;
    s.canvas.padding = margen;
    return s;
}

// --- margen cero: el area util es el lienzo entero --------------------------
const sinMargen = TextEditor.areaUtil(settings(0), 480, 320);
assert.equal(sinMargen.pad, 0, 'margen 0 = sin padding');
assert.equal(sinMargen.width, 480, 'ancho util = ancho del lienzo');
assert.equal(sinMargen.height, 320, 'alto util = alto del lienzo');

// --- margen intermedio: se mide contra el lado MENOR ------------------------
// 480x320 con 25%: el lado menor es 320, pad = 80. Con la formula antigua
// (pad = ancho * margen) el pad seria 120 y el alto util quedaria en 80.
const medio = TextEditor.areaUtil(settings(0.25), 480, 320);
assert.equal(medio.pad, 80, 'el padding se mide contra el lado menor (320 * 25% = 80)');
assert.equal(medio.width, 480 - 160, 'ancho util descontando el padding dos veces');
assert.equal(medio.height, 320 - 160, 'alto util descontando el padding dos veces');

// --- canvas apaisado: el margen NO colapsa antes de tiempo -------------------
// Medido: con 800x200 y margen 13% la formula por anchura daba alto util -8.
const apaisado = TextEditor.areaUtil(settings(0.13), 800, 200);
assert.ok(apaisado.height > 0, 'el alto util nunca llega a cero ni negativo');
assert.equal(apaisado.pad, 200 * 0.13, 'el lado menor (200) manda sobre el ancho (800)');
assert.ok(apaisado.height > 100, 'con 13% de margen el alto util debe seguir siendo amplio (got ' + apaisado.height + ')');

// --- margen al maximo: el texto se achica pero NO desaparece (FR-003) --------
for (const [w, h] of [[480, 320], [800, 200], [200, 800], [1080, 1080], [1600, 400]]) {
    const area = TextEditor.areaUtil(settings(0.5), w, h);
    const minor = Math.min(w, h);
    assert.ok(area.width > 0 && area.height > 0, 'area util positiva en ' + w + 'x' + h);
    assert.ok(area.height >= minor * 0.1, 'alto util minimo garantizado en ' + w + 'x' + h + ' (got ' + area.height + ')');
    assert.ok(area.width >= minor * 0.1, 'ancho util minimo garantizado en ' + w + 'x' + h + ' (got ' + area.width + ')');
    // La caja sigue centrada: el margen se come el mismo a ambos lados.
    assert.equal(w - area.width, 2 * area.pad, 'padding simetrico en ' + w + 'x' + h);
    assert.equal(h - area.height, 2 * area.pad, 'padding simetrico vertical en ' + w + 'x' + h);
}

// --- el area util se estrecha de forma monotona al subir el margen ------------
let previo = TextEditor.areaUtil(settings(0), 480, 320).width;
for (const m of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    const area = TextEditor.areaUtil(settings(m), 480, 320);
    assert.ok(area.width <= previo + 0.001, 'el area util se estrecha al SUBIR el margen');
    previo = area.width;
}
assert.ok(TextEditor.areaUtil(settings(0), 480, 320).width > TextEditor.areaUtil(settings(0.5), 480, 320).width,
    'margen 0 deja mas area util que margen al maximo');

// --- un solo calculo: el helper es el que usan ajuste, render y sizing ------
// El margen nunca debe quedar sin acotar aunque venga fuera de rango.
const fueraDeRango = TextEditor.areaUtil(settings(5), 480, 320);
assert.ok(fueraDeRango.height > 0, 'un margen fuera de rango no puede vaciar el area util');
assert.equal(fueraDeRango.pad, TextEditor.areaUtil(settings(0.5), 480, 320).pad,
    'un margen > 50% se comporta como el maximo del slider');

console.log('area util: OK - padding contra el lado menor + minimo garantizado (un solo calculo)');