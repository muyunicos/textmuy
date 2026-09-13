/* ===== TEXTMUY MOTOR - cliente unificado del motor de galerias (Const. VII) =====
 * Toda operacion con el servidor via action=tm_galeria con op=... (endpoint
 * unico; sin handlers sueltos, sin fallbacks). El puente expone
 * bridge.urls.motorUrl + bridge.nonces.motor.
 * Respuestas: wp_send_json_{success|error} -> {success, data}. Los errores
 * del motor ya traen causa motor:<op>:<motivo> (Const. VI).
 */
(function() {
'use strict';
var bridge = null;
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('message', function (ev) {
        if (!ev || !ev.data || ev.data.type !== 'textmuy-bridge') return;
        if (ev.source !== window.parent && ev.source !== window) return;
        if (ev.data.bridge && typeof ev.data.bridge === 'object') bridge = ev.data.bridge;
    });
}
function motorOK() {
    return !!(bridge && bridge.urls && bridge.urls.motorUrl && bridge.nonces && bridge.nonces.motor);
}
function mensajeMotor(datos, resp, porDefecto) {
    if (datos && datos.data) return String(datos.data);
    if (resp && (resp.status === 403 || resp.status === 400)) {
        return porDefecto + ' Recarga la pagina (la sesion pudo expirar) y reintenta.';
    }
    return porDefecto;
}
function leerJson(resp) {
    try { return resp.json().catch(function () { return null; }); }
    catch (_) { return Promise.resolve(null); }
}
async function op(op, fd) {
    if (!motorOK()) throw new Error('El motor de galerias solo esta disponible dentro del plugin.');
    fd = fd || new FormData();
    fd.append('op', op);
    fd.append('_wpnonce', bridge.nonces.motor);
    const resp = await fetch(bridge.urls.motorUrl, { method: 'POST', body: fd, credentials: 'same-origin' });
    const datos = await leerJson(resp);
    if (!resp.ok || !datos || !datos.success) {
        throw new Error(mensajeMotor(datos, resp, 'La operacion del motor fallo.'));
    }
    return datos.data;
}
async function listar(scope) {
    var fd = new FormData();
    if (scope) fd.append('scope', scope);
    return op('listar', fd);
}
async function alta(scope, archivo, campos) {
    campos = campos || {};
    var fd = new FormData();
    fd.append('scope', scope);
    fd.append('archivo', archivo, campos.nombreArchivo || (archivo && archivo.name) || 'archivo');
    ['nombre', 'titulo', 'categoria', 'sobrescribir'].forEach(function (k) {
        if (campos[k] !== undefined) fd.append(k, campos[k]);
    });
    return op('alta', fd);
}
async function baja(scope, nombre) {
    var fd = new FormData();
    fd.append('scope', scope);
    fd.append('nombre', nombre || '');
    return op('baja', fd);
}
async function editar(scope, payload) {
    payload = payload || {};
    var fd = new FormData();
    fd.append('scope', scope);
    ['nombre', 'nombreNuevo', 'categoriaNueva'].forEach(function (k) {
        if (payload[k] !== undefined) fd.append(k, payload[k]);
    });
    return op('editar', fd);
}
async function sprite(scope, blob) {
    var fd = new FormData();
    fd.append('scope', scope);
    fd.append('archivo', blob, 'thumbs.webp');
    return op('sprite', fd);
}
async function miniatura(nombre, blob) {
    var fd = new FormData();
    fd.append('nombre', nombre || '');
    fd.append('archivo', blob, (nombre || 'thumb') + '.webp');
    return op('miniatura', fd);
}
window.TMMotor = {
    motorOK: motorOK,
    listar: listar,
    alta: alta,
    baja: baja,
    editar: editar,
    sprite: sprite,
    miniatura: miniatura
};
})();
