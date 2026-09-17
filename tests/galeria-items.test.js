const assert = require('node:assert/strict');
const C = require('../js/catalog.js');
const parsed = C.parseCatalog({ items: [
    [4, 'Azul', 'fondos', 'azul.png'], [1, 'Sol', 'iconos', 'sol.svg'],
    [2, '', '', ''], ['mal', 'Invalida', 'fondos', 'x.png']
] }, 'img');
const puente = [
    { id: 4, nombre: 'azul.png', titulo: 'Azul', categoria: 'fondos' },
    { id: 8, nombre: 'nuevo.png', categoria: 'fondos', url: 'https://test/nuevo.png' },
    { nombre: 'sin-id.png', categoria: 'varios', url: 'https://test/sin-id.png' }
];
const antes = JSON.stringify({ parsed, puente });
const warnings = [];
const warn = console.warn;
console.warn = msg => warnings.push(msg);
try {
    const fondos = C.itemsGaleriaImg(parsed, { tab: 'fondos', puente });
    assert.deepEqual(fondos.items.map(i => i.imgId), [4, 8]);
    assert.equal(fondos.items[0].tipo, 'catalogo');
    assert.equal(fondos.libres, 1);
    assert.equal(fondos.invalidas, 1);
    assert.equal(C.itemsGaleriaImg(parsed, { tab: 'fondos', q: 'AZUL', puente }).items.length, 1);
    assert.equal(C.itemsGaleriaImg(parsed, { tab: 'fondos', q: '#4', puente }).items[0].imgId, 4);
    assert.deepEqual(C.itemsGaleriaImg(parsed, { tab: 'iconos', puente }).items.map(i => i.imgId), [1]);
    assert.equal(C.itemsGaleriaImg(parsed, { tab: 'varios', puente }).items[0].imgId, null);
    assert.equal(C.itemsGaleriaImg(null, { tab: 'fondos', puente }).items.length, 2);
    assert.equal(C.itemsGaleriaImg(parsed, { tab: 'fondos', q: 'inexistente' }).items.length, 0);
    assert.equal(JSON.stringify({ parsed, puente }), antes, 'no muta sus entradas');
    assert.ok(warnings.length > 0);
} finally { console.warn = warn; }
console.log('OK: galeria-items.test.js');
