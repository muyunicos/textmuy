/* RC39 (001-fix-bugs-01) - US4: fidelidad del round-trip de presets.
 *
 * El defecto reportado: "guardo un preset con un color y al cargarlo el color
 * cambia al que tenia puesto en la vista actual". El preset EN DISCO estaba
 * bien: el fallo era de lectura, porque la carga escribia campo por campo
 * sobre el estado vivo y nunca aplicaba el grupo de capas de relleno ni el
 * de estilos por linea. Como el lienzo prioriza las capas de relleno, el
 * color dibujado era el de la vista.
 *
 * Fija el contrato de contracts/preset-apply.md:
 *   - defaults + delta sobre un objeto NUEVO (R-P1.1, R-P1.2);
 *   - ningun campo ausente del delta conserva un valor de la vista (FR-016);
 *   - las capas de relleno y los estilos por linea SI se aplican (FR-015);
 *   - la carga es idempotente (R-P1.3);
 *   - un preset que referencia la fuente por titulo sigue cargando (R-C6.1).
 */
const assert = require('node:assert/strict');

global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    fonts: { add: () => {}, load: () => Promise.resolve([{ family: 'x' }]) },
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    head: { appendChild: () => {} },
    getElementsByTagName: () => [{ appendChild: () => {} }],
    dispatchEvent: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};
global.FontFace = function (n) { this.name = n; this.load = () => Promise.resolve({ family: n, add: () => {} }); };
global.window.FontFace = global.FontFace;
global.ResizeObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };

const CATALOGO = {
    thumbs: { w: 180, h: 30, c: 4 },
    items: [
        [1, 'Bangers', 'display', 'Bangers'],
        [2, 'Permanent Marker', 'handwriting', 'Permanent Marker'],
        [58, 'MUY-Alegría', 'custom', 'MUY-Alegria.ttf']
    ]
};
global.fetch = function (url) {
    if (/fonts\.json/.test(String(url))) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CATALOGO) });
    }
    return Promise.reject(new Error('no net'));
};

// El modulo de fuentes espera al puente ANTES de leer el catalogo cuando
// nota que esta en un iframe. En Node no hay iframe, asi que este stub solo
// hace disponible PresetManager.getBridge para que loadCatalog no espere.
global.window.PresetManager = global.window.PresetManager || {
    getBridge: function () { return null; },
    bridgeAvailable: function () { return false; }
};

require('../js/catalog.js');
require('../js/fonts.js');
require('../js/editor.js');
require('../js/preset-manager.js');
const FL = global.window.FontLoader;
const ED = global.window.TextEditor;
const PM = global.window.PresetManager;

// Sin iframe, loadCatalog va directo al fetch. Se fuerza la carga real.
if (!global.window.parent) { /* Node: no hay iframe */ }

const defaults = () => ED.createDefaultSettings();
function ajuste(settings, ruta, valor) {
    const k = ruta.split('.');
    let o = settings;
    for (let i = 0; i < k.length - 1; i++) { if (!o[k[i]]) o[k[i]] = {}; o = o[k[i]]; }
    o[k[k.length - 1]] = valor;
    return settings;
}

(async function () {
    await FL.loadCatalog();

    // 1. REGRESION DEL DEFECTO REPORTADO: el color de una capa de relleno
    //    debe volver al guardado, no al que tiene la vista.
    const guardado = defaults();
    ajuste(guardado, 'font.src', 2);
    guardado.fill.layers = [{
        id: 'L2', active: true, alpha: 1, blendmode: 'source-over', repeat: 'none',
        styles: [{ id: 'S2', type: 'color', color: '#ff0000' }]
    }];
    const delta = PM.diffSettings(defaults(), guardado);
    assert.equal(delta.fill.layers[0].styles[0].color, '#ff0000',
        'el preset guarda el color de la capa');

    const vista = defaults();
    ajuste(vista, 'font.src', 1);
    vista.fill.layers = [{
        id: 'L9', active: true, alpha: 1, blendmode: 'source-over', repeat: 'none',
        styles: [{ id: 'S9', type: 'color', color: '#00ff00' }]
    }];
    const trasCargar = ED.loadPreset(PM.settingsFromDelta(delta), vista);
    assert.equal(trasCargar.fill.layers[0].styles[0].color, '#ff0000',
        'al cargar vuelve el color guardado, no el de la vista');

    // 2. FR-016 / R-P1.1: los campos no declarados vuelven a sus defaults.
    const deltaMinimo = PM.diffSettings(defaults(), ajuste(defaults(), 'text', 'SOLO'));
    const vistaSucia = defaults();
    ajuste(vistaSucia, 'font.size', 140);
    ajuste(vistaSucia, 'rotate', 45);
    const colorDeLaVista = [{ id: 'Lx', active: true, alpha: 1, repeat: 'none', styles: [{ id: 'Sx', type: 'color', color: '#123456' }] }];
    ajuste(vistaSucia, 'fill.layers', colorDeLaVista);
    const trasMinimo = ED.loadPreset(PM.settingsFromDelta(deltaMinimo), vistaSucia);
    const def = defaults();
    assert.equal(trasMinimo.text, 'SOLO', 'el campo declarado se aplica');
    assert.equal(trasMinimo.font.size, def.font.size, 'campo no declarado -> default');
    assert.equal(trasMinimo.rotate, def.rotate, 'otro campo no declarado -> default');
    assert.notDeepEqual(trasMinimo.fill.layers, colorDeLaVista,
        'las capas de la vista NO sobreviven a la carga');

    // 3. FR-015: las capas de relleno se aplican completas.
    const multilayer = defaults();
    multilayer.fill.layers = [
        { id: 'A', active: true, alpha: 1, blendmode: 'multiply', repeat: 'letter', styles: [
            { id: 'a1', type: 'color', color: '#111111' },
            { id: 'a2', type: 'gradient', gradient: { angle: 45, colors: ['#ff0000', '#0000ff'] } }
        ] },
        { id: 'B', active: true, alpha: 0.5, blendmode: 'screen', repeat: 'none', styles: [
            { id: 'b1', type: 'color', color: '#222222' }
        ] }
    ];
    const trasMulti = ED.loadPreset(PM.settingsFromDelta(PM.diffSettings(defaults(), multilayer)), defaults());
    assert.equal(trasMulti.fill.layers.length, 2, 'las dos capas se aplican');
    assert.equal(trasMulti.fill.layers[0].styles.length, 2, 'los dos estilos');
    assert.equal(trasMulti.fill.layers[0].blendmode, 'multiply', 'el modo de mezcla');
    assert.equal(trasMulti.fill.layers[0].repeat, 'letter', 'la repeticion');
    assert.equal(trasMulti.fill.layers[1].styles[0].color, '#222222', 'el color de la 2a capa');

    // 4. FR-015: estilos por linea y destino activo.
    // 002-text-tab D1: el formato de lineas es v2, con claves 1-BASED en
    // `lines.line` y la herencia en `lines.inherit` (el `overrides` 0-based y el
    // `sizing` global del formato v1 se rechazan: constitucion VII v3.2.0).
    const conLineas = defaults();
    conLineas.lines.activeTarget = 'L2';
    conLineas.lines.inherit = { '3': 'L2' };
    conLineas.lines.line = { '1': { font: { size: 20 } }, '2': { font: { size: 30, weight: 'bold' } } };
    const trasLineas = ED.loadPreset(PM.settingsFromDelta(PM.diffSettings(defaults(), conLineas)), defaults());
    assert.equal(trasLineas.lines.activeTarget, 'L2', 'el destino activo se aplica');
    assert.equal(trasLineas.lines.line['1'].font.size, 20, 'el estilo propio de L1 (clave 1-based)');
    assert.equal(trasLineas.lines.line['2'].font.weight, 'bold', 'el de L2');
    assert.equal(trasLineas.lines.inherit['3'], 'L2', 'la herencia de L3 a L2');

    // 5. R-P1.3: la carga es idempotente.
    const una = ED.loadPreset(PM.settingsFromDelta(delta), defaults());
    const dos = ED.loadPreset(PM.settingsFromDelta(delta), defaults());
    assert.deepEqual(una.fill.layers, dos.fill.layers, 'cargar dos veces da lo mismo');

    // 6. R-C6.1: referencia por titulo sigue cargando y se normaliza.
    const porTitulo = PM.diffSettings(defaults(), ajuste(defaults(), 'font.src', 'Permanent Marker'));
    const trasTitulo = PM.settingsFromDelta(porTitulo);
    assert.equal(typeof trasTitulo.font.src, 'number', 'queda en identidad numerica');
    assert.equal(FL.getFontFamily(trasTitulo.font.src), '"Permanent Marker"',
        'y compone la familia correcta');

    // 7. SC-009: round-trip campo por campo.
    const complejo = defaults();
    ajuste(complejo, 'text', 'NUEVO');
    ajuste(complejo, 'font.src', 2);
    ajuste(complejo, 'font.size', 123);
    ajuste(complejo, 'rotate', 33);
    ajuste(complejo, 'canvas.width', 777);
    complejo.fill.layers = [{ id: 'Z', active: true, alpha: 0.7, blendmode: 'overlay', repeat: 'word', styles: [{ id: 'z1', type: 'color', color: '#abcdef' }] }];
    const idaYVuelta = ED.loadPreset(PM.settingsFromDelta(PM.diffSettings(defaults(), complejo)), defaults());
    ['text', 'font.src', 'font.size', 'rotate'].forEach(function (campo) {
        assert.deepEqual(idaYVuelta[campo], complejo[campo], 'round-trip de ' + campo);
    });
    assert.equal(idaYVuelta.canvas.width, 777, 'round-trip de canvas.width');
    assert.deepEqual(idaYVuelta.fill.layers, complejo.fill.layers, 'round-trip de las capas');

    // 8. RC39: el camino de SALIDA espera a la fuente declarada (US1).
    //    Regresion del defecto: el export del PNG y la miniatura del preset se
    //    dibujaban de inmediato y salian con la tipografia del sistema si la
    //    fuente aun no habia bajado. Aqui se fija el CONTRACTO: la salida
    //    consulta la fuente, espera su carga y, si falla, NO dibuja.
    let llamadas = 0;
    let fuenteConsultada;
    const loaderReal = global.window.FontLoader.loadFont;
    global.window.FontLoader.loadFont = function (ref) {
        llamadas++;
        fuenteConsultada = ref;
        return Promise.reject(new Error('sin red (simulada)'));
    };
    let falloSalida = null;
    try {
        await ED.renderToCanvasConFuente({ width: 4, height: 4, getContext: function () { return {}; } },
            ED.createDefaultSettings());
    } catch (e) { falloSalida = e; }
    global.window.FontLoader.loadFont = loaderReal;
    assert.equal(llamadas, 1, 'la salida consulta la fuente declarada antes de dibujar');
    assert.ok(fuenteConsultada !== undefined, 'consulta la fuente que declara el proyecto');
    assert.ok(falloSalida, 'si la fuente no carga, la salida rechaza en vez de dibujar de mas');
    assert.match(String(falloSalida && falloSalida.message), /fuente no disponible/,
        'la causa nombra el problema de fuente');

    // 9. RC39: confirmar la previsualizacion de la galeria SUELTA la fuente
    //    explorada. Sin esto el lienzo se queda pegado a la fuente
    //    previsualizada mientras el selector ya dice otra (R-C5.5, FR-009).
    const conPrevia = defaults();
    ajuste(conPrevia, 'font.src', 2);
    ED.aplicarFuentePrevia(2);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(ED.familiaDeFuente(conPrevia), '"Permanent Marker"', 'la previa se aplica al lienzo');
    ED.confirmarFuentePrevia();
    assert.equal(ED.familiaDeFuente(conPrevia), '"Permanent Marker"',
        'al confirmar, la familia efectivo es la del proyecto');

    console.log('OK: preset-roundtrip.test.js');
})().catch(function (e) { console.error(e.stack || e.message); process.exit(1); });