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
                const filas = [];
                for (let y = 0; y < h; y++) {
                    let filaMin = -1, filaMax = -1;
                    for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4;
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        if (cerca(r, 26) && cerca(g, 26) && cerca(b, 26)) continue;
                        if (cerca(r, 34) && cerca(g, 34) && cerca(b, 34)) continue;
                        tinta++;
                        hash = (hash * 31 + r * 7 + g * 11 + b * 13 + x * 17 + y * 19) % 2147483647;
                        if (perfil[x] < 0) perfil[x] = y;
                        if (filaMin < 0) filaMin = x;
                        filaMax = x;
                    }
                    if (filaMin >= 0) filas.push([y, filaMin, filaMax]);
                }
                return { w: w, h: h, tinta: tinta, hash: hash, perfil: perfil, filas: filas, distintos: distintos, maxDelta: maxDelta };
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

        // ---- R-P3 (SC-002): la barra de Style target se ve al abrir (DOM real) ----
        async function estadoPestana(nombre) {
            if (nombre) await page.click('#tt-options-menu li[data-name="' + nombre + '"]');
            return await page.evaluate(function () {
                const barra = document.getElementById('tt-line-target-bar');
                const grupo = document.querySelector('[data-global-only]');
                const li = document.querySelector('#tt-options-menu li.selected');
                return { barra: getComputedStyle(barra).display, grupo: grupo ? getComputedStyle(grupo).display : null,
                    activa: li && li.dataset ? li.dataset.name : null };
            });
        }
        const arranque = await estadoPestana(null);
        assert.equal(arranque.activa, "text", "R-P3.1: al abrir esta activa la pestana TEXT");
        assert.notEqual(arranque.barra, "none", "R-P3.1: la barra Style target se ve al abrir sin tocar nada (display=" + arranque.barra + ")");
        assert.notEqual(arranque.grupo, "none", "R-P3.3: en All el grupo Canvas Size (data-global-only) se ve");
        for (const p of ["custom", "icon"]) {
            const v = await estadoPestana(p);
            assert.notEqual(v.barra, "none", "R-P3.2: la barra sigue visible en " + p + " (display=" + v.barra + ")");
        }
        for (const p of ["background", "save"]) {
            const v = await estadoPestana(p);
            assert.equal(v.barra, "none", "R-P3.2: la barra se oculta en " + p + " (display=" + v.barra + ")");
        }
        await estadoPestana("text");
        await page.click("[data-line-style=\"2\"]");
        const conLinea = await estadoPestana(null);
        assert.equal(conLinea.grupo, "none", "R-P3.3: con L2 activo el grupo Canvas Size se oculta");
        await page.click("[data-line-style=\"all\"]");
        const sinLinea = await estadoPestana(null);
        assert.notEqual(sinLinea.grupo, "none", "R-P3.3: al volver a All el grupo reaparece");

        // ---- R-P4 (SC-003): el margen achica sin matar el texto ----
        await page.evaluate(function () { window.__tt.preparar({ text: "MUYMUYMUYMUYMUY" }); });
        const margenMax = await page.evaluate(function () {
            const inp = document.getElementById("tt-canvas-margin-input");
            inp.value = "50";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            window.TextEditor.render();
            const cv = document.getElementById("tt-canvas");
            const util = window.TextEditor.areaUtil(window.TextEditor.getSettings(), cv.width, cv.height);
            const m = window.__tt.medir();
            const filas = m.filas;
            return { padding: window.TextEditor.getSettings().canvas.padding, tinta: m.tinta, pad: util.pad, w: cv.width, h: cv.height,
                bbox: filas.length ? { minY: filas[0][0], maxY: filas[filas.length - 1][0],
                    minX: Math.min.apply(null, filas.map(function (f) { return f[1]; })),
                    maxX: Math.max.apply(null, filas.map(function (f) { return f[2]; })) } : null };
        });
        assert.ok(margenMax.padding >= 0.4, "R-P4: el Margin al maximo llega al tope del area util (padding=" + margenMax.padding + ")");
        assert.ok(margenMax.tinta > 0, "R-P4.1: con el margen al maximo el texto SIGUE pintando tinta (" + margenMax.tinta + " px)");
        assert.ok(margenMax.bbox && margenMax.bbox.minY >= margenMax.pad - 2 && margenMax.bbox.maxY <= margenMax.h - margenMax.pad + 2 && margenMax.bbox.minX >= margenMax.pad - 2 && margenMax.bbox.maxX <= margenMax.w - margenMax.pad + 2,
            "R-P4.2: la caja de tinta cabe en el area util (bbox=" + JSON.stringify(margenMax.bbox) + " pad=" + margenMax.pad.toFixed(1) + ")");
        await page.evaluate(function () {
            const inp = document.getElementById("tt-canvas-margin-input");
            inp.value = "0";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            window.TextEditor.render();
        });        // ---- R-P5 (SC-004): cero tinta en el borde del lienzo ----
        async function bordeCon(cfg) {
            return await page.evaluate(function (c) {
                const s = window.TextEditor.getSettings();
                s.text = c.texto;
                s.canvas.width = 800; s.canvas.height = 400;
                const m = document.getElementById("tt-canvas-margin-input");
                m.value = String(c.margen);
                m.dispatchEvent(new Event("input", { bubbles: true }));
                const r = document.getElementById("tt-rotate-input");
                r.value = String(c.rotacion);
                r.dispatchEvent(new Event("input", { bubbles: true }));
                const c2 = document.getElementById("tt-distort-arc-angle-input");
                c2.value = String(c.curva);
                c2.dispatchEvent(new Event("input", { bubbles: true }));
                window.TextEditor.render();
                const cv = document.getElementById("tt-canvas");
                const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
                const cerca = function (v, t) { return Math.abs(v - t) <= 30; };
                const tintaEn = function (x, y) {
                    const i = (y * cv.width + x) * 4;
                    if (cerca(d[i], 26) && cerca(d[i + 1], 26) && cerca(d[i + 2], 26)) return false;
                    if (cerca(d[i], 34) && cerca(d[i + 1], 34) && cerca(d[i + 2], 34)) return false;
                    return true;
                };
                let fila0 = 0, filaN = 0, col0 = 0, colN = 0, tinta = 0;
                for (let x = 0; x < cv.width; x++) { if (tintaEn(x, 0)) fila0++; if (tintaEn(x, cv.height - 1)) filaN++; }
                for (let y = 0; y < cv.height; y++) { if (tintaEn(0, y)) col0++; if (tintaEn(cv.width - 1, y)) colN++; }
                for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (tintaEn(x, y)) tinta++;
                return { fila0: fila0, filaN: filaN, col0: col0, colN: colN, tinta: tinta, rotacion: s.rotate, margen: s.canvas.padding, curva: s.distort.arc.angle };
            }, cfg);
        }
        const LARGO = "MUYMUYMUYMUYMUY MUYMUYMUYMUYMUY";
        const MULTI = "MUYMUYMUYMUYMUY MUY MUY\nMUYMUYMUYMUYMUY MUYMUYMUY";
        for (const txt of [LARGO, MULTI]) {
            for (const rot of [0, 45, -45]) {
                const v = await bordeCon({ texto: txt, rotacion: rot, margen: 0, curva: 0 });
                assert.ok(v.tinta > 0, "R-P5 (previa): el texto se pinta (rot=" + rot + ", tinta=" + v.tinta + ")");
                assert.equal(v.fila0 + v.filaN + v.col0 + v.colN, 0,
                    "R-P5.1: cero tinta en el borde (rot=" + rot + " -> fila0=" + v.fila0 + " filaN=" + v.filaN + " col0=" + v.col0 + " colN=" + v.colN + ")");
            }
        }
        const comb = await bordeCon({ texto: MULTI, rotacion: 0, margen: 40, curva: 120 });
        assert.ok(comb.tinta > 0, "R-P5.3: margen alto + curva + texto largo sigue pintando (" + comb.tinta + " px)");
        assert.equal(comb.fila0 + comb.filaN + comb.col0 + comb.colN, 0,
            "R-P5.3: y sigue sin tinta en el borde (fila0=" + comb.fila0 + " filaN=" + comb.filaN + " col0=" + comb.col0 + " colN=" + comb.colN + ")");
        await bordeCon({ texto: "MUYMUYMUY", rotacion: 0, margen: 0, curva: 0 });

        // ---- R-P6 (SC-005): una linea es invariante al Line height ----
        async function conLineHeight(v) {
            return await page.evaluate(function (val) {
                const inp = document.getElementById("tt-line-height-input");
                inp.value = String(val);
                inp.dispatchEvent(new Event("input", { bubbles: true }));
                window.TextEditor.render();
                const m = window.__tt.medir();
                return { lh: window.TextEditor.getSettings().lineHeight, tinta: m.tinta,
                    minY: m.filas.length ? m.filas[0][0] : null,
                    maxY: m.filas.length ? m.filas[m.filas.length - 1][0] : null,
                    fuentes: window.TextEditor.getLineFontPx() };
            }, v);
        }
        await page.evaluate(function () { window.__tt.preparar({ text: "MUYMUYMUY" }); });
        const lh0 = await conLineHeight(0);
        for (const lh of [50, 100, 200, -100]) {
            const v = await conLineHeight(lh);
            assert.equal(v.fuentes.length, 1, "R-P6.1: el lienzo tiene una sola linea");
            assert.equal(v.minY, lh0.minY, "R-P6.1: con UNA linea, Line height " + lh + " no mueve la caja (top " + v.minY + " vs " + lh0.minY + ")");
            assert.equal(v.maxY, lh0.maxY, "R-P6.1: ni la base (bottom " + v.maxY + " vs " + lh0.maxY + ")");
            assert.equal(v.tinta, lh0.tinta, "R-P6.1: ni la tinta (" + v.tinta + " vs " + lh0.tinta + ")");
        }
        await conLineHeight(0);
        await page.evaluate(function () { window.__tt.preparar({ text: "MUYMUYMUY\nMUYMUYMUY" }); });
        const barrido = [];
        for (const lh of [-100, -50, 0, 50, 100, 200]) {
            const v = await conLineHeight(lh);
            barrido.push({ lh: lh, top: v.minY, bottom: v.maxY, tinta: v.tinta });
        }
        const top0 = barrido.filter(function (b) { return b.lh === 0; })[0].top;
        barrido.forEach(function (b) {
            assert.ok(Math.abs(b.top - top0) <= 1,
                "R-P6.2: L1 ancla el bloque, el top no se mueve en todo el rango (lh=" + b.lh + "% top=" + b.top + " vs " + top0 + ")");
        });
        const crece = barrido.filter(function (b) { return b.lh <= 100; });
        for (let i = 1; i < crece.length; i++) {
            assert.ok(crece[i].bottom > crece[i - 1].bottom,
                "R-P6.2: el bloque crece hacia abajo (lh=" + crece[i].lh + "% bottom=" + crece[i].bottom + " > lh=" + crece[i - 1].lh + "% bottom=" + crece[i - 1].bottom + ")");
        }
        const b200 = barrido.filter(function (b) { return b.lh === 200; })[0];
        const b100 = barrido.filter(function (b) { return b.lh === 100; })[0];
        assert.ok(b200.bottom < b100.bottom,
            "R-P6.2: con +200% el bloque ya no entra y el encaje reescala el conjunto (bottom " + b200.bottom + " < " + b100.bottom + ", tinta " + b200.tinta + " < " + b100.tinta + ")");        // R-P8.2: la corrida no puede dejar errores de pagina.
        assert.deepEqual(errores, []);
        console.log('OK: text-tab.browser.js (editor real; puente y assets simulados)');
    } finally { await browser.close(); }
})().catch(function (e) { console.error(e); process.exitCode = 1; });