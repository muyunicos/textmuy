const assert = require('node:assert/strict');
const listeners = {};
const pasos = [];
let hojaLocal = { vieja: true };
let terminarCatalogo;
global.CustomEvent = class { constructor(type, opts) { this.type = type; this.detail = opts.detail; } };
global.window = {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    ThumbEngine: { invalidate(ambito) { pasos.push('thumb:' + ambito); } },
    TextMuyAPI: {
        invalidarSpriteCanonico(ambito) { pasos.push('sprite:' + ambito); },
        invalidarCatalogo(ambito) { pasos.push('api:' + ambito); }
    },
    FontLoader: { invalidateCatalog() {
        pasos.push('fonts:inicio');
        return new Promise(resolve => { terminarCatalogo = () => { pasos.push('fonts:fin'); resolve(); }; });
    } }
};
global.document = { fonts: null };
require('../js/catalog.js');
require('../js/preset-manager.js');
const C = window.TextMuyCatalog;
const PM = window.PresetManager;
window.addEventListener('textmuy:sprite-invalidado', ev => {
    pasos.push('vista:' + ev.detail.ambito);
    hojaLocal = null;
});
(async function () {
    const cat = C.parseCatalog({ items: [[1, 'Fondo', 'fondos', 'a.png']] }, 'img');
    const salida = C.itemsGaleriaImg(cat, { tab: 'fondos', puente: [
        { id: 1, nombre: 'a.png', categoria: 'fondos' }
    ] });
    assert.equal(salida.items.length, 1);
    assert.equal(salida.items[0].imgId, 1);
    let terminada = false;
    const p = PM.invalidarSprite('fonts').then(() => { terminada = true; });
    assert.equal(hojaLocal, null, 'evento descarta la hoja local antes de releer');
    assert.deepEqual(pasos, ['thumb:fonts', 'sprite:fonts', 'api:fonts', 'vista:fonts', 'fonts:inicio']);
    await Promise.resolve();
    assert.equal(terminada, false, 'la invalidacion espera la relectura');
    terminarCatalogo();
    await p;
    assert.equal(terminada, true);
    pasos.length = 0;
    await PM.invalidarSprite('img');
    assert.deepEqual(pasos, ['thumb:img', 'sprite:img', 'api:img', 'vista:img']);
    console.log('OK: invalidacion.test.js (API publica + evento + espera)');
})().catch(e => { console.error(e); process.exitCode = 1; });
