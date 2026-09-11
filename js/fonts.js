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

    // ===== CATALOGO UNICO DE FUENTES VIA fonts.json (cero hardcode) =====
    // uploads/tm/fonts/fonts.json (= wp-content/uploads/tm en WP) es la
    // UNICA fuente de verdad. Formato canonico (constitucion IV):
    //   {"thumbs":{"w":180,"h":30,"c":4},"items":[[id,title,cats,file],...]}
    //   id numerico entero >= 1 (= tile: tile = id-1). cats string
    //   "cat1, cat2" (default custom). file con extension = fisico
    //   (.ttf/.otf/.woff/.woff2, se valida con HEAD); sin extension =
    //   Google online (spec "Familia:wght@..." via link inyectado);
    //   [id,"","",""] = tombstone libre (no se muestra).
    // Parser compartido: window.TextMuyCatalog (js/catalog.js), clases
    // ok/free/invalid. Invalid en galeria: salto + console.warn +
    // contador visible (Const. VI higiene de listado); en render:
    // rechazo con causa ambito:id:motivo.
    var DEFAULT_FONT_FAMILY = 'Bangers';
    var catalogPromise = null;
    var catalogParsed = null; // resultado de TextMuyCatalog.parseCatalog
    var catalogFonts = {};   // id numerico -> {titulo, categorias:[], file, online}
    var fontCategories = {}; // categoria -> [ids] (derivado del catalogo)
    var catalogLibres = [];  // ids tombstone (no se muestran)
    var catalogInvalidas = []; // [{pos, reason}] para warn + contador
    var FONT_EXT_RE = /\.(ttf|otf|woff|woff2)$/i;
    function catalogUrl() {
        return fontUrlBase() + 'fonts.json';
    }
    // Compat: delega al parser unico (js/catalog.js). Retorna la entry
    // ok o null (free/invalid -> null, como antes).
    function parseCatalogEntry(f) {
        if (!window.TextMuyCatalog) return null;
        var r = window.TextMuyCatalog.classifyEntry(f, { ambito: 'fonts', pos: -1 });
        return (r.status === 'ok') ? r.entry : null;
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
        // Dentro del iframe del plugin, el fonts.json real vive en uploads y la
        // base URL llega por el puente (textmuy-bridge-ready). Al arrancar el
        // puente puede no haber llegado aun; diferir el fetch hasta que llegue
        // (o hasta un timeout corto en standalone/arranque sin puente).
        // Evita el 404 engañoso a fonts/fonts.json del modulo en iframe.
        var inIframe = (typeof window !== 'undefined' && window.parent && window.parent !== window);
        if (inIframe) {
            var b = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
            if (!b || !b.urls || !b.urls.fuentesBase) {
                catalogPromise = new Promise(function (resolve) {
                    var done = false;
                    var finish = function () {
                        if (done) return;
                        done = true;
                        catalogPromise = null; // reiniciar para que la carga real corra
                        resolve(fetchCatalog());
                    };
                    window.addEventListener('textmuy-bridge-ready', finish);
                    setTimeout(finish, 1200); // fallback: arranque con puente lento
                });
                return catalogPromise;
            }
        }
        return fetchCatalog();
    }
    // Fuerza recarga del catalogo tras altas/bajas via puente (el plugin
    // escribe la tupla y el proximo render/lista debe verla).
    function invalidateCatalog() {
        catalogPromise = null;
        catalogFonts = {};
        fontCategories = {};
        catalogLibres = [];
        catalogInvalidas = [];
        catalogParsed = null;
        return loadCatalog();
    }
    function fetchCatalog() {
        catalogPromise = fetch(catalogUrl(), { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('sin fonts.json en ' + catalogUrl());
            return r.json();
        }).then(function (data) {
            catalogFonts = {};
            fontCategories = {};
            catalogLibres = [];
            catalogInvalidas = [];
            var lista = Array.isArray(data) ? data : (data && data.items);
            if (!Array.isArray(lista)) throw new Error('fonts.json no es array/items');
            if (window.TextMuyCatalog) {
                catalogParsed = window.TextMuyCatalog.parseCatalog(data, 'fonts');
                catalogFonts = catalogParsed.items;
                fontCategories = catalogParsed.categorias;
                catalogLibres = catalogParsed.libres;
                catalogInvalidas = catalogParsed.invalidas;
            } else {
                // Sin catalog.js (no deberia pasar: index lo carga antes):
                // fallback minimo con el parser local.
                lista.forEach(function (f) {
                    var e = parseCatalogEntry(f);
                    if (!e) return;
                    catalogFonts[e.id] = e;
                });
                Object.keys(catalogFonts).forEach(function (id) {
                    (catalogFonts[id].categorias || ['custom']).forEach(function (c) {
                        if (!fontCategories[c]) fontCategories[c] = [];
                        if (fontCategories[c].indexOf(+id) === -1) fontCategories[c].push(+id);
                    });
                });
            }
            catalogInvalidas.forEach(function (iv) {
                console.warn('fonts:' + iv.reason + ' (entrada saltada)');
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
            if (!f || !f.nombre) return;
            // SOLO fuentes fisicas reales: el nombre del archivo debe llevar
            // extension de fuente. El puente VIEJO mezclaba entradas Google
            // (sin archivo) en bridge.fuentes: esas generaban FontFace 404/500
            // (GET .../fonts/Nunito?v=0). Ahora se ignoran en silencio.
            if (!FONT_EXT_RE.test(f.nombre)) return;
            var key = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (!fontRegistry[key]) {
                fontRegistry[key] = {
                    name: f.titulo || f.nombre,
                    path: f.url,
                    isCustom: true,
                    isServer: true,
                    serverFile: f.nombre,
                    categoria: f.categoria || 'custom'
                };
                nameToKeyMap[f.titulo || f.nombre] = key;
            }
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
    function fontFileExists(url, esFisica) {
        try {
            if (typeof location !== 'undefined' && location.protocol === 'file:') return Promise.resolve(true);
        } catch (_) { /* sin location en Node */ }
        // Fisicas del catalogo: file es relativo a uploads/.../textmuy/fonts/.
        var full = (esFisica && url && !/^(https?:)?\/\//i.test(url)) ? fontUrlBase() + url : url;
        if (!full) return Promise.resolve(false);
        return fetch(full, { method: 'HEAD' }).then(function (r) { return !!r.ok; }).catch(function () { return false; });
    }
    function sanitizeFontKey(nombre) {
        return 'user-' + String(nombre || 'fuente').replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    function loadUserFonts() {
        if (userFontsPromise) return userFontsPromise;
        // El fonts.json del catalogo lo tiene TODO. Las entradas FISICAS (con
        // extension real en file) se registran aqui con HEAD previo: si el
        // archivo no existe en uploads/.../textmuy/fonts/ se omiten en silencio
        // (cero 404 de FontFace, cero spam en consola). Las ONLINE son lazy:
        // se cargan via link Google al elegir/renderizar (loadFont).
        userFontsPromise = loadCatalog().then(function () {
            var jobs = Object.keys(catalogFonts).map(function (id) {
                var entry = catalogFonts[id];
                if (!entry || entry.online) return Promise.resolve(null);
                var key = sanitizeFontKey(id);
                if (fontRegistry[key]) return Promise.resolve(key);
                return fontFileExists(entry.file, true).then(function (ok) {
                    if (!ok) return null;
                    fontRegistry[key] = {
                        id: id,
                        name: entry.titulo || id,
                        path: entry.file,
                        isCustom: true,
                        isUserFile: true,
                        categoria: (entry.categorias || ['custom'])[0]
                    };
                    nameToKeyMap[entry.titulo || id] = key;
                    nameToKeyMap[id] = key;
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
        // ID numerico (formato unico): exige entrada ok en el catalogo.
        // String legacy (slug "Bangers", "Nintender Regular", spec Google)
        // -> se rechaza con causa para re-guardar el preset (ruptura
        // total Q4; sin fallback silencioso). Solo el flujo interno
        // (registry/puente) puede resolver claves no numericas.
        if (typeof font === 'number' && Math.floor(font) === font && font >= 1) {
            if (catalogFonts[font]) return font;
            throw new Error('fonts:' + font + ':ausente o invalido (re-guardar el preset desde el editor)');
        }
        if (typeof font === 'string') {
            if (fontRegistry[font]) return font;
            if (textStudioFontMap[font]) return textStudioFontMap[font];
            if (/^\d+\.ttf$/i.test(font)) return registerTextStudioFont(font) || font;
            throw new Error('presets:?:font.src string (legacy "' + font + '"): re-guardar el preset desde el editor');
        }
        if (typeof font.src === 'number' && Math.floor(font.src) === font.src && font.src >= 1) {
            if (catalogFonts[font.src]) return font.src;
            if (textStudioFontMap[font.src]) return textStudioFontMap[font.src];
            throw new Error('fonts:' + font.src + ':ausente o invalido (re-guardar el preset desde el editor)');
        }
        if (font.src) {
            if (fontRegistry[font.src]) return font.src;
            var tsKey = registerTextStudioFont(font.src, font.name);
            if (tsKey) return tsKey;
            throw new Error('presets:?:font.src string (legacy "' + font.src + '"): re-guardar el preset desde el editor');
        }
        if (font.name) {
            if (nameToKeyMap[font.name]) return nameToKeyMap[font.name];
            return font.name;
        }
        return DEFAULT_FONT_FAMILY;
    }

    function loadFont(fontKey) {
        // Clave numerica (id de catalogo): se resuelve a su spec/file
        // antes de cargar. El resto del flujo no cambia.
        if (typeof fontKey === 'number' && Math.floor(fontKey) === fontKey && fontKey >= 1) {
            var cent = catalogFonts[fontKey];
            if (!cent) {
                return Promise.reject(new Error('fonts:' + fontKey + ':ausente o invalido (re-guardar el preset desde el editor)'));
            }
            fontKey = cent.online ? cent.file : cent.titulo;
        }
        if (loadedFonts[fontKey]) {
            return Promise.resolve(loadedFonts[fontKey]);
        }
        if (loadingPromises[fontKey]) {
            return loadingPromises[fontKey];
        }

        var fontInfo = fontRegistry[fontKey];
        // Entrada de catalogo (fonts.json): online -> Google lazy, fisica -> FontFace.
        if (!fontInfo && catalogFonts[fontKey]) {
            const entry = catalogFonts[fontKey];
            if (entry.online) {
                // Spec Google: file guarda "Familia:wght@..." (o la familia a secas).
                return ensureGoogleFontBySpec(entry.file || entry.titulo || fontKey);
            }
            // Fisica: file es relativo a uploads/.../textmuy/fonts/.
            const fullUrl = /^(https?:)?\/\//i.test(entry.file) ? entry.file : fontUrlBase() + entry.file;
            const p = fontFileExists(fullUrl).then(function (ok) {
                if (!ok) {
                    delete loadingPromises[fontKey];
                    return ensureGoogleFontBySpec(entry.titulo || fontKey);
                }
                const font = new FontFace(entry.titulo || fontKey, 'url(' + fullUrl + ')');
                return font.load().then(function (loaded) {
                    document.fonts.add(loaded);
                    loadedFonts[fontKey] = entry.titulo || fontKey;
                    return entry.titulo || fontKey;
                }).catch(function () {
                    delete loadingPromises[fontKey];
                    return ensureGoogleFontBySpec(entry.titulo || fontKey);
                });
            });
            loadingPromises[fontKey] = p;
            return p;
        }
        if (!fontInfo) {
            // Clave desconocida: si esta en el catalogo, resolver GOOGLE por su name.
            if (catalogFonts[fontKey]) {
                const entry = catalogFonts[fontKey];
                return ensureGoogleFontBySpec(entry.file || entry.titulo || fontKey);
            }
            console.warn('Font not found in registry, using fallback:', fontKey, '->', DEFAULT_FONT_FAMILY);
            return ensureGoogleFontBySpec(DEFAULT_FONT_FAMILY);
        }

        // Entrada de catalogo online sin path local: inyectar su spec Google.
        if (!fontInfo.path) {
            const spec = (catalogFonts[fontKey] && catalogFonts[fontKey].file) || fontInfo.name || fontKey;
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
        if (catalogFonts[fontKey]) {
            return catalogFonts[fontKey].titulo || fontKey;
        }
        // Spec de Google Fonts sin entrada en el catálogo (p.ej. "Oswald:wght@400;700")
        // → extraer el nombre de familia con googleFamilyOf().
        const family = googleFamilyOf(fontKey);
        return family || fontKey;
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
        var esOnline = !!(fontItem && fontItem.online) || (catalogFonts[fontKey] && catalogFonts[fontKey].online);

        // Online Google: preview con fuente del sistema (rapido, sin red/links).
        if (esOnline) {
            var cvS = document.createElement('canvas');
            cvS.width = ancho;
            cvS.height = alto;
            var ctxS = cvS.getContext('2d');
            ctxS.fillStyle = '#ffffff';
            ctxS.fillRect(0, 0, ancho, alto);
            ctxS.font = '14px sans-serif';
            ctxS.fillStyle = '#666666';
            ctxS.textAlign = 'left';
            ctxS.textBaseline = 'middle';
            ctxS.fillText(fontName, 6, Math.round(alto / 2));
            return Promise.resolve(cvS);
        }

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
        // Items = catalogo (fonts.json: online Google + fisicas del json) +
        // fisicas del puente registradas. Las online se dibujan con fuente del
        // sistema (cero red/cero FontFace: el preview real es lazy al elegir).
        var items = [];
        Object.keys(catalogFonts).forEach(function (id) {
            var e = catalogFonts[id];
            items.push({ nombre: id, name: e.titulo || id, key: id, online: !!e.online });
        });
        getAvailableFonts().forEach(function (f) {
            if (catalogFonts[f.key]) return;
            items.push({ nombre: f.key, name: f.name, key: f.key, online: false });
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
        invalidateCatalog: invalidateCatalog,
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
        getCatalogLibres: function() { return catalogLibres.slice(); },
        getCatalogInvalidas: function() { return catalogInvalidas.slice(); },
        getCatalogParsed: function() { return catalogParsed; },
        registry: fontRegistry
    };

})();
