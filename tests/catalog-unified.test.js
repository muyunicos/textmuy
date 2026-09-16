/* Test del catalogo unico uploads/tm (js/catalog.js).
 * Canonico: {thumbs:{w,h,c}, items:[[id,title,cats,file],...]} con
 * id numerico >= 1, libre = tombstone [id,"","",""], clases
 * ok/free/invalid con causa "ambito:id:motivo", tile = id-1.
 * Ver constitucion IV + VI y contracts/.
 */
const assert = require('node:assert/strict');
const C = require('../js/catalog.js');

// 1. Tupla ok (Google en fonts).
let r = C.classifyEntry([1, 'Bangers', 'display', 'Bangers'], { ambito: 'fonts', pos: 0 });
assert.equal(r.status, 'ok');
assert.equal(r.entry.id, 1);
assert.equal(r.entry.online, true);
assert.deepEqual(r.entry.categorias, ['display']);

// 2. Tupla ok fisica + cats multi.
r = C.classifyEntry([3, 'Mi Fuente', 'display, favs', 'MiFuente.woff2'], { ambito: 'fonts', pos: 2 });
assert.equal(r.status, 'ok');
assert.equal(r.entry.online, false);
assert.deepEqual(r.entry.categorias, ['display', 'favs']);

// 3. Tombstone libre.
r = C.classifyEntry([2, '', '', ''], { ambito: 'fonts', pos: 1 });
assert.equal(r.status, 'free');
assert.equal(r.entry.id, 2);

// 4. Invalidas con causa: no-tupla, objeto, tupla-3, id string.
assert.match(C.classifyEntry(null, { ambito: 'fonts', pos: 0 }).reason, /no-tupla/);
assert.match(C.classifyEntry({ n: 'x' }, { ambito: 'fonts', pos: 1 }).reason, /no-tupla/);
assert.match(C.classifyEntry(['Sola', 'Sola', 'custom'], { ambito: 'fonts', pos: 2 }).reason, /no-tupla/);
assert.match(C.classifyEntry(['Montserrat', 'M', 'sans', 'Montserrat'], { ambito: 'fonts', pos: 3 }).reason, /id no numerico/);

// 5. Duplicado.
const vistos = {};
assert.equal(C.classifyEntry([5, 'A', 'c', 'A'], { ambito: 'fonts', pos: 0, vistos }).status, 'ok');
assert.match(C.classifyEntry([5, 'B', 'c', 'B'], { ambito: 'fonts', pos: 1, vistos }).reason, /duplicado/);

// 6. Google fuera de fonts = invalid.
assert.match(C.classifyEntry([1, 'G', 'fondos', 'Alguna'], { ambito: 'img', pos: 0 }).reason, /google solo valido en fonts/);

// 7. parseCatalog agrega: items/libres/invalidas/categorias/maxId.
const p = C.parseCatalog({ thumbs: { w: 180, h: 30, c: 4 }, items: [
    [1, 'Bangers', 'display', 'Bangers'],
    [2, '', '', ''],
    ['x', 'T', 'c', 'f'],
    [3, 'Fis', 'display, favs', 'M.ttf']
] }, 'fonts');
assert.deepEqual(Object.keys(p.items).map(Number), [1, 3]);
assert.deepEqual(p.libres, [2]);
assert.equal(p.invalidas.length, 1);
assert.deepEqual(p.categorias.display, [1, 3]);
assert.deepEqual(p.categorias.favs, [3]);
assert.equal(p.maxId, 3);

// 8. tile = id-1 en los 3 tamanos.
assert.deepEqual(C.tileDeId(1, { w: 180, h: 30, c: 4 }), { x: 0, y: 0, w: 180, h: 30, col: 0, row: 0 });
assert.deepEqual(C.tileDeId(5, { w: 180, h: 30, c: 4 }), { x: 0, y: 30, w: 180, h: 30, col: 0, row: 1 });
assert.deepEqual(C.tileDeId(8, { w: 200, h: 100, c: 4 }), { x: 600, y: 100, w: 200, h: 100, col: 3, row: 1 });
assert.deepEqual(C.tileDeId(9, { w: 100, h: 100, c: 8 }), { x: 0, y: 100, w: 100, h: 100, col: 0, row: 1 });

// 9. requireId: ok pasa; libre e inexistente lanzan con causa.
assert.equal(C.requireId(p, 'fonts', 1).file, 'Bangers');
assert.throws(() => C.requireId(p, 'fonts', 2), /fonts:2:libre/);
assert.throws(() => C.requireId(p, 'fonts', 9), /fonts:9:ausente o invalido/);

// 10. huecoParaAlta: tombstone mas bajo, o maxId+1.
assert.equal(C.huecoParaAlta(p), 2);
assert.equal(C.huecoParaAlta(C.parseCatalog({ thumbs: { w: 1, h: 1, c: 1 }, items: [[1, 'A', 'c', 'A']] }, 'fonts')), 2);

// 11. cats default custom.
r = C.classifyEntry([7, 'Sola', '', 'Sola'], { ambito: 'fonts', pos: 0 });
assert.deepEqual(r.entry.categorias, ['custom']);

console.log('OK: catalog-unified.test.js');

/* ===== RC33 (Fase 1): sprite canonico tile = id-1 ===== */
// manifestDeSprite: layout determinista con huecos estables (tombstones ->
// null; un alta/baja nunca reordena los tiles existentes).
const cat2 = C.parseCatalog({ thumbs: { w: 100, h: 100, c: 2 }, items: [
    [1, 'A', 'fondos', 'a.webp'],
    [2, '', '', ''],
    [4, 'D', 'iconos', 'd.webp']
] }, 'img');
assert.equal(cat2.maxId, 4);
const man = C.manifestDeSprite(cat2, 'img');
assert.equal(man.columnas, 2);
assert.equal(man.filas, 2);
assert.equal(man.tiles.length, 4);
assert.deepEqual(man.tiles[0], { id: 1, nombre: '1', x: 0, y: 0, w: 100, h: 100 });
assert.equal(man.tiles[1], null, 'tombstone -> hueco estable');
assert.equal(man.tiles[2], null, 'id sin uso -> hueco estable');
assert.deepEqual(man.tiles[3], { id: 4, nombre: '4', x: 100, y: 100, w: 100, h: 100 });
// thumbs invalido -> lanza (el llamador usa fallback controlado).
assert.throws(() => C.manifestDeSprite({ thumbs: { w: 0, h: 100, c: 2 }, items: [], maxId: 0 }, 'img'), /thumbs/);

// celdaDeSprite: celda del id si entra en el lienzo; null si excede.
const fake = { naturalWidth: 200, naturalHeight: 200, width: 200, height: 200 };
assert.deepEqual(C.celdaDeSprite(fake, man, 4), { x: 100, y: 100, w: 100, h: 100, col: 1, row: 1 });
assert.deepEqual(C.celdaDeSprite(fake, man, 1), { x: 0, y: 0, w: 100, h: 100, col: 0, row: 0 });
assert.equal(C.celdaDeSprite(fake, man, 5), null, 'id 5 excede la hoja (hoja vieja)');
assert.equal(C.celdaDeSprite(null, man, 1), null);

// firmaCatalogo: contrato compartido con PMU_Uploads::sprite ([w,h,c,items]).
assert.equal(C.firmaCatalogo({ w: 100, h: 100, c: 2 }, [['a']]), JSON.stringify([100, 100, 2, [['a']]]));
assert.equal(C.firmaCatalogo(null, null), JSON.stringify([0, 0, 0, []]));
assert.notEqual(C.firmaCatalogo({ w: 100, h: 100, c: 2 }, cat2.items.length ? [[1]] : []),
    C.firmaCatalogo({ w: 100, h: 100, c: 2 }, [[2]]), 'catalogo distinto -> firma distinta');
