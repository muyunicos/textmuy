/* ===== TEXTSTUDIO FONTS - TTF Font Loading ===== */

(function() {
    'use strict';

    var fontRegistry = {};

    // TextStudio font ID -> clave de catalogo online (se resuelve a Google
    // Fonts via el catalogo fonts.json; ya no hay TTF locales en el modulo).
    var textStudioFontMap = {
        '832.ttf': 'Creepster',
        '4322.ttf': 'Press Start 2P',
        '11768.ttf': 'Kanit'
    };

    // TextStudio font name -> clave de catalogo online
    var nameToKeyMap = {
        '28 Days Later Cyr Regular': 'Creepster',
        '28 Days Later': 'Creepster',
        'Nintender Regular': 'Press Start 2P',
        'Nintender': 'Press Start 2P',
        'LEMON MILK Pro UltraBold': 'Kanit',
        'LEMON MILK': 'Kanit'
    };

    // ===== CATALOGO GOOGLE VIA fonts.json (cero hardcode) =====
    // fonts/fonts.json (plantilla) y uploads/.../textmuy/fonts/fonts.json
    // (copia editable del admin): [{nombre, titulo, categoria}]. Sin campo
    // url/path = online (se resuelve via document.fonts, nunca FontFace).
    // Las fisicas (TTF en la carpeta, escaneadas por el plugin via puente)
    // se registran aparte con path local + HEAD previo. fontCategories se
    // deriva del catalogo (dinamico: categorias nuevas sin tocar codigo).
    // Nombre generico inicial del canvas (NO es una fuente cargada: es la
    // etiqueta que muestra el picker vacio y la que resuelven los presets sin
    // fuente declarada hasta que el usuario elige una real).
    // Se reemplaza en cuanto el usuario elige/carga una fuente (ver setDefaultFont).
    var DEFAULT_FONT_FAMILY = 'Bangers';
    var catalogPromise = null;
    var catalogFonts = {};   // nombre -> {titulo, categoria}
    var fontCategories = {}; // categoria -> [nombres] (derivado del catalogo)
    function catalogUrl() {
        return fontUrlBase() + 'fonts.json';
    }
    // Fuentes fisicas conocidas por el puente (escaneo del servidor). El
    // plugin manda bridge.fuentes al hacer syncServerFonts; esto solo expone
    // la lista ya sincronizada para la galeria de fuentes (sin HEAD extra:
    // el servidor las escaneo al construir el puente).
    function listServerFonts() {
        var out = [];
        for (var key in fontRegistry) {
            if (fontRegistry[key] && fontRegistry[key].isServer) {
                out.push({
                    key: key,
                    nombre: fontRegistry[key].serverFile || key,
                    titulo: fontRegistry[key].name,
                    categoria: fontRegistry[key].categoria || 'custom',
                    url: fontRegistry[key].path
                });
            }
        }
        return out;
    }
    function loadCatalog() {
        if (catalogPromise) return catalogPromise;
        catalogPromise = fetch(catalogUrl(), { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('sin fonts.json en ' + catalogUrl());
            return r.json();
        }).then(function (lista) {
            if (!Array.isArray(lista)) throw new Error('fonts.json no es array');
            catalogFonts = {};
            fontCategories = {};
            lista.forEach(function (f) {
                if (!f || !f.nombre) return;
                var cat = f.categoria || 'custom';
                // google:"Familia:wght@..." (online lazy) o url (fisica a mano).
                catalogFonts[f.nombre] = { titulo: f.titulo || f.nombre, categoria: cat, google: f.google || null, url: f.url || null };
                if (!fontCategories[cat]) fontCategories[cat] = [];
                if (fontCategories[cat].indexOf(f.nombre) === -1) fontCategories[cat].push(f.nombre);
            });
            return catalogFonts;
        }).catch(function (err) {
            console.warn('No se pudo cargar el catalogo de fuentes (' + catalogUrl() + '):', err && err.message);
            catalogPromise = null;
            return catalogFonts;
        });
        return catalogPromise;
    }
    var loadedFonts = {};
    var loadingPromises = {};
    var customFonts = {};

    // Soporte para puente de servidor (WordPress Personalizador PDF)
    var bridgeFontsLoaded = false;
    function syncServerFonts() {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        if (!bridge || !Array.isArray(bridge.fuentes)) return;
        bridge.fuentes.forEach(function (f) {
            var key = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
            fontRegistry[key] = {
                name: f.titulo || f.nombre,
                path: f.url,
                isCustom: true,
                isServer: true,
                serverFile: f.nombre
            };
            nameToKeyMap[f.titulo || f.nombre] = key;
        });
        bridgeFontsLoaded = true;
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('textmuy-bridge-ready', syncServerFonts);
        // Si el puente ya estaba disponible antes de cargar fonts.js
        setTimeout(syncServerFonts, 50);
    }

    // ===== FUENTES DE USUARIO: fisicas del puente + url del catalogo =====
    // Las fisicas viven en uploads/.../textmuy/fonts/ y las escanea el plugin
    // (bridge.fuentes). Tambien se aceptan entradas con url dentro del
    // fonts.json del catalogo (fisicas declaradas a mano). En ambos casos se
    // verifica con HEAD antes de registrar: las que fallan no entran al
    // registry (cero 404 de FontFace, cero spam en consola).
    var userFontsLoaded = false;
    var userFontsPromise = null;
    function fontUrlBase() {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var base = (bridge && bridge.urls && bridge.urls.fuentesBase) ? bridge.urls.fuentesBase : 'fonts/';
        return base.slice(-1) === '/' ? base : base + '/';
    }
    function fontFileExists(url) {
        try {
            if (typeof location !== 'undefined' && location.protocol === 'file:') return Promise.resolve(true);
        } catch (_) { /* sin location en Node */ }
        return fetch(url, { method: 'HEAD' }).then(function (r) { return !!r.ok; }).catch(function () { return false; });
    }
    function sanitizeFontKey(nombre) {
        return 'user-' + String(nombre || 'fuente').replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    function loadUserFonts() {
        if (userFontsPromise) return userFontsPromise;
        // El fonts.json del catalogo Google puede traer entradas con url
        // (fisicas declaradas a mano). Esas se registran aqui mismo con HEAD
        // previo; las fisicas del puente llegan por syncServerFonts.
        userFontsPromise = loadCatalog().then(function () {
            var jobs = Object.keys(catalogFonts).map(function (nombre) {
                var entry = catalogFonts[nombre];
                if (!entry || !entry.url) return Promise.resolve(null);
                var key = sanitizeFontKey(nombre);
                if (fontRegistry[key]) return Promise.resolve(key);
                return fontFileExists(entry.url).then(function (ok) {
                    if (!ok) return null;
                    fontRegistry[key] = {
                        name: entry.titulo || nombre,
                        path: entry.url,
                        isCustom: true,
                        isUserFile: true,
                        categoria: entry.categoria || 'custom'
                    };
                    nameToKeyMap[entry.titulo || nombre] = key;
                    nameToKeyMap[nombre] = key;
                    return key;
                });
            });
            return Promise.all(jobs).then(function (keys) {
                userFontsLoaded = true;
                return keys.filter(Boolean);
            });
        }).catch(function () {
            userFontsLoaded = true;
            return [];
        });
        return userFontsPromise;
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('textmuy-bridge-ready', function () { userFontsPromise = null; loadUserFonts(); });
    }
 // Store user-uploaded fonts

    function registerTextStudioFont(src, name) {
        if (!src || !/\.ttf$/i.test(src)) return null;
        var key = 'ts-' + src.replace(/\.ttf$/i, '');
        if (!fontRegistry[key]) {
            fontRegistry[key] = {
                name: name || ('TextStudio Font ' + src),
                path: 'https://textstudio.com/fonts/' + src
            };
        }
        return key;
    }

    /**
     * Registra una fuente personalizada de forma SINCRONA devolviendo su key.
     * Mantiene retrocompatibilidad total con callers síncronos (controls.js, etc.).
     */
    function registerCustomFont(name, dataUrl) {
        var key = 'custom-' + Date.now();
        fontRegistry[key] = {
            name: name,
            path: dataUrl,
            isCustom: true
        };
        customFonts[key] = { name: name, dataUrl: dataUrl };
        saveCustomFonts();
        return key;
    }

    /**
     * Sube un archivo de fuente al servidor (modo plugin) y registra la entrada con URL remota.
     * Devuelve una Promise<string> con el key final.
     */
    function uploadCustomFont(fileBlob, name) {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var fontName = name || (fileBlob && fileBlob.name ? fileBlob.name.replace(/\.[^/.]+$/, '') : 'Custom Font');

        if (bridge && bridge.urls && bridge.urls.subirFuente && (fileBlob instanceof Blob || fileBlob instanceof File)) {
            var fd = new FormData();
            fd.append('fuente', fileBlob, fileBlob.name || fontName);
            fd.append('titulo', fontName);
            if (bridge.nonces && bridge.nonces.subirFuente) {
                fd.append('_wpnonce', bridge.nonces.subirFuente);
            }
            return fetch(bridge.urls.subirFuente, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.success && res.data) {
                        var f = res.data;
                        var key = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
                        fontRegistry[key] = {
                            name: f.titulo,
                            path: f.url,
                            isCustom: true,
                            isServer: true,
                            serverFile: f.nombre
                        };
                        nameToKeyMap[f.titulo] = key;
                        if (Array.isArray(bridge.fuentes)) {
                            bridge.fuentes.push(f);
                        }
                        return key;
                    }
                    throw new Error('Fallo la subida al servidor');
                });
        }
        return Promise.reject(new Error('Subida al servidor no disponible'));
    }

    function saveCustomFonts() {
        try {
            localStorage.setItem('textmuy_custom_fonts', JSON.stringify(customFonts));
        } catch (e) {
            console.warn('Failed to save custom fonts:', e);
        }
    }

    function loadCustomFonts() {
        try {
            var saved = localStorage.getItem('textmuy_custom_fonts');
            if (saved) {
                customFonts = JSON.parse(saved);
                Object.keys(customFonts).forEach(function(key) {
                    fontRegistry[key] = {
                        name: customFonts[key].name,
                        path: customFonts[key].dataUrl,
                        isCustom: true
                    };
                });
            }
        } catch (e) {
            console.warn('Failed to load custom fonts:', e);
        }
    }

    function resolveFontFromPreset(font) {
        if (!font) return DEFAULT_FONT_FAMILY;
        if (typeof font === 'string') {
            if (fontRegistry[font]) return font;
            if (catalogFonts[font]) return font;
            if (textStudioFontMap[font]) return textStudioFontMap[font];
            if (/^\d+\.ttf$/i.test(font)) return registerTextStudioFont(font) || font;
            return font;
        }
        if (font.src) {
            if (textStudioFontMap[font.src]) return textStudioFontMap[font.src];
            if (fontRegistry[font.src]) return font.src;
            var tsKey = registerTextStudioFont(font.src, font.name);
            if (tsKey) return tsKey;
        }
        if (font.name) {
            if (nameToKeyMap[font.name]) return nameToKeyMap[font.name];
            return font.name;
        }
        return DEFAULT_FONT_FAMILY;
    }

    function loadFont(fontKey) {
        if (loadedFonts[fontKey]) {
            return Promise.resolve(loadedFonts[fontKey]);
        }
        if (loadingPromises[fontKey]) {
            return loadingPromises[fontKey];
        }

        var fontInfo = fontRegistry[fontKey];
        if (!fontInfo) {
            // Clave desconocida: si esta en el catalogo Google (fonts.json),
            // inyectar SU spec (campo google con pesos) via link dedicado.
            if (catalogFonts[fontKey]) {
                const entry = catalogFonts[fontKey];
                return ensureGoogleFontBySpec(entry.google || entry.titulo || fontKey);
            }
            console.warn('Font not found in registry, using fallback:', fontKey, '->', DEFAULT_FONT_FAMILY);
            return ensureGoogleFontBySpec(DEFAULT_FONT_FAMILY);
        }

        // Entrada de catalogo online sin path local: inyectar su spec Google.
        if (!fontInfo.path) {
            const spec = (catalogFonts[fontKey] && catalogFonts[fontKey].google) || fontInfo.name || fontKey;
            return ensureGoogleFontBySpec(spec);
        }

        var font = new FontFace(fontInfo.name, 'url(' + fontInfo.path + ')');
        loadingPromises[fontKey] = font.load().then(function(loaded) {
            document.fonts.add(loaded);
            loadedFonts[fontKey] = fontInfo.name;
            return fontInfo.name;
        }).catch(function(err) {
            console.warn('Failed to load font ' + fontKey + ':', err);
            delete loadingPromises[fontKey];
            // Fallback a Google Fonts (categoria de la fuente o default).
            return ensureGoogleFontBySpec(DEFAULT_FONT_FAMILY);
        });

        return loadingPromises[fontKey];
    }

    // Inyecta el <link> css2 de UNA familia Google (campo google del json:
    // "Oswald:wght@400;500;600;700") y espera a document.fonts. Solo se llama
    // al elegir/renderizar esa familia: al abrir la app, cero fuentes.
    // Sin red o sin document.fonts: resuelve igual (canvas usa fallback).
    var googleLinksInjected = {};
    function googleFamilyOf(spec) {
        return String(spec || '').split(':')[0].replace(/\+/g, ' ') || spec;
    }
    function ensureGoogleFontBySpec(spec) {
        spec = String(spec || '').trim();
        if (!spec) return Promise.resolve(DEFAULT_FONT_FAMILY);
        const family = googleFamilyOf(spec);
        if (loadedFonts[family]) return Promise.resolve(loadedFonts[family]);
        if (loadingPromises[family]) return loadingPromises[family];
        // 1. Inyectar el <link> css2 una sola vez por familia.
        try {
            if (typeof document !== 'undefined' && document.createElement && !googleLinksInjected[family]) {
                googleLinksInjected[family] = true;
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=' + spec.split(' ').join('+') + '&display=swap';
                link.setAttribute('data-textmuy-font', family);
                (document.head || document.getElementsByTagName('head')[0] || document.body).appendChild(link);
            }
        } catch (_) { /* sin DOM: seguir al paso 2 */ }
        // 2. Esperar a document.fonts (con timeout: sin red resuelve igual).
        let p;
        try {
            if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
                const timeout = new Promise(function (res) { setTimeout(function () { res(false); }, 3000); });
                p = Promise.race([
                    document.fonts.load('16px "' + family + '"'),
                    timeout
                ]).then(function () {
                    loadedFonts[family] = family;
                    return family;
                }).catch(function () {
                    loadedFonts[family] = family;
                    return family;
                });
            } else {
                loadedFonts[family] = family;
                p = Promise.resolve(family);
            }
        } catch (_) {
            loadedFonts[family] = family;
            p = Promise.resolve(family);
        }
        loadingPromises[family] = p;
        return p;
    }
    // Compat: antes recibia el nombre de familia; ahora deriva el spec del
    // catalogo (campo google) y delega. Si no hay spec, usa la familia tal cual.
    function getFontName(fontKey) {
        if (fontRegistry[fontKey]) {
            return fontRegistry[fontKey].name;
        }
        return fontKey;
    }

    function isCustomFont(fontKey) {
        return fontKey in fontRegistry && fontRegistry[fontKey].isCustom;
    }

    function preloadAll() {
        // Lazy real: al abrir la app NO se carga ninguna fuente. Solo se deja
        // el catalogo listo (para la galeria) y se asegura la fuente del
        // template/preset activo si es Google (una sola familia) o local.
        return loadCatalog().then(function () {
            const cur = resolveFontFromPreset(
                (typeof state !== 'undefined' && state.settings && state.settings.font)
                    ? state.settings.font : DEFAULT_FONT_FAMILY
            );
            return loadFont(cur).catch(function () { return cur; });
        }).catch(function () { return DEFAULT_FONT_FAMILY; });
    }

    function getAvailableFonts() {
        var fonts = [];
        for (var key in fontRegistry) {
            fonts.push({
                key: key,
                name: fontRegistry[key].name,
                isCustom: fontRegistry[key].isCustom || false
            });
        }
        return fonts.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
    }

    function deleteCustomFont(key) {
        var font = fontRegistry[key];
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;

        if (font && font.isServer && font.serverFile && bridge && bridge.urls && bridge.urls.borrarFuente) {
            var fd = new FormData();
            fd.append('nombre', font.serverFile);
            if (bridge.nonces && bridge.nonces.borrarFuente) {
                fd.append('_wpnonce', bridge.nonces.borrarFuente);
            }
            fetch(bridge.urls.borrarFuente, { method: 'POST', body: fd, credentials: 'same-origin' });
            delete fontRegistry[key];
            delete loadedFonts[key];
            if (Array.isArray(bridge.fuentes)) {
                bridge.fuentes = bridge.fuentes.filter(function (f) { return f.nombre !== font.serverFile; });
            }
            return true;
        }

        if (customFonts[key]) {
            delete customFonts[key];
            delete fontRegistry[key];
            delete loadedFonts[key];
            saveCustomFonts();
            return true;
        }
        return false;
    }

    // Load custom fonts from localStorage on initialization
    loadCustomFonts();


    /**
     * Renderiza una miniatura de la fuente mostrando SU PROPIO NOMBRE
     * Dimensiones estandar: 180x30px, alineado a la izquierda, recortado si no entra.
     */
    function renderFontPreview(fontItem, ancho, alto) {
        ancho = ancho || 180;
        alto = alto || 30;
        var fontKey = typeof fontItem === 'string' ? fontItem : (fontItem.key || fontItem.nombre);
        var fontName = (fontItem && fontItem.name) || (fontRegistry[fontKey] && fontRegistry[fontKey].name) || fontKey;

        return loadFont(fontKey).then(function () {
            var cv = document.createElement('canvas');
            cv.width = ancho;
            cv.height = alto;
            var ctx = cv.getContext('2d');

            // Fondo blanco limpio
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, ancho, alto);

            // Clip al espacio util
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, ancho, alto);
            ctx.clip();

            // Texto: nombre de la fuente, alineado a la izquierda, vertical centrado
            ctx.font = '16px "' + fontName + '", sans-serif';
            ctx.fillStyle = '#222222';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(fontName, 6, Math.round(alto / 2));

            ctx.restore();
            return cv;
        }).catch(function () {
            // Fallback con fuente de sistema
            var cv = document.createElement('canvas');
            cv.width = ancho;
            cv.height = alto;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, ancho, alto);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(fontName, 6, Math.round(alto / 2));
            return cv;
        });
    }

    /**
     * Asegura el spritesheet global de fuentes (180x30 por tile).
     */
    function ensureFontsSprite() {
        if (!window.ThumbEngine) {
            return Promise.resolve(null);
        }
        var fonts = getAvailableFonts();
        var items = fonts.map(function (f) {
            return { nombre: f.key, name: f.name, key: f.key };
        });

        var bF = (window.PresetManager && window.PresetManager.getBridge) ? window.PresetManager.getBridge() : null;
        return ThumbEngine.ensureSprite({
            scope: 'fuentes',
            items: items,
            ancho: 180,
            alto: 30,
            columnas: 4,
            render: renderFontPreview,
            baseUrl: (bF && bF.urls && bF.urls.fuentesBase) ? bF.urls.fuentesBase : ''
        });
    }

    // Cambia la fuente generica inicial (p.ej. al elegir una real en la
    // galeria o al cargar el template predeterminado).
    function setDefaultFont(family) {
        if (typeof family === 'string' && family.trim()) {
            DEFAULT_FONT_FAMILY = family.trim();
        }
        return DEFAULT_FONT_FAMILY;
    }

    window.FontLoader = {
        DEFAULT_FONT_FAMILY: DEFAULT_FONT_FAMILY,
        setDefaultFont: setDefaultFont,
        loadFont: loadFont,
        ensureGoogleFontBySpec: ensureGoogleFontBySpec,
        loadUserFonts: loadUserFonts,
        loadCatalog: loadCatalog,
        listServerFonts: listServerFonts,
        fontUrlBase: fontUrlBase,
        getFontName: getFontName,
        isCustomFont: isCustomFont,
        preloadAll: preloadAll,
        resolveFontFromPreset: resolveFontFromPreset,
        registerTextStudioFont: registerTextStudioFont,
        registerCustomFont: registerCustomFont,
        uploadCustomFont: uploadCustomFont,
        deleteCustomFont: deleteCustomFont,
        renderFontPreview: renderFontPreview,
        ensureFontsSprite: ensureFontsSprite,
        getAvailableFonts: getAvailableFonts,
        getFontCategories: function() { return fontCategories; },
        getCatalogFonts: function() { return catalogFonts; },
        registry: fontRegistry
    };

})();
