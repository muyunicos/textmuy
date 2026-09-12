/* ===== PRESET MANAGER - presets .txm (miniaturas por spritesheet global) =====
 *
 * Desde 3.2.0 el almacenamiento unico de presets son ARCHIVOS:
 *   {nombre}.txm  -> delta de settings (formato textmuy-project v1)
 *
 * Las miniaturas viven en el sprite del ambito presets gestionado por
 * ThumbEngine.ensureSprite({scope:'presets'}); el plugin lo persiste via
 * guardarSprite (thumbs/{scope}.webp + {scope}.json). NO se generan .webp
 * sueltos junto al .txm (ahorran inodes y se sirven en una sola peticion).
 *
 * Desde 4.0.0 del plugin, dentro de WordPress los archivos viven en
 * uploads/personalizador-pdf/textmuy/presets/ y la base URL de LECTURA
 * llega por el puente (bridge.urls.presetsBase). Sin puente (standalone)
 * se leen de presets/ relativo al modulo.
 *
 * Dentro del plugin (iframe de "Estilos de Texto") el guardado/borrado y la
 * subida de imagenes van por el puente PHP (admin-post). Sin puente (uso
 * standalone) "guardar" descarga el .txm y las imagenes se siguen embebiendo
 * como data-URL.
 * Las claves localStorage de versiones anteriores son SOLO LECTURA: la galeria
 * ofrece migrarlas al servidor una unica vez (migrateLegacyPresets).
 */
(function() {
    'use strict';

    // ===== PUENTE CON PERSONALIZADOR PDF (postMessage same-origin) =====
    // La pagina del admin envia {type:'textmuy-bridge', bridge:{urls,nonces,presets,imagenes}}
    // cuando el iframe carga. Sin puente: bridge queda null (modo standalone).
    let bridge = null;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('message', function (ev) {
            if (!ev || !ev.data || ev.data.type !== 'textmuy-bridge') return;
            if (ev.source !== window.parent && ev.source !== window) return;
            if (ev.data.bridge && typeof ev.data.bridge === 'object') {
                bridge = ev.data.bridge;

                // Configurar ThumbEngine y cargar su script si no esta cargado
                function configureThumbEngine() {
                    if (window.ThumbEngine && bridge.urls && bridge.urls.guardarSprite) {
                        window.ThumbEngine.configure({
                            endpoint: bridge.urls.guardarSprite,
                            nonce: bridge.nonces && bridge.nonces.guardarSprite
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

    // Sin datos de fabrica versionados en el modulo (v4.1): el listado de presets
    // vive en uploads/.../textmuy/presets/ y llega por el puente. Sin puente
    // (standalone sin datos) la lista queda vacia: no hay nombres "fantasma".
    function listPresets() {
        if (bridge && Array.isArray(bridge.presets) && bridge.presets.length) {
            return bridge.presets.slice();
        }
        return [];
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

    function descargarTxm(safe, blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safe + '.txm';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }

    /**
     * Guarda el settings actual como par {nombre}.txm + {nombre}.webp.
     * Con puente: al servidor (disponible en todos los navegadores).
     * Sin puente: descarga el .txm (el usuario lo coloca en presets/).
     * Devuelve {name, mode:'server'|'download'}.
     */
    async function savePreset(name, settings) {
        const safe = sanitizeName(name || (settings && settings.text) || 'preset');
        const payload = {
            format: PROJECT_FORMAT,
            version: PROJECT_VERSION,
            name: safe,
            settings: diffSettings(getDefaults(), settings) || {}
        };
        const txmBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        if (!bridgeAvailable()) {
            descargarTxm(safe, txmBlob);
            return { name: safe, mode: 'download' };
        }
        const fd = new FormData();
        fd.append('nombre', safe);
        fd.append('txm', txmBlob, safe + '.txm');
        fd.append('_wpnonce', bridge.nonces.guardarPreset);
        const resp = await fetch(bridge.urls.guardarPreset, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo guardar el preset en el servidor.'));
        }
        // Mantener el listado local al dia (sin recargar la pagina).
        if (Array.isArray(bridge.presets) && bridge.presets.indexOf(safe) === -1) {
            bridge.presets.push(safe);
            bridge.presets.sort();
        }
        thumbnailCache.delete(safe);
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('presets'); } catch (_) {}
        }
        return { name: safe, mode: 'server' };
    }

    async function deletePreset(name) {
        if (!bridgeAvailable()) {
            throw new Error('Borrar presets del servidor solo esta disponible dentro del plugin.');
        }
        const safe = sanitizeName(name);
        const fd = new FormData();
        fd.append('nombre', safe);
        fd.append('_wpnonce', bridge.nonces.borrarPreset);
        const resp = await fetch(bridge.urls.borrarPreset, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo borrar el preset del servidor.'));
        }
        if (Array.isArray(bridge.presets)) {
            bridge.presets = bridge.presets.filter(function (n) { return n !== safe; });
        }
        thumbnailCache.delete(safe);
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('presets'); } catch (_) {}
        }
        return true;
    }

    // ===== IMAGENES SUBIDAS (modules/textmuy/imagenes/{fondos,iconos,varios}) =====
    const CATEGORIAS_IMAGENES = ['fondos', 'iconos', 'varios'];

    /**
     * Sube una imagen al servidor. opciones: {categoria, nombre, sobrescribir}
     * (nombre + sobrescribir se usan para guardar una EDICION sobre el archivo).
     * Devuelve {nombre, categoria, url} (url con cache-bust ?v=mtime).
     */
    async function uploadImage(file, opciones) {
        opciones = opciones || {};
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes solo esta disponible dentro del plugin.');
        }
        const categoria = (opciones.categoria && CATEGORIAS_IMAGENES.indexOf(opciones.categoria) !== -1)
            ? opciones.categoria
            : 'varios';
        const fd = new FormData();
        fd.append('imagen', file, (file && file.name) || opciones.nombre || 'imagen.png');
        fd.append('categoria', categoria);
        if (opciones.nombre) { fd.append('nombre', opciones.nombre); }
        if (opciones.sobrescribir) { fd.append('sobrescribir', '1'); }
        fd.append('_wpnonce', bridge.nonces.subirImagen);
        const resp = await fetch(bridge.urls.subirImagen, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo subir la imagen.'));
        }
        const item = datos.data;
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return !(im.nombre === item.nombre && (im.categoria || 'varios') === item.categoria);
            });
            bridge.imagenes.push(item);
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('imagenes'); } catch (_) {}
        }
        return item;
    }

    /** Borra una imagen del servidor. item: {nombre, categoria}. */
    async function deleteImage(item) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes solo esta disponible dentro del plugin.');
        }
        const fd = new FormData();
        fd.append('nombre', item.nombre || item.slug);
        fd.append('categoria', item.categoria || 'varios');
        fd.append('_wpnonce', bridge.nonces.borrarImagen);
        const resp = await fetch(bridge.urls.borrarImagen, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo borrar la imagen.'));
        }
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return !(im.nombre === item.nombre && (im.categoria || 'varios') === (item.categoria || 'varios'));
            });
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('imagenes'); } catch (_) {}
        }
        return true;
    }

    /** Renombra y/o mueve de categoria. Devuelve el item actualizado. */
    async function moverImagen(item, nombreNuevo, categoriaNueva) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de imagenes solo esta disponible dentro del plugin.');
        }
        const fd = new FormData();
        fd.append('nombre', item.nombre || item.slug);
        fd.append('categoria', item.categoria || 'varios');
        fd.append('nombreNuevo', nombreNuevo);
        fd.append('categoriaNueva', categoriaNueva || 'varios');
        fd.append('_wpnonce', bridge.nonces.cambiarImagen);
        const resp = await fetch(bridge.urls.cambiarImagen, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo renombrar la imagen.'));
        }
        const itemNuevo = datos.data;
        if (Array.isArray(bridge.imagenes)) {
            bridge.imagenes = bridge.imagenes.filter(function (im) {
                return !(im.nombre === item.nombre && (im.categoria || 'varios') === (item.categoria || 'varios'));
            });
            bridge.imagenes.push(itemNuevo);
        }
        if (window.ThumbEngine && window.ThumbEngine.invalidate) {
            try { window.ThumbEngine.invalidate('imagenes'); } catch (_) {}
        }
        return itemNuevo;
    }

    /** Listado de imagenes del servidor; con categoria, solo esa categoria. */
    function listImages(categoria) {
        const todas = (bridge && Array.isArray(bridge.imagenes)) ? bridge.imagenes.slice() : [];
        if (categoria && CATEGORIAS_IMAGENES.indexOf(categoria) !== -1) {
            return todas.filter(function (im) { return (im.categoria || 'varios') === categoria; });
        }
        return todas;
    }

    // ===== FUENTES FISICAS (uploads/.../textmuy/fonts/) =====
    // El plugin escanea la carpeta y manda bridge.fuentes [{nombre, titulo,
    // url, categoria?}]. Renombrar/cambiar categoria = moverFuente (el
    // servidor renombra el TTF y/o actualiza su categoria). Sin puente no hay
    // CRUD fisico (standalone = solo lectura del catalogo + uploads locales).
    /** Renombra y/o mueve de categoria una fuente. Devuelve el item actualizado. */
    async function moverFuente(item, nombreNuevo, categoriaNueva) {
        if (!bridgeAvailable()) {
            throw new Error('El directorio de fuentes solo esta disponible dentro del plugin.');
        }
        if (!bridge.urls.cambiarFuente) {
            throw new Error('El plugin no expone cambiarFuente.');
        }
        const fd = new FormData();
        fd.append('nombre', item.serverFile || item.nombre || item.slug);
        fd.append('nombreNuevo', nombreNuevo);
        fd.append('categoriaNueva', categoriaNueva || 'custom');
        fd.append('_wpnonce', bridge.nonces.cambiarFuente);
        const resp = await fetch(bridge.urls.cambiarFuente, {
            method: 'POST', body: fd, credentials: 'same-origin'
        });
        const datos = await leerJson(resp);
        if (!resp.ok || !datos || !datos.success) {
            throw new Error(mensajePuente(datos, resp, 'No se pudo renombrar la fuente.'));
        }
        const itemNuevo = datos.data;
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
            try { window.ThumbEngine.invalidate('fuentes'); } catch (_) {}
        }
        return itemNuevo;
    }

    // ===== LISTADO =====
    function bridgeAvailable() {
        return !!(bridge && bridge.urls && bridge.urls.guardarPreset && bridge.nonces);
    }

    /**
     * Base URL para LEER presets ({nombre}.txm / {nombre}.webp).
     * Con puente: uploads/.../textmuy/presets/ (plugin >= 4.0.0).
     * Standalone: presets/ relativo al modulo.
     * Siempre termina en barra.
     */
    function presetUrlBase() {
        const base = (bridge && bridge.urls && bridge.urls.presetsBase)
            ? bridge.urls.presetsBase
            : 'presets/';
        return base.slice(-1) === '/' ? base : base + '/';
    }

    // ===== CARGA =====
    // Devuelve {kind:'txm'|'raw', data}. 'raw' es el formato TextStudio crudo de
    // los presets .json legacy (compat de carga, ya no se generan).
    async function fetchPreset(name) {
        const safe = sanitizeName(name);
        const base = presetUrlBase();
        const response = await fetch(base + encodeURIComponent(safe) + '.txm');
        if (response.ok) {
            const payload = await response.json();
            if (!payload || payload.format !== PROJECT_FORMAT || typeof payload.settings !== 'object' || payload.settings === null) {
                throw new Error('Unsupported preset format: ' + safe);
            }
            return { kind: 'txm', data: payload };
        }
        const legacy = await fetch(base + encodeURIComponent(safe) + '.json');
        if (legacy.ok) {
            return { kind: 'raw', data: await legacy.json() };
        }
        throw new Error('Preset not found: ' + safe);
    }

    async function loadPreset(name) {
        try {
            const entry = await fetchPreset(name);
            const settings = entry.kind === 'txm' ? settingsFromDelta(entry.data.settings) : entry.data;
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
            const resp = await fetch(url, { method: 'HEAD' });
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

    // ===== MIGRACION LEGACY (localStorage -> servidor, una unica vez) =====
    // Claves legacy de versiones anteriores (solo lectura, para migrar una unica vez).
    const LEGACY_STORAGE_KEY = 'textmuy_presets';
    const LEGACY_IMPORTED_KEY = 'textstudio_presets';

    /** Presets de versiones anteriores guardados en localStorage (solo lectura). */
    function legacyLocalPresets() {
        const out = [];
        try {
            const loc = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
            Object.keys(loc).forEach(function (n) {
                out.push({ name: n, kind: 'settings', data: loc[n] });
            });
            const imp = JSON.parse(localStorage.getItem(LEGACY_IMPORTED_KEY) || '{}');
            Object.keys(imp).forEach(function (n) {
                if (!out.some(function (p) { return p.name === n; })) {
                    out.push({ name: n, kind: 'raw', data: imp[n].preset || imp[n] });
                }
            });
        } catch (_) { /* storage is optional */ }
        return out;
    }

    /** Sube los presets legacy de este navegador al servidor y limpia las claves. */
    async function migrateLegacyPresets() {
        const viejos = legacyLocalPresets();
        if (!viejos.length || !bridgeAvailable()) return [];
        const subidos = [];
        for (let i = 0; i < viejos.length; i++) {
            const p = viejos[i];
            try {
                let settings = p.data;
                if (p.kind === 'raw' && window.TextEditor && window.TextEditor.createDefaultSettings && window.TextEditor.loadPreset) {
                    settings = window.TextEditor.createDefaultSettings();
                    window.TextEditor.loadPreset(p.data, settings);
                }
                if (settings && typeof settings === 'object') {
                    delete settings.category;
                    delete settings.timestamp;
                }
                await savePreset(p.name, settings);
                subidos.push(sanitizeName(p.name));
            } catch (e) {
                console.warn('No se pudo migrar el preset local', p.name, e);
            }
        }
        if (subidos.length) {
            try {
                localStorage.removeItem(LEGACY_STORAGE_KEY);
                localStorage.removeItem(LEGACY_IMPORTED_KEY);
            } catch (_) { /* storage is optional */ }
        }
        return subidos;
    }

    // Expose API
    window.PresetManager = {
        // Listado y carga (archivos .txm de presets/)
        listPresets,
        listImages,
        loadPreset,
        fetchPreset,
        presetUrlBase,
        settingsFromDelta,
        diffSettings,
        applyDelta,
        // Puente (guardar/borrar en el servidor, o descargar .txm standalone)
        savePreset,
        deletePreset,
        bridgeAvailable,
        getBridge: function () { return bridge; },
        // Imagenes subidas (modules/textmuy/imagenes/{fondos,iconos,varios})
        CATEGORIAS_IMAGENES,
        uploadImage,
        deleteImage,
        moverImagen,
        // Fuentes fisicas (uploads/.../textmuy/fonts/, escaneo del plugin)
        moverFuente,
        // Miniaturas de galeria (spritesheet global thumbs/{scope}.webp o render lazy)
        ensureThumbnail,
        thumbnailDataUrl,
        // Migracion unica de presets legacy (localStorage de versiones previas)
        legacyLocalPresets,
        migrateLegacyPresets
    };
})();
