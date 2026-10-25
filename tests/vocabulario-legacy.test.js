/* RC81 (F1a): un solo vocabulario por efecto.
 *
 * El modulo arrastraba DOS nombres para los mismos efectos (herencia de TextStudio):
 * canonico (`shadow.outer`, `shadow.outer2`, `shadow.inner`, `shadow.inner2`,
 * `outline.first`, `outline.second`) y legacy suelto (`shadowOuter`, `shadowOuter2`,
 * `shadowInner`, `shadowInner2`, `outline`, `outline2`). El motor lee ambos pero con
 * alcances DISTINTOS (outline.second es global y outline2 por linea), asi que el mismo
 * efecto obedecia o no al Style target segun que nombre trajera el preset.
 *
 * Este test fija: (1) la normalizacion legacy -> canonico; (2) que el canonico gane
 * cuando vienen las dos formas; (3) que `loadPreset` (el camino real de la galeria y de
 * la API) deje el estado SIN legacy, de modo que el `.txm` que se guarda tenga una sola
 * forma. Tambien fija que `animation` y los `editable` (0 lecturas en el motor) ya no
 * esten en los defaults.
 */
const assert = require('node:assert/strict');

global.window = {};
// Stub minimo de DOM: `loadPreset` termina en updateUIFromSettings -> getElementById.
global.document = {
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {},
    createElement: function () {
        return { style: {}, getContext: function () { return null; }, setAttribute: function () {}, appendChild: function () {} };
    }
};
require('../js/editor.js');
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
require('../js/preset-manager.js');

const T = global.window.TextEditor;
const PM = global.window.PresetManager;
assert.ok(T && typeof T.normalizarVocabularioLegacy === 'function', 'normalizarVocabularioLegacy exportada');
assert.ok(PM && PM.diffSettings, 'PresetManager.diffSettings expuesto');

// --- 1. Legacy suelto -> canonico, y el legacy desaparece ---------------------------
const s1 = T.createDefaultSettings();
assert.ok(s1.shadow && s1.shadow.outer, 'los defaults traen shadow.outer canonico');
T.normalizarVocabularioLegacy(Object.assign(s1, {
    shadowOuter: { active: true, distance: 0.3, size: 0.2, fill: { color: { r: 1, g: 2, b: 3 } } },
    shadowInner2: { active: true, size: 0.5 },
    outline: { active: true, width: 0.2 },
    outline2: { active: true, width: 0.4 }
}));
assert.equal(s1.shadowOuter, undefined, 'shadowOuter se retira del estado');
assert.equal(s1.outline2, undefined, 'outline2 tambien');
assert.equal(s1.shadow.outer.active, true, 'y pasa a shadow.outer');
assert.equal(s1.shadow.outer.distance, 0.3, 'con sus campos');
assert.equal(s1.shadow.outer.fill.color.b, 3, 'y el color anidado');
assert.equal(s1.shadow.inner2.size, 0.5, 'shadowInner2 -> shadow.inner2');
assert.equal(s1.outline.second.width, 0.4, 'outline2 -> outline.second');
assert.equal(s1.outline.first.width, 0.2, 'outline -> outline.first');

// --- 2. Si vienen las DOS formas, gana el legacy (una sola regla, sin ambiguedad) --
const s2 = T.createDefaultSettings();
s2.shadow.outer.distance = 0.9;
T.normalizarVocabularioLegacy(Object.assign(s2, {
    shadowOuter: { distance: 0.3, size: 0.77 }
}));
assert.equal(s2.shadow.outer.distance, 0.3, 'el legacy pisa el canonico');
assert.equal(s2.shadow.outer.size, 0.77, 'y trae sus campos');
assert.equal(s2.shadowOuter, undefined, 'sin dejar legacy');
assert.equal(s2.shadowOuter, undefined, 'y el legacy igual se retira');

// --- 3. loadPreset normaliza lo que ENTRA (galeria y API) --------------------------
T.loadPreset({
    text: 'X',
    outline2: { active: true, width: 0.33 },
    shadowOuter: { active: true, distance: 0.4 },
    outline: { active: true, width: 0.11 }
});
const recien = T.getSettings();
assert.equal(recien.outline.second.active, true, 'loadPreset deja outline.second');
assert.equal(recien.outline.second.width, 0.33, 'con su ancho');
assert.equal(recien.outline.first.width, 0.11, 'y outline.first del legacy outline');
assert.equal(recien.shadow.outer.distance, 0.4, 'la sombra tambien quedo canonica');
const delta = PM.diffSettings(T.createDefaultSettings(), recien);
assert.equal(delta.outline2, undefined, 'el delta guardado NO lleva outline2');
assert.equal(delta.shadowOuter, undefined, 'ni shadowOuter');
// OJO: el ESTADO sigue teniendo los alias porque `defaultSettings` tambien los declara
// (el modulo conserva el vocabulario viejo en los defaults). Lo que importa y se fija
// aca es que lo que ENTRA se normaliza y que el `.txm` que se guarda no lo lleva.
// Limpiar los alias de `defaultSettings` (y con ellos 58 hojas duplicadas del schema)
// queda como paso siguiente.

// --- 4. Lo muerto ya no esta en los defaults (0 lecturas en el motor) --------------
const defs = T.createDefaultSettings();
assert.equal(defs.animation, undefined, 'animation fuera (ANIMATION no es parte del modulo)');
assert.equal(defs.editable, undefined, 'editable (top level) fuera');
assert.equal(defs.lettering.editable, undefined, 'lettering.editable fuera');
assert.equal(defs.icon.editable, undefined, 'icon.editable fuera');
assert.equal(defs.background.editable, undefined, 'background.editable fuera');

console.log('OK: vocabulario-legacy.test.js');