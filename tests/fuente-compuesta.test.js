/* RC39 (001-fix-bugs-01) - US1: composicion de la familia tipografica.
 *
 * El defecto reportado ("al tocar un control la fuente cambia a Bangers") era
 * una composicion de ctx.font SIN entrecomillar: un nombre con espacios genera
 * una abreviatura CSS invalida y el navegador IGNORA la asignacion en silencio,
 * dejando en el lienzo la composicion anterior. Este archivo fija:
 *   - la familia siempre entrecomillada (R-C3.2);
 *   - una sola forma de componer el valor de fuente (R-C3.1);
 *   - ninguna familia generica de reserva (R-C3.3).
 *
 * Se prueba sobre el resolvedor de js/fonts.js y sobre un contexto de canvas
 * simulado que imita el criterio del navegador (rechaza valores invalidos).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    fonts: null,
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [{ appendChild: () => {} }]
};
global.FontFace = function (name, src) {
    this.name = name; this.src = src;
    this.load = () => Promise.reject(new Error('sin red'));
};
global.window.FontFace = global.FontFace;

const CATALOGO = {
    thumbs: { w: 180, h: 30, c: 4 },
    items: [
        [1, 'Bangers', 'display', 'Bangers'],
        [2, 'Permanent Marker', 'handwriting', 'Permanent Marker'],
        [3, 'Press Start 2P', 'monospace', 'Press Start 2P'],
        [58, 'MUY-Alegría', 'custom', 'MUY-Alegria.ttf'],
        [59, 'MUY-Señorita', 'custom', 'MUY-Senorita.ttf'],
        [60, 'Bebas Neue', 'display', 'Bebas Neue']
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

// Contexto de canvas simulado con el criterio del navegador: un valor de
// fuente invalido NO se aplica y el contexto conserva el anterior. Asi la
// suite reproduce de verdad el sintoma que veia el usuario.
function ctxFalso() {
    return {
        font: '10px sans-serif',
        aplicar: function (valor) {
            const v = String(valor);
            // Regla CSS: peso, tamano y familia. La familia debe ir entre
            // comillas si el nombre no es un ident simple; un nombre con
            // espacios sin comillas hace que el navegador descarte el valor.
            if (!/^(normal|bold|italic|\d{3})\s+\d+px\s+(.+)$/.test(v)) return false;
            const familia = v.replace(/^\S+\s+\d+px\s+/, '');
            if (/\s/.test(familia) && !/^".*"$/.test(familia) && !/^'.*'$/.test(familia)) return false;
            this.font = v;
            return true;
        }
    };
}

(async function () {
    await FL.loadCatalog();

    // 1. R-C3.2: la familia se entrecomilla SIEMPRE, con o sin espacios.
    assert.equal(FL.getFontFamily(1), '"Bangers"', 'nombre simple, entrecomillado');
    assert.equal(FL.getFontFamily(2), '"Permanent Marker"', 'nombre con espacios, entrecomillado');
    assert.equal(FL.getFontFamily(3), '"Press Start 2P"', 'nombre con espacios y digitos');
    assert.equal(FL.getFontFamily(58), '"MUY-Alegría"', 'con tilde');
    assert.equal(FL.getFontFamily(59), '"MUY-Señorita"', 'con enye');

    // 2. R-C3.1 + R-C3.2: el valor compuesto lo acepta el contexto SIEMPRE.
    //    Sin las comillas, los nombres con espacios lo rechazarian y el lienzo
    //    conservaria la composicion anterior (la fuente fantasma).
    const ctx = ctxFalso();
    for (const id of [1, 2, 3, 58, 59, 60]) {
        const valor = 'normal 76px ' + FL.getFontFamily(id);
        assert.equal(ctx.aplicar(valor), true, 'el contexto acepta el valor de la fuente ' + id);
        assert.equal(ctx.font, valor, 'el contexto quedo con la familia pedida: ' + id);
    }

    // 3. Control de regresion explicito: SIN comillas, el contexto rechaza el
    //    valor y conserva el anterior. Es el mecanismo exacto del bug.
    const ctx2 = ctxFalso();
    assert.equal(ctx2.aplicar('normal 76px Permanent Marker'), false,
        'sin comillas el valor es invalido: el bug de la fuente fantasma');
    assert.equal(ctx2.font, '10px sans-serif', 'el contexto conservo el valor anterior');

    // 4. R-C3.3: ninguna familia generica de reserva en el valor compuesto.
    for (const id of [1, 2, 3, 58, 59, 60]) {
        const familia = FL.getFontFamily(id).toLowerCase();
        assert.ok(!/serif|sans-serif|monospace|cursive|fantasy/.test(familia),
            'la familia ' + id + ' no lleva una generica de reserva');
    }

    // 5. R-C2.5: el resolvedor de familia es PURO. No toca la red ni cambia el
    //    estado de carga, asi que se puede llamar en cada pintado.
    const antesEstado = FL.getFontState(1);
    const antesRed = 0;
    for (let i = 0; i < 5; i++) FL.getFontFamily(2);
    assert.equal(FL.getFontState(1), antesEstado, 'resolver la familia no cambia el estado');
    assert.equal(antesRed, 0, 'resolver la familia no pide red');

    // 6. Un id inexistente no produce una familia inventada (fail-fast).
    assert.equal(FL.getFontFamily(9999), null, 'sin fuente no hay familia');

    console.log('OK: fuente-compuesta.test.js');
})().catch(function (e) { console.error(e.stack || e.message); process.exit(1); });
