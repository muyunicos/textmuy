/* RC39 (001-fix-bugs-01) - US3: una identidad unica por fuente en el selector.
 *
 * El defecto reportado: "en la lista de fuentes se muestran repetidas, y las
 * de arriba no andan". Causa: el selector se poblaba desde el mapa de categorias
 * con el id de catalogo y luego se le anadian las mismas fuentes del puente con
 * una clave distinta ('server-<archivo>'), de modo que la misma fuente aparecia
 * dos veces, y las entradas del primer paso no cargaban porque el camino de
 * carga solo miraba el registro interno.
 *
 * Esta suite fija:
 *   - cada fuente aparece UNA vez (R-C4.1);
 *   - toda entrada lleva la identidad numerica, que es la que carga (R-C4.2);
 *   - un titulo ambiguo no se resuelve por azar (R-C1.1);
 *   - una fuente con tilde/ene resuelve y se compone bien (R-C1.2).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    fonts: { add: () => {}, load: () => Promise.resolve([{ family: 'x' }]) },
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [{ appendChild: () => {} }]
};
global.FontFace = function (name, src) {
    this.name = name; this.src = src;
    this.load = () => Promise.resolve({ family: name, add: () => {} });
};
global.window.FontFace = global.FontFace;

// Catalogo con la duplicacion que reportaba el usuario: una fuente propia
// (fisica del administrador) y una de catalogo con titulo repetido.
const CATALOGO_AMBIGUO = {
    thumbs: { w: 180, h: 30, c: 4 },
    items: [
        [1, 'Bangers', 'display', 'Bangers'],
        [2, 'Permanent Marker', 'handwriting', 'Permanent Marker'],
        [58, 'MUY-Alegría', 'custom', 'MUY-Alegria.ttf'],
        [59, 'MUY-Señorita', 'custom', 'MUY-Senorita.ttf'],
        [60, 'Crimson Text', 'serif', 'Crimson Text'],
        [61, 'Crimson Text', 'serif', 'Crimson Text2.ttf'],
        [4, '', '', '']
    ]
};

let catalogoActual = CATALOGO_AMBIGUO;
global.fetch = function (url) {
    if (/fonts\.json/.test(String(url))) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(catalogoActual) });
    }
    return Promise.reject(new Error('no net'));
};

require('../js/catalog.js');
require('../js/fonts.js');
const FL = global.window.FontLoader;

(async function () {
    await FL.loadCatalog();
    const entradas = FL.listFontEntries();

    // 1. R-C4.1: una entrada por identidad. Ningun titulo repetido, ningun
    //    id repetido. El tombstone (id 4 vacio) no aparece.
    const ids = entradas.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, 'ninguna identidad repetida');
    assert.ok(!ids.includes(4), 'el tombstone libre no se lista');

    // 2. El nucleo del defecto: una fuente propia aparece UNA vez, no dos
    //    (antes salia por el catalogo y otra vez por el puente).
    const alegria = entradas.filter((e) => e.name === 'MUY-Alegría');
    assert.equal(alegria.length, 1, 'la fuente propia aparece exactamente una vez');
    assert.equal(alegria[0].id, 58, 'con su identidad de catalogo');

    // 3. R-C4.2: toda entrada lleva la identidad numerica, no una clave de
    //    texto. Es lo que permite que CADA entrada cargue su fuente.
    for (const e of entradas) {
        assert.equal(typeof e.id, 'number', 'la entrada ' + e.name + ' tiene identidad numerica');
        assert.ok(e.id >= 1, 'identidad valida para ' + e.name);
    }

    // 4. Cada entrada es resoluble: es lo que garantiza que elegirla cambia el texto.
    for (const e of entradas) {
        assert.equal(FL.resolveFontId(e.id), e.id, 'la identidad ' + e.id + ' resuelve a si misma');
    }

    // 5. R-C1.1: un titulo repetido es AMBIGUO, no se elige una al azar.
    assert.throws(() => FL.resolveFontId('Crimson Text'), /titulo ambiguo/);
    //    Pero las identidades si se resuelven sin ambiguedad.
    assert.equal(FL.resolveFontId(60), 60);
    assert.equal(FL.resolveFontId(61), 61);

    // 6. R-C1.2: los titulos con tilde y ene resuelven igual que los ASCII.
    assert.equal(FL.resolveFontId('MUY-Alegría'), 58);
    assert.equal(FL.resolveFontId('MUY-Señorita'), 59);
    assert.equal(FL.getFontFamily(58), '"MUY-Alegría"', 'y se compone entrecomillada');

    // 7. Entradas ordenadas y agrupadas por categoria, sin entradas huerfanas.
    const cats = new Set(entradas.map((e) => e.categoria));
    for (const e of entradas) assert.ok(cats.has(e.categoria), 'categoria presente');
    for (let i = 1; i < entradas.length; i++) {
        const a = entradas[i - 1];
        const b = entradas[i];
        if (a.categoria === b.categoria) assert.ok(String(a.name) <= String(b.name), 'orden alfabetico dentro de la categoria');
    }

    // 8. Sin catalogo no hay entradas que puedan fallar al elegirse (R-C4.4).
    catalogoActual = { thumbs: { w: 180, h: 30, c: 4 }, items: [] };
    await FL.invalidateCatalog();
    const vacio = FL.listFontEntries();
    assert.equal(vacio.length, 0, 'sin catalogo no hay entradas');
// 9. RC40 (regresion): el editor arranca ANTES de que el puente entregue el
    //    catalogo, y resuelve la fuente por defecto en ese momento. Eso fue lo
    //    que rompio todo: al no estar todavia en el catalogo se le invento una
    //    identidad; cuando el catalogo llego, la misma fuente quedo con DOS
    //    identidades y toda fuente por nombre resulto ambigua.
    //    Secuencia real: catalogo vacio -> resolver -> catalogo real -> resolver.
    //    R-C1.5 (el catalogo manda), R-C1.7 (no inventar), R-C1.8 (descartar).

    // 9a. Catalogo NO LEIDO todavia (lo que pasa al abrir el editor: el puente
    //     aun no entrego fonts.json). No se puede afirmar que la fuente no
    //     exista, asi que no se inventa identidad: resolver falla y se reintenta
    //     cuando el catalogo llegue (R-C1.7).
    const fetchBueno = global.fetch;
    global.fetch = function () { return Promise.reject(new Error('sin catalogo aun')); };
    FL.invalidateCatalog();
    await FL.loadCatalog().catch(function () {});
    let idSinCatalogo = null;
    try { idSinCatalogo = FL.resolveFontId('Bangers'); } catch (e) { idSinCatalogo = null; }
    assert.equal(idSinCatalogo, null,
        'sin catalogo leido no se inventa identidad: resolver falla y se reintenta');
    global.fetch = fetchBueno;

    // 9b. Llega el catalogo real con Bangers en el id 1: debe resolver a 1.
    catalogoActual = {
        thumbs: { w: 180, h: 30, c: 4 },
        items: [[1, 'Bangers', 'display', 'Bangers'], [2, 'Otra', 'display', 'Otra']]
    };
    await FL.invalidateCatalog();
    assert.equal(FL.resolveFontId('Bangers'), 1,
        'con el catalogo presente el nombre resuelve a la identidad del catalogo');

    // 9c. Y la fuente NO queda duplicada en el listado: si sobreviviera una
    //     identidad provisional, 'Bangers' apareceria dos veces, que es el bug.
    const listadas = FL.listFontEntries().filter((e) => e.name === 'Bangers');
    assert.equal(listadas.length, 1, 'la fuente aparece una sola vez en el listado');
    assert.equal(listadas[0].id, 1, 'con la identidad del catalogo');

    // 9d. Una familia que el catalogo NO trae (p.ej. una Google importada) debe
    //     poder resolverse: es una fuente nueva, no un error. R-C1.6.
    const nueva = FL.resolveFontId('Fuente Nueva De Google');
    assert.equal(typeof nueva, 'number', 'una familia no catalogada resuelve a una identidad');
    assert.notEqual(nueva, 1, 'no colapsa con la identidad del catalogo');
    assert.equal(FL.resolveFontId('Bangers'), 1,
        'el catalogo sigue mandando despues de crear una fuente nueva');


    console.log('OK: fuente-selector.test.js');
})().catch(function (e) { console.error(e.stack || e.message); process.exit(1); });
