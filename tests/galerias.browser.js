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
        // Originales de imagen: los pide el NAVEGADOR via `img.src` (no pasan por el
        // stub de fetch), asi que se sirven y se cuentan aca con una ruta propia.
        const originales = [];
        await page.route('https://textmuy.test/**', route => {
            const u = route.request().url();
            if (/\.(png|jpe?g|webp|gif)$/i.test(u) && u.indexOf('thumbs.webp') < 0) {
                originales.push(u);
                // PNG valido (1x1): alcanza para que F1 lo encaje en la celda.
                const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
                return route.fulfill({ contentType: 'image/png', body: png });
            }
            route.fulfill({ contentType: 'text/html', body: '<div id="tt"><div id="tt-main-container"></div></div>' });
        });
        // SC-005 (T027/T039): el preview de Google pide UNA hoja css2 por familia,
        // sin `wght@` y sin `text=`. La familia resuelve con una local: sin red extra.
        const google = [];
        await page.route('https://fonts.googleapis.com/**', route => {
            google.push(route.request().url());
            route.fulfill({ contentType: 'text/css', body: '@font-face{font-family:"Bangers";src:local("Arial");}' });
        });
        await page.goto('https://textmuy.test/');
        await page.evaluate(() => {
            window.prueba = { ops: [], eventos: [], orden: [], catalogos: 0, version: 0, rechazar: false, fontFace: 0, hojas: 0, sinHoja: false, sinHojaImg: false, certificaAlGenerar: false, rechazarSprite: false, originales: 0 };
            // Espia de FontFace: es la unica via por la que una fuente fisica
            // abandona el servidor (RC37: abrir la galeria debe dar 0).
            const FontFaceReal = window.FontFace;
            window.FontFace = function() { prueba.fontFace++; return new FontFaceReal(...arguments); };
            const cat = { thumbs: { w: 180, h: 30, c: 4 }, items: [
                [1, 'Bangers', 'display', 'Bangers'],          // Google: nunca se baja
                [2, 'Mi Fisica', 'custom', 'mi-fisica.ttf']    // fisica: NO al abrir
            ] };
            const cimg = { thumbs: { w: 100, h: 100, c: 8 }, items: [[1, 'Fondo A', 'fondos', 'a.png']] };
            window.fetch = async (url, opts) => {
                if (String(url).endsWith('fonts.json')) {
                    prueba.catalogos++;
                    prueba.orden.push('catalogo');
                    // El motor certifica la hoja escribiendo thumbs.sprite_firma:
                    // sin eso la ruta canonica la rechaza (RC37).
                    if (!prueba.sinHoja) cat.thumbs.sprite_firma = window.TextMuyCatalog.firmaCatalogo(cat.thumbs, cat.items);
                    else delete cat.thumbs.sprite_firma;
                    return new Response(JSON.stringify(cat), { status: 200 });
                }
                if (String(url).endsWith('thumbs.webp')) {
                    prueba.hojas++;
                    // PNG real: reticula canonica del ambito (fonts 4x180x30 en 1
                    // fila -> 720x30; img 8x100 en 1 fila -> 800x100).
                    const esImg = String(url).indexOf('/img/') >= 0;
                    const cv = document.createElement('canvas');
                    cv.width = esImg ? 800 : 720; cv.height = esImg ? 100 : 30;
                    const bin = atob(cv.toDataURL('image/png').split(',')[1]);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    return new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png' } });
                }
                if (/\.(png|jpe?g|webp|gif)$/i.test(String(url))) {
                    // Original de un recurso (F1 del nucleo los encaja): imagen REAL
                    // (200x150) para que la celda se pueda dibujar, y contador para
                    // probar que con hoja certificada NO se descarga ninguno.
                    prueba.originales++;
                    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 150;
                    const bin = atob(cv.toDataURL('image/png').split(',')[1]);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    return new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png' } });
                }
                if (/\.(ttf|otf|woff2?)$/i.test(String(url))) {
                    // El archivo fisico: responde vacio (el FontFace real falla y
                    // cae al fallback; lo que se mide es CUANTAS veces se pide).
                    return new Response(new Uint8Array(0), { status: 200 });
                }
                if (String(url).endsWith('img.json')) {
                    prueba.catalogos++;
                    // La hoja de img se sirve CERTIFICADA salvo que el escenario pida
                    // un error de generacion (sinHojaImg): leerla no descarga originales.
                    if (!prueba.sinHojaImg) cimg.thumbs.sprite_firma = window.TextMuyCatalog.firmaCatalogo(cimg.thumbs, cimg.items);
                    else delete cimg.thumbs.sprite_firma;
                    return new Response(JSON.stringify(cimg), { status: 200 });
                }
                if (opts && opts.method === 'POST') {
                    const op = opts.body.get('op');
                    prueba.ops.push(op);
                    if (op === 'alta') {
                        cat.items.push([3, 'Nueva', 'custom', 'nueva.ttf']);
                        prueba.orden.push('motor:alta');
                        return new Response(JSON.stringify({ success: true, data: { id: 3, nombre: 'nueva.ttf', url: 'https://textmuy.test/fonts/nueva.ttf' } }));
                    }
                    if (op === 'baja' && prueba.rechazar) return new Response(JSON.stringify({ success: false, data: 'denegado' }), { status: 403 });
                }
                throw new Error('Peticion inesperada: ' + url);
            };
            window.ThumbEngine = {
                configure() {}, invalidate() { prueba.version++; prueba.orden.push('thumb'); },
                async ensureSprite(opts) {
                    // T039: cada generacion de hoja es UNA escritura (I2).
                    prueba.ops.push('sprite');
                    // Motor que rechaza: la hoja no se persiste y el nucleo devuelve
                    // {estado:'error', causa:'<ambito>:hoja:motor:rechazo'}.
                    if (prueba.rechazarSprite) return null;
                    if (prueba.certificaAlGenerar && opts && opts.firma) {
                        // El motor persistio la hoja: el servidor ya la sirve certificada.
                        if (opts.scope === 'img') { cimg.thumbs.sprite_firma = opts.firma; prueba.sinHojaImg = false; }
                        else { cat.thumbs.sprite_firma = opts.firma; prueba.sinHoja = false; }
                    }
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
        await page.addStyleTag({ path: path.join(root, 'css', 'style.css') });
        await page.evaluate(async () => {
            window.postMessage({ type: 'textmuy-bridge', bridge: {
                urls: { motor: 'https://textmuy.test/motor', fuentesBase: 'https://textmuy.test/fonts/', presetsBase: 'https://textmuy.test/presets/', imagenesBase: 'https://textmuy.test/img/' },
                nonces: { motor: 'test' }, fuentes: [], presets: [], imagenes: []
            } }, location.origin);
            await new Promise(resolve => window.addEventListener('textmuy-bridge-ready', resolve, { once: true }));
            await FontLoader.loadCatalog();
            // RC37: NO se reemplaza renderFontPreview: hay que dejar que corra
            // el real para medir SI pide el archivo de la fuente.
            TextMuyGaleriaFuentes.abrir(() => {});
        });
        await page.waitForSelector('.tt-galpanel-tile canvas');
        // Invariante 3 (RC37): abrir la galeria no descarga ninguna fuente.
        const apertura = await page.evaluate(() => ({
            fontFace: prueba.fontFace,
            hojas: prueba.hojas,
            tiles: document.querySelectorAll('.tt-galpanel-tile').length,
            canvases: document.querySelectorAll('.tt-galpanel-tile canvas').length,
            ambito: document.querySelector('.tt-galpanel').dataset.ambito,
            ratio: getComputedStyle(document.querySelector('.tt-galpanel-tile')).aspectRatio,
            ancho: Math.round(document.querySelector('.tt-galpanel-tile').getBoundingClientRect().width),
            alto: Math.round(document.querySelector('.tt-galpanel-tile').getBoundingClientRect().height),
            linksGoogle: document.querySelectorAll('link[data-textmuy-font]').length
        }));
        assert.equal(apertura.fontFace, 0, 'abrir la galeria no crea ningun FontFace');
        assert.equal(apertura.linksGoogle, 0, 'abrir la galeria no inyecta Google Fonts');
        assert.equal(apertura.hojas, 1, 'la hoja canonica se LEE (un thumbs.webp)');
        assert.equal(apertura.tiles, 2, 'las dos fuentes del catalogo listadas');
        assert.equal(apertura.canvases, 2, 'tiles dibujados desde la hoja (celda = id-1)');
        assert.equal(apertura.ambito, 'fonts', 'el panel declara su ambito');
        assert.equal(apertura.ratio, '6 / 1', 'el tile sigue la proporcion de la celda (ratio simplificado con MCD, T029)');
        // Legibilidad real (el bug: 5 columnas de ~62x10 px con el glifo a ~5 px).
        assert.ok(apertura.alto >= 20 && apertura.alto <= 45,
            'tira de fuente legible (alto=' + apertura.alto + 'px)');
        assert.ok(apertura.ancho >= 140, 'la celda usa el ancho natural del tile (ancho=' + apertura.ancho + 'px)');
        // SC-006 (T031): el alto sale del aspect-ratio del tile, con w/h crudos
        // del inventario (180x30). Tolerancia de 2 px por redondeo del navegador.
        assert.ok(Math.abs(apertura.alto - Math.round(apertura.ancho * 30 / 180)) <= 2,
            'alto = round(ancho x h/w) +-2 (alto=' + apertura.alto + 'px, ancho=' + apertura.ancho + 'px)');
        // Invariante 4 (RC37): la fuente se descarga al seleccionarla (1 solo).
        await page.locator('.tt-galpanel-tile[data-slug="2"]').click();
        await page.waitForFunction(() => prueba.fontFace >= 1);
        assert.equal(await page.evaluate(() => prueba.fontFace), 1,
            'seleccionar UNA fuente descarga UN archivo');
        // SC-005 (US3 / T027-T039): clic en la celda GOOGLE => UNA hoja css2 por
        // familia, sin `wght@` ni `text=`, y la celda se redibuja con su tipo real.
        const pCss2 = page.waitForRequest(r => r.url().indexOf('fonts.googleapis.com') >= 0, { timeout: 5000 });
        await page.locator('.tt-galpanel-tile[data-slug="1"]').click();
        await pCss2;
        assert.equal(google.length, 1, 'una sola peticion css2 para la familia Google');
        assert.equal(/wght@|text=/.test(google[0]), false, 'css2 sin wght@ ni text= (' + google[0] + ')');
        assert.equal(await page.evaluate(() => !!document.querySelector('.tt-galpanel-tile[data-slug="1"] canvas')),
            true, 'la celda Google se redibuja con su tipo real');
        assert.equal(await page.evaluate(() => prueba.fontFace), 1,
            'el preview de Google no crea un FontFace extra (usa la hoja css2)');
        // T020/T037 (hallazgo del recorrido en WP real, 2026-10-24): con el MOTOR
        // rechazando la escritura, la galeria de FUENTES muestra la causa y el
        // Reintentar. Antes el `then` posterior al onError corria SIEMPRE y dejaba
        // el fallo invisible (boton oculto y status del footer pisado).
        await page.evaluate(() => {
            prueba.sinHoja = true; prueba.rechazarSprite = true; prueba.certificaAlGenerar = false; prueba.ops = [];
            if (window.TextMuyAPI.invalidarCatalogo) window.TextMuyAPI.invalidarCatalogo('fonts');
            if (window.TextMuyAPI.invalidarSpriteCanonico) window.TextMuyAPI.invalidarSpriteCanonico('fonts');
            if (window.TextMuyAPI.invalidarDibujados) window.TextMuyAPI.invalidarDibujados('fonts');
            const p = [...document.querySelectorAll('.tt-galpanel')].find(x => x.dataset.ambito === 'fonts');
            p.querySelector('.tt-galpanel-close').click();
        });
        await page.evaluate(() => TextMuyGaleriaFuentes.abrir(() => {}));
        await page.waitForFunction(() => {
            const p = [...document.querySelectorAll('.tt-galpanel')].find(x => x.dataset.ambito === 'fonts');
            const b = p.querySelector('.tt-galpanel-reintentar');
            return !!(b && !b.hidden);
        });
        const rechazoFonts = await page.evaluate(() => {
            const p = [...document.querySelectorAll('.tt-galpanel')].find(x => x.dataset.ambito === 'fonts');
            return { status: p.querySelector('.tt-galpanel-status').textContent, ops: prueba.ops.slice(),
                boton: !p.querySelector('.tt-galpanel-reintentar').hidden };
        });
        assert.deepEqual(rechazoFonts.ops, ['sprite'], 'motor que rechaza (fonts): 1 intento y la hoja NO se persiste (I3)');
        assert.ok(/fonts:hoja:motor:rechazo/.test(rechazoFonts.status),
            'la causa queda VISIBLE en la galeria de fuentes (' + rechazoFonts.status + ')');
        assert.equal(rechazoFonts.boton, true, 'el Reintentar queda visible (T020)');
        await page.evaluate(() => { prueba.rechazarSprite = false; prueba.certificaAlGenerar = true; prueba.ops = []; });
        await page.locator('.tt-galpanel[data-ambito="fonts"] .tt-galpanel-reintentar').click();
        await page.waitForFunction(() => {
            const p = [...document.querySelectorAll('.tt-galpanel')].find(x => x.dataset.ambito === 'fonts');
            return p.querySelectorAll('.tt-galpanel-tile canvas').length === 2;
        });
        const reintentoFonts = await page.evaluate(() => {
            const p = [...document.querySelectorAll('.tt-galpanel')].find(x => x.dataset.ambito === 'fonts');
            return { ops: prueba.ops.slice(), oculto: p.querySelector('.tt-galpanel-reintentar').hidden };
        });
        assert.deepEqual(reintentoFonts.ops, ['sprite'], 'el reintento de la galeria de fuentes escribe UNA vez (I2)');
        assert.equal(reintentoFonts.oculto, true, 'el Reintentar se oculta al resolverse');
        await page.evaluate(() => { prueba.ops = []; });
        await page.locator('.tt-galpanel-upload input').setInputFiles({ name: 'nueva.ttf', mimeType: 'font/ttf', buffer: Buffer.from('fuente simulada') });
        await page.waitForFunction(() => document.querySelectorAll('.tt-galpanel-tile').length === 3 && prueba.eventos.length === 1);
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
            // La hoja de img se sirve CERTIFICADA: cuando se lee, la celda se dibuja
            // desde el sprite (canvas) sin descargar ningun original (SC-001).
            for (let i = 0; i < 40 && !(panelImg() && panelImg().querySelector('.tt-galpanel-tile canvas')); i++) {
                await new Promise(r => setTimeout(r, 50));
            }
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
            return { preview, confirmado, cerradaTrasAplicar, huboCancelTrasAplicar, cancelo: prueba.onCancel, oculta: panelImg().hidden,
                ambito: panelImg().dataset.ambito,
                ratio: getComputedStyle(panelImg().querySelector('.tt-galpanel-tile')).aspectRatio,
                canvases: panelImg().querySelectorAll('.tt-galpanel-tile canvas').length,
                originales: prueba.originales };
        });
        assert.equal(flujo.ambito, 'img', 'el panel de imagenes declara su ambito');
        assert.equal(flujo.ratio, '1 / 1', 'el tile de imagenes sigue su celda (1:1, ratio simplificado)');
        assert.equal(flujo.canvases, 1, 'la celda de img se dibuja desde la hoja certificada');
        assert.equal(originales.length, 0, 'con hoja certificada NO se descarga ningun original de imagen (SC-001)');
        assert.equal(flujo.preview, 'https://textmuy.test/img/a.png', 'preview en vivo con la URL resuelta');
        assert.equal(flujo.confirmado, 1, 'Aplicar confirma el id numerico');
        assert.equal(flujo.cerradaTrasAplicar, true);
        assert.equal(flujo.huboCancelTrasAplicar, false, 'Aplicar no dispara onCancel');
        assert.equal(flujo.cancelo, true, 'cerrar sin Aplicar dispara onCancel');
        assert.equal(flujo.oculta, true);
        // T022/T039 (SC-002/SC-004): SIN hoja la galeria la genera sola con EXACTAMENTE
        // 1 escritura; la apertura siguiente lee la hoja certificada y no descarga ni
        // escribe nada.
        const antesGen = await page.evaluate(async () => {
            const panelFonts = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'fonts');
            panelFonts.querySelector('.tt-galpanel-close').click();
            prueba.sinHoja = true;
            prueba.certificaAlGenerar = true;
            prueba.ops = [];
            // Estado limpio: catalogo sin firma, sin memo de canon y sin celdas en cache.
            if (window.TextMuyAPI.invalidarSpriteCanonico) window.TextMuyAPI.invalidarSpriteCanonico('fonts');
            if (window.TextMuyAPI.invalidarCatalogo) window.TextMuyAPI.invalidarCatalogo('fonts');
            if (window.TextMuyAPI.invalidarDibujados) window.TextMuyAPI.invalidarDibujados('fonts');
            const hoja = await window.TextMuyAPI.ensureSpriteCanonico('fonts');
            return { fontFace: prueba.fontFace, hojas: prueba.hojas, originales: prueba.originales, hojaAntes: hoja ? 'certificada' : 'rechazada' };
        });
        await page.evaluate(() => TextMuyGaleriaFuentes.abrir(() => {}));
        let diagGen = null;
        for (let i = 0; i < 60; i++) {
            diagGen = await page.evaluate(() => ({
                ops: prueba.ops.slice(), canvases: document.querySelectorAll('.tt-galpanel-tile canvas').length,
                canvasesFonts: [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'fonts').querySelectorAll('.tt-galpanel-tile canvas').length,
                phs: document.querySelectorAll('.tt-galpanel-tile .tt-galpanel-ph').length,
                status: (document.querySelector('.tt-galpanel-status') || {}).textContent || '',
                fontFace: prueba.fontFace, hojas: prueba.hojas, sinHoja: prueba.sinHoja
            }));
            if (diagGen.ops.length >= 1) break;
            await new Promise(r => setTimeout(r, 250));
        }
        assert.ok(diagGen && diagGen.ops.length >= 1, 'la generacion sin hoja no llego a escribir (I2)');
        const generada = await page.evaluate(async () => {
            const panelFonts = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'fonts');
            // Tras F2 la hoja queda certificada: la lectura canonica la acepta.
            const hoja = await window.TextMuyAPI.ensureSpriteCanonico('fonts');
            return {
                ops: prueba.ops.slice(), fontFace: prueba.fontFace, hojas: prueba.hojas, originales: prueba.originales,
                canvases: panelFonts.querySelectorAll('.tt-galpanel-tile canvas').length,
                hojaDespues: hoja ? 'certificada' : 'rechazada'
            };
        });
        assert.equal(antesGen.hojaAntes, 'rechazada', 'sin thumbs.sprite_firma la hoja NO se acepta (SC-001)');
        assert.deepEqual(generada.ops, ['sprite'], 'sin hoja => EXACTAMENTE 1 POST op=sprite (I2)');
        assert.equal(generada.hojaDespues, 'certificada', 'tras generar, la hoja queda certificada (SC-002)');
        assert.equal(generada.fontFace - antesGen.fontFace, 2,
            'la generacion baja SOLO los 2 archivos fisicos pendientes (la Google va por css2)');
        assert.equal(originales.length, 0, 'generar la hoja de fonts no descarga originales de imagen');
        const antes2 = await page.evaluate(() => {
            const panelFonts = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'fonts');
            panelFonts.querySelector('.tt-galpanel-close').click();
            prueba.sinHoja = false;
            prueba.certificaAlGenerar = false;
            prueba.ops = [];
            return { fontFace: prueba.fontFace, hojas: prueba.hojas };
        });
        await page.evaluate(() => TextMuyGaleriaFuentes.abrir(() => {}));
        let diagLeida = null;
        for (let i = 0; i < 60; i++) {
            diagLeida = await page.evaluate(() => ({
                hojas: prueba.hojas,
                canvasesFonts: [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'fonts').querySelectorAll('.tt-galpanel-tile canvas').length
            }));
            if (diagLeida.canvasesFonts === 3) break;
            await new Promise(r => setTimeout(r, 250));
        }
        assert.ok(diagLeida.canvasesFonts === 3, 'la segunda apertura pinta las celdas desde la hoja');
        const leida = await page.evaluate(() => ({ ops: prueba.ops.slice(), fontFace: prueba.fontFace, hojas: prueba.hojas }));
        assert.deepEqual(leida.ops, [], 'segunda apertura con hoja certificada: 0 escrituras (I1/I2)');
        assert.equal(leida.fontFace, antes2.fontFace, 'segunda apertura: 0 descargas de contenido (SC-001)');
        assert.ok(leida.hojas - antes2.hojas <= 1, 'segunda apertura: la hoja no se regenera (0 o 1 lecturas)');
        // T037/T020: bug real de la revision (la galeria de imagenes no tenia boton ni
        // reintento). Motor que rechaza => no se persiste, se muestra la causa y
        // aparece Reintentar; cuando el motor acepta, el reintento escribe UNA vez.
        const originalesAntesImg = originales.length;
        const antesError = await page.evaluate(() => {
            prueba.sinHojaImg = true;
            prueba.rechazarSprite = true;
            prueba.certificaAlGenerar = false;
            prueba.ops = [];
            if (window.TextMuyAPI.invalidarSpriteCanonico) window.TextMuyAPI.invalidarSpriteCanonico('img');
            if (window.TextMuyAPI.invalidarCatalogo) window.TextMuyAPI.invalidarCatalogo('img');
            if (window.TextMuyAPI.invalidarDibujados) window.TextMuyAPI.invalidarDibujados('img');
            // Camino REAL de una mutacion: invalida la hoja en la vista (deja el
            // estado en 'pendiente') para que la apertura vuelva a generarla.
            window.dispatchEvent(new CustomEvent('textmuy:sprite-invalidado', { detail: { ambito: 'img' } }));
            const panel = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'img');
            if (!panel.hidden) panel.querySelector('.tt-galpanel-close').click();
            return { originales: prueba.originales };
        });
        await page.evaluate(() => TextMuyGaleria.abrir('fondos', () => {}, null, { preview: true }));
        let errorImg = null;
        for (let i = 0; i < 60; i++) {
            errorImg = await page.evaluate(() => {
                const panel = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'img');
                const btn = panel.querySelector('.tt-galpanel-reintentar');
                return { ops: prueba.ops.slice(), oculto: btn.hidden, status: (panel.querySelector('.tt-galpanel-status') || {}).textContent || '',
                    canvases: panel.querySelectorAll('.tt-galpanel-tile canvas').length,
                    phs: panel.querySelectorAll('.tt-galpanel-tile .tt-galpanel-ph').length,
                    imgs: panel.querySelectorAll('.tt-galpanel-tile img').length };
            });
            if (!errorImg.oculto) break;
            await new Promise(r => setTimeout(r, 250));
        }
        assert.deepEqual(errorImg.ops, ['sprite'], 'motor que rechaza: 1 intento de escritura y la hoja NO se persiste (I3) [diag=' + JSON.stringify(errorImg) + ']');
        assert.equal(errorImg.oculto, false, 'tras el error aparece el boton Reintentar (T020)');
        assert.ok(errorImg.status.indexOf('img:hoja:motor:rechazo') >= 0,
            'la causa exacta se muestra en la galeria de imagenes (' + errorImg.status + ')');
        // Reintento: el motor ya acepta => 1 escritura nueva y la celda se dibuja.
        await page.evaluate(() => { prueba.rechazarSprite = false; prueba.certificaAlGenerar = true; prueba.ops = []; });
        await page.locator('.tt-galpanel[data-ambito="img"] .tt-galpanel-reintentar').click();
        let reintento = null;
        for (let i = 0; i < 60; i++) {
            reintento = await page.evaluate(() => {
                const panel = [...document.querySelectorAll('.tt-galpanel')].find(p => p.dataset.ambito === 'img');
                return { ops: prueba.ops.slice(), canvases: panel.querySelectorAll('.tt-galpanel-tile canvas').length,
                    oculto: panel.querySelector('.tt-galpanel-reintentar').hidden };
            });
            if (reintento.canvases >= 1 && reintento.oculto) break;
            await new Promise(r => setTimeout(r, 250));
        }
        assert.deepEqual(reintento.ops, ['sprite'], 'el reintento escribe la hoja UNA vez (I2)');
        assert.equal(reintento.canvases, 1, 'tras el reintento la celda se dibuja desde la hoja');
        assert.equal(reintento.oculto, true, 'el Reintentar se oculta al resolverse');
        assert.equal(originales.length, originalesAntesImg + 1,
            'para generar la celda de img se baja SU original una sola vez (I5)');
        assert.deepEqual(errores, []);
        console.log('OK: galerias.browser.js (DOM real; motor y miniaturas simulados)');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
