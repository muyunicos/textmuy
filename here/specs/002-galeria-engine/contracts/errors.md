# contracts/errors.md — Causas del motor (002)

Formato: `motor:<op>:<motivo>` (Const. VI: rechazo con causa, sin fallbacks).
El cliente muestra el mensaje accionable y nada se sustituye.

| Causa | Situacion | Accion esperada |
|---|---|---|
| `motor:op:desconocida` | `op` fuera de la whitelist | nunca deberia ocurrir (cliente correcto) |
| `motor:scope:invalido` | scope fuera de `{fonts,img,presets}` | idem |
| `motor:nonce:expirado` | nonce invalido/expire | recargar pagina y reintentar |
| `motor:archivo:no_recibido` | upload ausente/error | reintentar |
| `motor:archivo:tamano` | supera limite (sprite 4 MB, miniatura 500 KB, fuente 10 MB, imagen 4 MB) | reducir archivo |
| `motor:archivo:formato` | extension/magic bytes invalidos | usar formato soportado |
| `motor:directorio:no_escribible` | permisos de `uploads/tm/...` | revisar permisos del hosting |
| `motor:nombre:invalido` | nombre fuera de `[a-z0-9_-]` | corregir nombre |
| `motor:recurso:ausente` | id/file inexistente en baja/editar | refrescar galeria |
| `thumbs:endpoint:ausente` | modulo sin puente intenta persistir sprite | abrir desde el plugin |

## Rechazos heredados de 001 (sin cambios)

| Causa | Situacion |
|---|---|
| `ambito:id:motivo` | entrada `invalid` del catalogo (galeria: warn+contador; render: rechazo) |
| `presets:<name>:font.src string (legacy)` | `.txm` viejo → re-guardar desde el editor |
| `img:<id>:ausente o invalido` | ref de imagen inexistente en render |

## Sin-puente (Const. III)

El editor MUST mostrar un estado de error claro ("abrir desde el plugin,
pestana Estilos de Texto") y NO disparar ninguna operacion. Prohibida la
degradacion silenciosa.