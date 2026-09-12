# Implementation Plan: Formato Unico de Recursos uploads/tm

**Branch**: `001-unified-resource-format` | **Date**: 2026-09-11 | **Spec**: `here/specs/001-unified-resource-format/spec.md`

**Input**: Feature specification de `spec.md` (Opcion A: id numerico puro con ruptura total; stories P1/P2/P2; FR-001..FR-012; SC-001..SC-004).

**Nota de ruta (Q5)**: `C:\Users\Jonatan\Documents\GitHub\personalizador-pdf\uploads\tm` es el espejo local de dev de **`wp-content/uploads/tm/` en WordPress** (ubicacion unica definitiva desde 2026-09-12; ruta historica `wp-content/uploads/personalizador-pdf/textmuy/` abandonada, sin migracion). Este plan define formato + parsers + galerias + tests en este repo; la escritura de datos la ejecuta el plugin hermano. En implementacion se permite leer/escribir fixtures en `../uploads/tm/` (datos de prueba, no codigo del modulo).

## Summary

Unificar los 3 ambitos (`fonts`, `img`, `presets` bajo `uploads/tm/`) en un unico JSON por ambito `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` con `id` numerico denso desde 1 = posicion de tile en el sprite fusionado (`tile=id-1`), `cats` string editable (default `custom`), `file` con extension = fisico / sin extension = Google (solo `fonts`) / vacio = **tombstone libre** `[id,"","",""]` (Q2: sin lista `free[]`). Los `.txm` referencian por id numerico (`settings.font.src` numerico, Q4: rechazo puro sin fallback). Parser de una sola forma con 3 clases (`ok`/`free`/`invalid`): galeria salta `invalid` con `console.warn` + contador visible, `renderBatch` rechaza con causa `ambito:id:motivo` (Q1). Sprite fusionado sin manifiesto por tile (Q3).

## Technical Context

**Language/Version**: Vanilla JS (IIFE ES5 + `let/const/async` puntual), sin build ni framework. Node 18+ SOLO para testing y `node --check`.

**Primary Dependencies**: Cero frameworks. Vendors `js/utils/*.min.js` NO editables. `ThumbEngine` lo inyecta el plugin via `bridge.urls.miniaturas` + `guardarSprite`; `render-core.html` carga `fonts + distort + bevel + specular + editor + preset-manager + export + api` en paridad con el editor.

**Storage**: `uploads/tm/{fonts,img,presets}/` (espejo `../uploads/tm/`, canonico WP `wp-content/uploads/tm/`). Un JSON por ambito + un sprite `.webp` por ambito. Escritura SOLO via puente postMessage; standalone = harness dev sin garantias (Const. I).

**Testing**: `node tests/*.test.js` (hoy 8 suites; esta feature agrega `catalog-unified.test.js` y extiende `fonts-catalog.test.js`) + `node --check` de tocados. Integrado primero, standalone segundo.

**Target Platform**: Navegador moderno con Canvas 2D + WebGL. WebGL ASUMIDO; sin WebGL la API MUST fallar (Const. II). `file://` limita fetch (HEAD previo para fisicos).

**Project Type**: `web-app` client-side (`index.html`) + headless (`render-core.html`). Single project: `js/`, `css/style.css`, 2 HTML, `tests/`.

**Performance Goals**: SC-001 (<30s encontrar/aplicar). 1 peticion por sprite. Render con carga modular solo-dependencias (`preloadAll` PROHIBIDO); cache por id.

**Constraints**: Todo cambio JS MUST subir `?v=RCn` en ambos HTML (hoy RC23 -> RC24). UI espanol, codigo sin tildes. `settings.canvas.width/height` unica fuente de verdad. Tiles: fonts 180x30, presets 200x100, imagenes 100x100; posicion derivada de `id-1`. Sin `localStorage` para recursos. Sin lectores legacy.

**Scale/Scope**: 3 ambitos (hoy: 57 fuentes, ~150 imagenes, 10 presets). A tocar: `js/fonts.js`, `js/preset-manager.js`, `js/api.js`, `js/galeria.js`, `js/fuentes-galeria.js`, `js/editor.js` (resolve numerico), `tests/`, fixtures en `../uploads/tm/`.


## Constitution Check

*GATE pre-Phase 0: PASS con 2 divergencias resueltas por el usuario. Re-chequeo post-Phase 1 al final.*

- **I. Editor como medio, API como fin**: PASS. Sin paneles nuevos, sin tocar All/L1-L3; solo cambia la fuente de datos de las galerias.
- **II. API de Render (NON-NEGOTIABLE)**: PASS. `renderBatch` rechaza con causa `ambito:id:motivo`; sin parciales ni sustituciones. Paridad `render-core.html`.
- **III. Integrado WP primero**: PASS. Ruta `uploads/tm/{fonts,img,presets}` (= `wp-content/uploads/tm`); puente extendido a 3 ambitos.
- **IV. Preset Delta + Catalogos Unicos**: PASS CONDICIONADO -> RESUELTO por Q2+Q3: `{thumbs:{w,h,c},items}` + tombstone en vez de `free[]` (requiere enmienda menor de Const. v2.0.0 con Sync Impact Report en la PR). Parser de una sola forma con 3 clases.
- **V. 100% Libre y alcance cerrado**: PASS. Sin premium/ANIMATION; export PNG+SVG; una galeria de presets y una de imagenes.
- **VI. Firmeza fail-fast y calidad**: PASS con matiz Q1: `invalid` en galeria = salto + warn + contador (higiene de listado); en render = rechazo duro. Carga modular, Google lazy, cero fuentes al abrir, suites + node --check.

**Re-chequeo post-Phase 1 (2026-09-11)**: el diseno mantiene los 6 principios. Accion pendiente: enmienda menor de Const. IV (`free[]` -> tombstone). Sin violaciones -> Complexity Tracking vacio.

## Project Structure

### Documentation (this feature)

```text
here/specs/001-unified-resource-format/
├── spec.md / plan.md / research.md / data-model.md / quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── catalog-schema.json / sprite-layout.md / txm-numeric-refs.md
    └── bridge-contract.md / errors.md
```

### Source Code (repository root)

```text
textmuy/ (single project, vanilla JS plano)
├── index.html / render-core.html (subir ?v=RC24 en implementacion)
├── css/style.css (sin cambios) / js/effects/ (sin cambios)
├── js/fonts.js (parser numerico + 3 clases + lookup por id)
├── js/preset-manager.js (3 ambitos + settingsFromDelta src numerico)
├── js/api.js (loadPresetById cache + ensureFontReady + error con causa)
├── js/galeria.js + js/fuentes-galeria.js (items + sprite derivado + warn+contador)
├── js/editor.js (resolve numerico) / js/export.js (sin cambios)
└── tests/ (NUEVO catalog-unified.test.js; EXTENDER fonts-catalog + preset-*)
```

**Structure Decision**: Single project (default). Datos fuera del repo (`../uploads/tm/` espejo de `wp-content/uploads/tm/`).

## Complexity Tracking

> Vacio: sin violaciones injustificadas. Divergencias decididas por el usuario y documentadas en `research.md`; enmienda menor de Const. IV por governance normal.
