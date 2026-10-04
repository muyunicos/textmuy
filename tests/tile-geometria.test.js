/* Tile-geometria: la geometria del tile de una galeria sale de `thumbs` del
 * catalogo (js/catalog.js::geometriaTiles) y NO de un ratio hardcodeado.
 * El CSS consume dos variables (--tt-gal-ratio / --tt-gal-col) que cada galeria
 * pinta con estos valores; los defaults por data-ambito cubren el caso "aun no
 * leí el catalogo". Aca se prueba la regla pura (sin DOM). */
const assert = require('node:assert/strict');
const C = require('../js/catalog.js');

// 1. Los tres ambitos reales: la celda del sprite define la proporcion del
//    tile (fonts 180x30, img 100x100, tm-presets 200x100).
//    RC46 / spec 009 (T029): el `ratio` sale REDUCIDO con MCD, de modo que
//    coincide con los defaults por `data-ambito` del CSS (6/1, 1/1, 2/1).
//    `w`/`h` crudos se conservan para el calculo del alto (SC-006).
assert.deepEqual(C.geometriaTiles({ w: 180, h: 30, c: 4 }),
    { w: 180, h: 30, ratio: '6 / 1', col: 180 });
assert.deepEqual(C.geometriaTiles({ w: 100, h: 100, c: 8 }),
    { w: 100, h: 100, ratio: '1 / 1', col: 100 });
assert.deepEqual(C.geometriaTiles({ w: 200, h: 100, c: 4 }),
    { w: 200, h: 100, ratio: '2 / 1', col: 200 });

// 2. La columna minima es el ancho natural de la celda, recortada a 48..220 px
//    (paneles muy chicos / muy grandes).
assert.equal(C.geometriaTiles({ w: 10, h: 10 }).col, 48);
assert.equal(C.geometriaTiles({ w: 900, h: 100 }).col, 220);
assert.equal(C.geometriaTiles({ w: 140, h: 70 }).col, 140);

// 3. thumbs ausentes o invalidos -> null: la galeria deja los defaults del CSS
//    (no inventa una reticula).
assert.equal(C.geometriaTiles(null), null);
assert.equal(C.geometriaTiles(undefined), null);
assert.equal(C.geometriaTiles({}), null);
assert.equal(C.geometriaTiles({ w: 0, h: 30 }), null);
assert.equal(C.geometriaTiles({ w: 180, h: 0 }), null);
assert.equal(C.geometriaTiles({ w: -5, h: 30 }), null);

// 4. El bug de origen: con el tile fijo 1/1, la celda de fuentes (6:1) quedaba
//    a ~10 px de alto. La proporcion del tile debe ser la de la celda.
const f = C.geometriaTiles({ w: 180, h: 30, c: 4 });
assert.equal(f.w / f.h, 6, 'proporcion 6:1 de la celda de fuentes');

// 5. RC46 (T029): el MCD conserva la proporcion y la hace igual a los defaults
//    del CSS. Retas con MCD = 1 (primos entre si) que no dividen limpio.
assert.deepEqual(C.geometriaTiles({ w: 7, h: 3, c: 2 }),
    { w: 7, h: 3, ratio: '7 / 3', col: 48 });
assert.deepEqual(C.geometriaTiles({ w: 300, h: 50, c: 4 }),
    { w: 300, h: 50, ratio: '6 / 1', col: 220 });
// Proporcion equivalente entre formulaciones distintas (SC-006 usa w/h crudos).
const a = C.geometriaTiles({ w: 180, h: 30 });
const b = C.geometriaTiles({ w: 360, h: 60 });
assert.equal(a.ratio, b.ratio, 'misma celda escalada -> mismo ratio');
assert.equal(a.w / a.h, b.w / b.h, 'misma proporcion con w/h distintos');

console.log('OK: tile-geometria.test.js');
