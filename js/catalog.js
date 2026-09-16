/* ===== TEXTMUY CATALOG - parser unico de catalogos uploads/pmu =====
 * Canonico por ambito (fonts/img/tm-presets):
 *   {"thumbs":{"w":N,"h":N,"c":N},"items":[[id,title,cats,file],...]}
 *   id numerico entero >= 1 (= tile: tile = id-1). title string.
 *   cats string "cat1, cat2" (default custom). file con extension =
 *   fisico; sin extension y no vacio = Google (SOLO fonts);
 *   "" = tombstone libre [id,"","",""].
 * Clases: ok / free / invalid con causa "ambito:id:motivo". Sin
 * compat legacy. Ver constitucion IV + VI y contracts/.
 */
(function() {
    'use strict';

    var CAT_SEP_RE = /[,/ ]+/;

    function isFreeTuple(title, cats, file) {
        return title === '' && cats === '' && file === '';
    }

    /* cats -> array: string con separadores coma/barra/espacio y
     * trim; vacio -> ["custom"]. */
    function parseCats(rawCats) {
        var arr;
        if (Array.isArray(rawCats)) {
            arr = rawCats.map(function(s) { return String(s).trim(); }).filter(Boolean);
        } else {
            arr = String(rawCats || 'custom').split(CAT_SEP_RE).map(function(s) {
                return s.trim();
            }).filter(Boolean);
        }
        if (!arr.length) arr = ['custom'];
        return arr;
    }

    /* Clasifica UNA entrada -> {status, entry?, reason?}:
     * ok -> {entry:{id,titulo,categorias,cats,file,online}};
     * free -> {entry:{id}} (tombstone, no se muestra);
     * invalid -> {reason:'ambito:id|@pos:motivo'}. */
    function classifyEntry(f, opts) {
        opts = opts || {};
        var ambito = opts.ambito || 'catalogo';
        var pos = (typeof opts.pos === 'number') ? opts.pos : -1;
        var at = pos >= 0 ? '@' + pos : '?';
        if (!Array.isArray(f) || f.length !== 4) {
            return { status: 'invalid', reason: ambito + ':' + at + ':no-tupla' };
        }
        var id = f[0], title = f[1], rawCats = f[2], file = f[3];
        if (typeof id !== 'number' || !isFinite(id) || Math.floor(id) !== id || id < 1) {
            return { status: 'invalid', reason: ambito + ':' + at + ':id no numerico' };
        }
        if (opts.vistos) {
            if (opts.vistos[id]) {
                return { status: 'invalid', reason: ambito + ':' + id + ':duplicado' };
            }
            opts.vistos[id] = true;
        }
        if (typeof title !== 'string' || typeof file !== 'string') {
            return { status: 'invalid', reason: ambito + ':' + id + ':title/file no string' };
        }
        if (isFreeTuple(title, rawCats, file)) {
            return { status: 'free', entry: { id: id } };
        }
        var cats = (typeof rawCats === 'string') ? rawCats : '';
        var categorias = parseCats(rawCats);
        var isFisico = /\.(ttf|otf|woff|woff2|svg|webp|png|jpg|jpeg|gif|avif|txm)$/i.test(file);
        if (!file) {
            return { status: 'invalid', reason: ambito + ':' + id + ':file vacio (no tombstone)' };
        }
        if (!isFisico && ambito !== 'fonts') {
            return { status: 'invalid', reason: ambito + ':' + id + ':google solo valido en fonts' };
        }
        return {
            status: 'ok',
            entry: {
                id: id,
                titulo: title || ('#' + id),
                categorias: categorias,
                cats: cats,
                file: file,
                online: !isFisico
            }
        };
    }

    /* Parsea un catalogo completo -> {items, libres, invalidas,
     * categorias, maxId, thumbs}. Las invalidas NO lanzan: la galeria
     * las salta con console.warn + contador (Const. VI); el render
     * rechaza si pide un id invalido, libre o inexistente. */
    function parseCatalog(data, ambito) {
        ambito = ambito || 'catalogo';
        var thumbs = { w: 0, h: 0, c: 1 };
        var lista = [];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            if (data.thumbs && typeof data.thumbs === 'object') {
                thumbs = { w: data.thumbs.w | 0, h: data.thumbs.h | 0, c: data.thumbs.c | 0 };
            }
            if (Array.isArray(data.items)) lista = data.items;
        } else if (Array.isArray(data)) {
            lista = data;
        }
        var out = { items: {}, libres: [], invalidas: [], categorias: {}, maxId: 0, thumbs: thumbs };
        var vistos = {};
        lista.forEach(function(f, i) {
            var r = classifyEntry(f, { ambito: ambito, pos: i, vistos: vistos });
            if (r.status === 'ok') {
                out.items[r.entry.id] = r.entry;
                if (r.entry.id > out.maxId) out.maxId = r.entry.id;
                r.entry.categorias.forEach(function(c) {
                    if (!out.categorias[c]) out.categorias[c] = [];
                    if (out.categorias[c].indexOf(r.entry.id) === -1) out.categorias[c].push(r.entry.id);
                });
            } else if (r.status === 'free') {
                if (out.libres.indexOf(r.entry.id) === -1) out.libres.push(r.entry.id);
                if (r.entry.id > out.maxId) out.maxId = r.entry.id;
            } else {
                out.invalidas.push({ pos: i, reason: r.reason });
            }
        });
        out.libres.sort(function(a, b) { return a - b; });
        return out;
    }

    /* Exige un id usable para render. Lanza Error('ambito:id:motivo')
     * si es libre, invalido o inexistente. */
    function requireId(parsed, ambito, id) {
        ambito = ambito || 'catalogo';
        if (parsed.items[id] && parsed.items[id].file) return parsed.items[id];
        if (parsed.libres.indexOf(id) !== -1) throw new Error(ambito + ':' + id + ':libre');
        throw new Error(ambito + ':' + id + ':ausente o invalido');
    }

    /* Tile en el sprite fusionado: tile = id-1. */
    function tileDeId(id, thumbs) {
        var w = thumbs.w | 0, h = thumbs.h | 0, c = thumbs.c | 0;
        if (!(id >= 1) || !(w > 0) || !(h > 0) || !(c > 0)) {
            throw new Error('tileDeId: id/thumbs invalidos (id=' + id + ')');
        }
        var col = (id - 1) % c;
        var row = Math.floor((id - 1) / c);
        return { x: col * w, y: row * h, w: w, h: h, col: col, row: row };
    }

    /* Manifiesto canonico del sprite de un ambito: tile = id-1 con huecos
     * estables. No depende del orden del catalogo: la posicion de cada id es
     * determinista via tileDeId. Los tombstones quedan como huecos (null),
     * asi un alta/baja nunca reordena los tiles existentes.
     * Retorna {scope, tile:{ancho,alto}, columnas, filas, tiles:[{id,x,y,..}|null]}.
     * thumbs invalido -> lanza (el llamador usa fallback controlado). */
    function manifestDeSprite(parsed, ambito) {
        if (!parsed || !parsed.thumbs) throw new Error((ambito || 'sprite') + ':thumbs:ausente');
        var thumbs = parsed.thumbs;
        var w = thumbs.w | 0, h = thumbs.h | 0, c = thumbs.c | 0;
        if (!(w > 0) || !(h > 0) || !(c > 0)) {
            throw new Error((ambito || 'sprite') + ':thumbs:invalido');
        }
        var max = parsed.maxId | 0;
        var filas = Math.max(1, Math.ceil(Math.max(1, max) / c));
        var tiles = [];
        for (var id = 1; id <= Math.max(1, max); id++) {
            var entry = parsed.items ? parsed.items[id] : null;
            if (entry && entry.file) {
                var t = tileDeId(id, thumbs);
                tiles.push({ id: id, nombre: String(id), x: t.x, y: t.y, w: w, h: h });
            } else {
                tiles.push(null); // hueco estable (tombstone o id sin uso)
            }
        }
        return { scope: ambito || '', tile: { ancho: w, alto: h }, columnas: c, filas: filas, tiles: tiles };
    }

    /* Posicion esperada del tile del id dentro de un sprite canonico ya
     * cargado. null si el sprite no es canonico para ese id. */
    function celdaDeSprite(spriteImage, canon, id) {
        if (!spriteImage || !canon || !(id >= 1)) return null;
        var esperado = null;
        try { esperado = tileDeId(id, { w: canon.tile.ancho, h: canon.tile.alto, c: canon.columnas }); }
        catch (_) { return null; }
        if (esperado.x + esperado.w > (spriteImage.naturalWidth || spriteImage.width || 0)) return null;
        if (esperado.y + esperado.h > (spriteImage.naturalHeight || spriteImage.height || 0)) return null;
        return esperado;
    }

    /* Firma canonica del catalogo: dims de reticula + tuplas crudas.
     * DEBE coincidir con PMU_Uploads::sprite ([w,h,c,items]) o el motor
     * rechaza la hoja con 'motor:sprite:catalogo:desactualizado'. Certifica
     * que un thumbs.webp pertenece al catalogo vigente (una hoja vieja con
     * las mismas dimensiones NO se reutiliza). */
    function firmaCatalogo(thumbs, items) {
        return JSON.stringify([
            (thumbs && thumbs.w) | 0,
            (thumbs && thumbs.h) | 0,
            (thumbs && thumbs.c) | 0,
            Array.isArray(items) ? items : []
        ]);
    }

    /* Hueco para un alta: tombstone mas bajo, o maxId+1. */
    function huecoParaAlta(parsed) {
        if (parsed.libres.length) return parsed.libres[0];
        return parsed.maxId + 1;
    }

    /* ===== Refs de imagen por id numerico (settings <-> img.json) ===== */
    var IMG_PATHS = [
        'background.fill.image.src', 'icon.src',
        'fill.texture.src',
        'outline.first.fill.texture.src', 'outline.second.fill.texture.src',
        'outline.global.fill.texture.src',
        'depth.fill.texture.src', 'depth2.fill.texture.src'
    ];

    function getPath(obj, path) {
        var cur = obj, parts = path.split('.');
        for (var i = 0; i < parts.length; i++) {
            if (!cur || typeof cur !== 'object') return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }
    function setPath(obj, path, value) {
        var cur = obj, parts = path.split('.');
        for (var i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }
    /* Objetos a recorrer: base + cada override de lines (mismas hojas). */
    function imgTargets(settings) {
        var out = [settings];
        if (settings && settings.lines && settings.lines.overrides && typeof settings.lines.overrides === 'object') {
            Object.keys(settings.lines.overrides).forEach(function (k) {
                var v = settings.lines.overrides[k];
                if (v && typeof v === 'object') out.push(v);
            });
        }
        return out;
    }
    /* Aplica fn a cada hoja de ref de imagen; muta in-place con el retorno
     * (si fn devuelve otro valor, se escribe). fn puede lanzar con causa. */
    function mapImgRefs(settings, fn) {
        if (!settings || typeof settings !== 'object') return settings;
        imgTargets(settings).forEach(function (obj) {
            IMG_PATHS.forEach(function (p) {
                var v = getPath(obj, p);
                if (v === undefined || v === null) return;
                var nv = fn(v, p);
                if (nv !== v) setPath(obj, p, nv);
            });
            var layers = getPath(obj, 'fill.layers');
            if (Array.isArray(layers)) {
                layers.forEach(function (layer) {
                    (layer && Array.isArray(layer.styles) ? layer.styles : []).forEach(function (style) {
                        if (style && style.texture && style.texture.src !== undefined && style.texture.src !== null) {
                            var nv = fn(style.texture.src, 'fill.layers.styles.texture.src');
                            if (nv !== style.texture.src) style.texture.src = nv;
                        }
                    });
                });
            }
        });
        return settings;
    }
    /* Id numerico entero >= 1 en forma number o string numerico ("47"). */
    /* RC32: los ids escritos como string llegaban al render como URL
     * relativas (-> GET modules/textmuy/47 404) y hasNumericImgRefs no los
     * veia, asi prepareImgRefs jamas los resolvia. */
    function esIdNumerico(v) {
        if (typeof v === 'number') return isFinite(v) && Math.floor(v) === v && v >= 1;
        if (typeof v === 'string' && /^[0-9]+$/.test(v.trim())) { var n = +v.trim(); return n >= 1; }
        return false;
    }
    /* true si el settings trae al menos una ref de imagen numerica. */
    function hasNumericImgRefs(settings) {
        var found = false;
        try {
            mapImgRefs(settings, function (v) {
                if (esIdNumerico(v)) found = true;
                return v;
            });
        } catch (_) { /* fn no lanza aqui */ }
        return found;
    }

    var api = {
        parseCats: parseCats,
        classifyEntry: classifyEntry,
        parseCatalog: parseCatalog,
        esIdNumerico: esIdNumerico,
        firmaCatalogo: firmaCatalogo,
        manifestDeSprite: manifestDeSprite,
        celdaDeSprite: celdaDeSprite,
        requireId: requireId,
        tileDeId: tileDeId,
        huecoParaAlta: huecoParaAlta,
        mapImgRefs: mapImgRefs,
        hasNumericImgRefs: hasNumericImgRefs
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.TextMuyCatalog = api;
})();
