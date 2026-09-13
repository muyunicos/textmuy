# contracts/bridge-contract.md — Consumidor del motor (modulo, 002)

Puente postMessage `{type:'textmuy-bridge', bridge:{motorUrl, nonces{motor},
bases{presetsBase,fuentesBase,imagenesBase}, miniaturas}}` en los 3 momentos
(Const. III). El modulo NO conhece handlers: solo `motorUrl` + `op`.

## Cliente de operaciones (nuevo `js/motor.js` sugerido, o metodos en
`PresetManager`)

Toda operacion = `POST motorUrl` con `_wpnonce` + `op` + payload:

| operacion del modulo | op + payload | retorno esperado |
|---|---|---|
| listar galeria (fonts/img/presets) | `op=listar&scope=...` | `{catalogo, items}` |
| subir imagen/fuente | `op=alta&scope=...` + archivo | `{id, nombre, url}` |
| borrar imagen/fuente/preset | `op=baja&scope=...&nombre` | `{id}` |
| renombrar/mover categoria | `op=editar&scope=...` | `{id, nombre, url}` |
| persistir sprite (ThumbEngine) | `op=sprite&scope=...` + webp | `{spriteUrl}` |
| miniatura de grupo PDF (admin.js) | `op=miniatura&nombre=...` + webp | `{url}` |

## Reglas del modulo

- Sin puente: estado de error claro (bloque del editor); cero fetches a rutas
  locales, cero data-URL, cero descarga de `.txm` (Const. III/VIII).
- Bases SOLO para LEER fisicos/catalogo; escrituras SOLO por `motorUrl`.
- Refs de imagen por id numerico (heredado de 001): la URL se resuelve via
  `urlDeImgRef`/`prepareImgRefs` contra `bases.imagenesBase`.
- Cache-bust: `?v=RCn` en `index.html`/`render-core.html` (RC27 → RC28).

## Purga asociada (misma entrega)

- `js/preset-manager.js`: `descargarTxm`, `legacyLocalPresets`,
  `migrateLegacyPresets`, base `'presets/'` de fallback.
- `js/controls.js`: `usarLocalEmbebida`.
- `js/fonts.js`/`js/api.js`/`js/galeria.js`: bases `'fonts/'`, `'presets/'`,
  `'img/'` de fallback.
- `js/catalog.js`: `parseCats` sin split de separadores (va a `invalid`).
- Scopes: el modulo envia `img|fonts|presets` (sin aliases).