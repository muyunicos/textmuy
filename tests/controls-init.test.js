const assert = require('node:assert/strict');

// Smoke test de wiring UI: verifica que Controls.init(editorStub) corra sin
// lanzar (atrapa ReferenceError por funciones fuera de scope, como el caso
// bindLineSizingUI de RC19) y que el init completo pase por bindControls,
// bindLineSizingUI, tabs de linea y galeria de fuentes.
// Los IIFE solo tocan window/document dentro de funciones; stubs minimos bastan.

function makeEl(tag) {
    const listeners = {};
    const el = {
        tagName: (tag || 'div').toUpperCase(),
        type: '',
        value: '',
        checked: false,
        hidden: false,
        disabled: false,
        dataset: {},
        style: {},
        children: [],
        parentElement: null,
        innerHTML: '',
        textContent: '',
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        id: '',
        addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
        dispatchEvent: function () { return true; },
        setAttribute: function (k, v) { el[k] = v; },
        getAttribute: function (k) { return el[k]; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        appendChild: function (c) { el.children.push(c); c.parentElement = el; return c; },
        removeChild: function (c) { el.children = el.children.filter(function (x) { return x !== c; }); return c; },
        closest: function () { return null; },
        getContext: function () { return null; },
    };
    return el;
}

const byId = {};
[
    'tt-options-menu', 'tt-options', 'tt-line-sizing-ref-input',
    'tt-font-gallery-btn', 'tt-font-picker-input',
    'tt-text-textarea',
].forEach(function (id) {
    const tag = id.indexOf('tt-font-picker') === 0 || id.indexOf('tt-line-sizing') === 0 ? 'select' : 'input';
    byId[id] = makeEl(tag);
    byId[id].id = id;
});
byId['tt-options-menu'].querySelectorAll = function () { return []; };

const listeners = {};
global.window = {
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
};
global.document = {
    getElementById: function (id) { return byId[id] || null; },
    querySelector: function () { return null; },
    querySelectorAll: function (sel) {
        // Tabs de linea All/L1/L2/L3: 4 botones con dataset.lineStyle.
        if (sel === '[data-line-style]') {
            return ['all', '1', '2', '3'].map(function (v) {
                const b = makeEl('button');
                b.dataset.lineStyle = v;
                return b;
            });
        }
        return [];
    },
    createElement: function (tag) { return makeEl(tag); },
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    dispatchEvent: function () { return true; },
    body: makeEl('body'),
};
global.localStorage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {},
};

require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/fonts.js');
require('../js/fuentes-galeria.js');
require('../js/galeria.js');
require('../js/controls.js');

const TextEditor = global.window.TextEditor;
const Controls = global.window.Controls;
assert.ok(TextEditor, 'TextEditor should be exposed');
assert.ok(Controls && typeof Controls.init === 'function', 'Controls.init should exist');

// init() completo no debe lanzar (caso RC19: bindLineSizingUI fuera de scope).
assert.doesNotThrow(function () {
    Controls.init(TextEditor);
}, 'Controls.init(editor) should not throw');

// El bindeo de sizing debe existir y dejar el select bindeado una sola vez.
const refSel = byId['tt-line-sizing-ref-input'];
assert.equal(refSel.dataset.bound, '1', 'tt-line-sizing-ref-input should be bound once');

// Galeria de fuentes expuesta (boton junto al selector de fuente).
assert.ok(global.window.TextMuyGaleriaFuentes, 'TextMuyGaleriaFuentes should be exposed');
assert.equal(typeof global.window.TextMuyGaleriaFuentes.abrir, 'function', 'GaleriaFuentes.abrir should exist');

console.log('controls init smoke tests passed');
