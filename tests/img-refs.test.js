/* img-refs: resolucion de refs de imagen por id numerico (formato unico,
 * T015). Cubre TextMuyCatalog.mapImgRefs/hasNumericImgRefs y
 * TextMuyAPI.prepareImgRefs: sin refs numericas NO hay fetch (carga
 * modular); con refs -> img.json resuelve a URLs (base imagenesBase o
 * 'img/'); id ausente -> rechazo 'img:<id>:ausente o invalido' (Const. II).
 */
const assert = require('node:assert/strict');

// Stubs minimos (mismo patron que preset-cache.test.js).
let fetchCalls = 0;
global.window = {};
global.localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
global.document = { fonts: null };
global.fetch = function() {
    fetchCalls++;
    return Promise.resolve({
        ok: true,
        json: function() {
            return Promise.resolve({ thumbs: { w: 100, h: 100, c: 8 }, items: [
                [1, 'Fondo A', 'fondos', 'a.webp'],
                [2, 'Icono B', 'iconos', 'b.svg'],
                [3, '', '', '']
            ] });
        }
    });
};

require('../js/catalog.js');
require('../js/editor.js');
require('../js/preset-manager.js');
require('../js/api.js');
const CAT = global.window.TextMuyCatalog;
const API = global.window.TextMuyAPI;
assert.ok(CAT && API && API.prepareImgRefs, 'TextMuyCatalog y TextMuyAPI.prepareImgRefs expuestos');

(async function() {
    // 1. Sin refs numericas: NO hay fetch (carga modular) y no muta.
    const solo = { background: { fill: { image: { active: true, src: 'img/x.png' } } } };
    await API.prepareImgRefs(solo);
    assert.equal(fetchCalls, 0, 'string refs must not trigger a catalog fetch');
    assert.equal(solo.background.fill.image.src, 'img/x.png');

    // 2. Refs numericas: resuelve a base + file (base por defecto 'img/').
    const st = {
        background: { fill: { image: { active: true, src: 1 } } },
        icon: { active: true, src: 2 },
        fill: { texture: { active: true, src: 1 } },
        outline: { first: { fill: { texture: { active: true, src: 2 } } } },
        depth: { fill: { texture: { active: true, src: 1 } } },
        lines: { overrides: { L1: { fill: { texture: { active: true, src: 2 } } } } },
        fill2: null
    };
    st.fill.layers = [{ styles: [{ type: 'texture', texture: { src: 1, repeat: 'repeat' } }] }];
    await API.prepareImgRefs(st);
    assert.equal(st.background.fill.image.src, 'img/a.webp');
    assert.equal(st.icon.src, 'img/b.svg');
    assert.equal(st.fill.texture.src, 'img/a.webp');
    assert.equal(st.outline.first.fill.texture.src, 'img/b.svg');
    assert.equal(st.depth.fill.texture.src, 'img/a.webp');
    assert.equal(st.lines.overrides.L1.fill.texture.src, 'img/b.svg');
    assert.equal(st.fill.layers[0].styles[0].texture.src, 'img/a.webp');
    assert.equal(fetchCalls, 1, 'un solo fetch de img.json (cache por ambito)');

    // 3. Cache: segunda llamada sin refs numericas no refetchea.
    await API.prepareImgRefs(st);
    assert.equal(fetchCalls, 1);

    // 4. Id ausente -> rechazo con causa (Const. II fail-fast).
    const roto = { fill: { texture: { active: true, src: 9 } } };
    await assert.rejects(API.prepareImgRefs(roto), /img:9:ausente o invalido/);

    // 5. Tombstone (3) tambien rechaza en render.
    const libre = { icon: { active: true, src: 3 } };
    await assert.rejects(API.prepareImgRefs(libre), /img:3:ausente o invalido/);

    // 6. walker puro: hasNumericImgRefs detecta (base + overrides + layers).
    assert.equal(CAT.hasNumericImgRefs({ fill: { texture: { src: 5 } } }), true);
    assert.equal(CAT.hasNumericImgRefs({ lines: { overrides: { L2: { icon: { src: 7 } } } } }), true);
    assert.equal(CAT.hasNumericImgRefs({ fill: { texture: { src: 'img/a.webp' } } }), false);

    console.log('img-refs tests passed');
})().catch(function(e) { console.error(e.message); process.exit(1); });