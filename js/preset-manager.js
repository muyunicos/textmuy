/* ===== PRESET MANAGER - presets .txm (miniaturas por spritesheet global) =====
 *
 * El almacenamiento unico de presets son ARCHIVOS:
 *   {nombre}.txm  -> delta de settings (formato textmuy-project v1)
 *
 * Las miniaturas viven en el sprite del ambito tm-presets gestionado por
 * ThumbEngine.ensureSprite({scope:'tm-presets'}); se persiste via el endpoint
 * unico del motor (op=sprite). NO se generan .webp sueltos junto al .txm.
 *
 * Dentro de WordPress los archivos viven en la ubicacion unica
 * uploads/pmu/tm-presets/ y la base URL de LECTURA llega por el puente
 * (bridge.urls.presetsBase). Toda ESCRITURA va por POST a urls.motor con
 * op= (contrato motor-resources de specs/006-align-textmuy-motor) y una
 * unica credencial bridge.nonces.motor. Sin puente el editor NO opera:
 * sin bases de respaldo, sin descarga local y sin imagenes embebidas.
 */
(function() {
    'use strict';

    // ===== PUENTE CON PERSONALIZADOR PDF (postMessage same-origin) =====
    // La pagina del admin envia {type:'textmuy-bridge', bridge:{urls,nonces,presets,imagenes,fuentes}}
    // cuando el iframe carga. Sin puente: bridge queda null y el editor no opera.
    let bridge = null;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('message', function (ev) {
            if (!ev || !ev.data || ev.data.type !== 'textmuy-bridge') return;
            if (ev.source !== window.parent && ev.source !== window) return;
            if (ev.data.bridge && typeof ev.data.bridge === 'object') {
                bridge = ev.data.bridge;

                // Configurar ThumbEngine y cargar su script si no esta cargado
                function configureThumbEngine() {
                    if (window.ThumbEngine && bridge.urls && bridge.urls.motor) {
                        window.ThumbEngine.configure({
                            endpoint: bridge.urls.motor,
                            nonce: bridge.nonces && bridge.nonces.motor
                        });
                    }
                }

                if (!window.ThumbEngine && bridge.urls && bridge.urls.miniaturas) {
                    var s = document.createElement('script');
                    s.src = bridge.urls.miniaturas;
                    s.onload = configureThumbEngine;
                    document.head.appendChild(s);
                } else {
                    configureThumbEngine();
                }

                // Aviso a la UI (los botones "Mis imagenes" se inyectan al llegar
                // el puente, que puede ser posterior a Controls.init()).
                if (typeof window.dispatchEvent === 'function' && typeof window.Event === 'function') {
                    window.dispatchEvent(new window.Event('textmuy-bridge-ready'));
                }
            }
        });
        // Avisar al parent que el modulo ya escucha (el parent reenvia el puente).
        try {
            if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
                window.parent.postMessage({ type: 'textmuy-ready' }, window.location.origin);
            }
        } catch (_) { /* parent cruzado o inaccesible */ }
    }

    // Sin datos de fabrica versionados en el modulo: el listado de presets vive
    // en uploads/pmu/tm-presets/ y llega por el puente (objetos {nombre,titulo,id};
    // se expone como lista de nombres para la UI).
    function listPresets() {
        if (bridge && Array.isArray(bridge.presets) && bridge.presets.length) {
            return bridge.presets.map(function (p) {
                return (p && typeof p === 'object') ? p.nombre : p;
            }).filter(Boolean);
        }
        return [];
    }

    /** POST al endpoint unico del motor con la credencial nonces.motor. */
    async function motorPost(op, fd) {
        fd.append('op', op);
        fd.append('_wpnonce', bridge.nonces.motor);
        const resp = await fetch(bridge.urls.motor, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'La operacion ' + op + ' fallo en el motor.'));
        }
        return datos.data;
    }

    // ===== FORMATO .txm =====
    const PROJECT_FORMAT = 'textmuy-project';
    const PROJECT_VERSION = 1;
    const THUMB_WIDTH = 200;
    const THUMB_HEIGHT = 100;

    let thumbnailCache = new Map();   // name -> URL (runtime only)

    function getDefaults() {
        return (window.TextEditor && window.TextEditor.createDefaultSettings)
            ? window.TextEditor.createDefaultSettings()
            : {};
    }

    // Recursive diff of `current` against `base`; only differing branches are
    // kept. Explicit false/0/null/"" are preserved when they differ.
    // Colores tal cual (hex string): sin normalizacion rgb<->hex.
    // Arrays con id estable (fill.layers/styles): diff/merge por id.
    function isIdArray(arr) {
        return Array.isArray(arr) && arr.length
            && arr.every(function(it) { return it && typeof it === 'object' && typeof it.id === 'string'; });
    }
    function diffIdArray(baseArr, curArr) {
        const baseById = {};
        (Array.isArray(baseArr) ? baseArr : []).forEach(function(it) {
            if (it && it.id) baseById[it.id] = it;
        });
        const out = [];
        let changed = false;
        curArr.forEach(function(it) {
            const b = (it && it.id && baseById[it.id]) || {};
            const d = diffSettings(b, it);
            if (d !== undefined) {
                const entry = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
                entry.id = it.id;
                out.push(entry);
                changed = true;
            } else if (it && it.id && !baseById[it.id]) {
                out.push(it);
                changed = true;
            }
        });
        const curIds = {};
        curArr.forEach(function(it) { if (it && it.id) curIds[it.id] = true; });
        (Array.isArray(baseArr) ? baseArr : []).forEach(function(it) {
            if (it && it.id && !curIds[it.id]) changed = true;
        });
        if (!changed) return undefined;
        return out;
    }
    function applyIdArray(target, key, deltaArr) {
        const cur = Array.isArray(target[key]) ? target[key] : [];
        const byId = {};
        cur.forEach(function(it) { if (it && it.id) byId[it.id] = it; });
        const next = [];
        (Array.isArray(deltaArr) ? deltaArr : []).forEach(function(d) {
            if (!d || typeof d.id !== 'string') return;
            if (byId[d.id]) { applyDelta(byId[d.id], d); next.push(byId[d.id]); }
            else next.push(JSON.parse(JSON.stringify(d)));
        });
        target[key] = next;
    }
    function diffSettings(base, current) {
        if (current === base) return undefined;
        if (Array.isArray(current)) {
            if (isIdArray(current) || isIdArray(base)) return diffIdArray(base, current);
            return JSON.stringify(current) === JSON.stringify(base) ? undefined : current;
        }
        if (current && base && typeof current === 'object' && typeof base === 'object' && !Array.isArray(base)) {
            const out = {};
            let has = false;
            Object.keys(current).forEach(function(k) {
                const d = diffSettings(base[k], current[k]);
                if (d !== undefined) { out[k] = d; has = true; }
            });
            return has ? out : undefined;
        }
        return current;
    }

    function applyDelta(target, delta) {
        if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return;
        Object.keys(delta).forEach(function(k) {
            const v = delta[k];
            if (Array.isArray(v) && (isIdArray(v) || isIdArray(target[k]))) {
                applyIdArray(target, k, v);
            } else if (v && typeof v === 'object' && !Array.isArray(v)) {
                if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
                applyDelta(target[k], v);
            } else {
                target[k] = v;
            }
        });
    }

    function settingsFromDelta(delta) {
        const settings = JSON.parse(JSON.stringify(getDefaults()));
        applyDelta(settings, delta);
        // Formato unico (Q4, ruptura total): font.src MUST ser id
        // numerico. String legacy -> rechazo con causa y accion.
        var src = settings && settings.font && settings.font.src;
        if (src !== undefined && src !== null && src !== '') {
            if (typeof src !== 'number' || Math.floor(src) !== src || src < 1) {
                throw new Error('presets:' + ((delta && delta.name) || '?') + ':font.src string (legacy "' + src + '"): re-guardar el preset desde el editor');
            }
        }
        return settings;
    }

    function sanitizeName(name) {
        const clean = String(name || '').trim()
            .replace(/[^a-z0-9_-]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
        return clean || 'preset';
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob);
                else reject(new Error('Could not encode image'));
            }, type, quality);
        });
    }

    function blobToDataURL(blob) {
        return new Promise(function(resolve, reject) {
            const r = new FileReader();
            r.onload = function() { resolve(r.result); };
            r.onerror = function() { reject(r.error); };
            r.readAsDataURL(blob);
        });
    }

    function thumbnailCanvas(settings) {
        const editor = window.TextEditor;
        if (!editor || !editor.renderToCanvas) throw new Error('Editor not ready');
        const s = JSON.parse(JSON.stringify(settings || editor.getSettings()));
        if (!s.canvas) s.canvas = {};
        s.canvas.width = THUMB_WIDTH;
        s.canvas.height = THUMB_HEIGHT;
        const c = document.createElement('canvas');
        c.width = THUMB_WIDTH;
        c.height = THUMB_HEIGHT;
        editor.renderToCanvas(c, s);
        return c;
    }

    async function thumbnailBlob(settings) {
        return canvasToBlob(thumbnailCanvas(settings), 'image/webp', 0.9);
    }

    async function thumbnailDataUrl(settings) {
        return blobToDataURL(await thumbnailBlob(settings));
    }

    // ===== GUARDADO / BORRADO =====
    async function leerJson(resp) {
        try { return await resp.json(); } catch (_) { return null; }
    }

    /** Mensaje de error humano: JSON del handler, o aviso de sesion expirada. */
    function mensajePuente(datos, resp, porDefecto) {
        if (datos && datos.data) return String(datos.data);
        if (resp && (resp.status === 403 || resp.status === 400)) {
            return porDefecto + ' Recarga la pagina (la sesion pudo expirar) y reintenta.';
        }
        return porDefecto;
    }

    /**
     * Guarda el settings actual como {nombre}.txm en el servidor via el motor
     * unico (op=alta, scope=tm-presets). Sin puente el editor no opera.
     * Devuelve {name, mode:'server'}.
     */
    async function savePreset(name, settings) {
        const safe = sanitizeName(name || (settings && settings.text) || 'preset');
        if (!bridgeAvailable()) {
            throw new Error('Guardar presets requiere el puente del plugin (recarga la pagina).');
        }
        const payload = {
            format: PROJECT_FORMAT,
            version: PROJECT_VERSION,
            name: safe,
            settings: diffSettings(getDefaults(), settings) || {}
        };
        const fd = new FormData();
        fd.append('scope', 'tm-presets');
        fd.append('title', safe);
        fd.append('contenido', JSON.stringify(payload));
        await motorPost('alta', fd);
        // Mantener el listado local al dia (sin recargar la pagina).
        if (Array.isArray(bridge.presets)) {
            const yaEsta = bridge.presets.some(function (p) {
                return (p && typeof p === 'object' ? p.nombre : p) === safe;
            });
            if (!yaEsta) {
                bridge.presets.push({ nombre: safe, titulo: safe, id: 0 });
            }
        }
        thumbnailCache.delete(safe);
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('tm-presets'); } catch (_) {}
        }
        return { name: safe, mode: 'server' };
    }

    async function deletePreset(name) {
        if (!bridgeAvailable()) {
            throw new Error('Borrar presets requiere el puente del plugin (recarga la pagina).');
        }
        const safe = sanitizeName(name);
        const fd = new FormData();
        fd.append('scope', 'tm-presets');
        fd.append('file', safe + '.txm');
        await motorPost('baja', fd);
        if (Array.isArray(bridge.presets)) {
            bridge.presets = bridge.presets.filter(function (p) {
                return (p && typeof p === 'object' ? p.nombre : p) !== safe;
            });
        }
        thumbnailCache.delete(safe);
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('tm-presets'); } catch (_) {}
        }
        return true;
    }

    // ===== IMAGENES SUBIDAS (uploads/pmu/img/, fisicos + catalogo img.json) =====
    const CATEGORIAS_IMAGENES = ['fondos', 'iconos', 'varios'];

    /**
     * Sube una imagen al servidor via el motor unico (op=alta, scope=img).
     * opciones: {categoria, nombre, sobrescribir}. Con sobrescribir+nombre
     * guarda una EDICION: alta de la nueva + baja de la vieja (una copia por
     * recurso, cero residuos). Devuelve {nombre, categoria, url, id}.
     */
    async function uploadImage(file, opciones) {
        opciones = opciones || {};
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes requiere el puente del plugin (recarga la pagina).');
        }
        const categoria = opciones.categoria || 'varios';
        const fd = new FormData();
        fd.append('scope', 'img');
        fd.append('title', opciones.nombre || (file && file.name) || 'imagen');
        fd.append('cats', categoria);
        fd.append('archivo', file, (file && file.name) || opciones.nombre || 'imagen.png');
        const item = await motorPost('alta', fd);
        if (opciones.sobrescribir && opciones.nombre && opciones.nombre !== item.nombre) {
            // Edicion sobre el archivo anterior: dar de baja la copia vieja.
            const fdBaja = new FormData();
            fdBaja.append('scope', 'img');
            fdBaja.append('file', opciones.nombre);
            try { await motorPost('baja', fdBaja); } catch (_) { /* la vieja pudo no existir */ }
        }
        const salida = {
            nombre: item.nombre,
            categoria: categoria,
            url: item.url,
            id: item.id
        };
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return !(im.nombre === item.nombre && (im.categoria || 'varios') === categoria);
            });
            bridge.imagenes.push(salida);
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('img'); } catch (_) {}
        }
        return salida;
    }

    /** Borra una imagen del servidor (op=baja, scope=img). item: {nombre}. */
    async function deleteImage(item) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes requiere el puente del plugin (recarga la pagina).');
        }
        const fd = new FormData();
        fd.append('scope', 'img');
        fd.append('file', item.nombre || item.slug);
        await motorPost('baja', fd);
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return im.nombre !== (item.nombre || item.slug);
            });
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('img'); } catch (_) {}
        }
        return true;
    }

    /** Renombra y/o mueve de categoria (op=editar, scope=img). Devuelve el item actualizado. */
    async function moverImagen(item, nombreNuevo, categoriaNueva) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes requiere el puente del plugin (recarga la pagina).');
        }
        const fd = new FormData();
        fd.append('scope', 'img');
        if (!item.id) {
            throw new Error('Recarga la pagina para actualizar la galeria y volver a intentar.');
        }
        fd.append('id', item.id);
        fd.append('file', nombreNuevo);
        fd.append('cats', categoriaNueva || 'varios');
        const data = await motorPost('editar', fd);
        const itemNuevo = {
            nombre: data.nombre,
            categoria: categoriaNueva || (item.categoria || 'varios'),
            titulo: nombreNuevo,
            url: data.url,
            id: data.id,
            thumb: ''
        };
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return im.nombre !== (item.nombre || item.slug);
            });
            bridge.imagenes.push(itemNuevo);
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('img'); } catch (_) {}
        }
        return itemNuevo;
    }

    /** Listado de imagenes del servidor; con categoria, solo esa categoria. */
    function listImages(categoria) {
        const todas = (bridge && Array.isArray(bridge.imagenes)) ? bridge.imagenes.slice() : [];
        if (categoria) {
            return todas.filter(function (im) { return (im.categoria || 'varios') === categoria; });
        }
        return todas;
    }

    // ===== FUENTES FISICAS (uploads/pmu/fonts/) =====
    // El motor manda bridge.fuentes [{nombre, titulo, ext, url, id}]. Renombrar
    // = moverFuente (op=editar, scope=fonts; el motor renombra el fisico y
    // actualiza la entrada). Sin puente no hay CRUD fisico.
    /** Renombra una fuente (op=editar, scope=fonts). Devuelve el item actualizado. */
    async function moverFuente(item, nombreNuevo, categoriaNueva) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de fuentes requiere el puente del plugin (recarga la pagina).');
        }
        if (!item.id) {
            throw new Error('Recarga la pagina para actualizar la galeria y volver a intentar.');
        }
        const fd = new FormData();
        fd.append('scope', 'fonts');
        fd.append('id', item.id);
        fd.append('file', nombreNuevo);
        if (categoriaNueva) { fd.append('cats', categoriaNueva); }
        const data = await motorPost('editar', fd);
        const itemNuevo = {
            nombre: data.nombre,
            titulo: nombreNuevo,
            ext: (data.nombre || '').split('.').pop(),
            url: data.url,
            id: data.id
        };
        if (Array.isArray(bridge.fuentes)) {
            bridge.fuentes = bridge.fuentes.filter(function (f) {
                return (f.nombre || f.slug) !== (item.serverFile || item.nombre || item.slug);
            });
            bridge.fuentes.push(itemNuevo);
        }
        if (window.FontLoader && window.FontLoader.listServerFonts) {
            // Re-registrar: quitar la vieja y dar de alta la nueva via sync.
            try { window.FontLoader.deleteCustomFont(item.fontKey || item.slug); } catch (_) {}
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('fonts'); } catch (_) {}
        }
        return itemNuevo;
    }

    // ===== LISTADO =====
    function bridgeAvailable() {
        return !!(bridge && bridge.urls && bridge.urls.motor
            && bridge.nonces && bridge.nonces.motor && bridge.urls.presetsBase);
    }

    /**
     * Base URL para LEER presets ({nombre}.txm). Llega por el puente
     * (uploads/pmu/tm-presets/). SIN base de respaldo: sin puente devuelve
     * '' y toda carga de preset se rechaza con causa (el editor no opera).
     * Siempre termina en barra.
     */
    function presetUrlBase() {
        const base = (bridge && bridge.urls && bridge.urls.presetsBase) ? bridge.urls.presetsBase : '';
        return base.slice(-1) === '/' ? base : (base ? base + '/' : '');
    }

    // ===== CARGA =====
    // Devuelve {kind:'txm', data}: formato unico textmuy-project v1. Los
    // formatos anteriores (.json legacy, referencias por nombre) NO se leen.
    async function fetchPreset(name) {
        const safe = sanitizeName(name);
        const base = presetUrlBase();
        if (!base) {
            throw new Error('presets:sin_puente: la lectura de presets requiere el plugin.');
        }
        const response = await fetch(base + encodeURIComponent(safe) + '.txm');
        if (response.ok) {
            const payload = await response.json();
            if (!payload || payload.format !== PROJECT_FORMAT || typeof payload.settings !== 'object' || payload.settings === null) {
                throw new Error('presets:' + safe + ':formato: volver a guardar el preset desde el editor.');
            }
            return { kind: 'txm', data: payload };
        }
        throw new Error('presets:' + safe + ':recurso:ausente');
    }

    async function loadPreset(name) {
        try {
            const entry = await fetchPreset(name);
            const settings = settingsFromDelta(entry.data.settings);
            if (window.TextEditor && window.TextEditor.loadPreset) window.TextEditor.loadPreset(settings);
            return settings;
        } catch (e) {
            console.error('Failed to load preset:', name, e);
            return null;
        }
    }

    // ===== MINIATURAS =====
    function isFileProtocol() {
        try { return typeof location !== 'undefined' && location.protocol === 'file:'; }
        catch (_) { return false; }
    }

    async function imagenExiste(url) {
        try {
            // GET en vez de HEAD: el hosting rechaza HEAD sobre estaticos de
            // uploads aunque GET responde 200. Se cancela el body apenas
            // llegan las cabeceras (no se baja el archivo).
            const resp = await fetch(url, { cache: 'no-store' });
            if (resp.body && typeof resp.body.cancel === 'function') {
                try { await resp.body.cancel(); } catch (_) { /* ya cerrado */ }
            }
            return resp.ok;
        } catch (_) { return false; }
    }

    /**
     * Miniatura de un preset: render 100x200 en memoria (data-URL) para
     * poblar el sprite del ambito; en el servidor persiste via guardarSprite
     * (sprite + manifest por scope). Nunca escribe en localStorage ni
     * genera .webp suelto junto al .txm.
     */
    async function ensureThumbnail(name) {
        if (thumbnailCache.has(name)) return thumbnailCache.get(name);
        return fallback();

        async function fallback() {
            try {
                const entry = await fetchPreset(name);
                let settings = entry.data;
                if (entry.kind === 'txm') {
                    settings = settingsFromDelta(entry.data.settings);
                } else if (window.TextEditor && window.TextEditor.createDefaultSettings && window.TextEditor.loadPreset) {
                    const converted = window.TextEditor.createDefaultSettings();
                    window.TextEditor.loadPreset(entry.data, converted);
                    settings = converted;
                }
                // Miniatura en memoria (data-URL) para poblar el sprite; NO persiste
                // ningun .webp junto al .txm: el sheet vive en thumbs/{scope}.webp.
                const url = await thumbnailDataUrl(settings);
                thumbnailCache.set(name, url);
                return url;
            } catch (e) {
                console.warn('Could not render thumbnail for', name, e);
                return null;
            }
        }
    }

    // Expose API
    window.PresetManager = {
        // Listado y carga (archivos .txm de uploads/pmu/tm-presets/)
        listPresets,
        listImages,
        loadPreset,
        fetchPreset,
        presetUrlBase,
        settingsFromDelta,
        diffSettings,
        applyDelta,
        // Puente (escrituras por el motor unico: urls.motor + op= + nonces.motor)
        savePreset,
        deletePreset,
        bridgeAvailable,
        getBridge: function () { return bridge; },
        // Imagenes subidas (uploads/pmu/img/, fisicos + catalogo img.json)
        CATEGORIAS_IMAGENES,
        uploadImage,
        deleteImage,
        moverImagen,
        // Fuentes fisicas (uploads/pmu/fonts/)
        moverFuente,
        // Miniaturas de galeria (spritesheet thumbs.webp por ambito, op=sprite)
        ensureThumbnail,
        thumbnailDataUrl
    };
})();
