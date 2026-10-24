/* 002-text-tab Phase 11 (RC78) — la RUTA DE ESCRITURA del panel de Font Size.
 *
 * Por que existe esta suite: el defecto que reporto el administrador ("no hay opcion
 * de que L2 sea el 50 % de ALL", "50 % de L1 no cambia de tamano", "Ancho no funciona
 * para nada", "L2 al 10 % del canvas y ALL se achica") NO estaba en el motor —que
 * resolvia bien la proporcion desde RC52, lo fija `tests/lineas-tamano.test.js`— sino
 * en la UI: el unico slider estaba atado a `canvas.maxFontSize` (el TOPE) y ningun
 * control escribia `sizing.pct`. Ninguna suite ejercia la ruta de ESCRITURA (todos los
 * tests armaban `lines` a mano), asi que el defecto llego a produccion.
 *
 * Esta suite mueve los controles REALES del panel y comprueba el DATO guardado.
 * Contrato: `contracts/lineas.md` 5 (R-L2.6 a R-L2.10).
 */
const assert = require('node:assert/strict');

// ===== DOM minimo: elementos del panel + los registrados por controls.js =====
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
        textContent: '',
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
        id: '',
        addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
        dispatch: function (ev) { (listeners[ev] || []).forEach(function (fn) { fn.call(el, { type: ev, preventDefault: function () {} }); }); },
        dispatchEvent: function () { return true; },
        setAttribute: function (k, v) { el[k] = v; },
        getAttribute: function (k) { return el[k]; },
        removeAttribute: function (k) { delete el[k]; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        appendChild: function (c) { el.children.push(c); c.parentElement = el; return c; },
        removeChild: function (c) { el.children = el.children.filter(function (x) { return x !== c; }); return c; },
        closest: function () { return null; },
        getContext: function () { return null; },
        focus: function () {}
    };
    // `options` es la lista de hijos (asi `pintarOpciones`/`selTiene` ven lo pintado).
    Object.defineProperty(el, 'options', { get: function () { return el.children; } });
    // `innerHTML = ''` limpia los hijos (lo hace `pintarOpciones` al repintar).
    Object.defineProperty(el, 'innerHTML', {
        get: function () { return el._html || ''; },
        set: function (v) { el._html = v; if (v === '') el.children = []; }
    });
    return el;
}

const IDS = [
    'tt-options-menu', 'tt-options',
    'tt-line-sizing-panel', 'tt-line-sizing-global',
    'tt-line-sizing-mode-input', 'tt-line-sizing-ref-input',
    'tt-line-sizing-pct-input', 'tt-line-sizing-cap-input',
    'tt-line-sizing-cap-reset', 'tt-line-sizing-estado',
    'tt-canvas-max-font-size-input', 'tt-max-font-size-label-text',
    'tt-max-font-size-hint', 'tt-text-textarea',
    'tt-font-gallery-btn', 'tt-font-picker-input'
];
const byId = {};
IDS.forEach(function (id) { byId[id] = makeEl(/input$/.test(id) ? 'select' : 'input'); byId[id].id = id; });

const listeners = {};
global.window = { addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); } };
const docListeners = {};
global.document = {
    getElementById: function (id) { return byId[id] || null; },
    querySelector: function () { return null; },
    querySelectorAll: function (sel) {
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
    addEventListener: function (ev, fn) { (docListeners[ev] = docListeners[ev] || []).push(fn); },
    dispatchEvent: function (ev) {
        (docListeners[(ev && ev.type) || ''] || []).forEach(function (fn) { fn(ev); });
        return true;
    },
    body: makeEl('body')
};

require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/fonts.js');
require('../js/fuentes-galeria.js');
require('../js/galeria.js');
require('../js/controls.js');

const TextEditor = global.window.TextEditor;
const Controls = global.window.Controls;
assert.ok(TextEditor && Controls, 'editor y controls expuestos');
Controls.init(TextEditor);

const settings = TextEditor.getSettings();
settings.text = 'AAA\nBBB\nCCC';
settings.canvas.width = 800;
settings.canvas.height = 600;
settings.canvas.maxFontSize = 100;

const panel = byId['tt-line-sizing-panel'];
const globalBox = byId['tt-line-sizing-global'];
const modo = byId['tt-line-sizing-mode-input'];
const refSel = byId['tt-line-sizing-ref-input'];
const pct = byId['tt-line-sizing-pct-input'];
const cap = byId['tt-line-sizing-cap-input'];
const capReset = byId['tt-line-sizing-cap-reset'];
const estado = byId['tt-line-sizing-estado'];

function entrada(n) {
    const ls = TextEditor.getSettings().lines;
    return (ls && ls.line) ? ls.line[String(n)] : undefined;
}

// --- En All el panel se oculta y manda el control global ---------------------
assert.equal(panel.hidden, true, 'con All el panel de linea esta oculto');
assert.equal(globalBox.hidden, false, 'con All manda el control global');

TextEditor.setLineTarget('L2');
assert.equal(panel.hidden, false, 'con L2 aparece el panel');
assert.equal(globalBox.hidden, true, 'y se oculta el control global (antes cambiaba de significado)');

// --- R-L2.9: el default no escribe NADA y todas las lineas quedan iguales -----
assert.equal(entrada(2), undefined, 'sin tocar nada, L2 no tiene entrada propia (no hay delta vacio)');
assert.equal(pct.value, 100, 'la Proporcion arranca en 100 (igual que la referencia)');
assert.equal(refSel.value, 'canvas', 'la Ref arranca en ALL');
assert.ok(refSel.children.some(function (o) { return o.value === 'canvas'; }), 'ALL esta entre las opciones de Ref');
assert.equal(refSel.children.some(function (o) { return o.value === 'linea:2'; }), false,
    'la Ref nunca ofrece la propia linea (L2)');

// --- (b) Proporcion: L2 al 50 % de ALL ---------------------------------------
pct.value = '50';
pct.dispatch('input');
assert.equal(entrada(2).sizing.pct, 50, 'la Proporcion se escribe en sizing.pct');
assert.equal(entrada(2).sizing.ref, 'canvas', 'con la Ref por defecto (ALL)');
assert.equal(entrada(2).sizing.mode, 'fontsize', 'en modo Proporcional');
assert.equal(settings.canvas.maxFontSize, 100, 'y el tope GLOBAL queda intacto');
assert.ok(/50 % del tamaño de ALL/.test(estado.textContent),
    'la frase de estado dice la relacion (' + estado.textContent + ')');

// Volver al default BORRA la regla (R-L2.9, IV).
pct.value = '100';
pct.dispatch('input');
assert.equal(entrada(2), undefined, 'Proporcional/ALL/100 no deja delta (vuelve a heredar)');

// --- (b) Ref a otra linea: L2 al 80 % de L1 ---------------------------------
pct.value = '80';
pct.dispatch('input');
refSel.value = 'linea:1';
refSel.dispatch('change');
assert.equal(entrada(2).sizing.ref, 'linea', 'la Ref linea se guarda');
assert.equal(entrada(2).sizing.refLine, 1, 'con su linea de referencia');
assert.equal(entrada(2).sizing.pct, 80, 'y la proporcion no se pierde al cambiar la Ref');
assert.ok(/del tamaño de L1/.test(estado.textContent), 'la frase nombra la referencia (' + estado.textContent + ')');

// --- (c) Modo Ancho: conserva la ref valida y NO ofrece ALL ------------------
modo.value = 'width';
modo.dispatch('change');
assert.equal(entrada(2).sizing.mode, 'width', 'el modo Ancho se guarda');
assert.equal(entrada(2).sizing.refLine, 1, 'la Ref valida se conserva al cambiar de modo');
assert.equal(refSel.children.some(function (o) { return o.value === 'canvas'; }), false,
    'en Ancho no se ofrece ALL (no hay "ancho de ALL")');
pct.value = '150';
pct.dispatch('input');
assert.equal(entrada(2).sizing.pct, 150, 'el pct de Ancho se guarda (antes se ignoraba al pintar)');

// Al volver a Proporcional con ALL, y entrar de nuevo en Ancho, la Ref cae a L1.
modo.value = 'fontsize';
modo.dispatch('change');
refSel.value = 'canvas';
refSel.dispatch('change');
assert.equal(entrada(2).sizing.ref, 'canvas', 'vuelve a ALL en Proporcional');
modo.value = 'width';
modo.dispatch('change');
assert.equal(entrada(2).sizing.ref, 'linea', 'al entrar en Ancho con ALL, la Ref cae');
assert.equal(entrada(2).sizing.refLine, 1, 'a la primera valida (L1)');

// --- (d) Tope por linea: 10 % del canvas y ALL NO se achica -----------------
cap.value = '10';
cap.dispatch('input');
assert.equal(entrada(2).canvas.maxFontSize, 10, 'el tope propio se guarda en la LINEA');
assert.equal(entrada(2).sizing.mode, 'width',
    'y la regla de tamano SOBREVIVE al escribir otro ajuste (RC78: mergeDelta la borraba)');
assert.equal(settings.canvas.maxFontSize, 100,
    'y el tope de ALL no cambia (era el defecto: "L2 al 10 % y ALL se achica")');
assert.ok(/tope propio/.test(estado.textContent), 'la frase avisa que el tope es propio (' + estado.textContent + ')');
assert.equal(capReset.hidden, false, 'y aparece el boton para volver a heredar');

// "Heredar de ALL" BORRA la clave (R-L2.6): el tope vuelve a ser el de ALL.
capReset.dispatch('click');
assert.equal(((entrada(2) || {}).canvas || {}).maxFontSize, undefined, 'el tope propio se borra');
assert.equal(capReset.hidden, true, 'y el boton se oculta (ya no hay nada propio)');
assert.ok(/tope heredado de ALL/.test(estado.textContent), 'la frase lo declara (' + estado.textContent + ')');

// --- R-L2.10: pintar el panel no materializa el tope ------------------------
TextEditor.setLineTarget('L1');
TextEditor.setLineTarget('L2');
assert.equal((entrada(2).canvas || {}).maxFontSize, undefined,
    'cambiar de target y volver NO escribe el tope (el 100 no se materializa)');

console.log('lineas escritura: OK - el panel escribe proporcion/ref/modo/tope y el tope de ALL no se toca');