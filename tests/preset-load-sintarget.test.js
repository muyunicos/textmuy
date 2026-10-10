/* REGRESION: loadPreset SIN targetSettings (camino real de la galeria).
 *
 * Defecto (visto en produccion en muyunicos.com, RC61):
 *   Failed to load preset: arcade-neon
 *   TypeError: defaultSettings is not a function
 *     at Object.loadPreset (editor.js:3739)
 *
 * Causa: la rama `else` de loadPreset (la que corre cuando la galeria hace
 * PresetManager.loadPreset(name) -> TextEditor.loadPreset(settings) SIN target)
 * llamaba `defaultSettings()` como si fuera funcion, pero `defaultSettings` es
 * un OBJETO (const). La funcion correcta es createDefaultSettings(). TODAS las
 * suites previas pasaban `target` como 2o argumento, evitando esa rama, por eso
 * el bug nunca las detenia. Esta suite carga SIN target y exige que no lance. */
const assert = require('node:assert/strict');

// --- Stub de DOM minimo pero suficiente para updateUIFromSettings ----------
function makeEl() {
    return {
        type: '', value: '', checked: false, min: 0, max: 1,
        style: {}, dataset: {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        querySelectorAll() { return []; },
        setAttribute() {}, getAttribute() { return null; }
    };
}
global.window = {};
global.CustomEvent = function (type) { this.type = type; };
global.document = {
    getElementById() { return makeEl(); },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    createElement() { return makeEl(); },
    dispatchEvent() {},
    fonts: { add() {}, load() { return Promise.resolve([]); } }
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };

require('../js/editor.js');
require('../js/preset-manager.js');
const TextEditor = global.window.TextEditor;
const PM = global.window.PresetManager;

assert.ok(TextEditor && typeof TextEditor.loadPreset === 'function', 'TextEditor.loadPreset expuesto');

// El defecto se disparaba al cargar SIN target. Reproducimos ese camino con un
// preset completo (estilos por linea incluidos, para cubrir AMBAS lineas del bug:
// 3739 en la rama else y 3832 en el reset de lines sin target).
const presetCompleto = TextEditor.createDefaultSettings();
presetCompleto.text = 'ARCADE\nGAME';
presetCompleto.font.src = 8;
presetCompleto.font.size = 40;
presetCompleto.fill.gradient = { active: true, angle: 90, colors: [{ color: '#00e5ff', pos: 0 }, { color: '#ff2bd6', pos: 1 }] };
// SIN lines declarado -> entra al else-if de la 3832.

// 1. loadPreset SIN target NO debe lanzar (regresion del TypeError).
assert.doesNotThrow(function () {
    TextEditor.loadPreset(JSON.parse(JSON.stringify(presetCompleto)));
}, 'loadPreset sin target no debe lanzar "defaultSettings is not a function"');

// 2. Debe haber aplicado el preset al estado vivo del editor.
const st = TextEditor.getSettings();
assert.equal(st.text, 'ARCADE\nGAME', 'sin target: el texto se aplica al estado vivo');
assert.equal(st.font.src, 8, 'sin target: la fuente se aplica al estado vivo');

// 3. Un preset que SI declara lines tambien debe cargar sin target (rama 3822).
const conLineas = TextEditor.createDefaultSettings();
conLineas.text = 'POP\nCORN';
conLineas.lines.inherit = { '2': 'L1' };
conLineas.lines.line = { '2': { font: { size: 50 }, sizing: { ref: 'linea', refLine: 1, pct: 70 } } };
assert.doesNotThrow(function () {
    TextEditor.loadPreset(JSON.parse(JSON.stringify(conLineas)));
}, 'loadPreset sin target con lines tampoco debe lanzar');
assert.deepEqual(TextEditor.getSettings().lines.inherit, { '2': 'L1' }, 'sin target: lines.inherit se aplica');

// 4. El camino REAL de la galeria (PresetManager.loadPreset -> settingsFromDelta
//    -> TextEditor.loadPreset SIN target) con un .txm v2 valido.
const txm = {
    format: 'textmuy-project', version: 2, name: 'reg',
    settings: PM.diffSettings(TextEditor.createDefaultSettings(), presetCompleto) || {}
};
assert.doesNotThrow(function () {
    const s = PM.settingsFromDelta(txm.settings);
    TextEditor.loadPreset(s);
}, 'el camino galeria (settingsFromDelta + loadPreset sin target) no debe lanzar');

console.log('OK: preset-load-sintarget.test.js');
