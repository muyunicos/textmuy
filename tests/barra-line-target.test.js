/* 002-text-tab US2 (P1) - la barra "Style target" se ve al abrir.
 *
 * Fija research R2 / FR-002: la barra nace con hidden=true y solo aparece tras
 * cambiar de pestana. Causa raiz medida: el registro de applyLineTargetGating y
 * su llamada inicial viven DENTRO del listener de 'textmuy:line-target-updated'
 * que re-sincroniza los gradient pickers, y ese evento no se dispara al
 * arrancar; al cambiar de pestana bindMenuTabs lo invoca directo y por eso
 * aparece.
 *
 * La suite comprueba comportamiento, no texto: el gating corre al iniciar
 * Controls.init() y decide por pestana activa.
 */
const assert = require('node:assert/strict');

function makeEl(tag) {
    const el = {
        tagName: (tag || 'div').toUpperCase(),
        type: '', value: '', checked: false, hidden: false, disabled: false,
        dataset: {}, style: {}, children: [], parentElement: null,
        innerHTML: '', textContent: '', options: [],
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        id: '',
        addEventListener: function () {}, dispatchEvent: function () { return true; },
        setAttribute: function (k, v) { el[k] = v; },
        getAttribute: function (k) { return el[k]; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        appendChild: function (c) { el.children.push(c); c.parentElement = el; return c; },
        removeChild: function (c) { el.children = el.children.filter(function (x) { return x !== c; }); return c; },
        closest: function () { return null; },
        getContext: function () { return null; }
    };
    return el;
}

// Barra de target de linea y grupo global (Canvas Size). La barra arranca
// oculta porque el HTML la declara con el atributo `hidden`.
const barra = makeEl('div');
barra.hidden = true;
const grupoGlobal = makeEl('div');
const pestanas = {};
['text', 'custom', 'icon', 'background', 'save'].forEach(function (nombre) {
    const li = makeEl('li');
    li.dataset.name = nombre;
    li._selected = false;
    li.classList.add = function (c) { if (c === 'selected') li._selected = true; };
    pestanas[nombre] = li;
});
const liText = pestanas.text;
function seleccionar(nombre) {
    Object.keys(pestanas).forEach(function (k) { pestanas[k]._selected = (k === nombre); });
}

const byId = {};
['tt-options-menu', 'tt-options', 'tt-line-sizing-ref-input', 'tt-font-gallery-btn', 'tt-font-picker-input', 'tt-text-textarea']
    .forEach(function (id) { const el = makeEl('input'); el.id = id; byId[id] = el; });

const listeners = {};
global.window = {
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    TextEditor: null
};
global.document = {
    getElementById: function (id) { return byId[id] || null; },
    querySelector: function (sel) {
        if (sel === '[data-line-target-bar]') return barra;
        // La pestana activa la marca el HTML con la clase `selected`.
        if (sel === '#tt-options-menu li.selected') {
            const nombre = Object.keys(pestanas).filter(function (k) { return pestanas[k]._selected; })[0];
            return nombre ? pestanas[nombre] : null;
        }
        return null;
    },
    querySelectorAll: function (sel) {
        if (sel === '[data-line-style]') {
            return ['all', '1', '2', '3'].map(function (v) { const b = makeEl('button'); b.dataset.lineStyle = v; return b; });
        }
        if (sel === '[data-global-only]') return [grupoGlobal];
        return [];
    },
    createElement: function (tag) { return makeEl(tag); },
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    dispatchEvent: function () { return true; },
    body: makeEl('body'),
    head: { appendChild: function () {} },
    fonts: { add: function () {}, load: function () { return Promise.resolve([]); } },
    getElementsByTagName: function () { return [{ appendChild: function () {} }]; }
};
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
global.FontFace = function (n) { this.name = n; this.load = function () { return Promise.resolve({ family: n, add: function () {} }); }; };
global.window.FontFace = global.FontFace;
global.ResizeObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
// fonts.js dispara una carga diferida del catalogo; en Node no hay red y el
// aviso ensuciaria la salida de la suite (no es lo que se prueba aqui).
global.fetch = function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve({}); } }); };
const warnOriginal = console.warn;
console.warn = function () {
    if (/No se pudo cargar el catalogo/.test(String(arguments[0]))) return;
    warnOriginal.apply(console, arguments);
};

require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/fonts.js');
require('../js/fuentes-galeria.js');
require('../js/galeria.js');
require('../js/controls.js');

const TextEditor = global.window.TextEditor;
const Controls = global.window.Controls;
assert.ok(TextEditor && Controls, 'TextEditor y Controls deben estar expuestos');

// Antes de init la barra nace oculta (el HTML la declara hidden a proposito).
assert.equal(barra.hidden, true, 'la barra arranca oculta en el HTML');

// FR-002 / US2: al abrir la pestana TEXT la barra debe quedar VISIBLE sin
// tocar nada. Este es el defecto que se corrige: hoy sigue oculta hasta que se
// dispara 'textmuy:line-target-updated'.
Controls.init(TextEditor);
assert.equal(barra.hidden, false,
    'la barra debe quedar visible al abrir TEXT, sin necesidad de cambiar de pestana');

// Gating por pestana: se re-dispara el mismo evento que usa el gating en
// caliente y el resultado debe ser coherente con la pestana activa simulada.
function refrescarGating() {
    (listeners['textmuy:line-target-updated'] || []).forEach(function (fn) { fn(); });
}
seleccionar('text'); refrescarGating();
assert.equal(barra.hidden, false, 'TEXT: barra visible');
seleccionar('custom'); refrescarGating();
assert.equal(barra.hidden, false, 'STYLES: barra visible');
seleccionar('icon'); refrescarGating();
assert.equal(barra.hidden, false, 'ICON: barra visible');
seleccionar('background'); refrescarGating();
assert.equal(barra.hidden, true, 'BACKGROUND: barra oculta');
seleccionar('save'); refrescarGating();
assert.equal(barra.hidden, true, 'DOWNLOAD: barra oculta');

// Grupo Canvas Size (data-global-only): visible en All, oculto en L1/L2/L3.
seleccionar('text');
TextEditor.setLineTarget('L2'); refrescarGating();
assert.equal(grupoGlobal.hidden, true, 'en L2 el grupo Canvas Size se oculta');
TextEditor.setLineTarget('all'); refrescarGating();
assert.equal(grupoGlobal.hidden, false, 'en All el grupo Canvas Size vuelve');

console.log('barra line target: OK - visible al abrir en TEXT/STYLES/ICON, oculta en BACKGROUND/DOWNLOAD');