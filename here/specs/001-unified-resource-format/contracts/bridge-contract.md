# bridge-contract.md — Puente extendido a 3 ambitos

Puente postMessage `{type:'textmuy-bridge', bridge:{...}}` en los 3 momentos (load iframe, `textmuy-ready`, inmediato). Rutas fisicas canonicas WP: `wp-content/uploads/tm/{fonts,img,presets}/` (espejo dev `../uploads/tm/`).

## bridge.urls (lectura + handlers)

| clave | uso |
|---|---|
| `fuentesBase` | leer `fonts/fonts.json` + fisicos (existente; `tm/fonts/`) |
| `imagenesBase` | leer `img/img.json` + fisicos (unificado en `tm/img/`, sin `imagenes/`; fisicos `.svg/.webp/.png/.avif/.jpg/.jpeg/.gif`) |
| `presetsBase` | leer `presets/presets.json` + `.txm` (existente; `tm/presets/`) |
| `guardarSprite` (+ nonce `guardarSprite`) | regenerar `sprite.webp` fijo del ambito tras alta/baja/Save; scope `img`/`fonts`/`presets` (aliases `imagenes`→`img`, `fuentes`→`fonts`) |
| `miniaturas` | URL del script `ThumbEngine` (existente) |
| `guardarPreset/borrarPreset` (+ nonces) | CRUD `.txm` + entrada en `presets.json` (existentes) |
| `subirFuente/borrarFuente/cambiarFuente` (+ nonces, patron `moverFuente`) | CRUD fisico + tupla en `fonts.json` (reutilizar patron actual; el plugin ya escribe tuplas) |
| `subirImagen/borrarImagen/moverImagen` (+ nonces) | CRUD fisico + tupla en `img.json` (`moverImagen` ya existe) |

## bridge listas (solo fisicos reales + catalogos)

- `fuentes`: `[{nombre,titulo,url}]` SOLO archivos fisicos reales (contrato ya vigente: el puente viejo que mezclaba Google queda prohibido).
- `imagenes`: fisica + categorias (formato actual `listImages`, a migrar a ids en implementacion).
- `presets`: nombres (a migrar a ids via `presets.json` en implementacion).
- Sin puente (standalone): listas vacias, lectura de fixtures locales si existen, cero escrituras (harness dev).
