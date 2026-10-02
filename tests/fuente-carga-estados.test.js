/* RC39 (001-fix-bugs-01) - US1: ciclo de carga de una fuente.
 *
 * Fija el ciclo de vida de data-model §2 (no solicitada -> pendiente ->
 * disponible | fallida) y, sobre todo, tres reglas que antes NO se cumplian:
 *   - un fallo NO marca la fuente como disponible y deja el estado
 *     REINTENTABLE: antes el fallback marcaba 'loaded' y un problema
 *     transitorio de red se volvia permanente (R-C2.2);
 *   - un fallo NO carga ninguna otra fuente: antes caia en silencio a la
 *     fuente por defecto y el usuario veia "Bangers" sin haberla elegido
 *     (R-C2.1, constitucion VI);
 *   - dos peticiones simultaneas comparten una sola descarga (R-C2.3).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    // document.fonts simulado: la familia Google se considera disponible
    // (se devuelve una cara), para poder distinguir el fallo de una fuente
    // FISICA (red caida) del de una fuente de catalogo publico.
    fonts: {
        add: function () {},
        load: function (spec) {
            if (/Bangers/.test(spec)) return Promise.resolve([{ family: 'Bangers' }]);
            return Promise.resolve([]);
        }
    },
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [{ appendChild: () => {} }]
};

let fontFaceLlamadas = [];
let redFalla = true;   // la fuente fisica no descarga mientras sea true
global.FontFace = function (name, src) {
    fontFaceLlamadas.push({ name, src });
    this.name = name; this.src = src;
    const self = this;
    this.load = function () {
        if (redFalla) return Promise.reject(new Error('sin red'));
        return Promise.resolve({ family: name, add: function () {} });
    };
};
global.window.FontFace = global.FontFace;

const CATALOGO = {
    thumbs: { w: 180, h: 30, c: 4 },
    items: [
        [1, 'Bangers', 'display', 'Bangers'],
        [2, 'Mi Fisica', 'custom', 'MiFisica.woff2']
    ]
};
global.fetch = function (url) {
    if (/fonts\.json/.test(String(url))) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CATALOGO) });
    }
    return Promise.reject(new Error('no net'));
};

require('../js/catalog.js');
require('../js/fonts.js');
const FL = global.window.FontLoader;

(async function () {
    await FL.loadCatalog();
    // El archivo de la fuente fisica se resuelve contra la base del puente;
    // sin puente no hay URL, asi que se registra una directa para poder probar
    // el ciclo de carga sin depender del plugin.
    FL.registry['user-2'] = {
        id: 2, name: 'Mi Fisica', path: 'https://ejemplo.test/fuentes/MiFisica.woff2',
        isCustom: true, isUserFile: true
    };

    // 1. Estado inicial: la fuente existe pero nadie la pidio.
    assert.equal(FL.getFontState(2), 'no solicitada', 'estado inicial');
    assert.equal(FL.getFontFailure(2), null, 'sin causa sin fallo');

    // 2. Un fallo deja el estado en 'fallida' CON CAUSA y NO en disponible.
    let fallo = null;
    try {
        await FL.loadFont(2);
        throw new Error('loadFont debio rechazar con la red caida');
    } catch (e) { fallo = e; }
    assert.ok(fallo, 'la carga fallo');
    assert.match(String(fallo.message), /fonts:2:/, 'la causa lleva ambito e identidad');
    assert.equal(FL.getFontState(2), 'fallida', 'estado fallida, no disponible');
    assert.ok(FL.getFontFailure(2), 'la causa queda consultable');
    assert.match(String(FL.getFontFailure(2)), /Mi Fisica/, 'la causa nombra la fuente');

    // 3. R-C2.1: el fallo NO cargo ninguna otra fuente. Ni una peticion a
    //    Google ni una FontFace de la fuente por defecto.
    const peticionesTrasFallo = fontFaceLlamadas.length;
    assert.ok(peticionesTrasFallo > 0, 'se intento la fuente pedida');
    const familias = fontFaceLlamadas.map((f) => f.name);
    assert.ok(!familias.includes('Bangers'),
        'el fallo no debio cargar la fuente por defecto en su lugar');
    assert.ok(familias.every((f) => f === 'Mi Fisica'),
        'solo se intento la fuente declarada');

    // 4. R-C2.2: el fallo es REINTENTABLE. Con la red de vuelta, un reintento
    //    vuelve a intentarlo y deja la fuente disponible.
    redFalla = false;
    const familia = await FL.loadFont(2);
    assert.equal(familia, 'Mi Fisica', 'el reintento devuelve la familia pedida');
    assert.equal(FL.getFontState(2), 'disponible', 'tras el reintento la fuente queda disponible');
    assert.equal(FL.getFontFailure(2), null, 'la causa se limpia al tener exito');

    // 5. R-C2.3: dos peticiones concurrentes comparten una sola descarga.
    //    Con la fuente ya disponible no hay descarga; se mide el caso de una
    //    fuente que aun no se pedia.
    const antes = fontFaceLlamadas.length;
    const [a, b] = await Promise.all([FL.loadFont(1), FL.loadFont(1)]);
    assert.equal(a, 'Bangers', 'primera peticion');
    assert.equal(b, 'Bangers', 'segunda peticion comparte la carga');
    // Una sola peticion de red por familia (no se duplica la descarga).
    assert.ok(fontFaceLlamadas.length - antes <= 1,
        'dos peticiones simultaneas no descargan dos veces');

    // 6. Una fuente que no existe falla con causa, sin sustituto.
    let e2 = null;
    try { await FL.loadFont(7777); } catch (e) { e2 = e; }
    assert.ok(e2, 'una identidad inexistente rechaza');
    assert.match(String(e2.message), /fonts:7777:/, 'la causa lleva la identidad');

    // 7. R-C2.4: invalidar el catalogo descarta lo que se sabia de las fuentes.
    await FL.invalidateCatalog();
    assert.equal(FL.getFontState(1), 'no solicitada',
        'tras invalidar el catalogo el estado vuelve a no solicitada');

    console.log('OK: fuente-carga-estados.test.js');
})().catch(function (e) { console.error(e.stack || e.message); process.exit(1); });
