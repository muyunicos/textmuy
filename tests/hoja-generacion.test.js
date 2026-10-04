/* Generacion de la hoja (spec 009, US2 / T021): el nucleo de dos fases de
 * TextMuyAPI.asegurarHojaCompleta, con stubs de fetch/ThumbEngine.
 *
 * Antes de esta suite NADA cubria el nucleo de generacion, y los tests
 * existentes simulaban un motor que SI certificaba la hoja: por eso el fallo
 * real (el motor PHP solo certificaba `img`) paso inadvertido con las 23
 * suites en verde. Aqui se cubre el contrato del cliente:
 *   I2  exactamente 1 escritura por ambito y apertura, y solo si fallos = 0
 *   I3  con algun fallo: 0 escrituras (nunca una hoja con celdas sin dibujar)
 *   I4  reentrancia: 2 llamadas concurrentes => 1 sola escritura
 *   I5  las celdas ya cubiertas por la hoja vigente no se vuelven a dibujar
 *   I6  el fallo informa ambito + causa exacta, sin mensajes genericos
 *   +   los items van 1..maxId (celda = id-1) porque el motor mide el ALTO de
 *       la hoja contra maxId, no contra count(items)
 */
const assert = require('node:assert/strict');

let puente = { urls: { fuentesBase: 'https://test/fonts/' }, nonces: { motor: 'n' } };
global.window = { PresetManager: { getBridge: () => puente } };
const C = require('../js/catalog.js');

const THUMBS = { w: 180, h: 30, c: 4 };
const ITEMS = [
    [1, 'Bangers', 'display', 'Bangers'],
    [2, 'Marker', 'handwriting', 'Marker'],
    [3, 'MUY-Alegria', 'custom', 'MUY-Alegria.ttf'],
];
let data = { thumbs: Object.assign({}, THUMBS), items: ITEMS.map(i => i.slice()) };
let ancho = 720, alto = 30;   // 4x180 x ceil(3/4)=1 fila -> 720x30
let peticiones = [], escrituras = [];

global.Image = class {
    set src(value) {
        this.width = ancho; this.height = alto;
        queueMicrotask(() => this.onload && this.onload());
    }
};
global.URL = { createObjectURL: () => 'blob:test' };
global.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
global.fetch = async (url) => {
    peticiones.push(String(url));
    // La hoja solo se sirve si el catalogo la declara certificada.
    if (String(url).indexOf('thumbs.webp') >= 0 && !data.thumbs.sprite_firma) {
        return { ok: false };
    }
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)), blob: async () => ({}) };
};
require('../js/api.js');
const API = window.TextMuyAPI;

// ThumbEngine simulado: cuenta escrituras. `certifica` deja el catalogo
// certificado (como hace el motor real tras un POST aceptado).
function instalarThumbEngine(opts) {
    opts = opts || {};
    window.ThumbEngine = {
        ensureSprite: async function (o) {
            escrituras.push(o);
            if (opts.falla) return null;
            if (opts.certifica) data.thumbs.sprite_firma = o.firma;
            return { spriteUrl: 'https://test/fonts/thumbs.webp' };
        }
    };
}
// Las celdas dibujadas se cachean por sesion en el nucleo (evita volver a
// pedir una fuente ya pintada), asi que reiniciar debe descartar esa cache
// tambien: si no, una celda dibujada en el caso 1 aparece "cubierta" en el 3
// y el conteo de pendientes sale 0.
function invalidarDibujados() {
    return API.invalidarDibujados();
}
function reiniciar() {
    escrituras = [];
    peticiones = [];
    data.thumbs = Object.assign({}, THUMBS);
    data.items = ITEMS.map(i => i.slice());
    API.invalidarSpriteCanonico('fonts');
    API.invalidarCatalogo('fonts');
    invalidarDibujados();
    puente = { urls: { fuentesBase: 'https://test/fonts/', imagenesBase: 'https://test/img/', presetsBase: 'https://test/tm-presets/' }, nonces: { motor: 'n' } };
}
const celda = id => ({ w: 180, h: 30, id });

(async function () {
    // ---------------------------------------------------------------------
    // 1. Sin hoja certificada: dibuja las 3 celdas y escribe UNA vez (I2).
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    let dibujadas = [];
    const progresos = [];
    const r1 = await API.asegurarHojaCompleta('fonts', {
        renderTile: function (it) { dibujadas.push(it.id); return celda(it.id); },
        onProgress: (h, t, f) => progresos.push([h, t, f])
    });
    assert.equal(r1.estado, 'generado', 'sin hoja => estado generado');
    assert.equal(r1.fallos, 0, 'sin fallos');
    assert.equal(escrituras.length, 1, 'I2: exactamente 1 escritura');
    assert.deepEqual(dibujadas, [1, 2, 3], 'dibuja las 3 celdas del catalogo');
    assert.deepEqual(progresos, [[1, 3, 0], [2, 3, 0], [3, 3, 0]], 'progreso N/M por celda');

    // Los items llegan 1..maxId con hueco estable: el motor mide el ALTO de la
    // hoja contra maxId, no contra count(items) (celda = id-1).
    const o1 = escrituras[0];
    assert.deepEqual(o1.items.map(i => i.id), [1, 2, 3], 'items = ids 1..maxId en orden');
    assert.equal(o1.ancho, 180, 'ancho = thumbs.w');
    assert.equal(o1.alto, 30, 'alto = thumbs.h');
    assert.equal(o1.columnas, 4, 'columnas = thumbs.c');
    assert.equal(o1.firma, C.firmaCatalogo(data.thumbs, data.items), 'manda la firma del catalogo');
    // El canvas de F1 se reutiliza en F2 (sin volver a pedir la fuente).
    const pintado = await o1.render(o1.items[0], 180, 30);
    assert.deepEqual(pintado, { w: 180, h: 30, id: 1 }, 'F2 reutiliza el canvas de F1');

    // ---------------------------------------------------------------------
    // 2. Hoja ya certificada: 0 descargas y 0 escrituras (I1).
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    data.thumbs.sprite_firma = C.firmaCatalogo(data.thumbs, data.items);
    let dibujadas2 = [];
    const r2 = await API.asegurarHojaCompleta('fonts', {
        renderTile: function (it) { dibujadas2.push(it.id); return celda(it.id); }
    });
    assert.equal(r2.estado, 'listo', 'con hoja certificada => listo');
    assert.equal(dibujadas2.length, 0, 'I1: 0 celdas dibujadas (0 descargas)');
    assert.equal(escrituras.length, 0, 'I1: 0 escrituras');

    // ---------------------------------------------------------------------
    // 3. Un fallo => 0 escrituras (I3): nunca se persiste una hoja con celdas
    //    sin dibujar, porque condenaria esas celdas para siempre.
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    const r3 = await API.asegurarHojaCompleta('fonts', {
        renderTile: function (it) { return it.id === 2 ? null : celda(it.id); }
    });
    assert.equal(r3.estado, 'error', 'con un fallo => error (no "generado")');
    assert.equal(r3.fallos, 1, 'cuenta el fallo');
    assert.equal(escrituras.length, 0, 'I3: con fallos NO se escribe la hoja');
    assert.equal(r3.causa, 'fonts:hoja:celdas:1:pendientes', 'I6: causa con ambito y motivo');

    // ---------------------------------------------------------------------
    // 4. Motor que rechaza => error con causa exacta, sin mensaje generico.
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ falla: true });
    const r4 = await API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) });
    assert.equal(r4.estado, 'error', 'motor rechaza => error');
    assert.equal(r4.causa, 'fonts:hoja:motor:rechazo', 'causa exacta');

    // ---------------------------------------------------------------------
    // 5. Reentrancia: dos llamadas concurrentes => 1 sola escritura (I4).
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    const [a, b] = await Promise.all([
        API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) }),
        API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) })
    ]);
    assert.equal(escrituras.length, 1, 'I4: dos llamadas concurrentes => 1 escritura');
    assert.equal(a.estado, 'generado'); assert.equal(b.estado, 'generado');

    // Ciclo completo de SC-002: la primera apertura escribe y certifica; la
    // siguiente ya lee la hoja y no vuelve a escribir.
    reiniciar();
    instalarThumbEngine({ certifica: true });
    await API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) });
    assert.equal(escrituras.length, 1, 'primera apertura: 1 escritura');
    data.thumbs.sprite_firma = C.firmaCatalogo(data.thumbs, data.items);
    const r6 = await API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) });
    assert.equal(escrituras.length, 1, 'siguiente apertura: 0 escrituras nuevas');
    assert.equal(r6.estado, 'listo');

    // ---------------------------------------------------------------------
    // 6. Sin puente: error con causa, sin red ni escrituras.
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    puente = null;
    const nAntes = peticiones.length;
    const r7 = await API.asegurarHojaCompleta('fonts', { renderTile: (it) => celda(it.id) });
    assert.equal(r7.estado, 'error');
    assert.equal(r7.causa, 'fonts:hoja:sin_puente');
    assert.equal(peticiones.length, nAntes, 'sin puente: 0 peticiones');
    assert.equal(escrituras.length, 0, 'sin puente: 0 escrituras');

    // ---------------------------------------------------------------------
    // 7. Huecos del catalogo: un tombstone no se dibuja ni ocupa celda.
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    data.items = [[1, 'A', 'custom', 'A.ttf'], [2, '', '', ''], [3, 'B', 'custom', 'B.ttf']];
    let dibujadas3 = [];
    await API.asegurarHojaCompleta('fonts', {
        renderTile: function (it) { dibujadas3.push(it.id); return celda(it.id); }
    });
    assert.deepEqual(dibujadas3, [1, 3], 'el tombstone (id=2) no se dibuja');
    assert.deepEqual(escrituras[0].items.map(i => i.id), [1, 2, 3], 'el hueco se mantiene en items');

    // ---------------------------------------------------------------------
    // 8. Un render que NUNCA resuelve no debe colgar la galeria: la celda se
    //    cuenta como fallo al vencer el tope y la hoja NO se persiste (I3).
    //    Sin este tope, `asegurarHojaCompleta` no resolvia nunca y las galerias
    //    se quedaban congeladas (0 tiles / sin repintado).
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    const r8 = await API.asegurarHojaCompleta('fonts', {
        timeoutMs: 40,
        renderTile: function (it) {
            if (it.id === 2) return new Promise(function () { /* nunca resuelve */ });
            return Promise.resolve(celda(it.id));
        }
    });
    assert.equal(r8.estado, 'error', 'render colgado => error, no cuelgue');
    assert.equal(r8.fallos, 1, 'la celda colgada cuenta como fallo');
    assert.equal(escrituras.length, 0, 'I3: con una celda colgada NO se escribe');

    // ---------------------------------------------------------------------
    // 9. `timeoutMs` ausente usa el tope por defecto (no cuelga tampoco), y un
    //    render que lanza se trata igual que uno que devuelve null.
    // ---------------------------------------------------------------------
    reiniciar();
    instalarThumbEngine({ certifica: true });
    const r9 = await API.asegurarHojaCompleta('fonts', {
        timeoutMs: 30,
        renderTile: function (it) {
            if (it.id === 1) throw new Error('boom');
            return Promise.resolve(celda(it.id));
        }
    });
    assert.equal(r9.estado, 'error', 'render que lanza => error');
    assert.equal(r9.fallos, 1);
    assert.equal(escrituras.length, 0);

    // ---------------------------------------------------------------------
    // 10. `img`: el render POR DEFECTO (sin renderTile) debe pedir el original
    //     de la celda y devolverlo como Image. Antes devuelto null para este
    //     ambito (se asumia que ThumbEngine resolvia solo), y como F1 invoca el
    //     render directamente, las 128 celdas de `img` contaban como fallo y la
    //     hoja jamas se persistia.
    // ---------------------------------------------------------------------
    reiniciar();
    data.items = [[1, 'Fondo', 'fondos', 'a.svg'], [2, 'Icono', 'iconos', 'b.svg']];
    instalarThumbEngine({ certifica: true });
    global.Image = class {
        constructor() { this.width = 40; this.height = 30; }
        set src(v) { this._src = v; queueMicrotask(() => this.onload && this.onload()); }
    };
    const r10 = await API.asegurarHojaCompleta('img');
    assert.equal(r10.estado, 'generado', 'img: con render por defecto => genera');
    assert.equal(r10.fallos, 0, 'img: 0 fallos');
    assert.equal(escrituras.length, 1, 'img: 1 escritura');
    const o10 = escrituras[0];
    assert.equal(o10.pad, true, 'img: pad para encajar el original');
    assert.equal(o10.items.length, 2);
    assert.equal(o10.items[0].url, 'https://test/img/a.svg', 'img: el item lleva la URL del original (base imagenesBase)');

    console.log('OK: hoja-generacion.test.js');
})().catch(function (e) { console.error(e); process.exit(1); });