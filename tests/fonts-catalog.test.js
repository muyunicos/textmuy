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
// Canvas falso que registra lo que se dibuja (para verificar el preview).
const dibujosCanvas = [];
global.document = {
    fonts: null,
    createElement: function() {
        return {
            width: 0,
            height: 0,
            getContext: function() {
                return {
                    fillStyle: '', font: '', textAlign: '', textBaseline: '',
                    fillRect: function() {}, beginPath: function() {}, rect: function() {},
                    clip: function() {}, save: function() {}, restore: function() {},
                    fillText: function(txt, x, y) {
                        dibujosCanvas.push({ txt: txt, font: this.font, w: this._w, x: x, y: y });
                    }
                };
            }
        };
    }
};
// FontFace espia: contar SI se pide el archivo de una fuente fisica.
let fontFaceLlamadas = 0;
global.FontFace = function(name, src) {
    fontFaceLlamadas++;
    this.name = name; this.src = src;
    this.load = function() { return Promise.reject(new Error('sin red')); };
};
global.window.FontFace = global.FontFace;
global.fetch = function() { return Promise.reject(new Error('no net')); };

require('../js/catalog.js');
require('../js/fonts.js');
const CAT = global.window.TextMuyCatalog;
const FL = global.window.FontLoader;
assert.ok(CAT && FL, 'TextMuyCatalog y FontLoader registrados');

// 0. RC39: el catalogo de ejemplo se inyecta por la via real (fetch simulado),
//    para que la resolucion por identidad tenga datos con los que trabajar.
global.fetch = function(url) {
    if (/fonts\.json/.test(String(url))) {
        return Promise.resolve({
            ok: true,
            json: function() {
                return Promise.resolve({ thumbs: { w: 180, h: 30, c: 4 }, items: [
                    [1, 'Bangers', 'display', 'Bangers'],
                    [2, 'Mi Fisica', 'display', 'MiFisica.woff2'],
                    [58, 'MUY-Alegría', 'custom', 'MUY-Alegría.ttf'],
                    [59, 'MUY-Señorita', 'custom', 'MUY-Señorita.ttf'],
                    [3, '', '', '']
                ] });
            }
        });
    }
    return Promise.reject(new Error('no net'));
};

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

// 3. Id sin catalogo -> lanza con causa (fail-fast, sin sustituto).
assert.throws(() => FL.resolveFontFromPreset({ src: 99 }), /fonts:99:/);
assert.throws(() => FL.resolveFontFromPreset('fuente@rara!'), /fuente desconocida/);

(async function() {
    // Catalogo cargado por la via real.
    await FL.loadCatalog();

    // 4. RC39: resolveFontFromPreset devuelve SIEMPRE la identidad NUMERICA de
    //    catalogo, nunca una clave ni un string de familia (R-C1.3). Antes
    //    devolvia 'Press Start 2P' / 'Bangers' tal cual, y ese valor no lo
    //    resolvia el camino de carga.
    assert.equal(FL.resolveFontFromPreset(1), 1);
    assert.equal(FL.resolveFontFromPreset('1'), 1);
    assert.equal(FL.resolveFontFromPreset({ src: 2 }), 2);
    assert.equal(FL.resolveFontFromPreset('Bangers'), 1);
    assert.equal(FL.resolveFontFromPreset({ src: 'Bangers' }), 1);
    //    Titulo con tilde y con ene (caso real de las fuentes del administrador).
    assert.equal(FL.resolveFontFromPreset('MUY-Alegría'), 58);
    assert.equal(FL.resolveFontFromPreset('MUY-Señorita'), 59);

    // 4b. Una entrada con tilde se entrecomilla al componer la familia (R-C3.2):
    //     sin comillas el navegador ignora el valor en silencio.
    assert.equal(FL.getFontFamily(58), '"MUY-Alegría"');
    assert.equal(FL.getFontFamily(1), '"Bangers"');
    //    Una familia con espacios tambien entrecomillada (el bug de la fuente
    //    fantasma): 'Mi Fisica' sin comillas es CSS invalido.
    assert.equal(FL.getFontFamily(2), '"Mi Fisica"');

    // 4c. Titulo ambiguo -> error de ambiguedad, no eleccion arbitraria (R-C1.1).
    global.fetch = function(url) {
        if (/fonts\.json/.test(String(url))) {
            return Promise.resolve({
                ok: true,
                json: function() {
                    return Promise.resolve({ thumbs: { w: 180, h: 30, c: 4 }, items: [
                        [1, 'Dup', 'display', 'Dup'],
                        [2, 'Dup', 'display', 'Dup2.ttf']
                    ] });
                }
            });
        }
        return Promise.reject(new Error('no net'));
    };
    await FL.invalidateCatalog();
    assert.throws(() => FL.resolveFontFromPreset('Dup'), /titulo ambiguo/);

    // 5. loadFont con id inexistente -> Promise rechazada con causa.
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
    //    Para esta comprobacion el fetch vuelve a fallar a proposito, y se
    //    invalida antes para no arrastrar la promesa cacheada del punto 4c.
    global.fetch = function() { return Promise.reject(new Error('no net')); };
    await FL.invalidateCatalog();
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
            optsSprite = opts;
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
    let optsSprite = null;
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

    // 11. RC37: la reticula de la hoja sale del catalogo (thumbs), no de un
    //     literal 180x30, y la peticion lleva la FIRMA del catalogo (sin firma
    //     el motor escribe sprite_firma='' y la hoja queda INcertificable).
    //     Aqui el catalogo vuelve a estar disponible (la seccion 7 lo dejo
    //     caido a proposito y 4c lo sustituyo por el de ambiguedad).
    global.fetch = function(url) {
        if (/fonts\.json/.test(String(url))) {
            return Promise.resolve({
                ok: true,
                json: function() {
                    return Promise.resolve({ thumbs: { w: 180, h: 30, c: 4 }, items: [
                        [1, 'Bangers', 'display', 'Bangers'],
                        [2, 'Mi Fisica', 'display', 'MiFisica.woff2']
                    ] });
                }
            });
        }
        return Promise.reject(new Error('no net'));
    };
    await FL.invalidateCatalog();
    assert.deepEqual(FL.getCatalogThumbs(), { w: 180, h: 30, c: 4 }, 'getCatalogThumbs desde fonts.json');
    assert.ok(optsSprite, 'ensureFontsSprite llamo a ThumbEngine');
    assert.equal(optsSprite.ancho, 180, 'ancho desde thumbs');
    assert.equal(optsSprite.alto, 30, 'alto desde thumbs');
    assert.equal(optsSprite.columnas, 4, 'columnas desde thumbs');
    assert.ok(typeof optsSprite.firma === 'string' && optsSprite.firma.length > 0,
        'la hoja se persiste certificada (firma del catalogo)');

    // 12. RC37: renderFontPreview con cargar:false dibuja SIN tocar la red ni
    //     FontFace. Es lo que usa la galeria: abrir el panel ya no descarga las
    //     fuentes fisicas del catalogo (antes: las 15, ~1,4 MB).
    const antes = fontFaceLlamadas;
    const cvSinCarga = await FL.renderFontPreview({ key: '2', name: 'Mi Fisica' }, 180, 30, { cargar: false });
    assert.ok(cvSinCarga, 'el preview sin carga se dibuja igual');
    assert.equal(fontFaceLlamadas, antes, 'cargar:false no pide el archivo de la fuente');
    assert.ok(dibujosCanvas.length > 0, 'el preview escribio el nombre en el canvas');
    //     Control positivo: sin la opcion, la fuente fisica SI se carga (1).
    //     RC39: la entrada del registro lleva identidad numerica, porque la
    //     carga se hace por identidad y no por clave de texto.
    FL.registry['fis-test'] = { id: 90001, name: 'Fis Test', path: 'https://test/fonts/fis.ttf', isCustom: true };
    const antesCarga = fontFaceLlamadas;
    await FL.renderFontPreview({ key: 'fis-test', name: 'Fis Test' }, 180, 30);
    assert.equal(fontFaceLlamadas, antesCarga + 1, 'cargar (default) si carga la fuente fisica');

    console.log('OK: fonts-catalog.test.js');
})().catch(function(e) { console.error(e.message); process.exit(1); });