const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Verificacion de integridad de los archivos tocados por 001-fix-bugs-01:
// ningun caracter CJK/corrupto debe colarse en codigo ni en documentacion.
// Las rutas son relativas al directorio desde el que se ejecuta la suite
// (raiz del modulo), igual que las demas suites de tests/.
const leer = (f) => fs.readFileSync(f, 'utf8');

// Verificacion de integridad de los archivos tocados por 001-fix-bugs-01:
// ningun caracter CJK/corrupto debe colarse en codigo ni en documentacion.
const ARCHIVOS = [
    'AGENTS.md',
    'js/fonts.js',
    'js/editor.js',
    'js/controls.js',
    'js/fuentes-galeria.js',
    'js/preset-manager.js',
    'index.html',
    'css/style.css',
    'tests/fuente-carga-estados.test.js',
    'tests/fuente-selector.test.js',
    'tests/preset-roundtrip.test.js',
    'tests/fonts-catalog.test.js'
];
const CORRUPTOS = /[⺀-鿿　-〿]/g;
ARCHIVOS.forEach(function (f) {
    const t = leer(f);
    const malos = t.match(CORRUPTOS);
    assert.equal(malos, null, f + ': sin caracteres corruptos (encontrados: ' + (malos || []).join('') + ')');
});

// La version de recarga debe quedar declarada en AGENTS.md y ser la misma
// en los dos HTML (contrato de AGENTS.md §10).
const docs = leer('AGENTS.md');
const v = /hoy \*\*(RC\d+)\*\*/.exec(docs);
assert.ok(v, 'AGENTS.md declara la version vigente');
['index.html', 'render-core.html'].forEach(function (f) {
    const html = leer(f);
    const versiones = [...html.matchAll(/\?v=(RC\d+)/g)].map((m) => m[1]);
    assert.ok(versiones.length > 0, f + ': tiene scripts versionados');
    const unicas = [...new Set(versiones)];
    assert.deepEqual(unicas, [v[1]], f + ': una sola version, la documentada (' + unicas.join(',') + ')');
});

console.log('OK: integridad-archivos.test.js (' + v[1] + ')');
