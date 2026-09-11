# quickstart.md — Validacion end-to-end (Formato Unico)

Guia runnable (sin codigo de implementacion; los cuerpos van en `tasks.md`/implementacion). Prerrequisitos: rama `001-unified-resource-format`, Node 18+, datos espejo en `../uploads/tm/` (= `wp-content/uploads/tm/` en WP).

## 1. Parsers (Node, sin navegador)

```bash
node tests/catalog-unified.test.js
node tests/fonts-catalog.test.js
node tests/img-refs.test.js
node tests/preset-cache.test.js tests/preset-delta.test.js tests/preset-load.test.js
node --check js/fonts.js js/preset-manager.js js/api.js js/galeria.js js/fuentes-galeria.js
```

Esperado: 3 clases `ok/free/invalid` con causas `ambito:id:motivo`; `tile=id-1` para 180x30/200x100/100x100; tombstone `[id,"","",""]` reutilizado en altas; `font.src` string rechazado (ver `contracts/errors.md` y `contracts/catalog-schema.json`).

## 2. Galerias (integrado primero)

Abrir la pestana Estilos de Texto del plugin con catalogos migrados (fixtures `fonts.json`/`img.json`/`presets.json` + sprites). Verificar SC-001..SC-004: titulo+cats+miniatura por item (detalle en `data-model.md`); busqueda y tabs; elegir fisica (HEAD ok) y Google (lazy `<link>`); contador de `invalid`/`libres` visible si hay; `console.warn` con causa por invalida.

- U4 (zero-404): las miniaturas de fisicos deben cargar sin 404 (`onerror` de `<img>`); un `file` inexistente de `img` se omite con warn, nunca 404 visible.
- A1 (SC-001): smoke de timing — de abrir la galeria a aplicar un recurso debe tardar <30s; si supera el limite, revisar carga del catalogo/sprite.

## 3. Render (headless + editor)

Cargar `.txm` numerico (ej. `font.src: 12`) y verificar fuente/imagenes correctas al primer intento, tamano exacto `settings.canvas.width/height`, `renderBatch` con 1 id invalido → rechazo `presets:<id>:...` sin parciales (contrato en `contracts/txm-numeric-refs.md`, puente en `contracts/bridge-contract.md`). Standalone despues como harness (listas vacias si no hay fixtures).
