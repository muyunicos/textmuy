/* ===== TEXTMUY CATALOG - parser unico de catalogos uploads/tm =====
 * Canonico por ambito (fonts/img/presets):
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
    /* true si el settings trae al menos una ref de imagen numerica. */
    function hasNumericImgRefs(settings) {
        var found = false;
        try {
            mapImgRefs(settings, function (v) {
                if (typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 1) found = true;
                return v;
            });
        } catch (_) { /* fn no lanza aqui */ }
        return found;
    }

    var api = {
        parseCats: parseCats,
        classifyEntry: classifyEntry,
        parseCatalog: parseCatalog,
        requireId: requireId,
        tileDeId: tileDeId,
        huecoParaAlta: huecoParaAlta,
        mapImgRefs: mapImgRefs,
        hasNumericImgRefs: hasNumericImgRefs
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.TextMuyCatalog = api;
})();
