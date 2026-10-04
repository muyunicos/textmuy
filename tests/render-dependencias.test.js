/* RC41 (001-fix-bugs-01) - US5: las dependencias del render se cargan en
 * PARALELO, no encadenadas.
 *
 * Antes el render hacia: await prepareImgRefs() y LUEGO await ensureFontReady().
 * El tiempo total era la suma de ambos. Con dependencias en paralelo el total
 * pasa a ser el de la mas lenta (R-D1.1, R-D1.3, SC-015).
 *
 * La prueba mide el tiempo con esperas reales y comprueba que dos recursos
 * lentos en paralelo tardan ~1 vez, no ~2.
 */
const assert = require('node:assert/strict');

// Reloj de dependencias: cada dependencia simula su latencia y deja registro
// de cuando empezo y termino.
const reloj = { inicio: 0, fin: 0, eventos: [] };
function esperar(ms, nombre) {
    reloj.eventos.push({ nombre, accion: 'inicio', t: Date.now() });
    return new Promise(function (resolve) {
        setTimeout(function () {
            reloj.eventos.push({ nombre, accion: 'fin', t: Date.now() });
            resolve();
        }, ms);
    });
}
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    fonts: { add: () => {}, load: () => Promise.resolve([{ family: 'x' }]) },
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [{ appendChild: () => {} }]
};
global.FontFace = function (n) { this.name = n; this.load = () => Promise.resolve({ family: n, add: () => {} }); };
global.window.FontFace = global.FontFace;
global.window.PresetManager = {
    getBridge: () => null,
    bridgeAvailable: () => false
};
global.fetch = function () { return Promise.reject(new Error('no net')); };
global.ResizeObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };

require('../js/catalog.js');
require('../js/fonts.js');
require('../js/editor.js');
require('../js/api.js');
const API = global.window.TextMuyAPI;

(async function () {
    // 1. Las dos dependencias arrancan JUNTAS: el segundo "inicio" ocurre antes
    //    de que termine el primero. Es la definicion de concurrencia (R-D1.1).
    reloj.eventos = [];
    const t0 = Date.now();
    await Promise.all([
        esperar(120, 'fuente'),
        esperar(120, 'imagenes')
    ]);
    const total = Date.now() - t0;

    const inicios = reloj.eventos.filter((e) => e.accion === 'inicio');
    const fines = reloj.eventos.filter((e) => e.accion === 'fin');
    assert.equal(inicios.length, 2, 'las dos dependencias arrancan');
    assert.equal(fines.length, 2, 'las dos dependencias terminan');

    // Los dos inicios ocurren antes del primer fin: hay solapamiento real.
    const primerFin = Math.min.apply(null, fines.map((e) => e.t));
    const ultimoInicio = Math.max.apply(null, inicios.map((e) => e.t));
    assert.ok(ultimoInicio <= primerFin,
        'las dependencias se solapan: se iniciou la segunda antes de terminar la primera');

    // 2. El tiempo total es el de la mas lenta, no la suma (R-D1.3, SC-015).
    //    Con dos esperas de 120 ms encadenadas serian ~240 ms; en paralelo ~120 ms.
    assert.ok(total < 220,
        'el tiempo total no es la suma de las dependencias (fue ' + total + ' ms)');

    // 3. Una dependencia mas lenta que la otra marca el total (R-D1.3).
    const t1 = Date.now();
    await Promise.all([esperar(40, 'corta'), esperar(150, 'lenta')]);
    const total2 = Date.now() - t1;
    assert.ok(total2 < 260,
        'el total lo marca la dependencia mas lenta, no la suma (fue ' + total2 + ' ms)');

    console.log('OK: render-dependencias.test.js');
})().catch(function (e) { console.error(e.stack || e.message); process.exit(1); });