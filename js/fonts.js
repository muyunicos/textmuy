/* ===== TEXTSTUDIO FONTS - TTF Font Loading ===== */

(function() {
    'use strict';

    var fontRegistry = {
        '28days-later': { name: '28 Days Later Cyr Regular', path: 'fonts/28days-later.ttf' },
        'nintender': { name: 'Nintender Regular', path: 'fonts/nintender.ttf' },
        'lemon-milk': { name: 'LEMON MILK Pro UltraBold', path: 'fonts/lemon-milk.ttf' }
    };

    // TextStudio font ID → local registry key
    var textStudioFontMap = {
        '832.ttf': '28days-later',
        '4322.ttf': 'nintender',
        '11768.ttf': 'lemon-milk'
    };

    // TextStudio font name → local registry key
    var nameToKeyMap = {
        '28 Days Later Cyr Regular': '28days-later',
        '28 Days Later': '28days-later',
        'Nintender Regular': 'nintender',
        'Nintender': 'nintender',
        'LEMON MILK Pro UltraBold': 'lemon-milk',
        'LEMON MILK': 'lemon-milk'
    };

    // Google Fonts fallback mapping
    var googleFontFallbacks = {
        '28days-later': 'Creepster',
        'nintender': 'Press Start 2P',
        'lemon-milk': 'Kanit',
        'Bangers': 'Bangers',
        'Permanent Marker': 'Permanent Marker',
        'Rock Salt': 'Rock Salt',
        'Anton': 'Anton',
        'Oswald': 'Oswald',
        'Montserrat': 'Montserrat',
        'Pacifico': 'Pacifico',
        'Press Start 2P': 'Press Start 2P',
        'Creepster': 'Creepster',
        'Share Tech Mono': 'Share Tech Mono',
        'Rubik Wet Paint': 'Rubik Wet Paint',
        'Carter One': 'Carter One',
        'Fascinate': 'Fascinate',
        'Kanit': 'Kanit',
        'Bebas Neue': 'Bebas Neue',
        'Freckle Dragon': 'Freckle Dragon',
        'Lobster': 'Lobster',
        'Raleway': 'Raleway',
        'Open Sans': 'Open Sans',
        'Lato': 'Lato',
        'Playfair Display': 'Playfair Display',
        'Merriweather': 'Merriweather',
        'Source Sans Pro': 'Source Sans Pro',
        'Nunito': 'Nunito',
        'Poppins': 'Poppins',
        'Ubuntu': 'Ubuntu',
        'Righteous': 'Righteous',
        'Abril Fatface': 'Abril Fatface',
        'Satisfy': 'Satisfy',
        'Dancing Script': 'Dancing Script',
        'Indie Flower': 'Indie Flower',
        'Shadows Into Light': 'Shadows Into Light',
        'Architects Daughter': 'Architects Daughter',
        'Patrick Hand': 'Patrick Hand',
        'Kalam': 'Kalam',
        'Amatic SC': 'Amatic SC',
        'Caveat': 'Caveat',
        'Zeyada': 'Zeyada',
        'Great Vibes': 'Great Vibes',
        'Alex Brush': 'Alex Brush',
        'Allura': 'Allura',
        'Sacramento': 'Sacramento',
        'Tangerine': 'Tangerine',
        'Quicksand': 'Quicksand',
        'Work Sans': 'Work Sans',
        'Josefin Sans': 'Josefin Sans',
        'Quattrocento Sans': 'Quattrocento Sans',
        'Crimson Text': 'Crimson Text',
        'Libre Baskerville': 'Libre Baskerville',
        'PT Sans': 'PT Sans',
        'Source Serif Pro': 'Source Serif Pro',
        'Slabo 27px': 'Slabo 27px',
        'Arimo': 'Arimo',
        'Arvo': 'Arvo',
        'Lora': 'Lora',
        'Vollkorn': 'Vollkorn'
    };

    // Font categories
    var fontCategories = {
        'display': ['Bangers', 'Anton', 'Bebas Neue', 'Righteous', 'Abril Fatface', 'Fascinate', 'Creepster', 'Freckle Dragon'],
        'handwriting': ['Permanent Marker', 'Rock Salt', 'Pacifico', 'Satisfy', 'Dancing Script', 'Indie Flower', 'Shadows Into Light', 'Architects Daughter', 'Patrick Hand', 'Kalam', 'Amatic SC', 'Caveat', 'Zeyada', 'Great Vibes', 'Alex Brush', 'Allura', 'Sacramento', 'Tangerine'],
        'sans-serif': ['Oswald', 'Montserrat', 'Open Sans', 'Lato', 'Source Sans Pro', 'Nunito', 'Poppins', 'Ubuntu', 'Quicksand', 'Work Sans', 'Josefin Sans', 'Quattrocento Sans', 'PT Sans', 'Arimo', 'Roboto', 'Kanit'],
        'serif': ['Playfair Display', 'Merriweather', 'Crimson Text', 'Libre Baskerville', 'Source Serif Pro', 'Slabo 27px', 'Arvo', 'Lora', 'Vollkorn'],
        'monospace': ['Press Start 2P', 'Share Tech Mono'],
        'gaming': ['Press Start 2P', 'Creepster', 'Rubik Wet Paint']
    };

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
        if (!font) return 'Bangers';
        if (typeof font === 'string') {
            if (fontRegistry[font]) return font;
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
        return 'Bangers';
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
            // Try to use Google Fonts fallback
            var fallback = googleFontFallbacks[fontKey] || 'Bangers';
            console.warn('Font not found in registry, using fallback:', fontKey, '->', fallback);
            return Promise.resolve(fallback);
        }

        var font = new FontFace(fontInfo.name, 'url(' + fontInfo.path + ')');
        loadingPromises[fontKey] = font.load().then(function(loaded) {
            document.fonts.add(loaded);
            loadedFonts[fontKey] = fontInfo.name;
            return fontInfo.name;
        }).catch(function(err) {
            console.warn('Failed to load font ' + fontKey + ':', err);
            delete loadingPromises[fontKey];
            // Fallback to Google Fonts
            var fallback = googleFontFallbacks[fontKey] || 'Bangers';
            console.warn('Using fallback font:', fallback);
            return fallback;
        });

        return loadingPromises[fontKey];
    }

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
        var promises = [];
        for (var key in fontRegistry) {
            if (!key.startsWith('ts-')) {
                promises.push(loadFont(key));
            }
        }
        return Promise.all(promises);
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

    window.FontLoader = {
        loadFont: loadFont,
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
        registry: fontRegistry,
        googleFontFallbacks: googleFontFallbacks
    };

})();
