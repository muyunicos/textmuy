/* 002-text-tab D1 — US6: formato del preset con lineas 1-based (FR-019).
 *
 * Fija data-model.md §7 y constitution IV/VII v3.2.0:
 *   - el `.txm` pasa a `version:2` (antes `version:1` con `lines.sizing` global
 *     y overrides 0-based);
 *   - solo viaja el DELTA contra los defaults, con `line["1"]` = L1;
 *   - lo configurado para lineas inexistentes se CONSERVA y se reactiva al
 *     reaparecer esas lineas (FR-015): no se poda al cargar;
 *   - un archivo con formato de lineas desconocido se RECHAZA con causa
 *     (constitucion VII v3.2.0: no hay lectores del formato anterior).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.document = {
    fonts: { add: function () {}, load: function () { return Promise.resolve([]); } },
    createElement: function () { return { width: 0, height: 0, style: {}, getContext: function () { return {}; } }; },
    head: { appendChild: function () {} },
    getElementsByTagName: function () { return [{ appendChild: function () {} }]; },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add: function () {} }); }; };
global.window.FontFace = global.FontFace;
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };

require('../js/editor.js');
require('../js/preset-manager.js');

const TextEditor = global.window.TextEditor;
const PresetManager = global.window.PresetManager;
assert.ok(TextEditor && PresetManager, 'editor y PresetManager expuestos');

// --- version:2 (constitucion IV v3.2.0) ------------------------------------
assert.equal(PresetManager.PROJECT_VERSION, 2, 'el formato del proyecto es la version 2');

// --- Delta estricto con lineas 1-based -------------------------------------
function conLineas() {
    const s = TextEditor.createDefaultSettings();
    s.text = 'UNO\nDOS\nTRES';
    s.lines = {
        activeTarget: 'all',
        inherit: { '3': 'L2' },
        line: {
            '1': { fill: { color: { r: 255, g: 0, b: 0 } } },
            '2': { sizing: { ref: 'linea', pct: 80 } },
            '3': { font: { size: 40 } }
        }
    };
    return s;
}
const defaults = TextEditor.createDefaultSettings();
const delta = PresetManager.diffSettings(defaults, conLineas());
assert.ok(delta.lines, 'el delta incluye lines');
assert.ok(delta.lines.line, 'con lineas 1-based dentro');
assert.ok(delta.lines.line['1'], 'L1 viaja con clave "1"');
assert.ok(delta.lines.line['2'], 'L2 viaja con clave "2"');
assert.ok(delta.lines.line['3'], 'L3 viaja con clave "3"');
assert.equal(delta.lines.line['0'], undefined, 'ninguna clave 0-based');
assert.ok(delta.lines.inherit && delta.lines.inherit['3'] === 'L2', 'la herencia viaja');
assert.equal(delta.lines.sizing, undefined, 'el sizing global desaparece del formato');

// --- Round-trip: guardar y recargar conserva las tres lineas ---------------
function roundTrip(settings) {
    const d = PresetManager.diffSettings(TextEditor.createDefaultSettings(), settings);
    const vuelta = PresetManager.settingsFromDelta(d);
    return vuelta;
}
const vuelta = roundTrip(conLineas());
assert.ok(vuelta.lines.line['1'], 'L1 sobrevive al round-trip con clave 1');
assert.ok(vuelta.lines.line['2'], 'L2 sobrevive');
assert.ok(vuelta.lines.line['3'], 'L3 sobrevive');
assert.equal(vuelta.lines.inherit['3'], 'L2', 'la herencia sobrevive');
assert.equal(vuelta.lines.line['1'].fill.color.r, 255, 'el color de L1 vuelve exacto');
assert.equal(vuelta.lines.line['2'].sizing.pct, 80, 'el porcentaje de L2 vuelve exacto');

// --- FR-015: lo configurado para lineas inexistentes se conserva ------------
// L2 y L3 configurados pero con un texto de UNA sola linea: nada se puede perder.
const corto = conLineas();
corto.text = 'UNO';
const vueltaCorta = roundTrip(corto);
assert.ok(vueltaCorta.lines.line['2'], 'L2 se conserva aunque el texto tenga 1 linea');
assert.ok(vueltaCorta.lines.line['3'], 'L3 tambien');
assert.equal(vueltaCorta.lines.line['2'].sizing.pct, 80, 'con su regla intacta');

// --- Un formato de lineas desconocido se RECHAZA con causa (constitucion VII) --
const viejo = {
    format: 'textmuy-project',
    version: 1,
    name: 'viejo',
    settings: { text: 'X', lines: { activeTarget: 'all', overrides: { '0': { font: { size: 40 } } }, sizing: { ref: 'canvas' } } }
};
assert.throws(function () {
    PresetManager.settingsFromDelta({ lines: { overrides: { '0': {} }, sizing: {} } });
}, /formato|ciclo|lineas/i, 'un delta con el formato de lineas viejo se rechaza con causa');

console.log('lineas formato: OK - .txm v2, claves 1-based, delta estricto, lineas ausentes conservadas');