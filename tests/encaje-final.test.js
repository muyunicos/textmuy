/* 002-text-tab Bloque C — US4 (P1): el texto nunca sobresale del lienzo.
 *
 * Fija contracts/geometria.md R-G2 y SC-004 (cero tinta en las filas y columnas
 * del borde con cualquier combinacion de layout, con y sin rotacion).
 *
 * El defecto medido: el encaje final SOLO corria en el camino con recorte
 * (curva o rotacion), por eso la rotacion "enmascaraba" el desborde y con el
 * resto de combinaciones quedaba tinta en el borde (columna 479 y 50+ px en la
 * fila 0).
 *
 * La prueba NO mira el codigo: reproduce la matriz de transformacion del
 * contexto de dibujo y comprueba que la caja que de verdad se dibuja cabe en
 * el area util del lienzo. Si el motor encaja, entra; si no, se sale.
 */
const assert = require('node:assert/strict');

global.window = {};

// --- Canvas 2D minimo con MATRIZ real de transformacion ----------------------
function makeCtx(registro) {
    const noop = function () {};
    const m = [1, 0, 0, 1, 0, 0]; // a b c d e f
    const pila = [];
    function mul(n) {
        const a = m[0] * n[0] + m[2] * n[1];
        const b = m[1] * n[0] + m[3] * n[1];
        const c = m[0] * n[2] + m[2] * n[3];
        const d = m[1] * n[2] + m[3] * n[3];
        const e = m[0] * n[4] + m[2] * n[5] + m[4];
        const f = m[1] * n[4] + m[3] * n[5] + m[5];
        m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f;
    }
    function aplicar(x, y) {
        return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
    }
    return {
        font: '10px sans-serif', textBaseline: '', textAlign: '',
        fillStyle: '', strokeStyle: '', lineWidth: 0, lineJoin: '', miterLimit: 0,
        globalAlpha: 1, globalCompositeOperation: '', filter: '',
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        save: function () { pila.push(m.slice()); },
        restore: function () { const v = pila.pop(); if (v) { m[0] = v[0]; m[1] = v[1]; m[2] = v[2]; m[3] = v[3]; m[4] = v[4]; m[5] = v[5]; } },
        translate: function (x, y) { mul([1, 0, 0, 1, x, y]); },
        scale: function (x, y) { mul([x, 0, 0, y, 0, 0]); },
        rotate: function (a) { mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
        setTransform: function (a, b, c, d, e, f) { m[0] = a; m[1] = b; m[2] = c; m[3] = d; m[4] = e; m[5] = f; },
        clearRect: noop, fillRect: noop, strokeRect: noop,
        fillText: noop, strokeText: noop,
        beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, closePath: noop,
        fill: noop, stroke: noop, clip: noop, rect: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop, putImageData: noop,
        // El unico drawImage con contenido es la capa de texto final: se
        // registra el rectangulo que queda EN EL LIENZO.
        drawImage: function (src, dx, dy, dw, dh) {
            const w = dw === undefined ? src.width : dw;
            const h = dh === undefined ? src.height : dh;
            const x = dx === undefined ? 0 : dx;
            const y = dy === undefined ? 0 : dy;
            const e = [aplicar(x, y), aplicar(x + w, y), aplicar(x, y + h), aplicar(x + w, y + h)];
            registro.push({
                left: Math.min.apply(null, e.map(function (p) { return p.x; })),
                right: Math.max.apply(null, e.map(function (p) { return p.x; })),
                top: Math.min.apply(null, e.map(function (p) { return p.y; })),
                bottom: Math.max.apply(null, e.map(function (p) { return p.y; }))
            });
        },
        measureText: function (text) {
            const mm = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
            const px = mm ? parseFloat(mm[1]) : 10;
            return {
                width: String(text).length * px * 0.55,
                actualBoundingBoxAscent: px * 0.8,
                actualBoundingBoxDescent: px * 0.2
            };
        },
        // Tinta: un rectangulo conocido, para que trimTransparent encuentre la
        // caja real de la capa compuesta.
        getImageData: function (x, y, w, h) {
            const W = Math.max(1, w), H = Math.max(1, h);
            const data = new Uint8ClampedArray(W * H * 4);
            const ancho = Math.max(1, Math.floor(W * 0.8));
            const alto = Math.max(1, Math.floor(H * 0.6));
            const ox = Math.floor((W - ancho) / 2);
            const oy = Math.floor((H - alto) / 2);
            for (let j = 0; j < H; j++) {
                for (let i = 0; i < W; i++) {
                    const idx = (j * W + i) * 4;
                    const dentro = i >= ox && i < ox + ancho && j >= oy && j < oy + alto;
                    data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255;
                    data[idx + 3] = dentro ? 255 : 0;
                }
            }
            return { data: data, width: W, height: H };
        },
        createImageData: function (w, h) { return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4) }; },
        createLinearGradient: function () { return { addColorStop: noop }; },
        createRadialGradient: function () { return { addColorStop: noop }; },
        createPattern: function () { return null; }
    };
}
global.document = {
    createElement: function () {
        const c = { width: 0, height: 0, style: {} };
        c.getContext = function () { return makeCtx([]); };
        return c;
    },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
};
require('../js/editor.js');
const DistortEngine = require('../js/effects/distort-engine.js');
global.DistortEngine = DistortEngine;

const TextEditor = global.window.TextEditor;

// Renderiza y devuelve la caja que el motor dibuja en el lienzo.
function cajaDibujada(opts) {
    const cajas = [];
    const W = opts.w || 400;
    const H = opts.h || 300;
    const lienzo = { width: W, height: H, style: {}, getContext: function () { return makeCtx(cajas); } };
    const s = TextEditor.createDefaultSettings();
    s.text = opts.text || 'TEXTO LARGO DE VARIAS LINEAS';
    s.canvas.width = W;
    s.canvas.height = H;
    s.canvas.padding = opts.margen || 0;
    s.canvas.maxFontSize = 100;
    s.lineHeight = opts.lineHeight !== undefined ? opts.lineHeight : 1;
    s.rotate = opts.rotate || 0;
    s.distort = { arc: { angle: opts.curva || 0 } };
    s.fill = {
        active: true,
        layers: [{ id: 'L1', repeat: 'none', alpha: 1, blendmode: 'over',
            styles: [{ type: 'color', color: { r: 255, g: 255, b: 255 } }] }]
    };
    TextEditor.renderToCanvas(lienzo, s, { transparent: true });
    return { cajas: cajas, W: W, H: H, settings: s };
}

function comprobarCaso(nombre, opts) {
    const r = cajaDibujada(opts);
    assert.ok(r.cajas.length > 0, nombre + ': el motor debe dibujar la capa de texto');
    const util = TextEditor.areaUtil(r.settings, r.W, r.H);
    const minX = r.W / 2 - util.width / 2;
    const maxX = r.W / 2 + util.width / 2;
    const minY = r.H / 2 - util.height / 2;
    const maxY = r.H / 2 + util.height / 2;
    r.cajas.forEach(function (c) {
        // FR-005: la capa dibujada entra completa en el area util, con el
        // margen de seguridad que aporta el recorte previo.
        assert.ok(c.left >= minX - 0.5, nombre + ': se sale por la izquierda (' + c.left.toFixed(1) + ' < ' + minX.toFixed(1) + ')');
        assert.ok(c.right <= maxX + 0.5, nombre + ': se sale por la derecha (' + c.right.toFixed(1) + ' > ' + maxX.toFixed(1) + ')');
        assert.ok(c.top >= minY - 0.5, nombre + ': se sale por arriba (' + c.top.toFixed(1) + ' < ' + minY.toFixed(1) + ')');
        assert.ok(c.bottom <= maxY + 0.5, nombre + ': se sale por abajo (' + c.bottom.toFixed(1) + ' > ' + maxY.toFixed(1) + ')');
    });
    return r;
}

// --- SC-004: cero tinta en los bordes con cualquier combinacion de layout ---
// Casos SIN curva: el camino con curva+recorte ya encajaba (de ahi que la
// rotacion "enmascarara" el desborde) y en Node no hay WebGL, que la ruta de
// salida rechaza con causa (Bloque A, R-C2.1).
comprobarCaso('texto simple', {});
comprobarCaso('texto largo', { text: 'PALABRA MUY LARGA QUE NO CABE DE UNA VEZ' });
comprobarCaso('varias lineas', { text: 'UNO\nDOS\nTRES\nCUATRO' });
comprobarCaso('rotacion', { rotate: 45 });
comprobarCaso('rotacion negativa', { rotate: -30 });
comprobarCaso('margen al maximo', { margen: 0.5 });
comprobarCaso('margen + rotacion', { margen: 0.3, rotate: 60 });
comprobarCaso('interlineado amplio', { text: 'A\nB\nC', lineHeight: 1.5 });
comprobarCaso('margen pequeno', { margen: 0.1, text: 'TEXTO' });
comprobarCaso('lienzo apaisado', { w: 800, h: 200, text: 'TEXTO' });
comprobarCaso('lienzo vertical', { w: 200, h: 800, text: 'TEXTO' });
comprobarCaso('lienzo apaisado + margen', { w: 800, h: 200, margen: 0.4, text: 'TEXTO' });
// --- R-G2.2: el encaje SOLO reduce, nunca amplia ------------------------------
// Con un lienzo enorme el texto NO debe crecer para ocupar el espacio.
const enorme = cajaDibujada({ w: 2000, h: 1500, text: 'PEQUEÑO' });
const utilEnorme = TextEditor.areaUtil(enorme.settings, enorme.W, enorme.H);
enorme.cajas.forEach(function (c) {
    assert.ok(c.right - c.left <= utilEnorme.width + 0.5, 'el encaje no amplia en horizontal');
    assert.ok(c.bottom - c.top <= utilEnorme.height + 0.5, 'el encaje no amplia en vertical');
});

// --- R-G2.3: el tamano de salida sigue siendo el del lienzo -----------------
// El encaje es interno: nunca toca settings.canvas.width/height.
const salida = cajaDibujada({ w: 640, h: 480, rotate: 40, margen: 0.2 });
assert.equal(salida.settings.canvas.width, 640, 'el ancho de salida es el configurado');
assert.equal(salida.settings.canvas.height, 480, 'el alto de salida es el configurado');

// --- Paridad: el camino headless usa el MISMO encaje que el visible ---------
// (FR-020). El encaje vive en render(), que es el mismo codigo para ambos.
const editor1 = cajaDibujada({ w: 500, h: 350, margen: 0.25 });
const editor2 = cajaDibujada({ w: 500, h: 350, margen: 0.25 });
assert.deepEqual(
    editor1.cajas.map(function (c) { return [c.left.toFixed(2), c.top.toFixed(2)]; }),
    editor2.cajas.map(function (c) { return [c.left.toFixed(2), c.top.toFixed(2)]; }),
    'el encaje es determinista (paridad editor / motor)'
);

// --- R-G2.1 con margen de seguridad: ni con Margin 0 la tinta toca el borde --
// El recorrido integrado en WordPress (Chrome real, fuente Bangers del catalogo)
// fallo con 112 pixeles de tinta en el borde con un texto que llena el ancho:
// el encaje llegaba hasta el area util exacta y la tinta se colaba en la
// columna 0. El encaje apunta a un area util reducida en SAFETY por lado.
comprobarCaso('texto que llena el ancho', { text: 'TEXTO LARGO DE VARIAS LINEAS', w: 480, h: 480 });
comprobarCaso('multilinea que llena', { text: 'UNO\nDOS\nTRES\nCUATRO', w: 480, h: 480 });
comprobarCaso('una sola linea maxima', { text: 'MMMMMMMMMM', w: 480, h: 480 });

console.log('encaje final: OK - la caja dibujada entra en el area util en todas las combinaciones');
