/* 003-option-schema - OPTION_SCHEMA unico + alcance data-driven + fail-fast.
 *
 * Fija el contrato de contracts/opciones.md:
 *   - OPTION_SCHEMA cubre todas las hojas de defaultSettings con scope (US1);
 *   - isGlobalPath consulta el alcance unificado (sin GLOBAL_PATHS/CANVAS_POR_LINEA);
 *   - settingsFromDelta rechaza con causa una ruta desconocida bajo una raiz
 *     conocida, y NO rechaza los 6 presets reales ni rutas dinamicas/arrays (US2).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};

require('../js/editor.js');
global.localStorage = {
    getItem: function() { return null; },
    setItem: function() {},
    removeItem: function() {}
};
require('../js/preset-manager.js');

const TextEditor = global.window.TextEditor;
const PM = global.window.PresetManager;
assert.ok(TextEditor, 'TextEditor expuesto');
assert.ok(PM && PM.settingsFromDelta, 'PresetManager.settingsFromDelta expuesto');

// --- 1. OPTION_SCHEMA cubre TODAS las hojas de defaultSettings ---------------
const schema = TextEditor.OPTION_SCHEMA();
const defaults = TextEditor.createDefaultSettings();

function hojasDe(obj, pre, acc) {
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) { obj.forEach(x => hojasDe(x, pre, acc)); return; }
        Object.keys(obj).forEach(k => hojasDe(obj[k], pre ? pre + '.' + k : k, acc));
    } else if (pre) acc.push(pre);
}
const hojas = [];
hojasDe(defaults, '', hojas);
assert.ok(hojas.length > 50, 'se esperaban muchas hojas (got ' + hojas.length + ')');
hojas.forEach(function (h) {
    assert.ok(schema[h], 'el schema cubre la hoja ' + h);
    assert.ok(schema[h].scope === 'global' || schema[h].scope === 'linea',
        h + ' tiene scope valido');
    assert.ok(typeof schema[h].nombre === 'string' && schema[h].nombre.length,
        h + ' tiene nombre');
});
// Grupos vacios no generan basura:
assert.ok(!schema['lines.line'], 'lines.line (vacio en defaults) no genera entrada');
assert.ok(!schema['lines.inherit'], 'lines.inherit (vacio) no genera entrada');

// --- 2. Alcance (isGlobalPath) reproduce el contrato -------------------------
['canvas', 'canvas.width', 'canvas.height', 'canvas.zoom'].forEach(function (p) {
    assert.equal(TextEditor.isGlobalPath(p), true, p + ' es global');
});
assert.equal(TextEditor.isGlobalPath('canvas.maxFontSize'), false,
    'EXCEPCION: canvas.maxFontSize es por linea');
['text', 'rotate', 'distort', 'lines', 'download', 'processing'].forEach(function (p) {
    assert.equal(TextEditor.isGlobalPath(p), true, p + ' es global');
});
['lettering.flag.active', 'lettering.boggle.active', 'lettering.blendmode',
 'lettering.reverseOverlap.letters'].forEach(function (p) {
    assert.equal(TextEditor.isGlobalPath(p), true, p + ' es global de bloque');
});
['font.size', 'fill.color.r', 'outline.first.width', 'align', 'letterSpacing',
 'lineHeight', 'lettering.shadow.size', 'icon.src', 'depth.length'].forEach(function (p) {
    assert.equal(TextEditor.isGlobalPath(p), false, p + ' es por linea');
});

// --- 3. Fail-fast de rutas (US2) ---------------------------------------------
// 3a. Ruta inexistente bajo raiz conocida -> rechazo con causa.
assert.throws(function () {
    PM.settingsFromDelta({ name: 'roto', fill: { colorx: { r: 1 } } });
}, /ruta_desconocida:fill\.colorx\.r/, 'una ruta inventada bajo fill se rechaza');

// 3b. Ruta bajo raiz DESCONOCIDA se permite (conservador, campo de extension).
assert.doesNotThrow(function () {
    PM.settingsFromDelta({ name: 'ext', extensionFutura: { x: 1 } });
}, 'una raiz desconocida no se rechaza');

// 3c. Contenedores dinamicos permitidos con subarbol libre.
assert.doesNotThrow(function () {
    PM.settingsFromDelta({ name: 'din', lines: { line: { '2': { font: { size: 40 }, sizing: { ref: 'linea', pct: 80 } } }, inherit: { '3': 'L2' } } });
}, 'lines.line/lines.inherit no se rechazan');
assert.doesNotThrow(function () {
    PM.settingsFromDelta({ name: 'capas', fill: { layers: [{ id: 'L2', active: true, styles: [{ id: 'S9', type: 'color', color: '#abc' }] }] } });
}, 'fill.layers (array dinamico) no se rechaza');

// 3d. Arrays permitidos completos (gradient.colors no tiene hojas en defaults).
assert.doesNotThrow(function () {
    PM.settingsFromDelta({ name: 'grad', fill: { gradient: { active: true, colors: [{ color: '#f00', pos: 0 }, { color: '#00f', pos: 1 }] } } });
}, 'fill.gradient.colors[] no se rechaza');

// --- 4. Los 6 presets reales cargan SIN rechazo (sin falsos positivos) -------
const presetsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'pmu', 'tm-presets');
if (!fs.existsSync(presetsDir)) throw new Error('no existe ' + presetsDir);
fs.readdirSync(presetsDir).filter(f => f.endsWith('.txm')).sort().forEach(function (file) {
    const payload = JSON.parse(fs.readFileSync(path.join(presetsDir, file), 'utf8'));
    assert.doesNotThrow(function () { PM.settingsFromDelta(payload.settings); },
        file + ' debe cargar sin rechazo de ruta');
});

console.log('OK: option-schema.test.js');
