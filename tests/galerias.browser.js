/* Integracion DOM en Chrome, puente/motor simulados. NO es WordPress ni
 * un modo standalone del editor. Requiere Playwright y Chrome instalados. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async function () {
    const browser = await chromium.launch({ executablePath: process.env.TEXTMUY_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const page = await browser.newPage();
        const errores = [];
        page.on('pageerror', e => errores.push(e.message));
        await page.route('https://textmuy.test/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="tt"><div id="tt-main-container"></div></div>' }));
        await page.goto('https://textmuy.test/');
        await page.evaluate(() => {
            window.prueba = { ops: [], eventos: [], orden: [], catalogos: 0, version: 0, rechazar: false };
            const cat = { thumbs: { w: 180, h: 30, c: 4 }, items: [[1, 'Bangers', 'display', 'Bangers']] };
            window.fetch = async (url, opts) => {
                if (String(url).endsWith('fonts.json')) {
                    prueba.catalogos++;
                    prueba.orden.push('catalogo');
                    return new Response(JSON.stringify(cat), { status: 200 });
                }
                if (String(url).endsWith('img.json')) {
                    prueba.catalogos++;
                    return new Response(JSON.stringify({ thumbs: { w: 100, h: 100, c: 8 }, items: [[1, 'Fondo A', 'fondos', 'a.png']] }), { status: 200 });
                }
                if (opts && opts.method === 'POST') {
                    const op = opts.body.get('op');
                    prueba.ops.push(op);
                    if (op === 'alta') {
                        cat.items.push([2, 'Nueva', 'custom', 'nueva.ttf']);
                        prueba.orden.push('motor:alta');
                        return new Response(JSON.stringify({ success: true, data: { id: 2, nombre: 'nueva.ttf', url: 'https://textmuy.test/fonts/nueva.ttf' } }));
                    }
                    if (op === 'baja' && prueba.rechazar) return new Response(JSON.stringify({ success: false, data: 'denegado' }), { status: 403 });
                }
                throw new Error('Peticion inesperada: ' + url);
            };
            window.ThumbEngine = {
                configure() {}, invalidate() { prueba.version++; prueba.orden.push('thumb'); },
                async ensureSprite(opts) {
                    const cv = document.createElement('canvas'); cv.width = 720; cv.height = 30;
                    return { spriteUrl: cv.toDataURL(), manifest: { version: prueba.version } };
                },
                drawTile(ctx, img, manifest, nombre) {
                    if (manifest.version !== prueba.version) throw new Error('Hoja vieja usada');
                    if (typeof nombre !== 'string') throw new Error('Clave no string');
                    ctx.fillRect(0, 0, 180, 30); return true;
                }
            };
            window.addEventListener('textmuy:sprite-invalidado', ev => prueba.eventos.push(ev.detail.ambito));
        });
        for (const file of ['catalog.js', 'fonts.js', 'preset-manager.js', 'api.js', 'galeria.js', 'fuentes-galeria.js']) {
            await page.addScriptTag({ path: path.join(root, 'js', file) });
        }
        await page.evaluate(async () => {
            window.postMessage({ type: 'textmuy-bridge', bridge: {
                urls: { motor: 'https://textmuy.test/motor', fuentesBase: 'https://textmuy.test/fonts/', presetsBase: 'https://textmuy.test/presets/', imagenesBase: 'https://textmuy.test/img/' },
                nonces: { motor: 'test' }, fuentes: [], presets: [], imagenes: []
            } }, location.origin);
            await new Promise(resolve => window.addEventListener('textmuy-bridge-ready', resolve, { once: true }));
            await FontLoader.loadCatalog();
            FontLoader.renderFontPreview = async () => document.createElement('canvas');
            TextMuyGaleriaFuentes.abrir(() => {});
        });
        await page.waitForSelector('.tt-galpanel-tile canvas');
        await page.locator('.tt-galpanel-upload input').setInputFiles({ name: 'nueva.ttf', mimeType: 'font/ttf', buffer: Buffer.from('fuente simulada') });
        await page.waitForFunction(() => document.querySelectorAll('.tt-galpanel-tile').length === 2 && prueba.eventos.length === 1);
        assert.deepEqual(await page.evaluate(() => prueba.ops), ['alta']);
        assert.deepEqual(await page.evaluate(() => prueba.eventos), ['fonts']);
        assert.ok(await page.evaluate(() => prueba.catalogos >= 2));
        const result = await page.evaluate(async () => {
            const bridge = PresetManager.getBridge();
            const key = 'server-rechazo';
            FontLoader.registry[key] = { name: 'Rechazo', isServer: true, serverFile: 'rechazo.ttf' };
            bridge.fuentes.push({ nombre: 'rechazo.ttf' });
            prueba.rechazar = true;
            const ok = await FontLoader.deleteCustomFont(key);
            const conservada = !!FontLoader.registry[key] && bridge.fuentes.some(f => f.nombre === 'rechazo.ttf');
            const antes = prueba.ops.length;
            FontLoader.unregisterCustomFont(key);
            return { ok, conservada, sinBaja: antes === prueba.ops.length, eventos: prueba.eventos.length };
        });
        assert.deepEqual(result, { ok: false, conservada: true, sinBaja: true, eventos: 1 });
        // Escenario 2 (galeria de imagenes, AGENTS 3.3): preview en vivo con la
        // URL -> "Aplicar" confirma el id numerico (solo id en .txm) -> cerrar
        // con X revierte via onCancel.
        await page.evaluate(() => { prueba.llamadas = []; prueba.onCancel = false; });
        const flujo = await page.evaluate(async () => {
            // Hay DOS paneles .tt-galpanel en el DOM (fuentes e imagenes); el
            // de imagenes se identifica por su tab 'fondos' (unico).
            const panelImg = () => [...document.querySelectorAll('.tt-galpanel')]
                .find(p => [...p.querySelectorAll('.tt-galpanel-tab')].some(b => b.textContent === 'fondos'));
            TextMuyGaleria.abrir('fondos', src => prueba.llamadas.push(src), null, {
                preview: true, applyLabel: 'Aplicar', onCancel: () => { prueba.onCancel = true; }
            });
            await new Promise(r => setTimeout(r, 120));
            panelImg().querySelector('.tt-galpanel-tile').click();
            await new Promise(r => setTimeout(r, 10));
            const preview = prueba.llamadas[prueba.llamadas.length - 1];
            panelImg().querySelector('.tt-galpanel-sel').click();
            await new Promise(r => setTimeout(r, 10));
            const confirmado = prueba.llamadas[prueba.llamadas.length - 1];
            const cerradaTrasAplicar = panelImg().hidden;
            const huboCancelTrasAplicar = prueba.onCancel;
            TextMuyGaleria.abrir('fondos', () => {}, null, { preview: true, applyLabel: 'Aplicar', onCancel: () => { prueba.onCancel = true; } });
            await new Promise(r => setTimeout(r, 50));
            panelImg().querySelector('.tt-galpanel-tile').click();
            panelImg().querySelector('.tt-galpanel-close').click();
            await new Promise(r => setTimeout(r, 10));
            return { preview, confirmado, cerradaTrasAplicar, huboCancelTrasAplicar, cancelo: prueba.onCancel, oculta: panelImg().hidden };
        });
        assert.equal(flujo.preview, 'https://textmuy.test/img/a.png', 'preview en vivo con la URL resuelta');
        assert.equal(flujo.confirmado, 1, 'Aplicar confirma el id numerico');
        assert.equal(flujo.cerradaTrasAplicar, true);
        assert.equal(flujo.huboCancelTrasAplicar, false, 'Aplicar no dispara onCancel');
        assert.equal(flujo.cancelo, true, 'cerrar sin Aplicar dispara onCancel');
        assert.equal(flujo.oculta, true);
        assert.deepEqual(errores, []);
        console.log('OK: galerias.browser.js (DOM real; motor y miniaturas simulados)');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
