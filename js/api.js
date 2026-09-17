/* ===== TEXTMUY API - client-side PNG rendering ===== */
(function() {
    'use strict';

    function mergeDeep(target, source) {
        if (!source || typeof source !== 'object') return target;
        Object.keys(source).forEach(function(key) {
            const value = source[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                mergeDeep(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    // Cache de presets (promise-cache): el mismo preset nunca se fetchea dos veces.
    // El puente con Personalizador PDF renderiza N grupos que suelen compartir preset.
    var presetCache = {};

    function clearPresetCache() {
        presetCache = {};
        catalogCache = {};
        catalogSync = {};
    }

    // SIN async en la firma: asi las llamadas repetidas devuelven LA MISMA promesa
    // cacheada (identidad estable, cero wrappers extra).
    function loadPresetByName(name) {
        if (presetCache[name]) return presetCache[name];
        const promise = (async function() {
            // Base de lectura de presets: llega por el puente (uploads/pmu/tm-presets/).
            // Formato unico delta textmuy-project: NO hay fallback al .json legacy.
            const base = (window.PresetManager && window.PresetManager.presetUrlBase)
                ? window.PresetManager.presetUrlBase()
                : '';
            if (!base) throw new Error('presets:sin_puente: la lectura requiere el plugin.');
            const response = await fetch(base + encodeURIComponent(name) + '.txm');
            if (!response.ok) throw new Error('presets:' + name + ':recurso:ausente');
            const payload = await response.json();
            if (!payload || payload.format !== 'textmuy-project'
                || typeof payload.settings !== 'object' || payload.settings === null) {
                throw new Error('presets:' + name + ':formato: volver a guardar el preset desde el editor.');
            }
            if (window.PresetManager && window.PresetManager.settingsFromDelta) {
                return window.PresetManager.settingsFromDelta(payload.settings);
            }
            throw new Error('PresetManager is required to load .txm presets');
        })();
        presetCache[name] = promise;
        // No cachear fallos: un retry (p. ej. tras guardar el preset en el editor) debe reevaluar.
        promise.catch(function() { delete presetCache[name]; });
        return promise;
    }

    /** Resuelve la clave de fuente del settings via FontLoader (si esta disponible). */
    function defaultFamily() {
        return (window.FontLoader && FontLoader.DEFAULT_FONT_FAMILY) || 'Bangers';
    }
    function resolveFontKey(font) {
        if (window.FontLoader && FontLoader.resolveFontFromPreset) {
            return FontLoader.resolveFontFromPreset(font);
        }
        if (font && typeof font === 'object') return font.src || font.name || defaultFamily();
        return (typeof font === 'string' && font) ? font : defaultFamily();
    }

    // Cache de catalogos por ambito para resolucion por id (formato unico).
    var catalogCache = {};
    // Nombre explicito del catalogo por ambito: NUNCA derivado del directorio.
    var CATALOGO_FILE = { fonts: 'fonts.json', img: 'img.json', 'tm-presets': 'presets.json' };
    var CATALOGO_BASE = { fonts: 'fuentesBase', img: 'imagenesBase', 'tm-presets': 'presetsBase' };
    function loadCatalogo(ambito) {
        var b = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var baseKey = CATALOGO_BASE[ambito];
        var base = (b && b.urls && baseKey && b.urls[baseKey]) ? b.urls[baseKey] : '';
        if (!base) throw new Error(ambito + ':catalogo:sin_puente');
        var url = base + CATALOGO_FILE[ambito];
        if (catalogCache[url]) return catalogCache[url];
        var p = fetch(url, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error(ambito + ':catalogo:ausente (' + url + ')');
            return r.json();
        }).then(function (data) {
            var parsed;
            if (window.TextMuyCatalog) parsed = window.TextMuyCatalog.parseCatalog(data, ambito);
            else parsed = { items: {}, libres: [], invalidas: [], categorias: {}, maxId: 0, thumbs: { w: 0, h: 0, c: 1 } };
            parsed.spriteFirma = data.thumbs && data.thumbs.sprite_firma;
            parsed.firma = window.TextMuyCatalog.firmaCatalogo(data.thumbs, data.items);
            catalogSync[ambito] = parsed;
            return parsed;
        });
        catalogCache[url] = p;
        p.catch(function () { delete catalogCache[url]; });
        return p;
    }

    /** Resuelve un preset por id numerico del catalogo presets.json. */
    function loadPresetById(id) {
        return loadCatalogo('presets').then(function (parsed) {
            var entry;
            try {
                entry = window.TextMuyCatalog
                    ? window.TextMuyCatalog.requireId(parsed, 'presets', id)
                    : null;
            } catch (e) { throw e; }
            if (!entry) throw new Error('presets:' + id + ':ausente o invalido');
            return loadPresetByName(entry.file.replace(/\.txm$/i, ''));
        });
    }

    // Cache sincrono del ultimo catalogo parseado por ambito (lo llena
    // loadCatalogo; lo leen urlDeImgRef/galeria/controls para previews sin
    // fetch extra). null si aun no cargo o fallo (cero 404 de ruido).
    var catalogSync = {};
    function loadCatalogoSync(ambito) {
        return catalogSync[ambito] || null;
    }

    // R2: resuelve un imgRef (id numerico | URL | data-URL) a URL mostrable.
    // Para ids usa el catalogo sincrono; si aun no cargo, '' (el re-render
    // tras prepareImgRefs pinta la preview). Strings se devuelven tal cual.
    function urlDeImgRef(ref) {
        // RC32: id escrito como string ("47") -> id numerico. Sin esto la
        // ref se devolvia como URL relativa y generaba GET .../textmuy/47 404.
        if (typeof ref === 'string' && window.TextMuyCatalog && window.TextMuyCatalog.esIdNumerico
            && window.TextMuyCatalog.esIdNumerico(ref)) ref = +String(ref).trim();
        if (typeof ref === 'number' && isFinite(ref) && Math.floor(ref) === ref && ref >= 1) {
            var cat = catalogSync.img;
            if (cat && cat.items && cat.items[ref] && cat.items[ref].file) {
                var b2 = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
                var base2 = (b2 && b2.urls && b2.urls.imagenesBase) ? b2.urls.imagenesBase : '';
                if (!base2) throw new Error('img:sin_puente');
                var f = cat.items[ref].file;
                return /^(https?:)?\/\//i.test(f) ? f : base2 + f;
            }
            return '';
        }
        return (typeof ref === 'string') ? ref : '';
    }

    // Resolucion autoritativa de refs de imagen por id numerico (formato
    // unico, T015). Sin refs numericas NO hay fetch (carga modular). Con
    // refs: img.json una vez (cache) y muta settings in-place; id ausente
    // o invalido -> rechazo con causa (Const. II: fail-fast en render).
    async function prepareImgRefs(settings) {
        if (!settings || typeof settings !== 'object' || !window.TextMuyCatalog) return settings;
        if (!window.TextMuyCatalog.hasNumericImgRefs(settings)) return settings;
        var parsed = await loadCatalogo('img');
        var b = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var base = (b && b.urls && b.urls.imagenesBase) ? b.urls.imagenesBase : '';
        if (!base) throw new Error('img:sin_puente');
        window.TextMuyCatalog.mapImgRefs(settings, function (v) {
            // RC32: refs numerico-string (p.ej. de .txm viejos o bordes que
            // escriben strings) se normalizan al id numerico ANTES de resolver;
            // asi se resuelven a URL en vez de fallar o pedir URL relativas.
            if (typeof v === 'string' && window.TextMuyCatalog.esIdNumerico && window.TextMuyCatalog.esIdNumerico(v)) v = +v.trim();
            if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < 1) return v;
            var e = parsed.items[v];
            if (!e || !e.file) throw new Error('img:' + v + ':ausente o invalido');
            return /^(https?:)?\/\//i.test(e.file) ? e.file : base + e.file;
        });
        return settings;
    }

    /**
     * Garantiza que la familia del settings este cargada en document.fonts ANTES de
     * renderizar (canvas usa ctx.font: sin esto, una familia aun no cargada se
     * renderiza con la fuente del sistema). Usado por toda la API publica.
     */
    async function ensureFontReady(settings) {
        var key = resolveFontKey(settings.font);
        if (window.FontLoader && FontLoader.loadFont) {
            try { await FontLoader.loadFont(key); } catch (_) { /* sigue el fallback */ }
        }
        if (document.fonts && document.fonts.load) {
            var family = (window.FontLoader && FontLoader.getFontName) ? FontLoader.getFontName(key) : key;
            var weight = (settings.font && settings.font.weight) || 'normal';
            try { await document.fonts.load(weight + ' 64px "' + family + '"'); } catch (_) {}
        }
    }

    /**
     * H-006 (003-plugin-compat-review): la ruta de API exige WebGL disponible
     * (Const. II: sin WebGL la API falla con causa, no degrada en silencio a
     * Canvas 2D). El editor conserva su fallback documentado; el render de la
     * API no.
     */
    function assertWebGLDisponible() {
        try {
            const cv = document.createElement('canvas');
            const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
            if (!gl) {
                throw new Error('render:webgl:no_disponible (la API requiere WebGL; sin el el estilo se degradaria)');
            }
        } catch (e) {
            if (e && /render:webgl/.test(e.message || '')) { throw e; }
            throw new Error('render:webgl:no_disponible (la API requiere WebGL; sin el el estilo se degradaria)');
        }
    }

    async function renderTextToPNG(params) {
        params = params || {};
        if (typeof params.text !== 'string') throw new Error('text must be a string');
        if (!params.preset && !params.settings) throw new Error('preset or settings is required');
        if (!window.TextEditor || !window.ExportManager) throw new Error('TextMuy has not finished loading');
        // H-006: fail-fast de WebGL en la ruta de API (Const. II).
        assertWebGLDisponible();

        let settings;
        if (params.settings) {
            // Render from current editor state (used by Download / Copy buttons)
            settings = TextEditor.createDefaultSettings();
            mergeDeep(settings, params.settings);
        } else {
            const preset = await loadPresetByName(params.preset);
            settings = TextEditor.createDefaultSettings();
            TextEditor.loadPreset(preset, settings);
        }

        settings.text = params.text;
        if (params.width) settings.canvas.width = Math.max(100, Math.min(8000, Number(params.width) || settings.canvas.width));
        if (params.height) settings.canvas.height = Math.max(100, Math.min(8000, Number(params.height) || settings.canvas.height));
        mergeDeep(settings, params.overrides || {});

        // Formato unico: refs de imagen por id numerico -> URLs (fail-fast).
        await prepareImgRefs(settings);

        await ensureFontReady(settings);

        const canvas = ExportManager.canvasFromSettings(settings);
        return ExportManager.toBlob(canvas);
    }

    /**
     * Render por lotes para el puente con Personalizador PDF (render-core).
     * items: [{ id, text, preset|settings, width, height, overrides? }]
     * options.onProgress(id, index, total) se llama antes de cada item.
     * Devuelve [{ id, blob }] en el mismo orden; si un item falla, rechaza
     * (nunca un lote parcial). Los presets se resuelven via cache (1 fetch por preset)
     * y los recursos (pool de capas, contextos WebGL) se comparten entre items.
     */
    async function renderBatch(items, options) {
        items = items || [];
        options = options || {};
        if (!window.TextEditor || !window.ExportManager) throw new Error('TextMuy has not finished loading');
        const out = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (typeof options.onProgress === 'function') {
                try { options.onProgress(item.id, i, items.length); } catch (_) { /* progreso best-effort */ }
            }
            const blob = await renderTextToPNG(item);
            out.push({ id: item.id, blob: blob });
        }
        return out;
    }

    async function downloadPNG(params) {
        const blob = await renderTextToPNG(params);
        const name = (params && params.preset ? params.preset : 'textmuy') + '_' + Date.now() + '.png';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 0);
        return name;
    }

    async function copyImageToClipboard(params) {
        const blob = await renderTextToPNG(params || {});
        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error('Clipboard API not available in this browser. Use HTTPS or localhost.');
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
    }

    // Sprite canonico por ambito (Fase 1): el thumbs.webp se lee directo del
    // servidor y la celda de cada id se deriva de catalogo.thumbs
    // (tile = id-1, huecos estables). Sin N fetches de originales ni rebuild
    // en el camino de lectura. El sprite lleva cache-bust por filemtime
    // (ver PMU_Uploads::url_de): al mutar el ambito, el filemtime cambia y
    // el navegador invalida solo. Cache en memoria por URL (sesion).
    var spriteCache = {};   // spriteUrl -> Promise<Image>
    var canonCache = {};    // ambito -> {canon, spriteUrl, spriteImage}
    function spriteBaseDe(ambito) {
        var b = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var baseKey = CATALOGO_BASE[ambito];
        var base = (b && b.urls && baseKey && b.urls[baseKey]) ? b.urls[baseKey] : '';
        return base || '';
    }
    function spriteUrlDeAmbito(ambito) {
        var base = spriteBaseDe(ambito);
        if (!base) throw new Error(ambito + ':sprite:sin_puente');
        return base.replace(/\/$/, '') + '/thumbs.webp';
    }
    function cargarImagenSprite(url) {
        if (spriteCache[url]) return spriteCache[url];
        // Revalidacion condicional (fetch cache:no-cache): 304 reutiliza la
        // copia del navegador (cero descarga si la hoja no cambio) y 200 trae
        // la hoja nueva. Sin ?v inventado y sin HEAD (el hosting lo bloquea).
        var p = fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.blob() : null; })
            .then(function (blob) {
                if (!blob) return null;
                return new Promise(function (res) {
                    var img = new Image();
                    img.onload = function () { res(img); };
                    img.onerror = function () { res(null); };
                    img.src = URL.createObjectURL(blob);
                });
            });
        spriteCache[url] = p;
        p.then(function (img) { if (!img) delete spriteCache[url]; });
        return p;
    }
    // Asegura el sprite canonico del ambito: {canon, spriteUrl, spriteImage}.
    // Solo se acepta una hoja CERTIFICADA para el catalogo vigente: el
    // catalogo guarda `thumbs.sprite_firma` (dims + tuplas) y debe coincidir
    // con la firma del catalogo leido. Una hoja vieja (mismas dimensiones,
    // otro contenido) NO se reutiliza: se devuelve null para que el llamador
    // regenere. Cache en memoria por ambito (invalidada tras mutaciones).
    async function ensureSpriteCanonico(ambito) {
        if (!window.TextMuyCatalog || !window.TextMuyCatalog.manifestDeSprite) return null;
        var parsed = null;
        try { parsed = await loadCatalogo(ambito); } catch (_) { return null; }
        if (!parsed || !parsed.items) return null;
        if (parsed.spriteFirma === undefined || parsed.spriteFirma !== parsed.firma) {
            return null; // sin certificar o catalogo cambio: regenerar
        }
        var canon = null;
        try { canon = window.TextMuyCatalog.manifestDeSprite(parsed, ambito); }
        catch (e) { console.warn((e && e.message) || e); return null; }
        var url = '';
        try { url = spriteUrlDeAmbito(ambito); } catch (e) { console.warn((e && e.message) || e); return null; }
        var prev = canonCache[ambito];
        if (prev && prev.spriteUrl === url && prev.canon && prev.firma === parsed.firma) return prev;
        var img = await cargarImagenSprite(url);
        if (!img) return null; // sprite ausente en servidor -> fallback controlado
        // Dimensiones del archivo: deben ser exactamente las de la retícula.
        if ((img.naturalWidth || img.width) !== canon.columnas * canon.tile.ancho
            || (img.naturalHeight || img.height) !== canon.filas * canon.tile.alto) {
            return null;
        }
        var out = { canon: canon, spriteUrl: url, spriteImage: img, firma: parsed.firma };
        canonCache[ambito] = out;
        return out;
    }
    // Dibuja el tile canonico del id en un canvas del tamano del tile.
    // null si el sprite no cubre ese id (hoja vieja: el llamador regenera).
    function drawTileCanonico(ambito, id) {
        var memo = canonCache[ambito];
        if (!memo || !memo.spriteImage || !memo.canon) return null;
        var c = null;
        try { c = window.TextMuyCatalog.celdaDeSprite(memo.spriteImage, memo.canon, id); }
        catch (_) { c = null; }
        if (!c) return null;
        try {
            var cv = document.createElement('canvas');
            cv.width = c.w; cv.height = c.h;
            cv.getContext('2d').drawImage(memo.spriteImage, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
            return cv;
        } catch (_) { return null; }
    }

    // Reconstruccion canonica UNA sola vez (sprite ausente en servidor o
    // invalidado): dibuja los tiles en layout tile = id-1 (huecos incluidos,
    // orden por id) y persiste via el motor (op=sprite, ThumbEngine). Con
    // opciones.render (p.ej. fuentes) el callback provee el canvas/Image del
    // tile; sin render, los items con url se descargan y encajan (pad en img).
    // Devuelve el resultado de ThumbEngine (o null sin motor/catalogo).
    async function reconstruirSpriteCanonico(ambito, opciones) {
        opciones = opciones || {};
        if (!window.ThumbEngine || !window.ThumbEngine.ensureSprite) return null;
        var parsed = null;
        try { parsed = await loadCatalogo(ambito); } catch (_) { return null; }
        if (!parsed || !parsed.items || !parsed.thumbs) return null;
        var base = spriteBaseDe(ambito);
        if (!base) return null;
        var items = [];
        for (var id = 1; id <= parsed.maxId; id++) {
            var e = parsed.items[id];
            if (e && e.file) {
                var it = { nombre: String(id), id: id, titulo: e.titulo, file: e.file, online: !!e.online };
                it.url = (!e.online && !/^(https?:)?\/\//i.test(e.file)) ? base + e.file : '';
                items.push(it);
            } else {
                items.push({ nombre: String(id), id: id }); // hueco estable
            }
        }
        var res = null;
        try {
            res = await window.ThumbEngine.ensureSprite({
                scope: ambito,
                items: items,
                ancho: parsed.thumbs.w | 0,
                alto: parsed.thumbs.h | 0,
                columnas: parsed.thumbs.c | 0,
                pad: ambito === 'img',
                baseUrl: base,
                firma: parsed.firma,
                render: opciones.render || null
            });
        } catch (_) { res = null; }
        // El motor certifica el catalogo (thumbs.sprite_firma) al persistir la
        // hoja: hay que releer el catalogo para que la lectura canonica valide.
        if (res) invalidarCatalogo(ambito);
        return res;
    }
    // Descarta la copia en memoria del catalogo del ambito: obliga a releerlo.
    // Necesario tras reconstruir el sprite, porque el motor certifica el
    // catalogo (thumbs.sprite_firma) recien al persistir la hoja.
    function invalidarCatalogo(ambito) {
        var base = spriteBaseDe(ambito);
        if (base) delete catalogCache[base + CATALOGO_FILE[ambito]];
        delete catalogSync[ambito];
    }
    // Invalida la cache canonica del ambito (tras alta/baja/edicion). El
    // proximo ensureSpriteCanonico revalida y trae la hoja nueva (no-cache).
    function invalidarSpriteCanonico(ambito) {
        var prev = canonCache[ambito];
        if (prev && prev.spriteUrl) delete spriteCache[prev.spriteUrl];
        delete canonCache[ambito];
    }

    window.TextMuyAPI = {
        renderTextToPNG: renderTextToPNG,
        renderBatch: renderBatch,
        downloadPNG: downloadPNG,
        copyImageToClipboard: copyImageToClipboard,
        loadPresetByName: loadPresetByName,
        loadPresetById: loadPresetById,
        loadCatalogo: loadCatalogo,
        loadCatalogoSync: loadCatalogoSync,
        urlDeImgRef: urlDeImgRef,
        prepareImgRefs: prepareImgRefs,
        invalidarCatalogo: invalidarCatalogo,
        ensureSpriteCanonico: ensureSpriteCanonico,
        reconstruirSpriteCanonico: reconstruirSpriteCanonico,
        invalidarSpriteCanonico: invalidarSpriteCanonico,
        drawTileCanonico: drawTileCanonico,
        clearPresetCache: clearPresetCache
    };
})();