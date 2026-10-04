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
    // uploads/pmu/fonts/fonts.json (= wp-content/uploads/pmu en WP) es la
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
    var catalogRaw = null;   // JSON crudo de fonts.json (insumo de la firma)
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
        // puente puede no haber llegado aun; la carga se difiere hasta que
        // llegue o hasta un plazo corto. RC44: sin puente NO se hace fetch
        // relativo al modulo (AGENTS 4.2: cero fetches relativos sin puente).
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
                        // Solo se hace fetch si para entonces hay base del puente.
                        // Al vencer el plazo sin puente se resuelve vacio: el
                        // catalogo real llegara con textmuy-bridge-ready.
                        var b2 = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
                        if (b2 && b2.urls && b2.urls.fuentesBase) resolve(fetchCatalog());
                        else resolve({});
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
        catalogRaw = null;
        // El indice canonico se reconstruye con el catalogo nuevo: si una
        // fuente fue dada de baja o renombrada, su identidad deja de existir
        // (R-C2.4). Sin esto el selector seguiria ofreciendo fuentes que ya no
        // estan en el servidor.
        fontsById = {};
        return loadCatalog();
    }
    function fetchCatalog() {
        catalogPromise = fetch(catalogUrl(), { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('sin fonts.json en ' + catalogUrl());
            return r.json();
        }).then(function (data) {
            catalogRaw = data || null; // la firma del sprite se calcula sobre el JSON crudo
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
            // El indice canonico se construye al leer el catalogo: a partir de
            // aqui la identidad de una fuente es su id numerico (T004).
            indexarCatalogo();
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

    // ===== IDENTIDAD CANONICA + ESTADO DE CARGA (RC39, 001-fix-bugs-01) =====
    // La identidad de una fuente es su id NUMERICO de catalogo (data-model §1).
    // Antes coexistian tres identidades para la misma fuente (id de catalogo,
    // clave 'user-<id>' y clave 'server-<archivo>'), lo que duplicaba el selector
    // y dejaba entradas que no cargaban nada. Ahora `fontsById` es el indice
    // unico; `fontRegistry` queda SOLO como mapa de compatibilidad hacia el
    // indice, nunca como fuente de verdad.
    var fontsById = {};      // id numerico -> entrada normalizada
    var fontStates = {};     // id numerico -> 'pendiente'|'disponible'|'fallida'
    var fontFailures = {};   // id numerico -> causa del ultimo fallo
    var fontPromises = {};   // id numerico -> promesa en curso (dedup, R-C2.3)

    // Normaliza una entrada a la forma canonica del indice.
    function normEntry(id, nombre, archivo, opciones) {
        opciones = opciones || {};
        return {
            id: id,
            name: nombre || String(id),
            file: archivo || '',
            online: opciones.online === undefined ? !FONT_EXT_RE.test(archivo || '') : opciones.online,
            path: opciones.path !== undefined ? opciones.path : urlFuenteAbsoluta(archivo),
            categoria: opciones.categoria || 'custom',
            isCustom: !!opciones.isCustom,
            isServer: !!opciones.isServer,
            isUserFile: !!opciones.isUserFile,
            serverFile: opciones.serverFile || ''
        };
    }
    // Registra/actualiza la entrada canonica de una identidad. Un cambio de
    // definicion invalida lo que se sabia de esa fuente: si fue renombrada o
    // sustituida, el estado de carga anterior ya no vale (R-C2.4).
    function setFontById(id, entrada) {
        if (!entrada || typeof id !== 'number' || !(id >= 1)) return null;
        fontsById[id] = entrada;
        delete loadedFonts[id];
        delete fontStates[id];
        delete fontFailures[id];
        return entrada;
    }
    function getFontById(id) {
        return (typeof id === 'number' && id >= 1) ? (fontsById[id] || catalogFonts[id] || null) : null;
    }
    // Una entrada del registro que aun no estaba en el indice (subida muy
    // reciente, o alta que aun no llego al catalogo) entra al indice con su
    // identidad, para que la carga por identidad tambien la encuentre.
    function indexarRegistro(clave) {
        var e = fontRegistry[clave];
        if (!e || typeof e.id !== 'number' || !(e.id >= 1)) return null;
        if (fontsById[e.id]) return fontsById[e.id];
        return setFontById(e.id, normEntry(e.id, e.name, e.serverFile || '', {
            online: !!e.online,
            path: e.path !== undefined ? e.path : undefined,
            categoria: e.categoria || 'custom',
            isCustom: !!e.isCustom,
            isServer: !!e.isServer,
            isUserFile: !!e.isUserFile,
            serverFile: e.serverFile || ''
        }));
    }
    // Indice canonico desde el catalogo: la unica fuente de verdad.
    function indexarCatalogo() {
        Object.keys(catalogFonts).forEach(function (cid) {
            var n = +cid;
            var e = catalogFonts[cid];
            if (!e || !fontsById[n]) {
                setFontById(n, normEntry(n, e && e.titulo, e && e.file, {
                    online: e ? !!e.online : false,
                    categoria: (e && e.categorias && e.categorias[0]) || 'custom',
                    isCustom: e ? !e.online : false,
                    isUserFile: e ? !e.online : false
                }));
            }
        });
        descartarVirtualesCubiertas();
    }
    // El catalogo esta DISPONIBLE cuando se leyo de verdad. Antes de que
    // llegue no se puede afirmar que una fuente no exista, y por eso no se
    // crean identidades provisionales (R-C1.7).
    function catalogoListo() {
        return catalogParsed !== null && catalogParsed !== undefined;
    }
    // R-C1.8: cuando el catalogo pasa a proveer una familia que tenia una
    // identidad creada por el registro, esa identidad se descarta. Sin esto una
    // familia queda con dos identidades vivas y el selector la muestra dos veces.
    function descartarVirtualesCubiertas() {
        var porBorrar = [];
        Object.keys(fontsById).forEach(function (cid) {
            var id = +cid;
            if (id < 100000) return;                 // solo identidades provisionales
            var nombre = fontsById[id] && fontsById[id].name;
            if (!nombre) return;
            var enCatalogo = idsPorTitulo(nombre);
            if (enCatalogo.indexOf(id) === -1) return;
            porBorrar.push({ id: id, nombre: nombre });
        });
        porBorrar.forEach(function (v) {
            delete fontsById[v.id];
            delete fontStates[v.id];
            delete fontFailures[v.id];
            delete fontPromises[v.id];
            delete loadedFonts[v.id];
            var clave = nameToKeyMap[v.nombre];
            if (clave && fontRegistry[clave] && fontRegistry[clave].id === v.id) {
                delete fontRegistry[clave];
                delete nameToKeyMap[v.nombre];
            }
        });
    }

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
            var nombre = f.titulo || f.nombre;
            // Si el catalogo ya conoce esta fuente, su identidad manda: la
            // entrada del puente se traduce a ese id y NO crea una fuente
            // paralela (T004). El `id` viaja en el inventario del plugin.
            var idConocido = (typeof f.id === 'number' && f.id >= 1) ? f.id : null;
            if (idConocido === null) {
                var porNombre = idsPorNombreRegistro(nombre).concat(idsPorTitulo(nombre));
                porNombre = porNombre.filter(function (v, i, a) { return a.indexOf(v) === i; });
                if (porNombre.length === 1) idConocido = porNombre[0];
            }
            if (idConocido !== null && (catalogFonts[idConocido] || fontsById[idConocido])) {
                // Solo se enriquece la entrada existente con su URL.
                var actual = fontsById[idConocido];
                if (actual) actual.path = f.url || actual.path;
                nameToKeyMap[nombre] = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
                return;
            }
            // Fuente del puente que el catalogo todavia no conoce (subida muy
            // reciente): se registra con una identidad propia.
            var idNuevo = idConocido !== null ? idConocido : siguienteIdFuenteVirtual();
            setFontById(idNuevo, normEntry(idNuevo, nombre, f.nombre, {
                online: false, path: f.url, isCustom: true, isServer: true,
                serverFile: f.nombre, categoria: f.categoria || 'custom'
            }));
            var key = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
            fontRegistry[key] = {
                id: idNuevo, name: nombre, path: f.url, isCustom: true, isServer: true,
                serverFile: f.nombre, categoria: f.categoria || 'custom'
            };
            nameToKeyMap[nombre] = key;
        });
        bridgeFontsLoaded = true;
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('textmuy-bridge-ready', syncServerFonts);
        // Si el puente ya estaba disponible antes de cargar fonts.js
        setTimeout(syncServerFonts, 50);
    }

    // ===== FUENTES DE USUARIO: fisicas del puente + url del catalogo =====
    // Las fisicas viven en uploads/pmu/fonts/ y las lista el motor
    // (bridge.fuentes). Tambien se aceptan entradas con url dentro del
    // fonts.json del catalogo (fisicas declaradas a mano). El catalogo lo
    // escribe el servidor escaneando el disco, asi que no se hace ninguna
    // comprobacion de red: registrar es solo memoria.
    var userFontsLoaded = false;
    var userFontsPromise = null;
    function fontUrlBase() {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        // SIN base de respaldo: sin puente no hay ruta relativa (editor no opera).
        var base = (bridge && bridge.urls && bridge.urls.fuentesBase) ? bridge.urls.fuentesBase : '';
        return base && base.slice(-1) !== '/' ? base + '/' : base;
    }
    // URL ABSOLUTA de un archivo de fuente del catalogo (el path relativo se
    // resolveria contra el documento del iframe y daria 404).
    function urlFuenteAbsoluta(file) {
        if (!file) return '';
        return /^(https?:)?\/\//i.test(file) ? file : fontUrlBase() + file;
    }
    function loadUserFonts() {
        if (userFontsPromise) return userFontsPromise;
        // El fonts.json del catalogo lo tiene TODO. Las entradas FISICAS se
        // registran DIRECTO del catalogo: el catalogo lo escribe el servidor
        // escaneando uploads/pmu/fonts/, asi que la existencia ya esta
        // validada en origen. Cero peticiones extra al arrancar; si un archivo
        // falta de verdad, el FontFace de loadFont falla y se informa con causa
        // (sin sustitucion: constitucion VI, FR-005).
        // Las ONLINE son lazy: se cargan via link Google al elegir/renderizar.
        userFontsPromise = loadCatalog().then(function () {
            indexarCatalogo();
            var jobs = Object.keys(catalogFonts).map(function (id) {
                var entry = catalogFonts[id];
                if (!entry || entry.online) return Promise.resolve(null);
                var n = +id;
                var canon = fontsById[n];
                if (canon) canon.path = canon.path || urlFuenteAbsoluta(entry.file);
                return Promise.resolve(canon ? canon.name : entry.titulo);
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
     * Invalida la hoja 'fonts' cacheada en ThumbEngine. Toda mutacion del
     * ambito (alta/baja/renombre) debe llamarla: sin esto el sheet seguia
     * sirviendose desde la cache con la fuente vieja (o con el tile de una
     * fuente ya borrada) y el proximo ensureFontsSprite no regeneraba.
     */
    function invalidarSpriteFuentes() {
        if (!window.PresetManager || !window.PresetManager.invalidarSprite) {
            return Promise.reject(new Error('fonts:invalidacion:sin_puente'));
        }
        return window.PresetManager.invalidarSprite('fonts');
    }

    /**
     * Sube un archivo de fuente al servidor via el motor unico
     * (op=alta, scope=fonts) y registra la entrada con URL remota.
     * Devuelve una Promise<string> con el key final.
     */
    function uploadCustomFont(fileBlob, name) {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        var fontName = name || (fileBlob && fileBlob.name ? fileBlob.name.replace(/\.[^/.]+$/, '') : 'Custom Font');

        if (bridge && bridge.urls && bridge.urls.motor && bridge.nonces && bridge.nonces.motor
            && (fileBlob instanceof Blob || fileBlob instanceof File)) {
            var fd = new FormData();
            fd.append('op', 'alta');
            fd.append('_wpnonce', bridge.nonces.motor);
            fd.append('scope', 'fonts');
            fd.append('title', fontName);
            fd.append('archivo', fileBlob, fileBlob.name || fontName);
            return fetch(bridge.urls.motor, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.success && res.data) {
                        var f = res.data;
                        // RC39: la fuente recien subida entra al indice con su
                        // IDENTIDAD, no solo con una clave de texto. Asi aparece
                        // en el selector como una sola entrada y se puede
                        // cargar por identidad (R-C1.3, R-C4.1).
                        var id = (typeof f.id === 'number' && f.id >= 1) ? f.id : siguienteIdFuenteVirtual();
                        setFontById(id, normEntry(id, fontName, f.nombre, {
                            online: false, path: f.url, isCustom: true, isServer: true,
                            serverFile: f.nombre, categoria: 'custom'
                        }));
                        var key = 'server-' + f.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
                        fontRegistry[key] = {
                            id: id, name: fontName, path: f.url,
                            isCustom: true, isServer: true, serverFile: f.nombre
                        };
                        nameToKeyMap[fontName] = key;
                        if (Array.isArray(bridge.fuentes)) {
                            bridge.fuentes.push({ nombre: f.nombre, titulo: fontName, url: f.url, id: id });
                        }
                        return invalidarSpriteFuentes().then(function () { return id; });
                    }
                    throw new Error((res && res.data) || 'Fallo la subida al servidor');
                });
        }
        return Promise.reject(new Error('Subida al servidor no disponible (sin puente del plugin)'));
    }

    // H-004 (003-plugin-compat-review): se elimino la persistencia en
    // localStorage de fuentes personalizadas (prohibida por el contrato,
    // sin lecturas legacy). Las fuentes viven SOLO en el catalogo del
    // plugin y se suben por el motor (op=alta, scope=fonts).

    // Fuente dentro de un preset. `font.src` canonico es STRING (titulo del
    // catalogo, p.ej. "Bangers" o "MUY-Alegria", o spec Google
    // "Oswald:wght@400;700"); tambien se acepta el id numerico del catalogo.
    // Un string se resuelve a la entrada del catalogo (por titulo) para que
    // loadFont aplique Google-lazy o FontFace fisico sin ambiguedad.
    // Referencia dentro de un preset: `font.src` canonico es el id NUMERICO de
    // catalogo. Se acepta tambien el titulo (archivos guardados antes de RC39)
    // y el spec de Google, pero SIEMPRE se devuelve la identidad numerica
    // (R-C1.3): el estado del proyecto nunca guarda una clave interna.
    //
    // Un titulo puede repetirse en el catalogo, asi que la busqueda por titulo
    // detecta la ambiguedad y falla en vez de elegir una al azar (R-C1.1).
    function idsPorTitulo(titulo) {
        var encontrados = [];
        Object.keys(catalogFonts).forEach(function (cid) {
            if (catalogFonts[cid] && catalogFonts[cid].titulo === titulo) encontrados.push(+cid);
        });
        return encontrados;
    }
    function idsPorNombreRegistro(nombre) {
        var clave = nameToKeyMap[nombre];
        if (!clave) return [];
        var e = fontRegistry[clave];
        return (e && typeof e.id === 'number' && e.id >= 1) ? [e.id] : [];
    }
    // Resuelve cualquier referencia admitida a una identidad NUMERICA.
    // Falla con causa cuando no puede o cuando es ambigua; nunca devuelve una
    // fuente sustituta ni un valor por defecto (R-C1.4).
    function resolveFontId(ref) {
        if (ref === undefined || ref === null || ref === '') {
            throw new Error('fonts:?:referencia vacia (elegir la fuente de nuevo en el editor)');
        }
        if (typeof ref === 'object') {
            if (ref.src !== undefined && ref.src !== null) return resolveFontId(ref.src);
            if (ref.name) return resolveFontId(ref.name);
            throw new Error('fonts:?:referencia sin src (elegir la fuente de nuevo en el editor)');
        }
        if (typeof ref === 'number') {
            if (Math.floor(ref) !== ref || ref < 1) throw new Error('fonts:' + ref + ':id no valido');
            indexarCatalogo();
            if (getFontById(ref)) return ref;
            throw new Error('fonts:' + ref + ':ausente o invalido (elegir la fuente de nuevo en el editor)');
        }
        if (typeof ref !== 'string') {
            throw new Error('fonts:' + typeof ref + ':tipo de referencia no valido');
        }
        var s = ref.trim();
        if (!s) throw new Error('fonts:?:referencia vacia (elegir la fuente de nuevo en el editor)');
        // Id numerico, con o sin cadena.
        if (/^\d+$/.test(s)) return resolveFontId(+s);
        // Clave interna del registro (tolerancia: se traduce a identidad).
        if (fontRegistry[s] && typeof fontRegistry[s].id === 'number' && fontRegistry[s].id >= 1) {
            indexarRegistro(s);
            return fontRegistry[s].id;
        }
        // Mapa de TextStudio.
        if (textStudioFontMap[s]) {
            var mapped = resolveFontFromPreset(textStudioFontMap[s]);
            return resolveFontId(mapped);
        }
        // Titulo del catalogo: puede haber mas de una coincidencia.
        // R-C1.6: el CATALOGO manda. Si el catalogo tiene la familia, se usan
        // solo sus identidades; el registro solo se consulta cuando el catalogo
        // no tiene ninguna. Sumarlos era lo que producia la ambiguedad falsa
        // de la regresion RC40 (identidades 1 y 100001 para la misma fuente).
        var delCatalogo = idsPorTitulo(s);
        if (delCatalogo.length === 1) return delCatalogo[0];
        if (delCatalogo.length > 1) {
            throw new Error('fonts:' + s + ':titulo ambiguo (' + delCatalogo.join(',') + '): elegir la fuente de nuevo en el editor');
        }
        // El catalogo no tiene esta familia: ahora si se consulta el registro.
        var delRegistro = idsPorNombreRegistro(s);
        var unicosRegistro = delRegistro.filter(function (v, i, a) { return a.indexOf(v) === i; });
        if (unicosRegistro.length === 1) return unicosRegistro[0];
        if (unicosRegistro.length > 1) {
            throw new Error('fonts:' + s + ':titulo ambiguo (' + unicosRegistro.join(',') + '): elegir la fuente de nuevo en el editor');
        }
        // TTF de TextStudio sin entrada en el catalogo.
        if (/^\d+\.ttf$/i.test(s)) {
            var reg = registerTextStudioFont(s);
            if (reg) return reg;
        }
        // Spec de Google sin entrada en el catalogo: se registra en el indice
        // con identidad propia. Acepta acentos, enes y signos (R-C1.2): la
        // validacion ya no exige ASCII, porque el titulo puede traer cualquiera.
        // Se rechazan los caracteres que no pueden aparecer ni en un titulo ni
        // en un spec de Google (p.ej. 'fuente@rara!'), para no crear una fuente
        // virtual a partir de una referencia corrupta.
        if (/^[^:]+(:[^:]*)?$/.test(s) && /^[^@!?<>{}[\]\\/]+(:[^:@!?<>{}[\]\\/]*)?$/.test(s)) {
            var familia = googleFamilyOf(s);
            var existente = idsPorNombreRegistro(familia)[0];
var existente = idsPorNombreRegistro(familia)[0];
            if (existente !== undefined) return existente;
            // R-C1.7: con el catalogo PENDIENTE no se inventa identidad. El
            // editor arranca antes de que el puente entregue el catalogo, y
            // hacerlo ahi fue la causa de la regresion RC40: se creo una
            // identidad para la fuente por defecto y, al llegar el catalogo, la
            // misma fuente quedo con dos identidades y todo por nombre fallo.
            if (!catalogoListo()) {
                throw new Error('fonts:' + s + ':catalogo no disponible todavia (se reintenta al cargar)');
            }
            var idNuevo = siguienteIdFuenteVirtual();
            if (existente !== undefined) return existente;
            var idNuevo = siguienteIdFuenteVirtual();
            setFontById(idNuevo, normEntry(idNuevo, familia, s, { online: true }));
            nameToKeyMap[familia] = 'user-' + idNuevo;
            fontRegistry['user-' + idNuevo] = { id: idNuevo, name: familia, isCustom: false, online: true };
            return idNuevo;
        }
        throw new Error('fonts:' + s + ':fuente desconocida (elegirla desde el picker)');
    }
    // Ids virtuales para specs de Google que no estan en el catalogo: arrancan
    // muy por encima del maximo real para no colisionar con el catalogo.
    var virtualIdSeq = 100000;
    function siguienteIdFuenteVirtual() {
        var maxReal = 0;
        Object.keys(catalogFonts).forEach(function (cid) { var n = +cid; if (n > maxReal) maxReal = n; });
        Object.keys(fontsById).forEach(function (cid) { var n = +cid; if (n > maxReal) maxReal = n; });
        virtualIdSeq = Math.max(virtualIdSeq, maxReal) + 1;
        return virtualIdSeq;
    }
    // Referencia de fuente de un preset. Devuelve SIEMPRE la identidad NUMERICA
    // de catalogo (R-C1.3). Falla con causa si no resuelve o si es ambigua.
    function resolveFontFromPreset(font) {
        return resolveFontId(font);
    }

    // Carga una fuente fisica (TTF/OTF/WOFF) por URL ABSOLUTA. Sin pre-chequeo
    // de existencia: el catalogo lo escribio el servidor sobre archivos reales.
    // Si el archivo falta, el estado pasa a 'fallida' con causa y la promesa
    // RECHAZA. Antes caia en silencio a la fuente por defecto (constitucion VI).
    function cargarFisica(id, familia, url) {
        var font = new FontFace(familia, 'url(' + url + ')');
        fontStates[id] = 'pendiente';
        delete fontFailures[id];
        var p = font.load().then(function (loaded) {
            document.fonts.add(loaded);
            loadedFonts[id] = familia;
            fontStates[id] = 'disponible';
            delete fontFailures[id];
            return familia;
        }).catch(function (err) {
            // Estado fallida REINTENTABLE: no se marca disponible y no se
            // borra la entrada, asi un reintento vuelve a intentarlo (R-C2.2).
            fontStates[id] = 'fallida';
            fontFailures[id] = 'fonts:' + id + ':no se pudo cargar "' + familia + '" (' + url + ')';
            delete fontPromises[id];
            delete loadingPromises[id];
            delete loadedFonts[id];
            var e = new Error(fontFailures[id]);
            e.fontId = id;
            e.familia = familia;
            e.cause = err && err.message;
            throw e;
        });
        fontPromises[id] = p;
        loadingPromises[id] = p;
        return p;
    }

    // Asegura que una identidad de fuente quede disponible para el dibujo.
    // Falla con causa si no puede; NO devuelve ninguna fuente sustituta (R-C2.1).
    // Dedup: dos peticiones concurrentes de la misma identidad comparten una
    // sola descarga (R-C2.3).
    function loadFont(ref) {
        var id;
        try { id = resolveFontId(ref); }
        catch (e) {
            return Promise.reject(e);
        }
        var entry = getFontById(id);
        if (!entry) {
            return Promise.reject(new Error('fonts:' + id + ':no registrada en el catalogo'));
        }
        if (fontStates[id] === 'disponible' && loadedFonts[id]) {
            return Promise.resolve(loadedFonts[id]);
        }
        if (fontPromises[id]) return fontPromises[id];

        var familia = entry.name || String(id);
        if (entry.online) {
            return asegurarGoogle(id, entry.file || familia, familia);
        }
        var url = entry.path || urlFuenteAbsoluta(entry.file);
        if (!url) {
            fontStates[id] = 'fallida';
            fontFailures[id] = 'fonts:' + id + ':sin archivo asociado (' + familia + ')';
            return Promise.reject(new Error(fontFailures[id]));
        }
        return cargarFisica(id, familia, url);
    }
    // "Oswald:wght@400;500;600;700") y espera a document.fonts. Solo se llama
    // al elegir/renderizar esa familia: al abrir la app, cero fuentes.
    // Sin red o sin document.fonts: resuelve igual (canvas usa fallback).
    var googleLinksInjected = {};
    function googleFamilyOf(spec) {
        return String(spec || '').split(':')[0].replace(/\+/g, ' ') || spec;
    }
    // Carga una familia de Google para una identidad concreta. Estados
    // explicitos y causa real: si document.fonts no llega a traerla en el
    // plazo, el estado queda 'fallida' y la promesa RECHAZA (R-C2.1, R-C2.2).
    function asegurarGoogle(id, spec, familia) {
        spec = String(spec || '').trim();
        if (fontStates[id] === 'disponible' && loadedFonts[id]) {
            return Promise.resolve(loadedFonts[id]);
        }
        if (fontPromises[id]) return fontPromises[id];
        fontStates[id] = 'pendiente';
        delete fontFailures[id];
        var fam = familia || googleFamilyOf(spec);
        var timeoutMs = 8000;
        // RC46: RCARRA ARREGLADA. Antes se inyectaba el <link> y se llamaba
        // document.fonts.load() en el MISMO tick: si la hoja de estilo todavia
        // no estaba parseada, load() resolvia con 0 caras y la fuente quedaba
        // 'fallida' con "no se pudo cargar de Google" (y sin reintento util,
        // porque googleLinksInjected ya la daba por puesta). Ahora se espera a
        // que el <link> cargue (o al mismo plazo) y solo entonces se pide la
        // cara. El sintoma era que las miniaturas de los presets con fuente
        // Google no se generaban nunca.
        var linkListo = new Promise(function (res) {
            var yaInyectada = googleLinksInjected[fam];
            if (typeof document === 'undefined' || !document.createElement || yaInyectada) {
                return res(yaInyectada ? 'puesta' : 'sin-dom');
            }
            googleLinksInjected[fam] = true;
            try {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(spec).replace(/%20/g, '+') + '&display=swap';
                link.setAttribute('data-textmuy-font', fam);
                link.onload = function () { res('cargada'); };
                link.onerror = function () { res('error'); };
                (document.head || document.getElementsByTagName('head')[0] || document.body).appendChild(link);
            } catch (_) { res('error'); }
        });
        var carga;
        try {
            if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
                var limite = new Promise(function (res) { setTimeout(function () { res('timeout'); }, timeoutMs); });
                carga = Promise.race([
                    linkListo.then(function () {
                        return document.fonts.load('16px "' + fam + '"').then(function (faces) {
                            return (faces && faces.length) ? 'ok' : 'vacia';
                        });
                    }),
                    limite
                ]);
            } else {
                carga = Promise.resolve('sin-api');
            }
        } catch (e) {
            carga = Promise.resolve('error');
        }
        var p = carga.then(function (res) {
            // Sin document.fonts no hay forma de verificar: se acepta (el
            // lienzo usara la familia y el navegador decidira). Con API, un
            // resultado vacio o un timeout SI son fallos reales.
            if (res === 'ok' || res === 'sin-api') {
                loadedFonts[id] = fam;
                fontStates[id] = 'disponible';
                delete fontFailures[id];
                return fam;
            }
            fontStates[id] = 'fallida';
            fontFailures[id] = 'fonts:' + id + ':la familia "' + fam + '" no se pudo cargar de Google';
            delete fontPromises[id];
            var e = new Error(fontFailures[id]);
            e.fontId = id;
            e.familia = fam;
            throw e;
        });
        fontPromises[id] = p;
        return p;
    }
    // Compat: recibe un spec de Google y asegura la fuente. Usa la identidad
    // virtual que le corresponde a la familia.
    function ensureGoogleFontBySpec(spec) {
        spec = String(spec || '').trim();
        if (!spec) return Promise.reject(new Error('fonts:?:spec de Google vacio'));
        var id;
        try { id = resolveFontId(spec); }
        catch (e) { return Promise.reject(e); }
        return asegurarGoogle(id, spec, googleFamilyOf(spec));
    }
    // Compat: antes recibia el nombre de familia; ahora deriva el spec del
    // catalogo (campo google) y delega. Si no hay spec, usa la familia tal cual.
    // Familia tipografica de una identidad, YA entrecomillada para componer el
    // valor de fuente de un contexto (R-C3.2). Sin comillas, un nombre con
    // espacios genera un valor CSS invalido que el navegador IGNORA en
    // silencio, dejando el valor anterior en el lienzo: esa era la fuente
    // fantasma que veia el usuario. Funcion PURA: no toca red ni estados.
    function getFontFamily(ref) {
        var id;
        try { id = resolveFontId(ref); }
        catch (_) { return null; }
        var e = getFontById(id);
        var nombre = (e && e.name) || (catalogFonts[id] && catalogFonts[id].titulo) || String(id);
        // Escapa comillas dobles para no romper el valor de fuente.
        var limpio = String(nombre).replace(/"/g, "'");
        return '"' + limpio + '"';
    }
    // Compat: nombre de familia SIN comillas, para quien solo necesita el texto.
    function getFontName(fontKey) {
        var quoted = getFontFamily(fontKey);
        if (quoted) return quoted.slice(1, -1);
        var fam = googleFamilyOf(fontKey);
        return fam || String(fontKey);
    }

    function isCustomFont(fontKey) {
        var id;
        try { id = resolveFontId(fontKey); } catch (_) { return false; }
        var e = getFontById(id);
        return !!(e && !e.online);
    }
    function getFontState(ref) {
        var id;
        try { id = resolveFontId(ref); } catch (_) { return 'desconocida'; }
        return fontStates[id] || 'no solicitada';
    }
    function getFontFailure(ref) {
        var id;
        try { id = resolveFontId(ref); } catch (_) { return null; }
        return fontFailures[id] || null;
    }

    // Asegura la fuente que se le pase. NO lee el estado del editor: ese estado
    // es privado a su modulo y la lectura a ciegas hacia que se asegurara
    // siempre la fuente por defecto (R5). El que llama decide cual es.
    // Al abrir la app NO se precarga nada mas que el catalogo.
    function preloadAll(ref) {
        return loadCatalog().then(function () {
            indexarCatalogo();
            if (ref === undefined || ref === null) return null;
            return loadFont(ref).catch(function (e) {
                console.warn('preloadAll: ' + ((e && e.message) || e));
                return null;
            });
        }).catch(function () { return null; });
    }

    // Listado UNICO de fuentes para poblar el selector y la galeria: una entrada
    // por identidad, ordenada por categoria y nombre. Dos titulos iguales son
    // dos identidades distintas y aparecen como entradas distintas (R-C4.1);
    // la misma fuente nunca aparece dos veces.
    function listFontEntries() {
        indexarCatalogo();
        var out = [];
        Object.keys(fontsById).forEach(function (cid) {
            var id = +cid;
            var e = fontsById[id];
            if (!e) return;
            out.push({
                id: id,
                value: id,
                name: e.name,
                file: e.file,
                online: !!e.online,
                categoria: e.categoria || 'custom',
                isCustom: !!e.isCustom,
                isServer: !!e.isServer,
                state: fontStates[id] || 'no solicitada'
            });
        });
        out.sort(function (a, b) {
            if (a.categoria !== b.categoria) return String(a.categoria).localeCompare(String(b.categoria));
            return String(a.name).localeCompare(String(b.name));
        });
        return out;
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

    /** Quita una fuente del registry SOLO en memoria (sin op=baja). La usa el
     *  renombre/movimiento: ahi el motor YA resolvio el fisico con op=editar y
     *  una baja extra borraria el archivo recien conservado (op=baja hace
     *  unlink + tombstone). */
    function unregisterCustomFont(key) {
        var reg = fontRegistry[key];
        if (!reg) return false;
        var id = (typeof reg.id === 'number' && reg.id >= 1) ? reg.id : null;
        delete fontRegistry[key];
        delete loadedFonts[key];
        delete loadingPromises[key];
        // RC39: la entrada sale tambien del indice canonico y de los estados
        // de carga, o la fuente seguiria en el selector y cargandose como si
        // existiera (R-C2.4).
        if (id !== null) {
            delete fontsById[id];
            delete fontStates[id];
            delete fontFailures[id];
            delete fontPromises[id];
            delete loadedFonts[id];
        }
        Object.keys(nameToKeyMap).forEach(function (name) {
            if (nameToKeyMap[name] === key) delete nameToKeyMap[name];
        });
        return true;
    }

    /**
     * Baja REAL de una fuente del servidor (op=baja, scope=fonts: el motor hace
     * unlink del fisico + tombstone en el catalogo). Devuelve Promise<boolean>:
     * conserva la entrada local si el motor rechaza la baja y resuelve despues
     * de confirmar e invalidar las caches. NUNCA rechaza: false ante fallos,
     * true cuando el motor confirma la baja.
     */
    /**
     * Baja REAL de una fuente IDENTIFICADA POR SU ID DE CATALOGO (op=baja,
     * scope=fonts). Es la ruta que usa la galeria: desde RC39 la identidad de
     * una fuente es su id numerico de `fonts.json`, y las fisicas del catalogo
     * NO tienen entrada en `fontRegistry` (por eso `deleteCustomFont` solo
     * servia para las subidas de la sesion y el boton Delete quedaba muerto).
     * Una familia Google (file sin extension = `online`) no se borra: no hay
     * fisico en el servidor. Devuelve Promise<boolean> y nunca rechaza.
     */
    function deleteFontFromCatalog(id) {
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;
        if (!(bridge && bridge.urls && bridge.urls.motor && bridge.nonces && bridge.nonces.motor)) {
            return Promise.resolve(false);
        }
        var entry = catalogFonts[id] || fontsById[id] || null;
        var archivo = entry && entry.file;
        if (!archivo || entry.online || !FONT_EXT_RE.test(archivo)) {
            return Promise.resolve(false); // Google: no hay fisico que borrar
        }
        var fd = new FormData();
        fd.append('op', 'baja');
        fd.append('_wpnonce', bridge.nonces.motor);
        fd.append('scope', 'fonts');
        fd.append('file', archivo);
        return fetch(bridge.urls.motor, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) {
                return r.json().then(function (res) { return { ok: r.ok, res: res }; });
            }).then(function (o) {
                if (!o.ok || !o.res || !o.res.success) return false;
                // La identidad desaparece: sale del indice canonico y de cualquier
                // entrada del registro que apuntara al mismo archivo.
                delete fontsById[id];
                Object.keys(fontRegistry).forEach(function (k) {
                    if (fontRegistry[k] && fontRegistry[k].serverFile === archivo) delete fontRegistry[k];
                });
                delete loadedFonts[id];
                delete fontStates[id];
                return true;
            })
            .catch(function () { return false; });
    }

    function deleteCustomFont(key) {
        var font = fontRegistry[key];
        var bridge = window.PresetManager && window.PresetManager.getBridge ? window.PresetManager.getBridge() : null;

        if (!(font && font.isServer && font.serverFile && bridge && bridge.urls && bridge.urls.motor
            && bridge.nonces && bridge.nonces.motor)) {
            return Promise.resolve(false);
        }
        var archivo = font.serverFile;
        var fd = new FormData();
        fd.append('op', 'baja');
        fd.append('_wpnonce', bridge.nonces.motor);
        fd.append('scope', 'fonts');
        fd.append('file', archivo);
        return fetch(bridge.urls.motor, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(async function (r) {
                var res = await r.json();
                if (!r.ok || !res || !res.success) return false;
                unregisterCustomFont(key);
                if (Array.isArray(bridge.fuentes)) {
                    bridge.fuentes = bridge.fuentes.filter(function (f) { return f.nombre !== archivo; });
                }
                await invalidarSpriteFuentes();
                return true;
            })
            .catch(function () { return false; });
    }

    // (H-004) Sin carga legacy de fuentes personalizadas: el catalogo y la
    // subida al servidor son la unica via (prohibido localStorage).


    /** Dibuja el nombre de la fuente en un canvas de ancho x alto SIN tocar la
     *  red. familyCss es el stack CSS a usar: si la familia aun no esta en
     *  document.fonts el navegador cae a la del sistema (que es exactamente el
     *  comportamiento que quiere un placeholder). */
    function dibujarPreviewFuente(fontName, familyCss, ancho, alto, color) {
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
        ctx.font = familyCss;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fontName, 6, Math.round(alto / 2));

        ctx.restore();
        return cv;
    }

    /**
     * Renderiza una miniatura de la fuente mostrando SU PROPIO NOMBRE
     * Dimensiones estandar: 180x30px, alineado a la izquierda, recortado si no entra.
     * opts.cargar === false => NO hace NINGUN fetch: dibuja con la familia
     * declarada (fuente del sistema si aun no esta cargada). Lo usan los
     * placeholders de la galeria: abrir el panel de fuentes jamas descarga el
     * catalogo. Antes cada tile llamaba a loadFont y al abrir se bajaban las
     * 15 fisicas del catalogo (~1,4 MB) mas el rebuild completo de la hoja.
     */
    function renderFontPreview(fontItem, ancho, alto, opts) {
        ancho = ancho || 180;
        alto = alto || 30;
        opts = opts || {};
        var fontKey = typeof fontItem === 'string' ? fontItem : (fontItem.key || fontItem.nombre);
        var fontName = (fontItem && fontItem.name) || (fontRegistry[fontKey] && fontRegistry[fontKey].name) || fontKey;
        var esOnline = !!(fontItem && fontItem.online) || (catalogFonts[fontKey] && catalogFonts[fontKey].online);
        var cssReal = '16px "' + fontName + '", sans-serif';

        // Online Google: preview con fuente del sistema (rapido, sin red/links).
        if (esOnline) {
            return Promise.resolve(dibujarPreviewFuente(fontName, '14px sans-serif', ancho, alto, '#666666'));
        }
        // Preview sin carga: cero red (placeholder de la galeria).
        if (opts.cargar === false) {
            return Promise.resolve(dibujarPreviewFuente(fontName, cssReal, ancho, alto, '#222222'));
        }

        return loadFont(fontKey).then(function () {
            return dibujarPreviewFuente(fontName, cssReal, ancho, alto, '#222222');
        }).catch(function () {
            // Fallback con fuente de sistema
            return dibujarPreviewFuente(fontName, '14px sans-serif', ancho, alto, '#666666');
        });
    }

    /**
     * Asegura el spritesheet global de fuentes (reticula de catalogo.thumbs).
     * DEPRECADO para la apertura de la galeria (RC37): la galeria lee la hoja
     * canonica con TextMuyAPI.ensureSpriteCanonico('fonts') y NUNCA reconstruye
     * aqui, porque ThumbEngine guarda el manifiesto solo en memoria y cada
     * apertura disparaba una generacion completa que llamaba a renderFontPreview
     * por cada item -> se descargaban TODAS las fuentes fisicas. Queda para la
     * generacion explicita ("Generar miniaturas").
     * opciones.sinCarga: dibuja los tiles sin descargar ninguna fuente.
     */
    function ensureFontsSprite(opciones) {
        opciones = opciones || {};
        if (!window.ThumbEngine) {
            return Promise.resolve(null);
        }
        // RC32: esperar el catalogo (bridge-ready + 1200ms max) y las fisicas
        // ANTES de armar los items. Sin esto, abrir la galeria rapido armaba
        // el sprite con catalogFonts vacio (solo registry) -> tiles ausentes y
        // reconstrucciones pesadas en cada apertura.
        return Promise.resolve()
            .then(function () { return loadCatalog(); })
            .then(function () { return loadUserFonts().catch(function () { return []; }); })
            .then(function () {
        // Items = catalogo (fonts.json: online Google + fisicas del json) +
        // fisicas del puente registradas. Las online se dibujan con fuente del
        // sistema (cero red/cero FontFace: el preview real es lazy al elegir).
        var items = [];
        // Identidad real de una fuente = su ARCHIVO fisico (y, si esta
        // registrada, su id de catalogo). El registry y el catalogo describen
        // la misma fuente con claves distintas ('user-3'/'server-x' vs id): sin
        // dedupe la hoja llevaba DOS tiles de la misma fuente (y la cargaba dos
        // veces al reconstruir).
        var archivosCatalogo = {}; // file fisico -> true
        Object.keys(catalogFonts).forEach(function (id) {
            var e = catalogFonts[id];
            if (e.file) archivosCatalogo[e.file] = true;
            items.push({ nombre: String(id), name: e.titulo || id, key: String(id), online: !!e.online });
        });
        getAvailableFonts().forEach(function (f) {
            if (catalogFonts[f.key]) return;
            var reg = fontRegistry[f.key] || null;
            if (reg && reg.id !== undefined && catalogFonts[reg.id]) return;   // registrada desde el catalogo
            if (reg && reg.serverFile && archivosCatalogo[reg.serverFile]) return; // fisica ya presente por id
            items.push({ nombre: String(f.key), name: f.name, key: String(f.key), online: false });
        });

        var bF = (window.PresetManager && window.PresetManager.getBridge) ? window.PresetManager.getBridge() : null;
        // La reticula la manda el catalogo (thumbs): si el plugin sube el
        // tamano de la celda, la hoja se escribe con ese tamano y la galeria lo
        // sigue (js/catalog.js::geometriaTiles). Fallback: la reticula historica.
        var th = (catalogParsed && catalogParsed.thumbs) || {};
        var sinCarga = !!opciones.sinCarga;
        var firma = '';
        try {
            if (window.TextMuyCatalog && catalogRaw && catalogRaw.thumbs) {
                firma = window.TextMuyCatalog.firmaCatalogo(catalogRaw.thumbs, catalogRaw.items);
            }
        } catch (_) { firma = ''; }
        return window.ThumbEngine.ensureSprite({
            scope: 'fonts',
            items: items,
            ancho: th.w > 0 ? (th.w | 0) : 180,
            alto: th.h > 0 ? (th.h | 0) : 30,
            columnas: th.c > 0 ? (th.c | 0) : 4,
            render: function (it, w, h) {
                return renderFontPreview(it, w, h, { cargar: !sinCarga });
            },
            // Sin firma el motor escribe thumbs.sprite_firma='' y la hoja queda
            // INcertificable para siempre: la ruta canonica (api.js) la rechaza
            // y se reconstruye en cada apertura.
            firma: firma,
            baseUrl: (bF && bF.urls && bF.urls.fuentesBase) ? bF.urls.fuentesBase : ''
        });
            });
    }

    // Cambia la fuente generica inicial (p.ej. al elegir una real en la
    // galeria o al cargar el template predeterminado).
    // RC32: NUNCA aceptar una clave del registry como familia por defecto.
    // El picker enviaba 'user-70' y contaminaba DEFAULT_FONT_FAMILY -> todas
    // las Google caian en fallback y ninguna se aplicaba.
    function familiaDeClave(key) {
        // Resuelve por la identidad canonica: el nombre visible de la fuente,
        // ya sea que la referencia sea un id, un titulo o una clave interna.
        try {
            var id = resolveFontId(key);
            var e = getFontById(id);
            if (e && e.name) return e.name;
        } catch (_) { /* referencia no resoluble: se usa tal cual */ }
        return String(key);
    }
    // Cambia la fuente por defecto del proyecto. Guardamos la IDENTIDAD, no el
    // nombre: la fuente vigente se consulta siempre (FR-011), y asi el valor
    // no se queda congelado en un estado viejo.
    function setDefaultFont(ref) {
        if (ref === undefined || ref === null || ref === '') return DEFAULT_FONT_FAMILY;
        try {
            DEFAULT_FONT_FAMILY = familiaDeClave(ref);
        } catch (_) { /* sin catalogo: se conserva la vigente */ }
        return DEFAULT_FONT_FAMILY;
    }

    window.FontLoader = {
        // Fuente por defecto VIGENTE (getter: antes era una copia congelada que
        // setDefaultFont nunca actualizaba, FR-011).
        get DEFAULT_FONT_FAMILY() { return DEFAULT_FONT_FAMILY; },
        setDefaultFont: setDefaultFont,
        loadFont: loadFont,
        ensureGoogleFontBySpec: ensureGoogleFontBySpec,
        loadUserFonts: loadUserFonts,
        loadCatalog: loadCatalog,
        invalidateCatalog: invalidateCatalog,
        listServerFonts: listServerFonts,
        fontUrlBase: fontUrlBase,
        getFontName: getFontName,
        // Familia YA entrecomillada para componer ctx.font (R-C3.2).
        getFontFamily: getFontFamily,
        // Estado del ciclo de carga y causa del ultimo fallo (data-model §2).
        getFontState: getFontState,
        getFontFailure: getFontFailure,
        // Identidad canonica de una referencia (id numerico de catalogo).
        resolveFontId: resolveFontId,
        // Listado unico por identidad: cada fuente aparece una vez (R-C4.1).
        listFontEntries: listFontEntries,
        isCustomFont: isCustomFont,
        preloadAll: preloadAll,
        resolveFontFromPreset: resolveFontFromPreset,
        registerTextStudioFont: registerTextStudioFont,
        uploadCustomFont: uploadCustomFont,
        deleteCustomFont: deleteCustomFont,
        // RC46/Bloque C: baja por identidad de catalogo (las fisicas de
        // fonts.json no tienen entrada en el registro).
        deleteFontFromCatalog: deleteFontFromCatalog,
        unregisterCustomFont: unregisterCustomFont,
        renderFontPreview: renderFontPreview,
        ensureFontsSprite: ensureFontsSprite,
        getAvailableFonts: getAvailableFonts,
        getFontCategories: function() { return fontCategories; },
        getCatalogFonts: function() { return catalogFonts; },
        getCatalogThumbs: function() {
            return (catalogParsed && catalogParsed.thumbs) || { w: 0, h: 0, c: 0 };
        },
        getCatalogLibres: function() { return catalogLibres.slice(); },
        getCatalogInvalidas: function() { return catalogInvalidas.slice(); },
        registry: fontRegistry
    };

})();
