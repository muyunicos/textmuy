const assert = require('node:assert/strict');

// Shims minimos para cargar js/editor.js + js/preset-manager.js + js/api.js en
// Node (IIFEs de navegador). api.js resuelve presets .txm via
// PresetManager.settingsFromDelta (en render-core.html carga igual).
let fetchCalls = 0;
// window con addEventListener capturado: permite inyectar el puente
// textmuy-bridge (sin puente el editor rechaza con causa, Const. II).
let bridgeHandler = null;
global.window = {
    addEventListener: function (type, fn) { if (type === 'message') bridgeHandler = fn; }
};
global.localStorage = { getItem: function() { return null; }, setItem: function() {} };
global.document = { fonts: null };
global.fetch = function() {
    fetchCalls++;
    // Respuesta con forma de .txm (delta textmuy-project v1).
    return Promise.resolve({
        ok: true,
        json: function() {
            // Delta numerico (formato unico): font.src id, sin strings.
            return Promise.resolve({ format: 'textmuy-project', version: 1, settings: { n: fetchCalls, font: { src: 1 } } });
        }
    });
};

require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/api.js');
// Inyecta el puente (bases de lectura de uploads/pmu) por el canal real:
// postMessage 'textmuy-bridge' que escucha preset-manager.js.
assert.ok(bridgeHandler, 'preset-manager debe registrar el listener textmuy-bridge');
bridgeHandler({ source: global.window, data: { type: 'textmuy-bridge', bridge: {
    urls: { motor: 'http://test/wp-admin/admin-post.php?action=pmu_uploads', imagenesBase: 'img/', presetsBase: 'presets/', fuentesBase: 'fonts/' },
    nonces: { motor: 'test-nonce' },
    presets: [], imagenes: [], fuentes: []
} } });
const API = global.window.TextMuyAPI;
const PM = global.window.PresetManager;
assert.ok(API, 'TextMuyAPI should be exposed');
assert.strictEqual(typeof API.renderBatch, 'function', 'renderBatch should be exposed');
assert.strictEqual(typeof API.clearPresetCache, 'function', 'clearPresetCache should be exposed');
assert.ok(PM && PM.settingsFromDelta, 'PresetManager should be exposed (api.js needs it for .txm)');

(async function() {
    // 1. Mismo preset -> misma promesa cacheada y 1 solo fetch (el .txm responde OK).
    const p1 = API.loadPresetByName('neon-glow');
    const p2 = API.loadPresetByName('neon-glow');
    assert.strictEqual(p1, p2, 'same preset must return the cached promise');
    const v1 = await p1;
    const v2 = await p2;
    assert.deepStrictEqual(v1, v2);
    assert.equal(v1.n, 1, 'the .txm delta must be applied via settingsFromDelta');
    assert.equal(fetchCalls, 1, 'only one fetch for repeated loads');

    // 1b. Delta legacy con font.src string -> rechazo con causa (Q4).
    // El rechazo NO queda cacheado (igual que un fallo de red): el
    // retry con delta numerico debe resolverse.
    const fetchNumerico = global.fetch;
    global.fetch = function() {
        return Promise.resolve({
            ok: true,
            json: function() {
                return Promise.resolve({ format: 'textmuy-project', version: 1, settings: { font: { src: 'Nintender Regular' } } });
            }
        });
    };
    await assert.rejects(API.loadPresetByName('legacy-str'), /legacy/);
    global.fetch = fetchNumerico;
    const relegado = await API.loadPresetByName('legacy-str');
    assert.equal(relegado.font.src, 1, 'tras el rechazo legacy, el retry numerico resuelve');
    API.clearPresetCache();
    fetchCalls = 0;

    // 2. Otro preset -> otro fetch.
    await API.loadPresetByName('gold-metallic');
    assert.equal(fetchCalls, 1);

    // 3. clearPresetCache -> el proximo load vuelve a fetchear.
    API.clearPresetCache();
    await API.loadPresetByName('neon-glow');
    assert.equal(fetchCalls, 2, 'cleared cache must refetch');

    // 4. Un fallo NO queda cacheado: el retry reevalua (el .txm y el .json
    //    legacy fallan -> rechaza; luego el .txm responde y aplica el delta).
    let existe = false;
    global.fetch = function() {
        if (!existe) return Promise.resolve({ ok: false, json: function() { return Promise.resolve({}); } });
        return Promise.resolve({
            ok: true,
            json: function() {
                // Delta numerico (formato unico): sin strings legacy.
                return Promise.resolve({ format: 'textmuy-project', version: 1, settings: { retry: true, font: { src: 2 } } });
            }
        });
    };
    const falla = API.loadPresetByName('fallback-test');
    await assert.rejects(falla, /recurso:ausente/);
    existe = true;
    const reintentado = await API.loadPresetByName('fallback-test');
    assert.ok(reintentado.retry, 'a failed load must not stay cached');

    console.log('preset cache tests passed');
})().catch(function(e) { console.error(e.message); process.exit(1); });