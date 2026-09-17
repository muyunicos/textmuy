const assert = require('node:assert/strict');
let puente = { urls: { imagenesBase: 'https://test/img/' } };
global.window = { PresetManager: { getBridge: () => puente } };
const C = require('../js/catalog.js');
let data = { thumbs: { w: 100, h: 100, c: 2 }, items: [
    [1, 'A', 'fondos', 'a.png'], [2, '', '', ''], [3, 'B', 'iconos', 'b.png']
] };
let ancho = 200, alto = 200, peticiones = [], dibujos = [], opciones;
global.Image = class {
    set src(value) { this.width = ancho; this.height = alto; queueMicrotask(() => this.onload()); }
};
global.URL = { createObjectURL: () => 'blob:test' };
global.document = { createElement: () => ({ getContext: () => ({ drawImage: (...args) => dibujos.push(args) }) }) };
global.fetch = async url => {
    peticiones.push(url);
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)), blob: async () => ({}) };
};
require('../js/api.js');
const API = window.TextMuyAPI;
function invalidar() { API.invalidarSpriteCanonico('img'); API.invalidarCatalogo('img'); }
(async function () {
    assert.equal(await API.ensureSpriteCanonico('img'), null, 'sin firma no acepta hoja');
    assert.equal(peticiones.length, 1, 'sin firma no descarga sprite');
    data.thumbs.sprite_firma = C.firmaCatalogo(data.thumbs, data.items);
    invalidar();
    const hoja = await API.ensureSpriteCanonico('img');
    assert.ok(hoja);
    const n = peticiones.length;
    assert.equal(await API.ensureSpriteCanonico('img'), hoja);
    assert.equal(peticiones.length, n, 'reutiliza cache');
    const cv = API.drawTileCanonico('img', 3);
    assert.equal(cv.width, 100);
    assert.deepEqual(dibujos[0].slice(1, 5), [0, 100, 100, 100], 'tile=id-1');
    assert.equal(API.drawTileCanonico('img', 10), null, 'fuera de hoja');
    invalidar();
    assert.equal(API.drawTileCanonico('img', 1), null, 'cache descartada');
    ancho = 201;
    assert.equal(await API.ensureSpriteCanonico('img'), null, 'reticula incorrecta');
    ancho = 200;
    data.thumbs.sprite_firma = 'vieja';
    invalidar();
    assert.equal(await API.ensureSpriteCanonico('img'), null, 'firma vieja');
    window.ThumbEngine = { ensureSprite: async opts => {
        opciones = opts;
        data.thumbs.sprite_firma = opts.firma;
        return { spriteUrl: 'https://test/img/thumbs.webp' };
    } };
    assert.ok(await API.reconstruirSpriteCanonico('img'));
    assert.deepEqual(opciones.items.map(i => i.nombre), ['1', '2', '3']);
    assert.equal(opciones.items[1].url, undefined, 'hueco estable');
    assert.equal(opciones.items[2].url, 'https://test/img/b.png');
    assert.equal(opciones.firma, C.firmaCatalogo(data.thumbs, data.items));
    assert.equal(opciones.pad, true);
    assert.equal(API.loadCatalogoSync('img'), null, 'reconstruccion obliga a releer certificacion');
    puente = null;
    assert.equal(await API.ensureSpriteCanonico('img'), null, 'sin puente no opera');
    console.log('OK: sprite-canonico.test.js');
})().catch(e => { console.error(e); process.exitCode = 1; });
