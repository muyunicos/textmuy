const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Guardas de integridad del ENTORNO y del TEXTO del repo.
//
// Motivo (diagnostico 2026-10-03): el modulo sufre "se rompio el codigo" sin
// que hubiera un error real de logica. Los hallazgos fueron:
//   1. El unico `bash` que resolvia el PATH era `C:\Program Files\Wiimm\WIT\bash.exe`
//      (cygwin de Wiimm, NO Git Bash) y `C:\Windows\System32\bash.exe` (ajuste de
//      VS Code) NO existia: usar bash no era seguro en esta maquina.
//   2. core.autocrlf=true venia del config global SIN .gitattributes, dejando el
//      worktree MIXTO (w/mixed, w/crlf, w/lf) -> diffs fantasma que aparentaban
//      corrupcion. Ahora hay .gitattributes con `eol=lf`.
//   3. js/controls.js y js/galeria.js traian BOM UTF-8 (los demas no) -> primer
//      caracter invisible y riesgo de fallo al parsear.
//   4. La salida de la consola usaba encoding ibm850 (CP850) por defecto -> mojibake
//      en la salida de herramientas (ej. `specify check`). El repo esta en UTF-8 sin BOM.
//
// Esta suite falla si alguien reintroduce cualquiera de esos problemas, si aparece
// un script bash (prohibido: Spec Kit va en PowerShell, `ps`) o si un archivo de
// texto propio del modulo deja de estar en UTF-8 sin BOM y con EOL uniforme.
//
// Se ejecuta en Node (pwsh), desde cualquier directorio: resuelve contra la RAIZ.

const RAIZ = path.resolve(__dirname, '..');

// Extensiones de TEXTO propias del modulo. Se excluyen a proposito:
//  - js/utils/*.min.js : vendors minificados, no se tocan (AGENTS.md 6)
//  - .specify/**       : archivos gestionados por el CLI (no editar a mano)
// Los archivos SIN extension de la raiz se listan aparte (ARRAIGADOS): el
// filtro por extension dejaba fuera .editorconfig y .gitattributes, que son
// justamente los que fijan charset/EOL, y estaban en CRLF en el worktree
// mientras la suite daba verde (falso positivo, M2).
const ARRAIGADOS = ['.editorconfig', '.gitattributes'];
function esTextoDelModulo(rel) {
    if (ARRAIGADOS.indexOf(rel) !== -1) return true;
    if (/(^|[\\/])js[\\/]utils[\\/]/.test(rel)) return false;      // vendors .min
    if (/(^|[\\/])\.specify[\\/]/.test(rel)) return false;          // gestionados
    if (/(^|[\\/])\.git[\\/]/.test(rel)) return false;
    if (/(^|[\\/])\.clinerules[\\/]/.test(rel)) return false;       // gestionados
    if (/(^|[\\/])\.vscode[\\/]/.test(rel)) return false;           // config local
    return /\.(js|css|html|md|json|txt|ps1)$/i.test(rel);
}

function recorrer(dir, acc) {
    for (const nombre of fs.readdirSync(dir)) {
        const abs = path.join(dir, nombre);
        const st = fs.statSync(abs);
        if (st.isDirectory()) recorrer(abs, acc);
        else acc.push(abs);
    }
    return acc;
}

// --- 1) Prohibido Bash / scripts de shell en el modulo ------------------------
const shells = recorrer(RAIZ, []).filter((abs) => /\.(sh|bash|zsh)$/i.test(abs));
assert.equal(shells.length, 0,
    'No debe haber scripts bash/shell en el modulo (Spec Kit va en PowerShell). Encontrados: ' +
    shells.map((s) => path.relative(RAIZ, s)).join(', '));

// --- 2) Los archivos gestionados por Spec Kit deben seguir siendo PowerShell ---
// (Si alguien reintroduce un gemelo .sh o cambia el init-options a "sh", esto avisa.)
const initOpts = JSON.parse(fs.readFileSync(path.join(RAIZ, '.specify/init-options.json'), 'utf8'));
assert.equal(initOpts.script, 'ps',
    '.specify/init-options.json: script debe ser "ps" (PowerShell), no bash');

// --- 3) UTF-8 sin BOM y EOL uniforme en el texto propio del modulo -----------
// OJO: recorrer() devuelve rutas ABSOLUTAS. El filtro necesita la ruta
// RELATIVA con separador '/', porque ARRAIGADOS compara nombres relativos y
// los regex de exclusion usan '/' (en Windows path.relative da '\\'). Pasarle
// la absoluta hacia que .editorconfig y .gitattributes nunca coincidieran y
// quedaran fuera del barrido: justo los dos archivos que fijan charset y EOL.
const archivos = recorrer(RAIZ, [])
    .map((abs) => ({ abs: abs, rel: path.relative(RAIZ, abs).split(path.sep).join('/') }))
    .filter(function (e) { return esTextoDelModulo(e.rel); });
assert.ok(archivos.length > 20, 'se encontraron archivos de texto a validar (control de cobertura)');

// Cobertura explicita: los arraigados DEBEN entrar al barrido (M2). Sin esto
// el filtro por extension los volvia a dejar fuera en silencio.
ARRAIGADOS.forEach(function (nombre) {
    assert.ok(archivos.some(function (e) { return e.rel === nombre; }),
        nombre + ' debe validarse (BOM/CRLF/UTF-8): si no entra al barrido, la guarda es inutil');
});

const conBOM = [];
const conCRLF = [];
const noUTF8 = [];
for (const e of archivos) {
    const rel = e.rel;
    const buf = fs.readFileSync(e.abs);

    // BOM UTF-8 (EF BB BF) o UTF-16 (FF FE / FE FF) prohibidos.
    if ((buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ||
        (buf[0] === 0xFF && buf[1] === 0xFE) ||
        (buf[0] === 0xFE && buf[1] === 0xFF)) {
        conBOM.push(rel);
    }

    // CRLF: el worktree debe coincidir con eol=lf de .gitattributes.
    const texto = buf.toString('utf8');
    if (/\r\n/.test(texto)) conCRLF.push(rel);

    // UTF-8 valido: si al re-codificar no coincide, hay bytes invalidos.
    if (!Buffer.from(texto, 'utf8').equals(buf)) noUTF8.push(rel);
}

assert.deepEqual(conBOM, [], 'sin BOM UTF-8/UTF-16 en archivos de texto (UTF-8 sin BOM obligatorio)');
assert.deepEqual(conCRLF, [], 'sin CRLF: todo el texto del repo usa LF (ver .gitattributes)');
assert.deepEqual(noUTF8, [], 'todos los archivos de texto son UTF-8 valido');

// --- 4) .gitattributes y .editorconfig presentes y con las reglas clave --------
const ga = path.join(RAIZ, '.gitattributes');
assert.ok(fs.existsSync(ga), '.gitattributes debe existir (normaliza EOL: sin el, autocrlf global deja el worktree MIXTO)');
const gaTexto = fs.readFileSync(ga, 'utf8');
assert.ok(/\* text=auto eol=lf/.test(gaTexto), '.gitattributes: falta la regla global `* text=auto eol=lf`');

const ec = path.join(RAIZ, '.editorconfig');
assert.ok(fs.existsSync(ec), '.editorconfig debe existir (encoding/EOL para editores)');
const ecTexto = fs.readFileSync(ec, 'utf8');
assert.ok(/charset\s*=\s*utf-8/i.test(ecTexto), '.editorconfig: debe declarar charset utf-8');
assert.ok(/end_of_line\s*=\s*lf/i.test(ecTexto), '.editorconfig: debe declarar end_of_line lf');

// --- 5) La documentacion declara la prohibicion de bash ------------------------
// (AGENTS.md 8 ya lo dice; esta guarda evita que se pierda en una reescritura.)
const agents = fs.readFileSync(path.join(RAIZ, 'AGENTS.md'), 'utf8');
assert.ok(/no uses sintaxis de bash/i.test(agents),
    'AGENTS.md 8 debe declarar que no se usa sintaxis de bash');
assert.ok(/bash\.exe|bash.*Wiimm|Wiimm/i.test(agents) ||
    fs.existsSync(path.join(RAIZ, 'docs/entorno-desarrollo.md')),
    'Debe existir docs/entorno-desarrollo.md con el diagnostico del shell');

console.log('OK: entorno.test.js (' + archivos.length + ' archivos de texto verificados, sin BOM, UTF-8, LF)');
