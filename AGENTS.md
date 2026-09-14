# AGENTS.md — Contexto del módulo TextMuy

> Este archivo debe leerse COMPLETO antes de editar, buscar o responder sobre este
> repositorio. Contiene el objetivo, la arquitectura, las reglas técnicas críticas,
> las decisiones de diseño ya tomadas y las dificultades del entorno.
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
(Canvas 2D + WebGL) que vive **integrado** en el plugin WordPress "Personalizador PDF"
(iframe same-origin + puente postMessage) y expone una **API de render** que convierte
texto + preset en un **PNG transparente** del tamaño exacto.

## 1. Objetivo y visión del sistema

- **Dos modos de uso, ambos dentro del plugin**:
  1. **Editor visual**: interfaz tipo TextStudio para crear/editar estilos de texto,
     importar presets y gestionar la biblioteca guardada (iframe de la pestaña
     "Estilos de Texto").
  2. **API client-side**: `TextMuyAPI.renderTextToPNG` / `renderBatch` reciben texto +
     preset (+ overrides opcionales) y devuelven un PNG transparente del tamaño
     especificado. Es una función JS, no un servidor; se consume desde
     `render-core.html` (iframe off-screen del plugin).
- **Lo que SÍ queremos**: editor con la mayoría de funciones de TextStudio (menos
  ANIMATION), importador de presets desde textstudio.com, CRUD de presets, gestión de
  fuentes, canvas definido por el usuario con auto-ajuste del texto, exportación PNG
  y SVG.
- **Lo que NO queremos**: sección ANIMATION, export a formatos distintos de PNG y SVG,
  tiers de calidad (LITE/PRO/ULTRA), restricciones premium.
  **LA APP ES 100% LIBRE: no existirá concepto premium.**
- **Sin modo standalone**: el editor NO opera fuera del plugin (Const. I/III, no
  negociable). Sin puente muestra un estado de error claro y accionable, y hace cero
  fetches a rutas locales del módulo.
- **Integración con Personalizador PDF**: los grupos de un PDF pueden llevar "texto +
  estilo"; el plugin renderiza vía `render-core` en el navegador del admin. El contrato
  de comunicación está en §4 (y en el AGENTS.md del plugin).

## 2. Arquitectura y mapa de archivos

```
textmuy/
├── AGENTS.md              <- ESTE archivo (contexto obligatorio)
├── index.html             <- Editor completo (UI; iframe de la pestaña "Estilos de Texto")
├── render-core.html       <- Motor de render headless (~220 KB sin UI: fonts + effects +
│                             editor + export + api); iframe off-screen del plugin
├── css/                   <- style.css (unico CSS del modulo)
├── js/
│   ├── main.js            <- Bootstrap del editor
│   ├── catalog.js         <- Parser unico de catalogos (ok/free/invalid) + tile=id-1
│   ├── editor.js          <- Estado + render del canvas (fuente de verdad del settings)
│   ├── controls.js        <- Binding UI (TEXT/STYLES/ICON/BACKGROUND/DOWNLOAD)
│   ├── galeria.js         <- Galeria unificada de imagenes (preview en vivo)
│   ├── fuentes-galeria.js <- Galeria de fuentes (CRUD fisico estilo galeria)
│   ├── preset-manager.js  <- CRUD de presets + puente + formato .txm (settingsFromDelta)
│   ├── api.js             <- API publica: renderTextToPNG / renderBatch / loadPresetById /
│   │                         prepareImgRefs / cache presets y catalogos
│   ├── export.js          <- Exportacion PNG transparente
│   ├── fonts.js           <- Carga de fuentes (Google Fonts + catalogo) y ensureFontReady
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
   verdad del tamaño (los inputs de DOWNLOAD están sincronizados; Scale es
   multiplicador) y `autoFitText` ajusta el texto al lienzo. "Save as preset" vive en
   la galería.
2. **Galería de presets** (única UI de presets): buscar, guardar como preset, borrar.
3. **Galería de imágenes** (`js/galeria.js`): un solo "Galería" en los importadores
   (rellenos, fondos, texturas, iconos), con tabs (fondos/iconos/varios), buscador,
   subida (botón + drag&drop + pegar) y **preview en vivo** que se revierte si se
   cierra sin "Aplicar". Lee el catálogo `img.json` (tuplas numéricas) + el sprite del
   ámbito.
3.1. **Galería de fuentes** (`js/fuentes-galeria.js`): tabs dinámicas desde el catálogo
   (`fonts.json`) + sprite `fonts`, upload TTF/OTF/WOFF/WOFF2, footer
   nombre+categoría+Save/Delete/Select.
3.2. **Catálogos únicos** (`js/catalog.js` + `TextMuyAPI.loadCatalogo`): un JSON por
   ámbito (`fonts.json`, `img.json`, `presets.json`) con ítems tupla
   `[id,title,cats,file]` e id numérico = tile `id-1` del sprite del ámbito. Son datos
   del plugin (§5): el módulo solo los lee, nunca los escribe.
4. **Importador TextStudio**: extrae el preset de una URL de textstudio.com
   (`window.__PRESET__` / JSON-LD) y lo guarda como `.txm` vía el puente (y lo aplica
   localmente).
5. **Export** (pestaña DOWNLOAD): PNG transparente al tamaño del canvas (× Scale),
   archivo SVG (efectos básicos compatibles).
6. **Render headless**: `render-core.html` expone `TextMuyAPI.renderBatch(items)` para
   el plugin (iframe off-screen cargado solo cuando se usa; comparte el código del
   editor).

## 4. Reglas técnicas críticas (¡NO MODIFICAR SIN ENTENDERLAS!)

1. **Contrato de la API**: `TextMuyAPI.renderBatch(items, {onProgress}) -> [{id, blob}]`
   con items `{id, text, preset|settings, width, height, overrides?}`. Rechaza ante el
   primer fallo (NUNCA un lote parcial) y garantiza la fuente cargada (`ensureFontReady`)
   antes de renderizar. El plugin consume esto para los grupos de un PDF.
2. **Puente postMessage (único acceso al servidor)**: el plugin envía
   `{type:'textmuy-bridge', bridge:{urls:{motor, miniaturas, presetsBase, fuentesBase,
   imagenesBase}, nonces:{motor}, presets, imagenes, fuentes}}` en 3 momentos (load del
   iframe, aviso `textmuy-ready` del módulo y envío inmediato). El módulo lo recibe en
   `preset-manager.js` (`bridgeAvailable()` / `getBridge()`). SIN puente el editor
   muestra un estado de error claro y NO opera: cero fetches a rutas relativas del
   módulo, cero data-URL de guardado, cero descarga de `.txm`.
3. **Escrituras SOLO vía el motor**: toda mutación es `POST` a `urls.motor`
   (`admin-post.php?action=pmu_uploads`) con `_wpnonce` (`nonces.motor`) + `op`
   (`listar|alta|baja|editar|sprite|miniatura`) + payload. El módulo no conoce handlers
   ni rutas físicas y nunca escribe catálogos ni archivos.
4. **Bases de lectura**: `urls.presetsBase`, `urls.fuentesBase` y `urls.imagenesBase`
   son las bases de los recursos del plugin. `PresetManager.presetUrlBase()` devuelve
   `urls.presetsBase`; `fetchPreset`, `ensureThumbnail` y `api.js` DEBEN usarla (nunca
   hardcodear `'presets/'` ni bases relativas del módulo).
5. **Formato `.txm`**: payload `{format:'textmuy-project', version:1, name, settings}`
   donde `settings` es el **DELTA** contra los defaults (`diffSettings` /
   `settingsFromDelta`). El `.json` crudo de TextStudio es SOLO de importación.
6. **Cache-bust `?v=RCn`**: al cambiar CUALQUIER JS del módulo, subir el número en los
   `<script>` de `index.html` Y `render-core.html` (hoy **RC27**). El plugin detecta
   módulos viejos por el contrato y avisa con Ctrl+F5.
7. **Sin `localStorage`**: prohibido para presets, imágenes y fuentes (sin excepciones
   ni lecturas legacy).
8. **Catálogo único por ámbito (v5.0)**:
   `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}`. Parser compartido
   `js/catalog.js` (clases `ok`/`free`/`invalid` con causa): `invalid` en GALERÍA =
   salto + `console.warn` + contador visible; en RENDER = rechazo `ambito:id:motivo`.
   Sprite fusionado por ámbito (fonts 180x30, img 100x100, presets 200x100), tile
   derivado `id-1`, cero manifiestos por tile.
9. **Refs numéricas en `.txm`**: `settings.font.src` e imágenes de settings referencian
   recursos por id del catálogo; cualquier string legacy = rechazo "re-guardar el preset
   desde el editor" (sin migración bajo demanda). `api.js::prepareImgRefs` resuelve los
   ids de imagen → URL (fail-fast en render; base `urls.imagenesBase`).

## 5. Formatos y convenciones de nombres (NO CAMBIAR)

- Preset: `{nombre}.txm` (JSON `textmuy-project` v1). Miniatura en el sprite del ámbito
  de presets (`thumbs.webp`, 200x100) que persiste el plugin.
- Nombres sanitizados: `[a-z0-9_-]` (`sanitizeName`).
- `settings.canvas.width/height`: única fuente de verdad del tamaño de render.
- **Los recursos son datos del plugin** (los gestiona su motor; este repositorio NO
  versiona datos y NO define rutas): `uploads/pmu/fonts/` (`fonts.json`),
  `uploads/pmu/img/` (`img.json`) y `uploads/pmu/tm-presets/` (`presets.json` +
  `{nombre}.txm`), con un único sprite `thumbs.webp` por ámbito junto a su catálogo. El
  módulo solo lee esas bases (`urls.*Base`) y escribe por el motor (`op=`).
- Espejo de desarrollo: el módulo se importa dentro del plugin, así que en este
  checkout las rutas reales son `personalizador-pdf/uploads/pmu/...`.

## 6. Responsabilidades por archivo JS

- **`catalog.js`**: parser único de catálogos (clasificación `ok`/`free`/`invalid` con
  causa `ambito:id:motivo`), `tileDeId` (tile=`id-1`), `huecoParaAlta` (reutiliza el
  tombstone más bajo), walker `mapImgRefs`/`hasNumericImgRefs` (refs de imagen por id).
- **`editor.js`**: estado del proyecto (`createDefaultSettings`, `loadPreset`) y render
  de todas las capas: fill/pattern/palette, outline, shadows, bevel, specular, icon,
  background, lettering (blendmodes, textures).
- **`controls.js`**: binding de la UI al settings (inputs, sub-menús STYLES, anti-drag,
  bindCanvasDimension, gradient colors).
- **`galeria.js`**: componente único de galería de imágenes (tabs, búsqueda, subida,
  preview en vivo con rollback).
- **`fuentes-galeria.js`**: galería de fuentes (mismo patrón visual `tt-galpanel-*`:
  buscador, tabs por categoría dinámica, tiles con preview o sprite `fonts`, upload
  TTF/OTF/WOFF/WOFF2, footer nombre+categoría+Save/Delete/Select, botón "+ Categoría").
  El CRUD físico va por el motor (`op=editar`; Google = solo lectura).
- **`preset-manager.js`**: CRUD de presets por el motor, formato `.txm`, miniaturas,
  `presetUrlBase()`, `getBridge()` y los listados iniciales que llegan por el puente.
- **`api.js`**: API pública (`renderTextToPNG`, `renderBatch`, `loadPresetById`,
  `prepareImgRefs`, `clearPresetCache`) y cache de presets + catálogos (1 fetch por
  recurso; no cachea fallos). Resolución de refs de imagen por id (fail-fast con causa
  en render).
- **`export.js`**: PNG transparente al tamaño exacto del canvas.
- **`fonts.js`**: carga Google Fonts + locales, `ensureFontReady`, resolución de la
  fuente de un preset (`resolveFontFromPreset`).
- **`gradient-picker.js`**: picker de gradientes N colores (sincronización con settings).
- **`effects/`**: bevel (WebGL con normal maps + fallback 2D), specular (Blinn-Phong),
  distort engine (arcos, ondas, bulge per-character con fallback matricial).
- **`utils/`**: vendors minificados. **No editar los `.min`.**
- **Sin `.min` propios**: los minificados de este repo (`editor.min.js`,
  `controls.min.js`, `effects/*.min.js`, etc.) se eliminaron — eran restos huérfanos
  sin consumidor (ningún HTML los cargaba). Fuente única: los `.js`.

## 7. Decisiones de diseño ya tomadas

- ✅ App **100% libre**: sin funciones premium, sin tiers de calidad.
- ❌ Sin sección ANIMATION. ❌ Export distinto de PNG transparente (JPG/PDF).
- ✅ **Un solo panel de presets**: la galería inferior expandible (no recrear paneles
  viejos: fieldset "Presets" ni "Local projects" eliminados).
- ✅ **Formato único `.txm`** (delta contra defaults).
- ✅ **Sin datos de fábrica ni rutas de datos en el módulo**: no hay `presets/`,
  `imagenes/` ni `fonts/` en el repositorio; los recursos del administrador viven en
  los uploads del plugin (§5) y se consumen por el puente.
- ✅ **Formato único de recursos (v5.0)**: catálogo por ámbito
  `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` con `id` NUMÉRICO denso desde 1
  = tile `id-1`; libre = tombstone `[id,"","",""]` (SIN lista `free[]`); `file` con
  extensión = físico, sin extensión = Google SOLO en `fonts` (lazy `<link>`). Parser
  compartido `js/catalog.js` con 3 clases `ok`/`free`/`invalid`: `invalid` en galería =
  salto + warn + contador visible; en render = rechazo con causa. Los `.txm` referencian
  por id numérico (`font.src`, imágenes de settings): string legacy = rechazo
  "re-guardar el preset" (sin migración bajo demanda).
- ✅ **Fuentes**: catálogo con Google lazy por familia (sin extensión) y físicas subidas
  por el administrador (ámbito `fonts`), con preview desde el sprite del ámbito.
- ✅ **Efectos WebGL con fallback a Canvas 2D en el editor**; en la ruta de la API, sin
  WebGL el render falla con causa (Const. II, sin degradación silenciosa).
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

- ⚠️ **Node SOLO para testing**: no corre en el servidor WordPress productivo.
- ⚠️ **Sin puente no hay editor**: al abrir `index.html` como archivo local (`file://`)
  el puente no existe y el editor muestra su estado de error. El helper
  `isFileProtocol()` evita ademas los HEAD de miniaturas en ese contexto.
- ⚠️ **Fuentes**: sin internet, Google Fonts no carga y cae al fallback; el módulo no
  trae fuentes propias (las del administrador viven en los uploads del plugin).
  `ensureFontReady` obliga a cargar la familia antes de renderizar
  (si no, el canvas usa la fuente del sistema).
- ⚠️ **WebGL puede no estar disponible**: bevel/especular tienen fallback Canvas 2D, PERO en
  la ruta de la API (constitución II) sin WebGL el render falla con causa (sin fallback
  silencioso).
- ⚠️ **Git-Bash + carpeta `here/`**: en comandos largos de shell el cwd se pierde (ENOENT
  fantasma con `cp`/`mkdir`); usar rutas absolutas Windows, `node -e` con `fs`, o la
  herramienta editor.
- ⚠️ **Vivir integrado**: este repositorio se importa dentro del plugin como
  `wp-content/plugins/personalizador-pdf/modules/textmuy/`; para probarlo hay que abrir
  la pestaña "Estilos de Texto" del plugin (no hay modo standalone).

## 9. Cómo probar

```bash
node tests/catalog-unified.test.js    # parser unico: ok/free/invalid + tile=id-1 + tombstone
node tests/fonts-catalog.test.js      # wiring fonts.js al parser + rechazo legacy (tuplas string)
node tests/img-refs.test.js           # refs de imagen por id (prepareImgRefs, fail-fast)
node tests/preset-cache.test.js
node tests/preset-delta.test.js
node tests/preset-load.test.js        # valida los presets del administrador (lee de los uploads)
node tests/distort-engine.test.js
node tests/flag-wave.test.js
node tests/pattern-block-box.test.js
node tests/controls-init.test.js      # smoke: Controls.init() corre sin lanzar (atrapa ReferenceError de scope)
node --check js/catalog.js js/fonts.js js/preset-manager.js js/api.js js/editor.js js/galeria.js js/fuentes-galeria.js
```

- **Único modo de prueba: integrado.** Pestaña "Estilos de Texto" del plugin
  (guardar/borrar preset, subir imagen o fuente) y vista previa / Procesar de un grupo
  con texto estilizado. Las suites de `tests/` corren en Node: son testing unitario, no
  un modo de ejecución del editor.
- Tras cambiar CUALQUIER JS: subir `?v=RCn` en `index.html` y `render-core.html` y
  recargar con Ctrl+F5.

## 10. Reglas para la IA al editar

- ✅ OBLIGATORIO: leer este AGENTS.md completo antes de proponer cambios.
- ✅ OBLIGATORIO: subir `?v=RCn` en `index.html` y `render-core.html` al cambiar JS.
- ✅ Mensajes e interfaz en español (sin tildes en código puro para evitar problemas de
  encoding).
- ✅ Las rutas, catalogos y archivos son datos del plugin: NO hardcodear rutas, NO
  escribir catalogos y NO asumir handlers; usar el puente (`urls.*`) y el motor (`op=`).
- ❌ NO DEBES: usar `localStorage` para presets/imágenes/fuentes.
- ❌ NO DEBES: introducir fallbacks client-side ni reactivar el modo standalone.
- ❌ NO DEBES: editar los vendors de `utils/`.
- ❌ NO DEBES: regenerar `.min` propios (eliminados a proposito; fuente unica los `.js`).
