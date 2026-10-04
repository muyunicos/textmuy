/* Previews reales de Google (spec 009, US3 / SC-005) + interruptor de inversion.
 *
 * Sintoma reportado: "las miniaturas de las fuentes locales se ven bien pero las
 * de Google todas tienen la misma tipografia". Causa: `renderFontPreview` dibujaba
 * las familias online con `'14px sans-serif'` (fuente del SISTEMA) sin descargar
 * nada, asi que las 57 celdas de Google eran el mismo render. Las 15 fisicas si
 * pasaban por `loadFont`, por eso se veian bien.
 *
 * Verificado en navegador (WP local + Playwright): 72 celdas -> 72 renders con
 * hash de pixeles DISTINTO, 56 peticiones css2 + 57 woff2, 1 solo POST; la
 * segunda apertura hace 0 POST y 0 descargas de la galeria.
 *
 * Acá se fija el CONTRATO en el fuente, que es lo que se puede comprobar sin
 * navegador (Node no tiene canvas).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fuentes = fs.readFileSync(path.join(__dirname, '../js/fonts.js'), 'utf8');
const galeria = fs.readFileSync(path.join(__dirname, '../js/fuentes-galeria.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

// 1. US3: la rama online debe CARGAR la familia y dibujar con ella. El fallo
//    original era un `Promise.resolve(dibujar(...'14px sans-serif'...))` que se
//    devolvia sin tocar la red.
const ramaOnline = /if \(esOnline\) \{[\s\S]*?\n        \}/.exec(fuentes);
assert.ok(ramaOnline, 'debe existir la rama esOnline de renderFontPreview');
assert.ok(/loadFont\(fontKey\)/.test(ramaOnline[0]),
    'la rama online debe pasar por loadFont (descargar la familia)');
assert.ok(!/Promise\.resolve\(dibujarPreviewFuente\(fontName, '14px sans-serif'/.test(ramaOnline[0]),
    'no puede dibujarse online solo con la fuente del sistema');
// Y si la familia no llega, degrada (la celda nunca queda vacia).
assert.ok(/\.catch\(function \(\) \{[\s\S]{0,200}14px sans-serif/.test(ramaOnline[0]),
    'si la familia falla, degrada al nombre con la fuente del sistema');
// El dibujo con la familia real usa cssReal (16px "<Familia>").
assert.ok(/dibujarPreviewFuente\(fontName, cssReal/.test(ramaOnline[0]),
    'el render online dibuja con la familia real (cssReal)');

// 2. El contrato de `asegurarGoogle` que hace posible US3: esperar al <link>
//    antes de pedir la cara (la carrera que hacia fallar a las Google).
assert.ok(/link\.onload\s*=\s*function \(\) \{ res\('cargada'\); \}/.test(fuentes),
    'asegurarGoogle debe esperar el onload del <link>');
assert.ok(/linkListo\.then\(function \(\) \{\s*return document\.fonts\.load/.test(fuentes),
    'document.fonts.load se invoca DESPUES de que el link cargo');

// 3. Concurrencia acotada en F1 (<=4): generar 128 imagenes o 57 familias en
//    secuencial tardaba la suma de todas.
assert.ok(/opciones\.concurrencia > 0 \? opciones\.concurrencia : 4/.test(api),
    'F1 usa concurrencia acotada por defecto (4)');
assert.ok(/while \(cursor < pendientes\.length\)/.test(api), 'F1 reparte con un cursor compartido');
assert.ok(/Promise\.all\(workers\)/.test(api), 'F1 espera a todos los workers');

// 4. Interruptor de inversion: presente, encendido por defecto y con la clase
//    que el CSS filtra. Solo en la galeria de fuentes.
assert.ok(/class="tt-galpanel-invert"/.test(galeria), 'el panel de fuentes tiene el interruptor');
assert.ok(/aria-pressed="true"/.test(galeria), 'arranca encendido (invertido por defecto)');
assert.ok(/let invertir=true/.test(galeria), 'el estado por defecto es invertido');
assert.ok(/classList\.add\('tt-galpanel-invertido'\)/.test(galeria), 'al inverter agrega la clase');
assert.ok(/classList\.remove\('tt-galpanel-invertido'\)/.test(galeria), 'al apagar quita la clase');
assert.ok(/\.tt-galpanel-invertido \.tt-galpanel-tile canvas,\s*\n\.tt-galpanel-invertido \.tt-galpanel-tile img \{ filter: invert\(1\); \}/.test(css),
    'el CSS invierte canvas e img SOLO con la clase activa');
// El filtro se limita a la clase del panel, que solo se usa en fuentes: en
// imagenes y presets los tiles son renders reales y darlos vuelta se veria raro.
assert.ok(!/tt-galpanel\[data-ambito="(img|presets)"\][^{]*\{[^}]*filter: invert/.test(css),
    'ningun ambito de imagenes/presets invierte (son renders reales)');
assert.ok(galeria.indexOf('tt-galpanel-invert') > -1 && css.indexOf('tt-galpanel-invertido') > -1,
    'la clase compartida es la que el CSS filtra');

console.log('OK: fuentes-preview-us3.test.js');