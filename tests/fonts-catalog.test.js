/* Fonts-catalog: wiring de fonts.js hacia el parser unico (js/catalog.js).
 * Formato canonico (constitucion IV v2.1): {thumbs:{w,h,c},
 * items:[[id,title,cats,file],...]} con id numerico >= 1; libre =
 * tombstone [id,"","",""]; clases ok/free/invalid con causa.
 * Las tuplas string/objetos siguen siendo legacy -> invalid con causa.
 * `font.src` de preset es canonico como STRING (titulo del catalogo o spec
 * Google); resolveFontFromPreset lo resuelve por titulo o lo pasa tal cual.
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
// 4. resolveFontFromPreset: font.src string canonico -> se resuelve (mapa
//    TextStudio, titulo del catalogo o spec Google tal cual).
assert.equal(FL.resolveFontFromPreset({ src: 'Nintender Regular' }), 'Press Start 2P');
assert.equal(FL.resolveFontFromPreset('Bangers'), 'Bangers');
//    Un string que no es titulo/mapa/spec Google si se rechaza con causa.
assert.throws(() => FL.resolveFontFromPreset('fuente@rara!'), /fuente desconocida/);

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

    // 7. RC35: un fallo de fonts.json NO queda cacheado (el proximo load
    //    reintenta; sin esto un 404/red transitorio dejaba el catalogo muerto).
    const fallo1 = FL.loadCatalog();
    await fallo1; // fetchCatalog traga el error y resuelve con lo que haya
    assert.notEqual(FL.loadCatalog(), fallo1, 'fallo de catalogo -> el proximo load crea una promesa nueva');

    // 8. RC35: ensureFontsSprite arma los items del manifiesto con nombre
    //    STRING (los ids del catalogo son numeros: el lookup de tile es ===
    //    estricto) y deduplica el registry contra el catalogo (identidad =
    //    archivo fisico / id), para no llevar la misma fuente DOS veces.
    global.window.ThumbEngine = {
        ensureSprite: function (opts) {
            itemsSprite = opts.items;
            return Promise.resolve({ spriteUrl: 'fonts/thumbs.webp', manifest: { tiles: [] } });
        },
        tile: function () { return null; },
        drawTile: function () { return false; },
        invalidate: function () { invalidaciones++; }
    };
    global.fetch = function (url) {
        if (/fonts\.json/.test(String(url))) {
            return Promise.resolve({
                ok: true,
                json: function () {
                    return Promise.resolve({ thumbs: { w: 180, h: 30, c: 4 }, items: [
                        [1, 'Bangers', 'display', 'Bangers'],
                        [2, 'Mi Fisica', 'display', 'MiFisica.woff2']
                    ] });
                }
            });
        }
        return Promise.reject(new Error('no net'));
    };
    let itemsSprite = null;
    let invalidaciones = 0;
    await FL.invalidateCatalog();       // relee fonts.json con el stub
    await FL.ensureFontsSprite();
    assert.ok(itemsSprite && itemsSprite.length >= 2, 'ensureFontsSprite produjo items');
    assert.deepEqual(itemsSprite.map(function (i) { return i.nombre; }), ['1', '2'],
        'items con nombre STRING y sin duplicar el registry (user-2 ya esta como id 2)');
    assert.ok(invalidaciones === 0, 'ensureFontsSprite no debe invalidar la hoja (solo leerla)');

    // 9. RC35: unregisterCustomFont quita la fuente SOLO en memoria (sin op=baja:
    //    el renombre/movimiento ya resolvio el fisico en el motor).
    FL.registry['server-test'] = { name: 'Test', serverFile: 'test.ttf', isServer: true };
    assert.equal(FL.unregisterCustomFont('server-test'), true, 'registry tiene la entrada');
    assert.ok(!FL.registry['server-test'], 'unregisterCustomFont la quito del registry');
    assert.equal(FL.unregisterCustomFont('server-test'), false, 'reintentar sobre una entrada ausente -> false');

    // 10. RC35: deleteCustomFont devuelve Promise<boolean> y NUNCA rechaza
    //     (sin puente -> false; sin baja local ni POST).
    const resBaja = await FL.deleteCustomFont('no-existe');
    assert.equal(resBaja, false, 'sin puente/entrada -> false');
    assert.ok(FL.deleteCustomFont('no-existe') instanceof Promise, 'siempre Promise');

    console.log('OK: fonts-catalog.test.js');
})().catch(function(e) { console.error(e.message); process.exit(1); });