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
    }

    // SIN async en la firma: asi las llamadas repetidas devuelven LA MISMA promesa
    // cacheada (identidad estable, cero wrappers extra).
    function loadPresetByName(name) {
        if (presetCache[name]) return presetCache[name];
        const promise = (async function() {
            // Base de lectura de presets: con puente es uploads/.../textmuy/presets/
            // (plugin >= 4.0.0); standalone: presets/ relativo al modulo.
            // Los .txm son delta textmuy-project (formato unico desde 3.2.0);
            // fallback al .json legacy (formato TextStudio crudo).
            const base = (window.PresetManager && window.PresetManager.presetUrlBase)
                ? window.PresetManager.presetUrlBase()
                : 'presets/';
            let response = await fetch(base + encodeURIComponent(name) + '.txm');
            if (response.ok) {
                const payload = await response.json();
                if (!payload || payload.format !== 'textmuy-project'
                    || typeof payload.settings !== 'object' || payload.settings === null) {
                    throw new Error('Unsupported preset format: ' + name);
                }
                if (window.PresetManager && window.PresetManager.settingsFromDelta) {
                    return window.PresetManager.settingsFromDelta(payload.settings);
                }
                throw new Error('PresetManager is required to load .txm presets');
            }
            response = await fetch(base + encodeURIComponent(name) + '.json');
            if (!response.ok) throw new Error('Preset not found: ' + name);
            return response.json();
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
    function loadCatalogo(ambito) {
        var base = (window.PresetManager && window.PresetManager.presetUrlBase)
            ? window.PresetManager.presetUrlBase()
            : 'presets/';
        var url = base + '../' + ambito + '/' + (ambito === 'fonts' ? 'fonts' : ambito === 'img' ? 'img' : 'presets') + '.json';
        if (catalogCache[url]) return catalogCache[url];
        var p = fetch(url, { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error(ambito + ':catalogo:ausente (' + url + ')');
            return r.json();
        }).then(function (data) {
            if (window.TextMuyCatalog) return window.TextMuyCatalog.parseCatalog(data, ambito);
            return { items: {}, libres: [], invalidas: [], categorias: {}, maxId: 0, thumbs: { w: 0, h: 0, c: 1 } };
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

    // Resolucion autoritativa de refs de imagen por id numerico (formato
    // unico, T015). Sin refs numericas NO hay fetch (carga modular). Con
    // refs: img.json una vez (cache) y muta settings in-place; id ausente
    // o invalido -> rechazo con causa (Const. II: fail-fast en render).
    async function prepareImgRefs(settings) {
        if (!settings || typeof settings !== 'object' || !window.TextMuyCatalog) return settings;
        if (!window.TextMuyCatalog.hasNumericImgRefs(settings)) return settings;
        var parsed = await loadCatalogo('img');
        var b = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var base = (b && b.urls && b.urls.imagenesBase) ? b.urls.imagenesBase : 'img/';
        window.TextMuyCatalog.mapImgRefs(settings, function (v) {
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

    async function renderTextToPNG(params) {
        params = params || {};
        if (typeof params.text !== 'string') throw new Error('text must be a string');
        if (!params.preset && !params.settings) throw new Error('preset or settings is required');
        if (!window.TextEditor || !window.ExportManager) throw new Error('TextMuy has not finished loading');

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

    window.TextMuyAPI = {
        renderTextToPNG: renderTextToPNG,
        renderBatch: renderBatch,
        downloadPNG: downloadPNG,
        copyImageToClipboard: copyImageToClipboard,
        loadPresetByName: loadPresetByName,
        loadPresetById: loadPresetById,
        loadCatalogo: loadCatalogo,
        prepareImgRefs: prepareImgRefs,
        clearPresetCache: clearPresetCache
    };
})();