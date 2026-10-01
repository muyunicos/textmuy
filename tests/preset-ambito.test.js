/* Ambito de presets: el modulo lo nombra 'presets' y el motor/ThumbEngine
 * 'tm-presets' (carpeta uploads/pmu/tm-presets/). RC37 normaliza el alias en
 * api.js: antes CATALOGO_FILE/BASE no tenian clave 'presets' y
 * loadCatalogo('presets') rechazaba SIEMPRE con 'presets:catalogo:sin_puente'
 * (loadPresetById roto y la rama de catalogo de la galeria de presets nunca
 * corrria). Ademas: ambos nombres comparten una sola cache (1 solo fetch). */
const assert = require('node:assert/strict');

let puente = { urls: { presetsBase: 'https://test/tm-presets/', fuentesBase: 'https://test/fonts/', imagenesBase: 'https://test/img/' } };
global.window = { PresetManager: { getBridge: () => puente } };
const C = require('../js/catalog.js');
let peticiones = [];
let data = { thumbs: { w: 200, h: 100, c: 4 }, items: [[1, 'neon-glow', 'custom', 'neon-glow.txm']] };
global.Image = class {
    set src(v) { this.width = 800; this.height = 100; queueMicrotask(() => this.onload()); }
};
global.URL = { createObjectURL: () => 'blob:test' };
global.document = { createElement: () => ({ getContext: () => ({ drawImage: function () {} }) }) };
global.fetch = async function (url) {
    peticiones.push(String(url));
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)), blob: async () => ({}) };
};
require('../js/api.js');
const API = window.TextMuyAPI;

(async function () {
    // 1. 'presets' resuelve (antes rechazaba siempre).
    const parsed = await API.loadCatalogo('presets');
    assert.ok(parsed && parsed.items && parsed.items[1], 'loadCatalogo("presets") lee presets.json');
    assert.equal(parsed.items[1].file, 'neon-glow.txm');
    assert.equal(peticiones[0], 'https://test/tm-presets/presets.json', 'usa presetsBase del puente');

    // 2. Un solo ambito interno: 'presets' y 'tm-presets' comparten cache y
    //    sincronia (cero fetches duplicados, cero caches paralelas).
    const otro = await API.loadCatalogo('tm-presets');
    assert.equal(otro, parsed, 'mismo objeto cacheado para ambos nombres');
    assert.equal(peticiones.length, 1, 'un solo fetch del catalogo');
    assert.ok(API.loadCatalogoSync('tm-presets'), 'catalogo sincronico visible por el nombre canonico');

    // 3. La hoja canonica del ambito acepta el alias y se certifica con la
    //    firma que manda la reconstruccion (op=sprite).
    assert.equal(await API.ensureSpriteCanonico('presets'), null, 'sin firma no acepta la hoja');
    let opciones = null;
    window.ThumbEngine = { ensureSprite: async function (opts) {
        opciones = opts;
        data.thumbs.sprite_firma = opts.firma;
        return { spriteUrl: 'https://test/tm-presets/thumbs.webp' };
    } };
    assert.ok(await API.reconstruirSpriteCanonico('presets'), 'reconstruccion con el alias');
    assert.equal(opciones.scope, 'tm-presets', 'el scope que habla con el motor es tm-presets');
    assert.equal(opciones.firma, C.firmaCatalogo(data.thumbs, data.items), 'manda la firma del catalogo');
    const hoja = await API.ensureSpriteCanonico('presets');
    assert.ok(hoja && hoja.spriteImage, 'tras certificar, la hoja se lee por el alias');
    assert.ok(API.drawTileCanonico('presets', 1), 'tile canonico por id (celda = id-1)');

    console.log('OK: preset-ambito.test.js');
})().catch(function (e) { console.error(e); process.exit(1); });
