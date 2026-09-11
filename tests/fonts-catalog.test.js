/* Test del parser del catalogo de fuentes (fonts.js).
 * Valida el formato UNICO de uploads/personalizador-pdf/textmuy/fonts/fonts.json:
 * tuplas posicionales de 4 [id, titulo, categorias, referencia].
 * SIN compat legacy ni objetos cortos (el sistema esta en construccion: el
 * parser no debe crecer para sostener formatos viejos). Lo que no sea tupla
 * de 4 -> null (se ignora).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// ==== Logica pura copiada de js/fonts.js (parseCatalogEntry) ====
const FONT_EXT_RE = /\.(ttf|otf|woff|woff2)$/i;
function parseCatalogEntry(f) {
    if (!Array.isArray(f) || f.length < 4) return null;
    var id = f[0], titulo = f[1];
    var rawCats = f[2], file = f[3];
    if (!id || typeof id !== 'string') return null;
    var catArr = Array.isArray(rawCats)
        ? rawCats.map(function (s) { return String(s).trim(); }).filter(Boolean)
        : String(rawCats || 'custom').split(/[,/]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!catArr.length) catArr = ['custom'];
    if (typeof file === 'string' && FONT_EXT_RE.test(file)) {
        return { id: id, titulo: titulo || id, categorias: catArr, file: file, online: false };
    }
    return { id: id, titulo: titulo || id, categorias: catArr, file: String(file || ''), online: true };
}

// 1. Tupla online con pesos.
const t1 = parseCatalogEntry(['Montserrat', 'Montserrat', 'sans-serif', 'Montserrat:wght@400;700']);
assert.equal(t1.id, 'Montserrat');
assert.equal(t1.online, true);
assert.equal(t1.file, 'Montserrat:wght@400;700');
assert.deepEqual(t1.categorias, ['sans-serif']);

// 2. Tupla fisica (extension) -> online=false.
const t2 = parseCatalogEntry(['Belmonte', 'Bebés Llorones', 'handwriting', 'Belmonte.otf']);
assert.equal(t2.online, false);
assert.equal(t2.file, 'Belmonte.otf');
assert.deepEqual(t2.categorias, ['handwriting']);

// 3. Multi-categoria separada por coma.
const t3 = parseCatalogEntry(['Lato', 'Lato', 'sans-serif, favs', 'Lato:wght@400']);
assert.deepEqual(t3.categorias, ['sans-serif', 'favs']); // trim por cat

// 4. Objeto legacy {nombre,titulo,categoria,google} SE RECHAZA (null).
assert.equal(parseCatalogEntry({ nombre: 'Oswald', titulo: 'Oswald', categoria: 'sans-serif', google: 'Oswald:wght@400;700' }), null);
// 5. Objeto corto {n,t,c,f} SE RECHAZA (null).
assert.equal(parseCatalogEntry({ n: 'Lora', t: 'Lora', c: 'serif', f: 'Lora' }), null);

// 6. Invalidos: null, array vacio, array de 3, id no string.
assert.equal(parseCatalogEntry(null), null);
assert.equal(parseCatalogEntry([]), null);
assert.equal(parseCatalogEntry(['Sola', 'Sola', 'custom']), null);            // falta referencia
assert.equal(parseCatalogEntry([42, 'Sola', 'custom', 'Sola']), null);        // id no string
assert.equal(parseCatalogEntry({ titulo: 'x' }), null);

// 7. Categoria por defecto si [2] vacio.
const t4 = parseCatalogEntry(['Sola', 'Sola', '', 'Sola']);
assert.deepEqual(t4.categorias, ['custom']);

// 8. Validar el fonts.json real de uploads (si existe): debe ser array de tuplas.
const uploadsJson = path.join(__dirname, '..', '..', 'uploads', 'personalizador-pdf', 'textmuy', 'fonts', 'fonts.json');
if (fs.existsSync(uploadsJson)) {
    const lista = JSON.parse(fs.readFileSync(uploadsJson, 'utf8'));
    assert.ok(Array.isArray(lista), 'fonts.json de uploads debe ser array');
    assert.ok(lista.every(function (it) { return Array.isArray(it) && it.length === 4; }), 'TODAS las entradas deben ser tuplas de 4');
    let ok = 0;
    lista.forEach(function (it) {
        const e = parseCatalogEntry(it);
        assert.ok(e && e.id, 'Entrada sin id: ' + JSON.stringify(it));
        ok++;
    });
    console.log('fonts.json real: ' + ok + ' entradas (todas tuplas)');
} else {
    console.log('(no hay fonts.json de uploads; se omitio la validacion real)');
}

console.log('OK: fonts-catalog.test.js');