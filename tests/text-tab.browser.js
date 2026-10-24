/* Puerta de pixeles del editor visible (002-text-tab T052a/T052b).
 * Contrato: specs/002-text-tab/contracts/pixeles.md (R-P1, R-P2).
 * Carga el index.html REAL con el puente y los assets simulados: NO es WordPress
 * ni un modo standalone del editor. Requiere Playwright y Chrome instalados. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const ORIGIN = 'https://textmuy.test';
const CHROME = process.env.TEXTMUY_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CSS2 = '@font-face{font-family:"Bangers";src:local("Arial");}';
const CATALOGO = { thumbs: { w: 180, h: 30, c: 4 }, items: [
    [1, 'Bangers', 'display', 'Bangers'],
    [2, 'Fisica A', 'custom', 'fisica-a.ttf'],
    [3, 'Fisica B', 'custom', 'fisica-b.ttf']
] };
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf' };
// Muestra UNIFORME en tinta (una sola barra vertical): con ella el borde superior
// del texto recto es una linea plana y cualquier desviacion es la curva. Con
// glifos de formas distintas (barras y traversanos del "H", la horquilla de la
// "Y") esa medida no es invariante y el recto ya daria decenas de px.
const MUESTRA = 'I';

function rangoPerfil(perfil) {
    const con = perfil.filter(function (v) { return v >= 0; });
    if (con.length < 20) return null;
    return Math.max.apply(null, con) - Math.min.apply(null, con);
}
function v(n) { return String(n); }

(async function () {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    try {
        const page = await browser.newPage();
        const errores = [];
        page.on('pageerror', function (e) { errores.push(e.message); });
        // R-P1.4: cero red real. Lo del modulo sale del disco; Google se sirve con
        // una local() para que la familia declarada resuelva sin red.
        await page.route(ORIGIN + '/**', function (route) {
            const ruta = route.request().url().slice(ORIGIN.length).split('?')[0];
            if (ruta === '/' || ruta === '/index.html') {
                return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(root, 'index.html')) });
            }
            if (ruta.indexOf('/fonts/') === 0) {
                if (ruta.indexOf('fonts.json') >= 0) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOGO) });
                return route.fulfill({ contentType: 'font/ttf', body: Buffer.alloc(0) });
            }
            const abs = path.join(root, ruta.replace(/^\//, ''));
            if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
                return route.fulfill({ contentType: TIPOS[path.extname(abs)] || 'application/octet-stream', body: fs.readFileSync(abs) });
            }
            return route.fulfill({ status: 404, body: 'no simulado: ' + ruta });
        });
        await page.route('https://fonts.googleapis.com/**', function (route) { route.fulfill({ contentType: 'text/css', body: CSS2 }); });
        await page.route('https://fonts.gstatic.com/**', function (route) { route.fulfill({ contentType: 'font/woff2', body: Buffer.alloc(0) }); });
        await page.goto(ORIGIN + '/');
        // R-P1.3: el puente entra como en el plugin (postMessage + senal de
        // disponibilidad) y despues se indexa el catalogo de fuentes.
        await page.evaluate(async function () {
            window.postMessage({ type: 'textmuy-bridge', bridge: {
                urls: { motor: location.origin + '/motor', miniaturas: location.origin + '/miniaturas', presetsBase: location.origin + '/presets/', fuentesBase: location.origin + '/fonts/', imagenesBase: location.origin + '/img/' },
                nonces: { motor: 'test' }, fuentes: [], presets: [], imagenes: []
            } }, location.origin);
            await new Promise(function (r) { window.addEventListener('textmuy-bridge-ready', r, { once: true }); });
            await window.FontLoader.loadCatalog();
            // La tipografia tiene que estar resuelta ANTES de medir: si el
            // rasterizado cambia a mitad de la corrida, el hash deja de ser estable.
            if (window.TextEditor.asegurarFuenteDeclarada) await window.TextEditor.asegurarFuenteDeclarada();
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
        });
        // R-P1.2: helpers sobre el DOM real, instalados una sola vez.
        await page.evaluate(function (muestra) {
            window.__tt = {};
            window.__tt.texto = muestra;
            window.__tt.preparar = function (o) {
                o = o || {};
                const s = window.TextEditor.getSettings();
                s.canvas.width = o.width || 800;
                s.canvas.height = o.height || 400;
                s.text = o.text || window.__tt.texto;
                s.background.active = false;
                s.font.src = 1;               // R-P1.4: familia Google simulada con local("Arial")
                s.distort.arc.angle = 0;
                window.TextEditor.render();
            };
            // R-P1.5: tinta = pixel del lienzo VISIBLE que no es ninguno de los dos
            // tonos del damero (26,26,26) y (34,34,34).
            window.__tt.ref = null;
            window.__tt.pixeles = function () {
                const cv = document.getElementById('tt-canvas');
                return { w: cv.width, h: cv.height, d: cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.slice(0) };
            };
            window.__tt.guardarRef = function () { window.__tt.ref = window.__tt.pixeles(); };
            window.__tt.medir = function () {
                const foto = window.__tt.pixeles();
                const w = foto.w, h = foto.h, d = foto.d;
                let distintos = 0, maxDelta = 0;
                if (window.__tt.ref && window.__tt.ref.d.length === d.length) {
                    const rd = window.__tt.ref.d;
                    for (let i = 0; i < d.length; i += 4) {
                        const dif = Math.max(Math.abs(d[i] - rd[i]), Math.abs(d[i + 1] - rd[i + 1]), Math.abs(d[i + 2] - rd[i + 2]), Math.abs(d[i + 3] - rd[i + 3]));
                        if (dif > 0) distintos++;
                        if (dif > maxDelta) maxDelta = dif;
                    }
                }
                const cerca = function (val, t) { return Math.abs(val - t) <= 30; };
                const perfil = [];
                let tinta = 0, hash = 0;
                for (let x = 0; x < w; x++) perfil.push(-1);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4;
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        if (cerca(r, 26) && cerca(g, 26) && cerca(b, 26)) continue;
                        if (cerca(r, 34) && cerca(g, 34) && cerca(b, 34)) continue;
                        tinta++;
                        hash = (hash * 31 + r * 7 + g * 11 + b * 13 + x * 17 + y * 19) % 2147483647;
                        if (perfil[x] < 0) perfil[x] = y;
                    }
                }
                return { w: w, h: h, tinta: tinta, hash: hash, perfil: perfil, distintos: distintos, maxDelta: maxDelta };
            };
            // El control REAL de "Curve the text": se mueve el slider y se
            // escucha su evento, como lo haria el administrador.
            window.__tt.curvar = function (grados) {
                const inp = document.getElementById('tt-distort-arc-angle-input');
                inp.value = String(grados);
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                window.TextEditor.render();
            };
        }, MUESTRA);

        // ---- Referencia: texto recto ----
        await page.evaluate(function () { window.__tt.preparar({}); window.__tt.guardarRef(); });
        const recto = await page.evaluate(function () { return window.__tt.medir(); });
        assert.equal(recto.distintos, 0, 'previa R-P2: la referencia es el propio render recto');
        const rangoRecto = rangoPerfil(recto.perfil);
        assert.ok(recto.tinta > 0, 'previa R-P2: el texto recto pinta tinta (' + v(recto.tinta) + ' px)');
        assert.ok(rangoRecto !== null && rangoRecto <= 15,
            'previa R-P2: con angulo 0 el borde superior de tinta es plano (rango ' + v(rangoRecto) + ' px)');

        // ---- R-P2.1: curva al maximo positivo ----
        await page.evaluate(function () { window.__tt.curvar(120); });
        const mas = await page.evaluate(function () { return window.__tt.medir(); });
        const rangoMas = rangoPerfil(mas.perfil);
        assert.ok(mas.tinta > 0, 'R-P2.1: con +120 grados hay tinta (' + v(mas.tinta) + ' px)');
        assert.ok(rangoMas !== null && rangoMas >= 30,
            'R-P2.1: el texto se dobla (rango ' + v(rangoMas) + ' px contra ' + v(rangoRecto) + ' en el recto)');

        // ---- R-P2.2: el signo opuesto tambien curva y no es el mismo render ----
        await page.evaluate(function () { window.__tt.curvar(-120); });
        const menos = await page.evaluate(function () { return window.__tt.medir(); });
        const rangoMenos = rangoPerfil(menos.perfil);
        assert.ok(menos.tinta > 0, 'R-P2.2: con -120 grados hay tinta (' + v(menos.tinta) + ' px)');
        assert.ok(rangoMenos !== null && rangoMenos >= 30,
            'R-P2.2: el signo opuesto tambien dobla el texto (rango ' + v(rangoMenos) + ' px)');
        const proporcion = Math.max(mas.tinta, menos.tinta) / Math.max(1, Math.min(mas.tinta, menos.tinta));
        assert.ok(proporcion >= 1.5,
            'R-P2.2: los dos signos no son el mismo render (+120=' + v(mas.tinta) + ' px, -120=' + v(menos.tinta) + ' px, x' + proporcion.toFixed(2) + ')');

        // ---- R-P2.3: volver a 0 deja el lienzo identico ----
        await page.evaluate(function () { window.__tt.curvar(0); });
        const recto2 = await page.evaluate(function () { return window.__tt.medir(); });
        const difTinta = Math.abs(recto2.tinta - recto.tinta);
        const proporcionPx = recto2.distintos / (recto2.w * recto2.h);
        assert.ok(difTinta <= 5,
            'R-P2.3: volver a 0 restituye la geometria recta (tinta ' + v(recto.tinta) + ' -> ' + v(recto2.tinta) + ' px)');
        assert.ok(proporcionPx <= 0.01,
            'R-P2.3: cero estado residual visible (' + v(recto2.distintos) + ' de ' + v(recto2.w * recto2.h) + ' px distintos, delta max ' + v(recto2.maxDelta) + ')');
        assert.ok(rangoPerfil(recto2.perfil) <= 15,
            'R-P2.3: el borde superior vuelve a ser plano (rango ' + v(rangoPerfil(recto2.perfil)) + ' px)');

        // ---- R-P2.1 (maximo del control): los dos extremos del slider ----
        for (const grados of [360, -360]) {
            await page.evaluate(function (g) { window.__tt.curvar(g); }, grados);
            const m = await page.evaluate(function () { return window.__tt.medir(); });
            assert.ok(m.tinta > 0,
                'R-P2.1: con el slider al maximo (' + grados + ' grados) sigue habiendo tinta (' + v(m.tinta) + ' px)');
        }

        // R-P8.2: la corrida no puede dejar errores de pagina.
        assert.deepEqual(errores, []);
        console.log('OK: text-tab.browser.js (editor real; puente y assets simulados)');
    } finally { await browser.close(); }
})().catch(function (e) { console.error(e); process.exitCode = 1; });