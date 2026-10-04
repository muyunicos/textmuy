/* 002-text-tab Bloque B — US5 (P2): la geometria unica de bloque.
 *
 * Fija contracts/geometria.md R-G1.1, R-G1.2 y R-G1.3:
 *   - ajuste y TODOS los motores comparten la misma geometria: lo calculado es
 *     lo pintado (R-G1.1);
 *   - la linea i>1 se coloca a `lineHeight * tamano[i-1]` debajo de la anterior
 *     y L1 ANCLA el bloque: su propio lineHeight se guarda pero no la mueve
 *     (R-G1.2, FR-021);
 *   - con tamanos por linea distintos las Y usan avances acumulados y las
 *     lineas nunca se superponen (R-G1.3).
 *
 * El defecto medido: el modelo centrado `n * px * lineHeight` hacia que una
 * SOLA linea se desplazara al mover Line height (FR-007).
 */
const assert = require('node:assert/strict');

global.window = {};

// Contexto 2D minimo pero COMPLETO: el motor compone capas internas con
// document.createElement('canvas') y pinta fondo, relleno y texto sobre ellas.
// El motor compone el texto en una CAPA INTERNA (canvas del pool) y recien
// despues la vuelca en el lienzo con drawImage. Para observar lo PINTADO hay
// que enganchar el registro en cualquier contexto 2D que cree el motor.
let registro = null;
function makeCtx2D() {
    const noop = function () {};
    return {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
        clearRect: noop, fillRect: noop, strokeRect: noop, drawImage: noop,
        fillText: function (ch, x, y) { if (registro) registro.push(y); },
        strokeText: function (ch, x, y) { if (registro) registro.push(y); },
        beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop,
        fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, setTransform: noop, putImageData: noop,
        measureText: function (text) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return {
                width: String(text).length * px * 0.55,
                actualBoundingBoxAscent: px * 0.8,
                actualBoundingBoxDescent: px * 0.2
            };
        },
        getImageData: function () {
            const data = new Uint8ClampedArray(4);
            data[3] = 255;
            return { data: data, width: 1, height: 1 };
        },
        createImageData: function () { return { data: new Uint8ClampedArray(4) }; },
        createLinearGradient: function () { return { addColorStop: noop }; },
        createRadialGradient: function () { return { addColorStop: noop }; },
        createPattern: function () { return null; }
    };
}

global.document = {
    createElement: function () { return { width: 0, height: 0, style: {}, getContext: function () { return makeCtx2D(); } }; },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
require('../js/editor.js');

const TextEditor = global.window.TextEditor;
assert.equal(typeof TextEditor.blockLayout, 'function', 'blockLayout debe estar expuesta para tests');

// Contexto minimo: measureText devuelve metricas coherentes con el px del
// ctx.font, como el navegador, para que el modelo se pueda verificar en Node.
function makeCtx() {
    return {
        font: '10px sans-serif',
        textBaseline: '',
        textAlign: '',
        measureText: function (text) {
            const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = m ? parseFloat(m[1]) : 10;
            return {
                width: String(text).length * px * 0.55,
                actualBoundingBoxAscent: px * 0.8,
                actualBoundingBoxDescent: px * 0.2
            };
        }
    };
}

function settings(lineHeight) {
    const s = TextEditor.createDefaultSettings();
    s.font = { src: 'Bangers', size: 100, weight: 'normal' };
    if (lineHeight !== undefined) s.lineHeight = lineHeight;
    return s;
}

const ctx = makeCtx();

// --- FR-007: con UNA sola linea, Line height no mueve nada -------------------
const lhMin = TextEditor.blockLayout(ctx, ['HOLA'], settings(0), [100]);
const lhMid = TextEditor.blockLayout(ctx, ['HOLA'], settings(0.5), [100]);
const lhMax = TextEditor.blockLayout(ctx, ['HOLA'], settings(1.5), [100]);
assert.equal(lhMin.baselines[0], lhMid.baselines[0], 'una sola linea: baseline identico con lineHeight 0.5');
assert.equal(lhMin.baselines[0], lhMax.baselines[0], 'una sola linea: baseline identico con lineHeight 1.5');
assert.equal(lhMin.height, lhMax.height, 'una sola linea: la altura no depende de lineHeight');
assert.equal(lhMax.top, lhMin.top, 'una sola linea: el borde superior no se mueve');

// --- R-G1.2: L1 ancla el bloque y L2 baja con el interlineado ---------------
const dosA = TextEditor.blockLayout(ctx, ['HOLA', 'MUNDO'], settings(1), [100, 100]);
const dosB = TextEditor.blockLayout(ctx, ['HOLA', 'MUNDO'], settings(1.5), [100, 100]);
assert.equal(dosA.baselines[0], dosB.baselines[0], 'FR-008: la primera linea queda FIJA');
assert.ok(dosB.baselines[1] > dosA.baselines[1], 'FR-008: la segunda linea se desplaza hacia abajo');
assert.equal(dosB.baselines[1] - dosB.baselines[0], 100 * 1.5, 'R-G1.2: avance = lineHeight * tamano de la linea de arriba');
assert.equal(dosA.baselines[1] - dosA.baselines[0], 100 * 1, 'avance con lineHeight 1');
// --- FR-021: L1.lineHeight no mueve nada (su valor no se usa como avance) ----
// Con una sola linea el avance es inexistente; con varias, L1 no aporta avance
// porque no tiene linea arriba: su lineHeight se guarda y no desplaza.
const tres = TextEditor.blockLayout(ctx, ['A', 'B', 'C'], settings(2), [100, 100, 100]);
assert.equal(tres.baselines[1] - tres.baselines[0], 200, 'el avance lo da el interlineado vigente');
assert.equal(tres.baselines[2] - tres.baselines[1], 200, 'y se repite para cada linea');

// --- R-G1.3: tamanos por linea distintos, avances acumulados ----------------
const mixto = TextEditor.blockLayout(ctx, ['A', 'B', 'C'], settings(1), [200, 100, 50]);
assert.equal(mixto.baselines[1] - mixto.baselines[0], 200 * 1, 'avance desde L1 = su propio tamano');
assert.equal(mixto.baselines[2] - mixto.baselines[1], 100 * 1, 'avance desde L2 = SU tamano, no el global');
assert.ok(mixto.baselines[2] - mixto.baselines[1] < tres.baselines[2] - tres.baselines[1],
    'una linea mas chica avanza menos: las lineas no se superponen');

// --- La geometria coincide con la real: caja de tinta y altura ---------------
const uno = TextEditor.blockLayout(ctx, ['HOLA'], settings(1), [100]);
assert.equal(uno.ascent[0], 80, 'ascendente medido');
assert.equal(uno.descent[0], 20, 'descendente medido');
assert.equal(uno.height, 100, 'una linea: altura = ascendente + descendente');
assert.equal(uno.top, uno.baselines[0] - uno.ascent[0], 'el borde superior es la tinta de la primera linea');
assert.equal(uno.bottom, uno.baselines[0] + uno.descent[0], 'el borde inferior es la tinta de la ultima linea');
assert.equal(uno.firstBaseline, -(uno.ascent[0] + uno.descent[0]) / 2 + uno.ascent[0],
    'una sola linea queda centrada como una linea aislada');

// Con varias lineas, la caja abarca TODAS las lineas (nada queda fuera).
const caja = TextEditor.blockLayout(ctx, ['A', 'B', 'C'], settings(1.5), [100, 100, 100]);
assert.equal(caja.top, caja.baselines[0] - caja.ascent[0]);
assert.equal(caja.bottom, caja.baselines[2] + caja.descent[2]);
assert.equal(caja.height, caja.bottom - caja.top, 'la caja cubre la primera y la ultima linea');
assert.ok(caja.height > caja.ascent[0] + caja.descent[0], 'varias lineas: la caja crece con el interlineado');

// --- Paridad con la caja que usan los motores (getTextBlockBox) -------------
// La caja de bloque y la geometria de dibujo no pueden divergir (R-G1.1).
const box = TextEditor.getTextBlockBox(ctx, settings(1.5), ['A', 'B', 'C'], 100);
assert.equal(box.y, caja.top, 'la caja arranca en el borde superior de la geometria');
// --- El DIBUJADO usa el mismo modelo (R-G1.1: no basta con que el helper sea
// --- correcto, tiene que ser el que coloca las lineas al pintar) -------------
// Se renderiza de verdad y se toman las baselines que salen del motor.
function renderBaselines(texto, lineHeight) {
    registro = [];
    const canvas = { width: 800, height: 600, style: {}, getContext: function () { return makeCtx2D(); } };
    const s = settings(lineHeight);
    s.text = texto;
    s.canvas.width = 800;
    s.canvas.height = 600;
    // Tope de tamano bajo y fijo: con el lienzo holgado el ajuste automatico
    // nunca llega a tocarlo, asi el tamano de linea es el MISMO con 1 y con
    // 1.5 y lo que se mide es solo el anclaje, no un re-escalado.
    s.canvas.maxFontSize = 5;
    s.fill = {
        active: true,
        layers: [{ id: 'L1', repeat: 'none', alpha: 1, blendmode: 'over',
            styles: [{ type: 'color', color: { r: 255, g: 255, b: 255 } }] }]
    };
    TextEditor.renderToCanvas(canvas, s, { transparent: true });
    const pintadas = registro;
    registro = null;
    const unicas = [];
    pintadas.forEach(function (y) { if (unicas.indexOf(y) === -1) unicas.push(y); });
    return unicas.sort(function (a, b) { return a - b; });
}

const pintadoA = renderBaselines('AA\nBB', 1);
const pintadoB = renderBaselines('AA\nBB', 1.5);
assert.equal(pintadoA.length, 2, 'un texto de dos lineas pinta dos baselines (got ' + pintadoA.length + ')');
assert.equal(pintadoB.length, 2, 'con interlineado 1.5 tambien son dos baselines');
assert.equal(pintadoA[0], pintadoB[0], 'FR-008 pintado: L1 queda en el MISMO sitio con 1 y con 1.5');
assert.ok(pintadoB[1] - pintadoB[0] > pintadoA[1] - pintadoA[0],
    'FR-008 pintado: L2 se separa mas con interlineado 1.5');

// Y con una SOLA linea, mover el interlineado no mueve nada (FR-007).
assert.deepEqual(renderBaselines('AA', 0), renderBaselines('AA', 1.5),
    'FR-007 pintado: una sola linea no se mueve con el interlineado');

console.log('avance de lineas: OK - L1 ancla, avance = lineHeight * tamano de la linea de arriba, sin solapes');
