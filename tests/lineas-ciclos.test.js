/* 002-text-tab D1 — US6: anti-ciclos (contrato lineas.md §3).
 *
 * Un ciclo en la herencia o en el dimensionamiento hace que la resolucion no
 * termine (el render queda colgado). Por eso:
 *   - la resolucion NO puede colgarse nunca, aunque el archivo venga editado a
 *     mano (R-L3.2);
 *   - la carga rechaza el preset con causa `lines:<detalle>:ciclo` dejando la
 *     vista intacta: no cuelga ni pinta parcial (FR-014);
 *   - se detectan ciclos de cualquier longitud y mixtos (herencia + tamano).
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
assert.equal(typeof TextEditor.detectarCiclos, 'function', 'detectarCiclos debe estar expuesta');
assert.equal(typeof TextEditor.resolveLine, 'function', 'resolveLine debe estar expuesta');

function base() {
    const s = TextEditor.createDefaultSettings();
    s.font.size = 100;
    return s;
}

// --- Sin ciclos: no se detecta nada -----------------------------------------
const s0 = base();
s0.lines = { activeTarget: 'all', inherit: { '3': 'L2' }, line: { '2': { sizing: { ref: 'linea', pct: 80 } } } };
assert.equal(TextEditor.detectarCiclos(s0), null, 'una cadena L3<-L2 es legitima');

// --- Ciclo directo de herencia: L2->L3 y L3->L2 -----------------------------
const s1 = base();
s1.lines = { activeTarget: 'all', inherit: { '2': 'L3', '3': 'L2' }, line: {} };
const c1 = TextEditor.detectarCiclos(s1);
assert.ok(c1, 'un ciclo directo de herencia se detecta');
assert.ok(/ciclo/i.test(String(c1)), 'la causa dice que es un ciclo (got ' + c1 + ')');

// --- Ciclo de longitud 3: L1->L2->L3->L1 -----------------------------------
const s2 = base();
s2.lines = { activeTarget: 'all', inherit: { '1': 'L2', '2': 'L3', '3': 'L1' }, line: {} };
assert.ok(TextEditor.detectarCiclos(s2), 'un ciclo de longitud 3 se detecta');

// --- Ciclo MIXTO: L3 hereda de L1 mientras L1 dimensiona contra L3 ----------
const s3 = base();
s3.lines = {
    activeTarget: 'all',
    inherit: { '3': 'L1' },
    line: { '1': { sizing: { ref: 'linea', pct: 80 } }, '3': { sizing: { ref: 'linea', pct: 50 } } }
};
// El alcance real son L1..L3, asi que el ciclo mixto se arma con L2<->L1:
s3.lines.inherit = { '2': 'L1' };
s3.lines.line = {
    '1': { sizing: { ref: 'linea', pct: 80, refLine: 2 } },
    '2': { sizing: { ref: 'linea', pct: 50, refLine: 1 } }
};
assert.ok(TextEditor.detectarCiclos(s3), 'un ciclo mixto (herencia + dimensionamiento) se detecta');

// --- La resolucion NO se cuelga con un ciclo (R-L3.2) ----------------------
// Esta es la garantia critica: el archivo editado a mano no puede dejar el
// editor colgado.
const s4 = base();
s4.lines = { activeTarget: 'all', inherit: { '2': 'L3', '3': 'L2' }, line: {} };
let resuelta = null;
assert.doesNotThrow(function () { resuelta = TextEditor.resolveLine(s4, 2); },
    'resolver una linea en ciclo no debe lanzar ni colgarse');
assert.ok(resuelta && resuelta.fill, 'y devuelve un estilo utilizable');

// --- Autociclo: una linea que se referencia a si misma ----------------------
const s5 = base();
s5.lines = { activeTarget: 'all', inherit: { '1': 'L1' }, line: {} };
assert.ok(TextEditor.detectarCiclos(s5), 'una linea que hereda de si misma es un ciclo');

console.log('lineas ciclos: OK - deteccion por ambas aristas, sin colgarse, con causa');

// --- La UI oculta lo que cerraria un ciclo (FR-013, R-L3.1) -----------------
// Es lo que el selector de herencia y el de tamano necesitan para ofrecer solo
// opciones validas: el filtro es TRANSITIVO y cubre las dos aristas.
assert.equal(typeof TextEditor.opcionesValidas, 'function', 'opcionesValidas debe estar expuesta');

// Sin nada configurado: cualquier linea puede tomar a otra como padre.
const libre = base();
libre.lines = { activeTarget: 'all', inherit: {}, line: { '1': {} } };
assert.deepEqual(TextEditor.opcionesValidas(libre, 1, 'inherit'), [2, 3],
    'sin ciclos, L1 puede heredar de L2 o L3');

// Si L2 ya hereda de L1, L1 NO puede heredar de L2 (cerraria el ciclo).
const encadenada = base();
encadenada.lines = { activeTarget: 'all', inherit: { '2': 'L1' }, line: { '1': {}, '2': {} } };
assert.ok(TextEditor.opcionesValidas(encadenada, 1, 'inherit').indexOf(2) === -1,
    'L1 no puede heredar de L2 si L2 ya hereda de L1');
assert.ok(TextEditor.opcionesValidas(encadenada, 1, 'inherit').indexOf(3) !== -1,
    'pero si de L3, que es una hoja');

// Ciclo de longitud 3: si L2<-L1 y L3<-L2, L1 no puede tomar a L3.
const larga = base();
larga.lines = {
    activeTarget: 'all',
    inherit: { '2': 'L1', '3': 'L2' },
    line: { '1': {}, '2': {}, '3': {} }
};
assert.ok(TextEditor.opcionesValidas(larga, 1, 'inherit').indexOf(3) === -1,
    'el filtro es transitivo: L1 no puede cerrar el ciclo de longitud 3 con L3');

// MIXTO: L2 hereda de L1 mientras L1 dimensiona contra L2.
const mixto2 = base();
mixto2.lines = {
    activeTarget: 'all',
    inherit: { '2': 'L1' },
    line: {
        '1': { sizing: { ref: 'linea', refLine: 2, pct: 80 } },
        '2': { sizing: { ref: 'linea', refLine: 1, pct: 50 } }
    }
};
assert.ok(TextEditor.detectarCiclos(mixto2), 'el estado de partida ya tiene un ciclo mixto');

// Aristas de tamano: si L1 ya dimensiona contra L2, L2 no puede hacerlo contra L1.
const porTamano = base();
porTamano.lines = {
    activeTarget: 'all',
    inherit: {},
    line: { '1': { sizing: { ref: 'linea', refLine: 2, pct: 80 } }, '2': { sizing: { ref: 'linea', refLine: 1, pct: 50 } } }
};
assert.ok(TextEditor.opcionesValidas(porTamano, 2, 'refLine').indexOf(1) === -1,
    'la arista de tamano tambien se filtra: L2 no puede referenciar a L1 si L1 referencia a L2');

// Referenciarse a si misma no se ofrece (no avanza la resolucion).
const propias = base();
propias.lines = { activeTarget: 'all', inherit: {}, line: { '2': {} } };
assert.ok(TextEditor.opcionesValidas(propias, 2, 'refLine').indexOf(2) === -1,
    'una linea no se ofrece a si misma como referencia');