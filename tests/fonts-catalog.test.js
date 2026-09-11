/* Fonts-catalog: wiring de fonts.js hacia el parser unico (js/catalog.js).
 * Formato canonico (constitucion IV v2.1): {thumbs:{w,h,c},
 * items:[[id,title,cats,file],...]} con id numerico >= 1; libre =
 * tombstone [id,"","",""]; clases ok/free/invalid con causa.
 * Legacy (tuplas string, objetos, font.src string) -> rechazo con
 * causa y accion "re-guardar el preset" (ruptura total Q4).
 */
const assert = require('node:assert/strict');

// Stubs minimos para cargar fonts.js (IIFE de navegador) en Node.
global.window = {};
global.localStorage = { getItem: function() { return null; }, setItem: function() {} };
global.document = { fonts: null, createElement: function() { return {}; } };
global.fetch = function() { return Promise.reject(new Error('no net')); };

require('../js/catalog.js');
require('../js/fonts.js');
const CAT = global.window.TextMuyCatalog;
const FL = global.window.FontLoader;
assert.ok(CAT && FL, 'TextMuyCatalog y FontLoader registrados');

// 1. Parser unico: tupla numerica ok (Google y fisica) + tombstone libre.
const p = CAT.parseCatalog({ thumbs: { w: 180, h: 30, c: 4 }, items: [
    [1, 'Bangers', 'display', 'Bangers'],
    [2, 'Mi Fisica', 'display', 'MiFisica.woff2'],
    [3, '', '', '']
] }, 'fonts');
assert.equal(p.items[1].titulo, 'Bangers');
assert.equal(p.items[1].online, true);
assert.equal(p.items[2].online, false);
assert.deepEqual(p.libres, [3]);

// 2. Tuplas legacy -> invalid con causa id no numerico (ruptura Q4).
const rLegacy = CAT.classifyEntry(['Montserrat', 'M', 'sans-serif', 'Montserrat:wght@400'], { ambito: 'fonts', pos: 0 });
assert.equal(rLegacy.status, 'invalid');
assert.match(rLegacy.reason, /id no numerico/);
assert.equal(CAT.classifyEntry({ nombre: 'O', titulo: 'O', categoria: 'c', google: 'O' }, { ambito: 'fonts', pos: 0 }).status, 'invalid');
assert.equal(CAT.classifyEntry([1, 'A', 'c', 'a.webp'], { ambito: 'img', pos: 0 }).status, 'ok');
assert.match(CAT.classifyEntry([1, 'A', 'c', 'AlgoSinExt'], { ambito: 'img', pos: 0 }).reason, /google solo valido en fonts/);

// 3. resolveFontFromPreset: id sin catalogo cargado -> lanza fonts:<id>.
assert.throws(() => FL.resolveFontFromPreset({ src: 99 }), /fonts:99:/);
// 4. resolveFontFromPreset: string legacy -> lanza pidiendo re-guardar.
assert.throws(() => FL.resolveFontFromPreset({ src: 'Nintender Regular' }), /legacy/);
assert.throws(() => FL.resolveFontFromPreset('Bangers'), /legacy/);

// 5. loadFont con id inexistente -> Promise rechazada con causa.
(async function() {
    try {
        await FL.loadFont(424242);
        throw new Error('loadFont debio rechazar');
    } catch (e) {
        assert.match(String(e && e.message || e), /fonts:424242:/);
    }

    // 6. requireId: libre / inexistente lanzan; ok devuelve entry.
    assert.throws(() => CAT.requireId(p, 'fonts', 3), /fonts:3:libre/);
    assert.throws(() => CAT.requireId(p, 'fonts', 40), /fonts:40:/);
    assert.equal(CAT.requireId(p, 'fonts', 1).file, 'Bangers');

    console.log('OK: fonts-catalog.test.js');
})().catch(function(e) { console.error(e.message); process.exit(1); });