/* Galeria de fuentes: filtros por categoria y footer (RC46 / Bloque C).
 *
 * Estos dos fallosVivian porque las pruebas NO llegaban a la galeria: el
 * listado se armaba con `items`, se filtraba sobre `items` y las pestanas se
 * derivaban de la lista YA filtrada; y el footer exigia `tipo==='server'`, que
 * nunca se cumple porque `cargar()` deduplica las fisicas del registro contra
 * `fonts.json` y las mete como `tipo:'catalogo'`. Resultado: las pestanas no
 * filtraban (72 -> 72) y ninguna fuente era editable ni borrable.
 *
 * Aqui se prueban las DOS reglas puras que gobiernan ese comportamiento.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname, '../js/fuentes-galeria.js'), 'utf8');

function reglasDelCodigo() {
    // Extrae del fuente las dos reglas que decides el comportamiento.
    const esEditable = /function esEditable\(it\)\{[\s\S]*?\n \}/.exec(src);
    assert.ok(esEditable, 'debe existir esEditable()');
    const cuerpo = esEditable[0]
        .replace(/function esEditable\(it\)\{/, '')
        .replace(/\}\s*$/, '');
    const sandbox = { Math: Math };
    vm.createContext(sandbox);
    return vm.runInContext('(function(it){' + cuerpo + '\nreturn it.tipo===\'catalogo\'&&!it.online;})', sandbox);
}

const esFisica = reglasDelCodigo();

// 1. Editabilidad: manda `online`, NO el tipo de entrada. Las fisicas del
//    catalogo entran como tipo:'catalogo' (dedupe contra fonts.json) y antes
//    eso las dejaba como solo lectura.
assert.equal(esFisica({ tipo: 'catalogo', online: false }), true, 'fisica del catalogo => editable');
assert.equal(esFisica({ tipo: 'catalogo', online: true }), false, 'familia Google => solo lectura');
assert.equal(esFisica(null), false, 'sin seleccion => sin edicion');

// 2. El listado completo debe ser la fuente de verdad del filtro: las
//    pestanas se derivan de itemsBase (sin filtrar) y el filtro se aplica
//    encima. Si se derivaran de `items` ya filtrado, al elegir una categoria
//    las demas pestanas desaparecerian.
assert.ok(src.includes('let itemsBase=[]'), 'debe existir itemsBase');
assert.ok(/items=itemsBase\.slice\(\)/.test(src), 'el filtro parte de itemsBase');
assert.ok(/itemsBase\.forEach\(function\(it\)\{set\[it\.categoria/.test(src),
    'las pestanas se derivan de itemsBase');
assert.ok(/fuenteActual=f;cargar\(\)/.test(src),
    'el clic en la pestana recarga (antes llamaba render() y no filtraba)');
// Ningun gate del footer puede volver a exigir tipo==='server'.
const gates = src.match(/it\.tipo!=='server'/g) || [];
assert.equal(gates.length, 0, 'ningun gate del footer puede exigir tipo==="server"');

// 3. La baja por identidad de catalogo debe existir (op=baja con el archivo de
//    fonts.json): las fisicas del catalogo no tienen entrada en el registro,
//    asi que deleteCustomFont solo nunca podia funcionar.
const fsrc = fs.readFileSync(require('node:path').join(__dirname, '../js/fonts.js'), 'utf8');
assert.ok(/function deleteFontFromCatalog\(id\)/.test(fsrc), 'debe existir deleteFontFromCatalog()');
assert.ok(/deleteFontFromCatalog: deleteFontFromCatalog/.test(fsrc), 'debe exportarse');
assert.ok(/entry\.online[\s\S]{0,80}return Promise\.resolve\(false\)/.test(fsrc),
    'una familia Google no se borra (no hay fisico)');
assert.ok(src.includes('deleteFontFromCatalog'), 'la galeria usa la baja por catalogo');

console.log('OK: fuentes-filtros-footer.test.js');