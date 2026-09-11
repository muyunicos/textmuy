# AGENTS.md — Contexto del módulo TextMuy

> este archivo debe leerse COMPLETO antes de editar, buscar o
> responder sobre este repositorio. Contiene el objetivo, la arquitectura, las reglas
> técnicas críticas, las decisiones de diseño ya tomadas y las dificultades del entorno.
> Si algo no está aquí, **preguntá al usuario**; no lo inventes.

---

## Índice

- [0. Resumen en una frase](#0-resumen-en-una-frase)
- [1. Objetivo y visión del sistema](#1-objetivo-y-vision-del-sistema)
- [2. Arquitectura y mapa de archivos](#2-arquitectura-y-mapa-de-archivos)
- [3. Flujo de trabajo](#3-flujo-de-trabajo)
- [4. Reglas técnicas críticas](#4-reglas-tecnicas-criticas)
- [5. Formatos y convenciones de nombres](#5-formatos-y-convenciones-de-nombres)
- [6. Responsabilidades por archivo JS](#6-responsabilidades-por-archivo-js)
- [7. Decisiones de diseño ya tomadas](#7-decisiones-de-diseno-ya-tomadas)
- [8. Dificultades del entorno](#8-dificultades-del-entorno)
- [9. Cómo probar](#9-como-probar)
- [10. Reglas para la IA al editar](#10-reglas-para-la-ia-al-editar)

---

## 0. Resumen en una frase

TextMuy es un **editor de estilos de texto client-side** al estilo TextStudio
(Canvas 2D + WebGL), que funciona **standalone** (abriendo
`index.html` o servido estático) e **integrado** en el plugin WordPress "Personalizador
PDF" (iframe same-origin + puente postMessage), y expone una **API de render** que convierte
texto + preset en un **PNG transparente** del tamaño exacto.

## 1. Objetivo y visión del sistema

- **Dos modos de uso**:
  1. **Editor visual**: interfaz tipo TextStudio para crear/editar estilos de texto,
     importar presets y gestionar una biblioteca guardada.
  2. **API client-side**: `TextMuyAPI.renderTextToPNG` / `renderBatch` reciben texto +
     preset (+ overrides opcionales) y devuelven un PNG transparente del tamaño
     especificado. Es una función JS, no un servidor.
- **Lo que SÍ queremos**: editor con la mayoría de funciones de TextStudio (menos
  ANIMATION), importador de presets desde textstudio.com, CRUD de presets, gestión de
  fuentes, canvas definido por el usuario con auto-ajuste del texto,
  exportación PNG y SVG.
- **Lo que NO queremos**: en comparación con TextStudio, no usaremos sección ANIMATION, export
  a formatos distintos de PNG y SVG, tiers de calidad (LITE/PRO/ULTRA),
  restricciones premium. **LA APP ES 100% LIBRE: no existirá concepto premium.**
- **Integración con Personalizador PDF**: los grupos de un PDF pueden llevar "texto +
  estilo"; el plugin renderiza vía render-core en el navegador del admin. Ver el contrato
  en §4 (y el AGENTS.md del plugin, §2.1).

## 2. Arquitectura y mapa de archivos

```
textmuy/
├── AGENTS.md              <- ESTE archivo (contexto obligatorio)
├── index.html             <- Editor completo (UI; iframe del plugin o standalone)
├── render-core.html       <- Motor de render headless (~220 KB sin UI: fonts + effects +
│                             editor + export + api); iframe off-screen del plugin
├── css/                   <- style.css (unico CSS del modulo)
├── js/
│   ├── main.js            <- Bootstrap del editor
│   ├── catalog.js         <- Parser unico de catalogos (ok/free/invalid) + tile=id-1
│   ├── editor.js          <- Estado + render del canvas (fuente de verdad del settings)
│   ├── controls.js        <- Binding UI (TEXT/STYLES/ICON/BACKGROUND/DOWNLOAD)
│   ├── galeria.js         <- Galería unificada de imágenes (preview en vivo)
│   ├── fuentes-galeria.js <- Galería de fuentes (CRUD físico estilo galería)
│   ├── preset-manager.js  <- CRUD de presets + puente + formato .txm (settingsFromDelta)
│   ├── api.js             <- API pública: renderTextToPNG / renderBatch / loadPresetById /
│   │                         prepareImgRefs / cache presets y catálogos
│   ├── export.js          <- Exportación PNG transparente
│   ├── fonts.js           <- Carga de fuentes (Google Fonts + catálogo) y ensureFontReady
│   ├── gradient-picker.js <- Picker de gradientes de N colores
│   ├── effects/           <- bevel-webgl.js, specular-webgl.js, distort-engine.js
│   └── utils/             <- Vendors minificados (pickr, grapick, potrace, pica, gif-
│                             encoder, stackblur, sortable, toastify, svgo...). NO editar
└── tests/                 <- 10 tests Node (catalog-unified, fonts-catalog, img-refs,
                              preset-cache, preset-delta, preset-load, distort-engine,
                              flag-wave, pattern-block-box, controls-init)
```

## 3. Flujo de trabajo

1. **Editor** (`index.html`): pestañas TEXT / STYLES (3D & FILLING, OUTLINES, SHADOWS) /
   ICON / BACKGROUND / DOWNLOAD. `settings.canvas.width/height` es la única fuente de
   verdad del tamaño (los inputs de DOWNLOAD están sincronizados; Scale es multiplicador)
   y `autoFitText` ajusta el texto al lienzo. "Save as preset" vive en la galería.
2. **Galería de presets** (única UI de presets): buscar, guardar como preset, borrar.
3. **Galería de imágenes** (`js/galeria.js`): un solo "Galería" en los importadores
   (rellenos, fondos, texturas, iconos), con tabs (fondos/iconos/varios), buscador, subida
   (botón + drag&drop + pegar) y **preview en vivo** que se revierte si se cierra sin
   "Aplicar". Lee `img/img.json` numérico + sprite 100x100.
3.1. **Galería de fuentes** (`js/fuentes-galeria.js`): tabs dinámicas desde el catálogo
   (`fonts.json`) + sprite `fuentes` 180x30, upload TTF/OTF/WOFF/WOFF2, footer
   nombre+categoría+Save/Delete/Select.
3.2. **Catálogos únicos** (`js/catalog.js` + `TextMuyAPI.loadCatalogo`): un JSON por ámbito
   en `uploads/tm/{fonts,img,presets}/` (`fonts.json`, `img.json`, `presets.json`), ítems
   tupla `[id,title,cats,file]` con id numérico = tile `id-1` del sprite del ámbito.
4. **Importador TextStudio**: extrae el preset de una URL de textstudio.com
   (`window.__PRESET__` / JSON-LD) y lo guarda como `.txm` vía puente (y lo aplica local).
5. **Export** (pestaña DOWNLOAD): PNG transparente al tamaño del canvas (× Scale), archivo SVG (efectos básicos compatibles).
6. **Render headless**: `render-core.html` expone `TextMuyAPI.renderBatch(items)` para el
   plugin (iframe off-screen cargado solo cuando se usa; comparte el código del editor).

## 4. Reglas técnicas críticas (¡NO MODIFICAR SIN ENTENDERLAS!)

1. **Contrato de la API**: `TextMuyAPI.renderBatch(items, {onProgress}) -> [{id, blob}]`
   con items `{id, text, preset|settings, width, height, overrides?}`. Rechaza ante el
   primer fallo (NUNCA un lote parcial) y garantiza la fuente cargada (`ensureFontReady`)
   antes de renderizar. El plugin consume esto para los grupos de un PDF.
2. **Puente postMessage**: el plugin envía `{type:'textmuy-bridge', bridge:{urls, nonces,
   presets, imagenes}}` en 3 momentos (load del iframe, aviso `textmuy-ready` del módulo,
   inmediato). El módulo expone `bridgeAvailable()`. SIN puente (standalone): guardar
   descarga el `.txm`, las imágenes se embeben como data-URL y el listado usa `presets/`
   local.
3. **Base URL de presets**: `PresetManager.presetUrlBase()` — con puente devuelve
   `bridge.urls.presetsBase` (uploads/.../textmuy/presets/ del plugin); standalone
   devuelve `presets/` relativo al módulo. `fetchPreset`, `ensureThumbnail` y `api.js`
   DEBEN usarla (nunca hardcodear `'presets/'`).
4. **Formato `.txm`**: payload `{format:'textmuy-project', version:1, name, settings}`
   donde `settings` es el **DELTA** contra los defaults (`diffSettings` /
   `settingsFromDelta`). El `.json` legacy (TextStudio crudo) es SOLO de carga.
5. **Cache-bust `?v=RCn`**: al cambiar CUALQUIER JS del modulo, subir el numero en los
   `<script>` de `index.html` Y `render-core.html` (hoy **RC24**). El plugin detecta
   modulos viejos por el contrato y avisa con Ctrl+F5.
6. **Sin localStorage para presets**: el CRUD por localStorage se ELIMINÓ. Las claves
   `textmuy_presets`/`textstudio_presets` son SOLO LECTURA (migración única vía
   `migrateLegacyPresets` desde la galería).
7. **Escritura al servidor SOLO vía puente**: el módulo nunca toca el servidor sin puente
   (fetch a admin-post con nonce). Standalone = 100% client-side, cero escrituras.
8. **Catálogo único por ámbito (v5.0)**: `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}`
   en `uploads/tm/{fonts,img,presets}/` (espejo dev `../uploads/tm/` = `wp-content/uploads/tm/`
   en WP). Parser compartido `js/catalog.js` (clases `ok`/`free`/`invalid` con causa):
   `invalid` en GALERÍA = salto + `console.warn` + contador visible; en RENDER = rechazo
   `ambito:id:motivo`. Sprite fusionado por ámbito (fonts 180x30, img 100x100,
   presets 200x100), tile derivado `id-1`, cero manifiestos por tile.
9. **Refs numéricas en `.txm`**: `settings.font.src` e imágenes de settings referencian
   recursos por id del catálogo; cualquier string legacy = rechazo "re-guardar el preset
   desde el editor" (sin migración bajo demanda). `api.js::prepareImgRefs` resuelve los ids
   de imagen → URL (fail-fast en render; base `imagenesBase` o `img/` standalone).

## 5. Formatos y convenciones de nombres (NO CAMBIAR)

- Preset: `{nombre}.txm` (JSON `textmuy-project` v1). Miniatura en el sprite
  `presets.webp` 200x100 (los `.webp` sueltos quedaron deprecados; limpieza física
  pendiente del plugin).
- Nombres sanitizados: `[a-z0-9_-]` (`sanitizeName`).
- `settings.canvas.width/height`: única fuente de verdad del tamaño de render.
- **Todos los datos de usuario (presets, imágenes, fuentes) viven en
  `wp-content/uploads/tm/`** (espejo local de dev: `../uploads/tm/`), gestionados por el
  plugin (ver su AGENTS.md §5). Este repositorio NO versiona datos: standalone arranca sin
  presets ni imágenes (lista vacía) y el admin los crea desde cero en uploads.

## 6. Responsabilidades por archivo JS

- **`catalog.js`**: parser único de catálogos (clasificación `ok`/`free`/`invalid` con causa
  `ambito:id:motivo`), `tileDeId` (tile=`id-1`), `huecoParaAlta` (reutiliza el tombstone más
  bajo), walker `mapImgRefs`/`hasNumericImgRefs` (refs de imagen por id en settings).
- **`editor.js`**: estado del proyecto (`createDefaultSettings`, `loadPreset`) y render de
  todas las capas: fill/pattern/palette, outline, shadows, bevel, specular, icon,
  background, lettering (blendmodes, textures).
- **`controls.js`**: binding de la UI al settings (inputs, sub-menús STYLES, anti-drag,
  bindCanvasDimension, gradient colors).
- **`galeria.js`**: componente único de galería de imágenes (tabs, búsqueda, subida,
  preview en vivo con rollback).
- **`fuentes-galeria.js`**: galería de fuentes (mismo patrón visual `tt-galpanel-*`:
  buscador, tabs por categoría dinámica, tiles con preview 180x30 o sprite
  `fuentes`, upload TTF/OTF/WOFF/WOFF2, footer nombre+categoría+Save/Delete/Select,
  botón "+ Categoria"). CRUD físico solo con puente (`moverFuente` renombra/cambia
  categoría; Google = solo lectura).
- **`preset-manager.js`**: CRUD de presets (puente/standalone), formato `.txm`,
  miniaturas, migración legacy, `presetUrlBase()`, listados para el plugin.
- **`api.js`**: API pública (`renderTextToPNG`, `renderBatch`, `loadPresetById`,
  `prepareImgRefs`, `clearPresetCache`) y cache de presets + catálogos (1 fetch por recurso;
  no cachea fallos). Resolución de refs de imagen por id (fail-fast con causa en render).
- **`export.js`**: PNG transparente al tamaño exacto del canvas.
- **`fonts.js`**: carga Google Fonts + locales, `ensureFontReady`, resolución de la fuente
  de un preset (`resolveFontFromPreset`).
- **`gradient-picker.js`**: picker de gradientes N colores (sincronización con settings).
- **`effects/`**: bevel (WebGL con normal maps + fallback 2D), specular (Blinn-Phong),
  distort engine (arcos, ondas, bulge per-character con fallback matricial).
- **`utils/`**: vendors minificados. **No editar los `.min`.**
- **Sin `.min` propios**: los minificados de este repo (`editor.min.js`,
  `controls.min.js`, `effects/*.min.js`, etc.) se eliminaron — eran restos
  huerfanos sin consumidor (ningun HTML los cargaba). Fuente unica: los `.js`.

## 7. Decisiones de diseño ya tomadas

- ✅ App **100% libre**: sin funciones premium, sin tiers de calidad.
- ❌ Sin sección ANIMATION. ❌ Export distinto de PNG transparente (JPG/PDF).
- ✅ **Un solo panel de presets**: la galería inferior expandible (no recrear paneles
  viejos: fieldset "Presets" ni "Local projects" eliminados).
- ✅ **Formato único `.txm`** (+ `.webp`).
- ✅ **Datos del admin en uploads del plugin**: presets, fuentes e imágenes
  viven en `uploads/.../textmuy/`.
- ✅ **Sin datos de fábrica en el módulo (v4.1)**: se eliminaron las carpetas `presets/`,
  `imagenes/` y `fonts/` del repositorio; standalone arranca con listas vacías.
- 🔜 **FUTURO — Fuentes como datos de usuario** (no implementado): `uploads/.../textmuy/
  fonts/{nombre}.{ttf,otf,woff,woff2}` + `{nombre}.webp` (preview) + `fonts.json`
  (`{nombre, titulo, url}`); handlers `textmuy_subir_fuente|borrar_fuente` (firma + límite);
  `fonts.js` registra las fuentes desde el puente y reemplaza `localStorage`
  (`textmuy_custom_fonts`) dentro del plugin (standalone mantiene localStorage); preview
  webp generada en el navegador al subir o auto-generada al primer uso si falta.
- ✅ **Fuentes como datos: catalogo Google en `fonts.json` + fisicas auto (v4.2,
  formato SUPERADO por v4.3, hoy por v5.0; HISTORICO)**: `uploads/.../textmuy/fonts/fonts.json` (copia
  editable del admin, UNICA fuente de catalogo): `[{nombre, titulo, categoria, google?}]`
  (`google:"Familia:wght@..."` = online lazy via link inyectado; `url` = fisica a
  mano con HEAD previo).
- ✅ **Formato único de recursos (v5.0, RC24)**: catálogo por ámbito
  `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` con `id` NUMÉRICO denso desde 1 =
  tile `id-1`; libre = tombstone `[id,"","",""]` (SIN lista `free[]`); `cats` string
  (coma/espacio/barra, default `custom`); `file` con extensión = físico (HEAD previo), sin
  extensión = Google SOLO en `fonts` (lazy `<link>`). Parser compartido `js/catalog.js` con
  3 clases `ok/free/invalid` (constitución IV v2.1.0): `invalid` en galería = salto + warn +
  contador visible; en render = rechazo con causa. Los `.txm` referencian por id numérico
  (`font.src`, imágenes de settings): string legacy = rechazo "re-guardar el preset" (sin
  migración bajo demanda). Ámbitos en `uploads/tm/{fonts,img,presets}/`: `fonts.json`
  (espejo `../uploads/tm/` = `wp-content/uploads/tm/`), `img.json` (antes `catalogo.json`),
  `presets.json` (nuevo); migrados via `here/specs/001-unified-resource-format/migrate-tm.mjs`
  (fonts 72, img 128, presets 10; backups `.legacy`). Lado plugin pendiente: escribir tuplas
  en alta/baja + regenerar sprites + limpiar `thumbs/presets.json` y `.webp` sueltos.
- ✅ Efectos WebGL con fallback a Canvas 2D (funciona sin WebGL).
- ✅ **Alcance de estilo por linea (Style target All/L1/L2/L3)**: `settings.lines`
  = `{activeTarget, overrides}` (delta disperso contra la base, solo lo que
  cambia). Rutas **globales** (contenido/layout: `text`, `align`, `lineHeight`,
  `letterSpacing`, `rotate`, `distort`, `canvas`, `lettering.flag/boggle/...`,
  `font.src`) nunca entran a overrides — van siempre a base (`isGlobalOnlyPath`
  en `editor.js`/`controls.js`). Rutas de **estilo** (`font.size/weight`, `fill`,
  `outline.*`, `depth/depth2`, `bevel`, `shadow.*`, `specular`, `lettering.shadow`,
  `icon`) se pintan por linea con su config efectiva (`forEachLineSetting` +
  `drawTextLines(..., lineFilter)`, misma geometria de bloque: cada linea
  conserva su baseline, nunca se superponen). El selector vive anclado abajo de
  TEXT, STYLES e ICON (`data-line-style-anchor`, mismo estado via evento
  `textmuy:line-target-updated`); los inputs marcan `data-line-override="1/0"`
  (propio vs heredado). Al cargar preset se resetea el target a All y se podan
  overrides huerfanos globales (`pruneGlobalOnlyOverrides`).
- ✅ **Tamano por linea con referencia (`lines.sizing`)**: config global del
  sistema de lineas (`{ref:'canvas'|'line', refLine, mode:'fontsize'|'width'}`).
  `ref:'canvas'` = autoFit historico. `ref:'line'` = la linea objetivo copia el
  tamano resuelto de otra linea (fontsize) o se ajusta a su ancho con el alto
  restante del canvas (width). UI: barra unica fija All/L1/L2/L3
  (`#tt-line-target-bar`, visible solo en TEXT/STYLES/ICON), grupo Canvas Size
  oculto en L1/L2/... (`data-global-only`), selector Sizing ref en Max Font
  Size (solo en L1/L2/...). Render: `lineFontSizes()` + `state.lineFontPx` +
  `drawTextLines` con avances acumulados (sin superposicion).


## 8. Dificultades del entorno (IMPORTANTE AL TRABAJAR AQUÍ)

- ⚠️ **Node SOLO para testing**: no corre en el servidor WP productivo.
- ⚠️ **`file://` limita fetch**: el HEAD de miniaturas se evita con `isFileProtocol()`
  al abrir el editor como archivo local.
- ⚠️ **Fuentes**: sin internet, Google Fonts no carga y cae al fallback; `fonts/` local
  está vacía por defecto. `ensureFontReady` obliga a cargar la familia antes de renderizar
  (si no, el canvas usa la fuente del sistema).
- ⚠️ **WebGL puede no estar disponible**: bevel/especular tienen fallback Canvas 2D, PERO en
  la ruta de la API (constitución II) sin WebGL el render falla con causa (sin fallback
  silencioso).
- ⚠️ **Git-Bash + carpeta `here/`**: en comandos largos de shell el cwd se pierde (ENOENT
  fantasma con `cp`/`mkdir`); usar rutas absolutas Windows, `node -e` con `fs`, o la
  herramienta editor.
- ⚠️ **Vivir integrado**: este repo es hermano del plugin en el proyecto (`../textmuy`);
  para probarlo integrado, copiarlo a `../personalizador-pdf/modules/textmuy/`
  (instrucciones en `modules/LEEME.md`).

## 9. Cómo probar

```bash
node tests/catalog-unified.test.js    # parser unico: ok/free/invalid + tile=id-1 + tombstone
node tests/fonts-catalog.test.js      # wiring fonts.js al parser + rechazo legacy (tuplas string)
node tests/img-refs.test.js           # refs de imagen por id (prepareImgRefs, fail-fast)
node tests/preset-cache.test.js
node tests/preset-delta.test.js
node tests/preset-load.test.js        # valida los presets de uploads (lee de ../uploads/tm/presets)
node tests/distort-engine.test.js
node tests/flag-wave.test.js
node tests/pattern-block-box.test.js
node tests/controls-init.test.js      # smoke: Controls.init() corre sin lanzar (atrapa ReferenceError de scope)
node --check js/catalog.js js/fonts.js js/preset-manager.js js/api.js js/editor.js js/galeria.js js/fuentes-galeria.js
```

- **Standalone**: abrir `index.html` (o servirlo por HTTP) y probar editor + galería +
  export PNG (arranca sin presets ni imágenes: el admin los crea desde cero en
  `uploads/tm/`).
- **Integrado**: pestaña "Estilos de Texto" del plugin (guardar/borrar preset, subir
  imagen) y vista previa / Procesar de un grupo con texto estilizado.
- **Migrar datos**: `node here/specs/001-unified-resource-format/migrate-tm.mjs` (convierte
  los formatos legacy del espejo `../uploads/tm/` al canónico v5.0, con backups `.legacy`).

## 10. Reglas para la IA al editar

- ✅ OBLIGATORIO: leer este AGENTS.md completo antes de proponer cambios.
- ✅ OBLIGATORIO: subir `?v=RCn` en `index.html` y `render-core.html` al cambiar JS.
- ✅ Mensajes e interfaz en español (sin tildes en código puro para evitar problemas de
  encoding).
- ❌ NO DEBES: usar `localStorage` para presets/imágenes/fuentes (solo la migración legacy de
  lectura).
- ❌ NO DEBES: escribir en el servidor sin el puente (admin-post + nonce).
- ❌ NO DEBES: editar los vendors de `utils/`.
- ❌ NO DEBES: regenerar `.min` propios (eliminados a proposito; fuente unica los `.js`).