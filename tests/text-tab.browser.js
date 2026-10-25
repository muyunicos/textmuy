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
            // T066 (RC78): bandas de tinta por linea con alto, tinta, color dominante y
            // rango horizontal (para el modo Ancho). NO toca el settings: mide lo que ya
            // este pintado, asi sirve despues de mover un control REAL del panel.
            window.__tt.bandas = function () {
                const cv = document.getElementById('tt-canvas');
                const w = cv.width, h = cv.height;
                const d = cv.getContext('2d').getImageData(0, 0, w, h).data;
                const cerca = function (x, t) { return Math.abs(x - t) <= 30; };
                const esTinta = function (x, y) {
                    const i = (y * w + x) * 4;
                    if (cerca(d[i], 26) && cerca(d[i + 1], 26) && cerca(d[i + 2], 26)) return false;
                    if (cerca(d[i], 34) && cerca(d[i + 1], 34) && cerca(d[i + 2], 34)) return false;
                    return true;
                };
                const filas = [];
                let enBanda = false, ini = 0;
                for (let y = 0; y < h; y++) {
                    let hay = false;
                    for (let x = 0; x < w && !hay; x++) if (esTinta(x, y)) hay = true;
                    if (hay && !enBanda) { enBanda = true; ini = y; }
                    if (!hay && enBanda) { enBanda = false; filas.push([ini, y - 1]); }
                }
                if (enBanda) filas.push([ini, h - 1]);
                const bandas = filas.map(function (b) {
                    let tinta = 0; const col = {}; let x0 = w, x1 = -1;
                    // T074 (D4): centro de tinta de la PRIMERA fila, de la de en medio y de la
                    // ULTIMA: con eso se mide la inclinacion (recta) y la comba (curva) de la
                    // linea, y su signo, sin depender de donde haya quedado el bloque.
                    let cIni = null, cMid = null, cFin = null;
                    const medio = Math.floor((b[0] + b[1]) / 2);
                    for (let y = b[0]; y <= b[1]; y++) {
                        let fx0 = w, fx1 = -1;
                        for (let x = 0; x < w; x++) {
                            if (!esTinta(x, y)) continue;
                            const i = (y * w + x) * 4;
                            tinta++;
                            if (x < x0) x0 = x;
                            if (x > x1) x1 = x;
                            if (x < fx0) fx0 = x;
                            if (x > fx1) fx1 = x;
                            const k = Math.round(d[i] / 32) + "," + Math.round(d[i + 1] / 32) + "," + Math.round(d[i + 2] / 32);
                            col[k] = (col[k] || 0) + 1;
                        }
                        if (fx1 < 0) continue;
                        const centroFila = (fx0 + fx1) / 2;
                        if (cIni === null) cIni = centroFila;
                        if (y <= medio) cMid = centroFila;
                        cFin = centroFila;
                    }
                    const dom = Object.keys(col).sort(function (a, b2) { return col[b2] - col[a]; })[0];
                    return {
                        ini: b[0], fin: b[1], alto: b[1] - b[0] + 1, tinta: tinta, color: dom,
                        x0: x0, x1: x1, ancho: (x1 >= 0 ? x1 - x0 + 1 : 0),
                        centroIni: cIni, centroMid: cMid, centroFin: cFin
                    };
                });
                return { bandas: bandas, fontPx: window.TextEditor.getLineFontPx() };
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
            "R-P6.2: con +200% el bloque ya no entra y el encaje reescala el conjunto (bottom " + b200.bottom + " < " + b100.bottom + ", tinta " + b200.tinta + " < " + b100.tinta + ")");        // ---- R-P7 (SC-006 / SC-007): tres lineas con estilo propio ----
        const TRES = "MUY\nMUY\nMUY";
        const SIN_REGLAS = { activeTarget: "all", inherit: {}, line: {} };
        const L2_80 = { activeTarget: "all", inherit: {}, line: { "2": { sizing: { ref: "canvas", mode: "fontsize", pct: 80 } } } };
        const L2_50 = { activeTarget: "all", inherit: {}, line: { "2": { sizing: { ref: "canvas", mode: "fontsize", pct: 50 } } } };
        const L3_50_DE_L2 = { activeTarget: "all", inherit: {}, line: { "2": { sizing: { ref: "canvas", mode: "fontsize", pct: 80 } }, "3": { sizing: { ref: "linea", mode: "fontsize", pct: 50, refLine: 2 } } } };

        // Mide las BANDAS de tinta por linea (una por linea con lineHeight = 0) con su
        // alto, su tinta y su color dominante; y los px que resolvio el modelo.
        async function bandasDeTexto(cfg) {
            return await page.evaluate(function (c) {
                const s = window.TextEditor.getSettings();
                s.canvas.width = 800; s.canvas.height = 400;
                s.text = c.texto; s.background.active = false; s.font.src = 1;
                s.distort.arc.angle = 0; s.rotate = 0; s.lineHeight = 0;
                s.lines = c.lines || { activeTarget: "all", inherit: {}, line: {} };
                if (c.maxFontSize !== undefined) s.canvas.maxFontSize = c.maxFontSize;
                if (c.fontSizePx !== undefined) s.font.size = c.fontSizePx;
                window.TextEditor.render();
                return window.__tt.bandas();
            }, cfg);
        }
        const base3 = await bandasDeTexto({ texto: TRES, lines: SIN_REGLAS });
        assert.equal(base3.bandas.length, 3, "R-P7 (previa): tres lineas dan tres bandas de tinta (got " + base3.bandas.length + ")");
        assert.equal(base3.bandas[0].alto, base3.bandas[1].alto, "R-P7 (previa): sin reglas las tres lineas miden igual (" + base3.bandas[0].alto + " vs " + base3.bandas[1].alto + ")");
        assert.equal(base3.bandas[1].alto, base3.bandas[2].alto, "R-P7 (previa): L3 tambien (" + base3.bandas[1].alto + " vs " + base3.bandas[2].alto + ")");

        // R-P7.1: cambiar L2 no toca L1 ni L3.
        const soloL2 = await bandasDeTexto({ texto: TRES, lines: L2_80 });
        assert.ok(Math.abs(soloL2.bandas[0].alto - base3.bandas[0].alto) <= 2,
            "R-P7.1: L1 no cambia (" + soloL2.bandas[0].alto + " vs " + base3.bandas[0].alto + ")");
        assert.ok(Math.abs(soloL2.bandas[2].alto - base3.bandas[2].alto) <= 2,
            "R-P7.1: L3 tampoco (" + soloL2.bandas[2].alto + " vs " + base3.bandas[2].alto + ")");
        assert.ok(soloL2.bandas[1].alto < base3.bandas[1].alto - 5,
            "R-P7.1: y L2 SI cambia (" + soloL2.bandas[1].alto + " contra " + base3.bandas[1].alto + ")");

        // R-P7.2: el ratio se mide con la FORMULA (alto de tinta L2/L1 = P/100), no con un numero fijo.
        const r80 = soloL2.bandas[1].alto / soloL2.bandas[0].alto;
        assert.ok(Math.abs(r80 - 0.80) <= 0.04, "R-P7.2: con P=80 el alto de L2/L1 es P/100 (got " + r80.toFixed(3) + ")");
        const soloL2_50 = await bandasDeTexto({ texto: TRES, lines: L2_50 });
        const r50 = soloL2_50.bandas[1].alto / soloL2_50.bandas[0].alto;
        assert.ok(Math.abs(r50 - 0.50) <= 0.04, "R-P7.2: y con P=50 tambien (got " + r50.toFixed(3) + ")");
        assert.ok(Math.abs((soloL2.fontPx[1] / soloL2.fontPx[0]) - 0.80) <= 0.02,
            "R-P7.2: el modelo resuelve P exacto (" + (soloL2.fontPx[1] / soloL2.fontPx[0]).toFixed(3) + ")");

        // R-P7.2 (cascada): L3 al 50% de L2 y L3/L1 = (P2/100) x (P3/100).
        const casc = await bandasDeTexto({ texto: TRES, lines: L3_50_DE_L2 });
        const r32 = casc.bandas[2].alto / casc.bandas[1].alto;
        const r31 = casc.bandas[2].alto / casc.bandas[0].alto;
        assert.ok(Math.abs(r32 - 0.50) <= 0.04, "R-P7.2: L3 al 50% de L2 (got " + r32.toFixed(3) + ")");
        assert.ok(Math.abs(r31 - 0.40) <= 0.05, "R-P7.2: en cascada L3/L1 = 0,8 x 0,5 (got " + r31.toFixed(3) + ")");

        // R-P7.3: la herencia es de ESTILO: L3 sin nada propio toma el color de L2.
        //  El color efectivo vive en las CAPAS de relleno (`fill.layers`), que el lienzo
        //  prioriza sobre `fill.color` (medido: cambiar solo `fill.color` no cambia el dibujo).
        function capaDeColor(color) { return { fill: { layers: [{ id: "capa", active: true, styles: [{ id: "st", type: "color", color: color }] }] } }; }
        const conColor = await bandasDeTexto({ texto: TRES, lines: { activeTarget: "all", inherit: { "3": "L2" }, line: { "2": capaDeColor("#ff0000") } } });
        assert.notEqual(conColor.bandas[0].color, conColor.bandas[1].color,
            "R-P7.3: L1 conserva su color (" + conColor.bandas[0].color + ")");
        assert.equal(conColor.bandas[1].color, conColor.bandas[2].color,
            "R-P7.3: L3 hereda el de L2 (" + conColor.bandas[2].color + " vs " + conColor.bandas[1].color + ")");

        // R-P7.4: alternar el target (All/L1/L2/L3) NO cambia el lienzo.
        await page.evaluate(function () { window.__tt.guardarRef(); });
        for (const boton of ["1", "2", "3", "all"]) {
            await page.click("[data-line-style=\"" + boton + "\"]");
            const v = await page.evaluate(function () { return window.__tt.medir(); });
            assert.equal(v.distintos, 0, "R-P7.4: el target " + boton + " no cambia el lienzo (" + v.distintos + " px distintos)");
        }

        // R-P7.5: lo configurado para lineas inexistentes se conserva y reaparece.
        const unaLinea = await bandasDeTexto({ texto: "MUY", lines: L2_80 });
        assert.equal(unaLinea.bandas.length, 1, "R-P7.5: con una sola linea, una banda (got " + unaLinea.bandas.length + ")");
        const guardado = await page.evaluate(function () { return Object.keys(window.TextEditor.getSettings().lines.line); });
        assert.deepEqual(guardado, ["2"], "R-P7.5: la regla de L2 sigue guardada (" + JSON.stringify(guardado) + ")");
        const vuelta = await bandasDeTexto({ texto: TRES, lines: L2_80 });
        assert.equal(vuelta.bandas.length, 3, "R-P7.5: al recuperar las tres lineas vuelven las tres bandas");
        assert.ok(Math.abs(vuelta.bandas[1].alto - soloL2.bandas[1].alto) <= 2,
            "R-P7.5: y el tamaño de L2 vuelve igual (" + vuelta.bandas[1].alto + " vs " + soloL2.bandas[1].alto + ")");

        // R-P7.6: round-trip real sin motor (diffSettings -> settingsFromDelta -> loadPreset).
        const rt = await page.evaluate(function () {
            const s = window.TextEditor.getSettings();
            s.text = "MUY\nMUY\nMUY";
            s.lines = { activeTarget: "all", inherit: {}, line: { "2": { sizing: { ref: "canvas", mode: "fontsize", pct: 80 } } } };
            window.TextEditor.render();
            const antes = { px: window.TextEditor.getLineFontPx(), tinta: window.__tt.medir().tinta };
            const delta = window.PresetManager.diffSettings(window.TextEditor.createDefaultSettings(), s);
            const recargado = window.PresetManager.settingsFromDelta(JSON.parse(JSON.stringify(delta)));
            window.TextEditor.loadPreset(recargado);
            window.TextEditor.render();
            const despues = { px: window.TextEditor.getLineFontPx(), tinta: window.__tt.medir().tinta };
            return { antes: antes, despues: despues, rutas: Object.keys(delta.lines || {}) };
        });
        assert.deepEqual(rt.despues.px, rt.antes.px, "R-P7.6: el round-trip conserva los px por linea (" + JSON.stringify(rt.despues.px) + " vs " + JSON.stringify(rt.antes.px) + ")");
        assert.equal(rt.despues.tinta, rt.antes.tinta, "R-P7.6: y la tinta pintada (" + rt.despues.tinta + " vs " + rt.antes.tinta + ")");

        // ===== T066 (RC78): el PANEL de Font Size por linea, movido como el usuario =====
        // Aqui NO se arma el dato a mano: se MUEVEN los controles del DOM (input/change
        // reales) y se mide el lienzo. Es la ruta que faltaba cubrir, y por la que se
        // colaron los cuatro defectos reportados. Contrato: contracts/lineas.md 5
        // (R-L2.6..R-L2.10) + pixeles.md R-P7.
        const dos = await bandasDeTexto({ texto: "MUY\nMUY", lines: SIN_REGLAS });
        assert.equal(dos.bandas.length, 2, "T066: dos lineas dan dos bandas (got " + dos.bandas.length + ")");
        assert.equal(dos.bandas[0].alto, dos.bandas[1].alto, "T066 (previa): sin reglas miden igual ("
            + dos.bandas[0].alto + " vs " + dos.bandas[1].alto + ")");
        await page.click('[data-line-style="2"]');
        const pan = await page.evaluate(function () {
            return {
                panel: !document.getElementById("tt-line-sizing-panel").hidden,
                global: document.getElementById("tt-line-sizing-global").hidden
            };
        });
        assert.equal(pan.panel, true, "T066: con L2 activo se ve el panel de la linea");
        assert.equal(pan.global, true, "T066: y se oculta el control global (antes significaba dos cosas)");

        // (b) Proporcion al 50 % de ALL: el alto de tinta de L2 cae a la mitad.
        const prop = await page.evaluate(function () {
            const pct = document.getElementById("tt-line-sizing-pct-input");
            pct.value = "50";
            pct.dispatchEvent(new Event("input", { bubbles: true }));
            const s = window.TextEditor.getSettings();
            return {
                sizing: s.lines.line["2"].sizing,
                capBase: s.canvas.maxFontSize,
                estado: document.getElementById("tt-line-sizing-estado").textContent
            };
        });
        assert.equal(prop.sizing.pct, 50, "T066(b): el slider de Proporcion escribe sizing.pct (got " + JSON.stringify(prop.sizing) + ")");
        assert.equal(prop.capBase, 100, "T066(b): y no toca el tope de ALL");
        assert.ok(/50 % del tamaño de ALL/.test(prop.estado), "T066(b): la frase de estado lo dice (" + prop.estado + ")");
        const m50 = await page.evaluate(function () { return window.__tt.bandas(); });
        const rel50 = m50.bandas[1].alto / m50.bandas[0].alto;
        assert.ok(Math.abs(rel50 - 0.50) <= 0.05,
            "T066(b): el alto de L2 es la mitad del de L1 (" + m50.bandas[1].alto + " vs " + m50.bandas[0].alto + ", rel " + rel50.toFixed(3) + ")");

        // (c) Modo Ancho al 50 % del ancho de L1: las dos lineas tienen el mismo texto, asi
        // que el ancho de tinta de L2 debe ser la mitad del de L1. Se usa 50 % y no 150 %
        // porque >100 % se topa con el ANCHO UTIL del lienzo (que es dinamico y sigue al
        // texto): medido, 150 % deja L2 igual que ALL. El >100 % exacto se cubre en la
        // suite Node (`lineas-tamano`), donde el area es fija.
        const anch = await page.evaluate(function () {
            const modo = document.getElementById("tt-line-sizing-mode-input");
            modo.value = "width";
            modo.dispatchEvent(new Event("change", { bubbles: true }));
            const ref = document.getElementById("tt-line-sizing-ref-input");
            ref.value = "linea:1";
            ref.dispatchEvent(new Event("change", { bubbles: true }));
            const pct = document.getElementById("tt-line-sizing-pct-input");
            pct.value = "50";
            pct.dispatchEvent(new Event("input", { bubbles: true }));
            const s = window.TextEditor.getSettings();
            return { sizing: s.lines.line["2"].sizing, capBase: s.canvas.maxFontSize };
        });
        assert.equal(anch.sizing.mode, "width", "T066(c): el modo Ancho se guarda (got " + JSON.stringify(anch.sizing) + ")");
        assert.equal(anch.sizing.refLine, 1, "T066(c): con la Ref en L1");
        assert.equal(anch.capBase, 100, "T066(c): y el tope de ALL sigue intacto");
        const mA = await page.evaluate(function () { return window.__tt.bandas(); });
        const relA = mA.bandas[1].ancho / mA.bandas[0].ancho;
        assert.ok(Math.abs(relA - 0.5) <= 0.08,
            "T066(c): el ancho de L2 es la mitad del de L1 (" + mA.bandas[1].ancho + " vs " + mA.bandas[0].ancho + ", rel " + relA.toFixed(3)
            + "; px " + JSON.stringify(mA.fontPx) + ")");

        // (d) Tope por linea: 10 % del canvas. Primero se vuelve a Proporcional/ALL/100
        // (que NO deja delta, R-L2.9) y se comprueba que L2 no cambia y que el tope de
        // ALL queda intacto (el defecto reportado: "L2 al 10 % y ALL se achica").
        const volver = await page.evaluate(function () {
            const modo = document.getElementById("tt-line-sizing-mode-input");
            modo.value = "fontsize";
            modo.dispatchEvent(new Event("change", { bubbles: true }));
            const ref = document.getElementById("tt-line-sizing-ref-input");
            ref.value = "canvas";
            ref.dispatchEvent(new Event("change", { bubbles: true }));
            const pct = document.getElementById("tt-line-sizing-pct-input");
            pct.value = "100";
            pct.dispatchEvent(new Event("input", { bubbles: true }));
            const s = window.TextEditor.getSettings();
            return { entrada: s.lines.line["2"], capBase: s.canvas.maxFontSize };
        });
        assert.equal(volver.entrada, undefined,
            "T066(d): Proporcional/ALL/100 no deja delta (R-L2.9), got " + JSON.stringify(volver.entrada));
        const base2 = await page.evaluate(function () { return window.__tt.bandas(); });
        assert.equal(base2.bandas[0].alto, base2.bandas[1].alto,
            "T066(d): y las dos lineas vuelven a medir igual (" + base2.bandas[0].alto + " vs " + base2.bandas[1].alto + ")");

        const cap = await page.evaluate(function () {
            const c = document.getElementById("tt-line-sizing-cap-input");
            c.value = "10";
            c.dispatchEvent(new Event("input", { bubbles: true }));
            const s = window.TextEditor.getSettings();
            const e = (s.lines.line && s.lines.line["2"]) || {};
            return {
                target: window.TextEditor.getLineTarget(),
                capLinea: (e.canvas || {}).maxFontSize,
                capBase: s.canvas.maxFontSize,
                boton: !document.getElementById("tt-line-sizing-cap-reset").hidden,
                estado: document.getElementById("tt-line-sizing-estado").textContent
            };
        });
        assert.equal(cap.target, "L2", "T066(d): el target sigue siendo L2 (got " + cap.target + ")");
        assert.equal(cap.capLinea, 10, "T066(d): el tope propio se guarda en la LINEA (got " + JSON.stringify(cap.capLinea) + ")");
        assert.equal(cap.capBase, 100, "T066(d): y el tope de ALL NO se achica (era el defecto reportado)");
        assert.equal(cap.boton, true, "T066(d): aparece el boton para volver a heredar");
        assert.ok(/tope propio/.test(cap.estado), "T066(d): la frase lo declara (" + cap.estado + ")");
        const mCap = await page.evaluate(function () { return window.__tt.bandas(); });
        assert.ok(Math.abs(mCap.bandas[0].alto - base2.bandas[0].alto) <= 2,
            "T066(d): L1 conserva su alto (" + mCap.bandas[0].alto + " vs " + base2.bandas[0].alto + ")");
        assert.ok(mCap.bandas[1].alto < base2.bandas[1].alto - 5,
            "T066(d): y L2 SI se achica (" + mCap.bandas[1].alto + " contra " + base2.bandas[1].alto + ")");

        // "Heredar de ALL" BORRA el tope propio (R-L2.6).
        await page.click("#tt-line-sizing-cap-reset");
        const heredado = await page.evaluate(function () {
            const s = window.TextEditor.getSettings();
            const e = (s.lines.line && s.lines.line["2"]) || {};
            return {
                propio: (e.canvas || {}).maxFontSize,
                entrada: s.lines.line["2"],
                boton: !document.getElementById("tt-line-sizing-cap-reset").hidden
            };
        });
        assert.equal(heredado.propio, undefined, "T066(d): el boton borra el tope propio");
        assert.equal(heredado.entrada, undefined,
            "T066(d): y la entrada vacia se poda (no queda un delta sin nada, IV)");
        assert.equal(heredado.boton, false, "T066(d): y se oculta al no quedar nada propio");

        // ===== T074 (RC79, bloque D4): giro y curva POR LINEA =====
        // Los dos valores son DESVIOS sobre ALL (R-L2.11): cada linea se compone en su
        // capa, se gira/curva EN SU PROPIO LUGAR y recien despues se apila. Se mide con
        // dos lineas, lineHeight alto (cada linea, su banda) y el centro de tinta de la
        // primera / la de en medio / la ultima fila: una recta los deja alineados, una
        // inclinacion los corre (tilt) y una comba desplaza el del medio (comba).
        async function medirLineas(cfg) {
            return await page.evaluate(function (c) {
                const s = window.TextEditor.getSettings();
                s.canvas.width = 800;
                s.canvas.height = 800;
                s.text = c.texto;
                s.background.active = false;
                s.font.src = 1;
                s.lineHeight = c.lineHeight || 200;
                s.rotate = c.rotate || 0;
                s.distort = { arc: { angle: c.curva || 0 } };
                s.lines = c.lines || { activeTarget: "all", inherit: {}, line: {} };
                window.TextEditor.render();
                const r = window.__tt.bandas();
                const tilt = function (b) { return (b.centroIni === null || b.centroFin === null) ? 0 : b.centroFin - b.centroIni; };
                const comba = function (b) {
                    return (b.centroIni === null || b.centroFin === null || b.centroMid === null)
                        ? 0 : b.centroMid - (b.centroIni + b.centroFin) / 2;
                };
                return {
                    bandas: r.bandas.map(function (b) { return { alto: b.alto, ancho: b.ancho, tilt: tilt(b), comba: comba(b) }; }),
                    resueltoL1: { rot: window.TextEditor.getEffectiveSetting(1, "rotate"), curva: window.TextEditor.getEffectiveSetting(1, "distort.arc.angle") },
                    resueltoL2: { rot: window.TextEditor.getEffectiveSetting(2, "rotate"), curva: window.TextEditor.getEffectiveSetting(2, "distort.arc.angle") }
                };
            }, cfg);
        }
        const DOS = "MUY\nMUY";

        // (a) ALL 15 sin desvios: las dos lineas siguen a ALL (misma inclinacion).
        const base15 = await medirLineas({ texto: DOS, rotate: 15 });
        assert.equal(base15.bandas.length, 2, "T074(a): dos lineas dan dos bandas (got " + base15.bandas.length + ")");
        assert.ok(base15.bandas[0].tilt > 40, "T074(a): con ALL 15 las lineas se inclinan (tilt " + base15.bandas[0].tilt.toFixed(0) + ")");
        assert.ok(Math.abs(base15.bandas[0].tilt - base15.bandas[1].tilt) <= 6,
            "T074(a): y las dos lo mismo (" + base15.bandas[0].tilt.toFixed(0) + " vs " + base15.bandas[1].tilt.toFixed(0) + ")");

        // (b) SUMA (R-L2.11): L1 +10 => 25 grados; L2 -15 => vuelve a 0 (queda recta).
        const suma = await medirLineas({
            texto: DOS, rotate: 15,
            lines: { activeTarget: "all", inherit: {}, line: { "1": { rotate: 10 }, "2": { rotate: -15 } } }
        });
        assert.equal(suma.resueltoL1.rot, 25, "T074(b): L1 = ALL 15 + 10 (got " + suma.resueltoL1.rot + ")");
        assert.equal(suma.resueltoL2.rot, 0, "T074(b): L2 = ALL 15 - 15 (got " + suma.resueltoL2.rot + ")");
        assert.ok(Math.abs(suma.bandas[1].tilt) <= 12,
            "T074(b): L2 queda RECTA porque su desvio cancela a ALL (tilt " + suma.bandas[1].tilt.toFixed(0) + ")");
        assert.ok(Math.abs(suma.bandas[0].tilt) > 100 && Math.abs(suma.bandas[0].tilt - suma.bandas[1].tilt) > 100,
            "T074(b): y L1 se inclina y difiere de L2 ("
            + suma.bandas[0].tilt.toFixed(0) + " vs " + suma.bandas[1].tilt.toFixed(0) + "): el valor es POR LINEA");

        // (b2) El `\/`: el signo del desvio es POR LINEA. Se mide de a UNA linea por render
        // (la otra queda recta, asi las bandas de tinta no se cruzan): L1 +6 da un signo
        // y L1 -6 el opuesto.
        const inclinaMas = await medirLineas({
            texto: DOS, lines: { activeTarget: "all", inherit: {}, line: { "1": { rotate: 6 } } }
        });
        const inclinaMenos = await medirLineas({
            texto: DOS, lines: { activeTarget: "all", inherit: {}, line: { "1": { rotate: -6 } } }
        });
        assert.ok(Math.abs(inclinaMas.bandas[0].tilt) >= 15,
            "T074(b2): L1 +6 se inclina (tilt " + inclinaMas.bandas[0].tilt.toFixed(0) + ")");
        assert.ok(inclinaMas.bandas[0].tilt * inclinaMenos.bandas[0].tilt < 0,
            "T074(b2): y el signo lo manda el desvio, no ALL (el `\\/`): "
            + inclinaMas.bandas[0].tilt.toFixed(0) + " vs " + inclinaMenos.bandas[0].tilt.toFixed(0));

        // (c) Curva por linea: signos opuestos (el `ALL 0 + L1 curva + / L2 curva -`).
        const curvasRes = await medirLineas({
            texto: DOS, lineHeight: 600,
            lines: { activeTarget: "all", inherit: {}, line: { "1": { distort: { arc: { angle: 90 } } }, "2": { distort: { arc: { angle: -90 } } } } }
        });
        assert.equal(curvasRes.resueltoL1.curva, 90, "T074(c): L1 curva +90 (got " + curvasRes.resueltoL1.curva + ")");
        assert.equal(curvasRes.resueltoL2.curva, -90, "T074(c): L2 curva -90 (got " + curvasRes.resueltoL2.curva + ")");
        const curvaMas = await medirLineas({
            texto: DOS, lines: { activeTarget: "all", inherit: {}, line: { "1": { distort: { arc: { angle: 90 } } } } }
        });
        const curvaMenos = await medirLineas({
            texto: DOS, lines: { activeTarget: "all", inherit: {}, line: { "1": { distort: { arc: { angle: -90 } } } } }
        });
        assert.ok(Math.abs(curvaMas.bandas[0].comba) >= 10,
            "T074(c): L1 con curva +90 se comba (comba " + curvaMas.bandas[0].comba.toFixed(0) + ")");
        assert.ok(curvaMas.bandas[0].comba * curvaMenos.bandas[0].comba < 0,
            "T074(c): y el signo lo manda el desvio (el `()`): "
            + curvaMas.bandas[0].comba.toFixed(0) + " vs " + curvaMenos.bandas[0].comba.toFixed(0));

        // (d) R-L2.12: declarar el desvio 0 no cambia NADA respecto de no declararlo.
        const cero = await medirLineas({
            texto: DOS, rotate: 15,
            lines: { activeTarget: "all", inherit: {}, line: { "1": { rotate: 0 }, "2": { rotate: 0 } } }
        });
        assert.equal(cero.bandas[0].tilt, base15.bandas[0].tilt, "T074(d): desvio 0 = mismo render (L1)");
        assert.equal(cero.bandas[1].tilt, base15.bandas[1].tilt, "T074(d): desvio 0 = mismo render (L2)");

        // (e) Round-trip real: el preset con desvios por linea vuelve identico.
        const rtD4 = await page.evaluate(function () {
            const s = window.TextEditor.getSettings();
            s.text = "MUY\nMUY";
            s.rotate = 15;
            s.lines = { activeTarget: "all", inherit: {}, line: { "1": { rotate: 10 }, "2": { distort: { arc: { angle: -60 } } } } };
            window.TextEditor.render();
            const antes = { tinta: window.__tt.medir().tinta, hash: window.__tt.medir().hash };
            const delta = window.PresetManager.diffSettings(window.TextEditor.createDefaultSettings(), s);
            const recargado = window.PresetManager.settingsFromDelta(JSON.parse(JSON.stringify(delta)));
            window.TextEditor.loadPreset(recargado);
            window.TextEditor.render();
            const despues = { tinta: window.__tt.medir().tinta, hash: window.__tt.medir().hash };
            return { antes: antes, despues: despues, lineas: delta.lines };
        });
        assert.equal(rtD4.despues.tinta, rtD4.antes.tinta, "T074(e): el round-trip conserva la tinta (" + rtD4.despues.tinta + " vs " + rtD4.antes.tinta + ")");
        assert.equal(rtD4.despues.hash, rtD4.antes.hash, "T074(e): y el render (hash)");
        assert.ok(rtD4.lineas && rtD4.lineas.line && rtD4.lineas.line["1"] && rtD4.lineas.line["1"].rotate === 10,
            "T074(e): el delta del preset lleva el desvio de L1 (" + JSON.stringify(rtD4.lineas && rtD4.lineas.line) + ")");

        // (f) R-L2.14: la chispeta declara la relacion (ALL + desvio) con una linea activa.
        const chispeta = await page.evaluate(function () {
            const s = window.TextEditor.getSettings();
            s.rotate = 90;
            s.lines = { activeTarget: "L2", inherit: {}, line: { "2": { rotate: 10 } } };
            window.TextEditor.setLineTarget("L2");
            window.TextEditor.render();
            const el = document.getElementById("tt-rotate-state");
            return { texto: el.textContent, oculto: el.hidden, override: el.getAttribute("data-line-override") };
        });
        assert.equal(chispeta.oculto, false, "T074(f): con L2 activo la chispeta se ve");
        assert.ok(/ALL 90/.test(chispeta.texto) && /10/.test(chispeta.texto),
            "T074(f): y dice la relacion (ALL 90 + 10), got '" + chispeta.texto + "'");
        assert.equal(chispeta.override, "1", "T074(f): marcada como valor propio");
        await page.evaluate(function () { window.TextEditor.setLineTarget("all"); });

        // R-P8.2: la corrida no puede dejar errores de pagina.
        assert.deepEqual(errores, []);
        console.log('OK: text-tab.browser.js (editor real; puente y assets simulados)');
    } finally { await browser.close(); }
})().catch(function (e) { console.error(e); process.exitCode = 1; });