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
(Canvas 2D + WebGL) que vive **integrado** en el plugin para WordPress "Personalizador PDF"
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
├── README.md              <- Ficha de desarrollo (entorno, Spec Kit, pruebas)
├── index.html             <- Editor completo (UI; iframe de la pestaña "Estilos de Texto")
├── render-core.html       <- Motor de render headless (~220 KB sin UI: fonts + effects +
│                             editor + export + api); iframe off-screen del plugin
├── docs/                  <- entorno-desarrollo.md (Windows + pwsh, Spec Kit + Cline)
├── .clinerules/           <- Workflows /speckit-* de la integracion cline (versionados)
├── .specify/              <- Spec Kit: constitution, scripts powershell/*.ps1, templates
├── specs/                 <- Especificaciones SDD (001-fix-bugs-01/...)
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
│   └── utils/             <- Vendors minificados (FileSaver, Sortable, gif-encoder,
│                             pica, potrace, stackblur, svgo, toastify-js, util...). NO editar
└── tests/                 <- 21 tests Node (catalog-unified, tile-geometria, fonts-catalog,
                              img-refs, preset-cache, preset-ambito, preset-delta,
                              preset-load, distort-engine, flag-wave, pattern-block-box,
                              controls-init, galeria-items, invalidacion, sprite-canonico,
                              rc-bump, fuente-compuesta, fuente-carga-estados,
                              fuente-selector, preset-roundtrip, integridad-archivos)
                              + galerias.browser.js (opcional; Chrome/Playwright externos)
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
   subida (botón de archivo; SIN drag&drop ni pegado) y **preview en vivo** que se
   revierte si se cierra sin "Aplicar". Lee el catálogo `img.json` (tuplas numéricas)
   + el sprite del ámbito, y deduplica el inventario del puente contra el catálogo
   (identidad = `id`).
3.1. **Galería de fuentes** (`js/fuentes-galeria.js`): tabs dinámicas desde el catálogo
   (`fonts.json`) + sprite `fonts`, upload TTF/OTF/WOFF/WOFF2, footer
   nombre+categoría+Save/Delete/Select. RC35: el manifiesto del sprite se indexa por
   nombre STRING (los ids del catálogo son números: sin `String(slug)` el lookup de
   tile fallaba siempre); toda mutación invalida la hoja ANTES de listar y ESPERA la
   relectura de `fonts.json`; `deleteCustomFont` (op=baja real) es Promise<boolean>,
   mientras `unregisterCustomFont` quita SOLO en memoria (el renombre/movimiento no
   debe mandar una baja extra: el motor ya resolvió el físico con op=editar); dedupe
   registry vs catálogo por archivo físico.
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
   **Handshake con acuse (RC38)**: al aplicar el puente, el módulo contesta
   `{type:'textmuy-bridge-ok'}` al padre. El padre **debe esperar ese acuse** antes de
   llamar `renderBatch`. Sin esa espera hay una carrera: el `postMessage` del puente se
   entrega como TAREA pero el `.then()` de la promesa del iframe corre como
   MICROTAREA, así que el primer render arrancaba con `bridge=null` y fallaba con
   `presets:sin_puente` (solo el segundo clic funcionaba). Consumidores con handshake:
   `assets/admin.js` (consola) y `assets/tienda.js` (ficha). Si no hay puente configurado
   no se espera acuse; si el módulo está viejo en caché y nunca acusa, el padre resuelve
   igual a los 3 s (nunca deja la promesa colgada).
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
   `<script>` de `index.html` Y `render-core.html` (hoy **RC41**); el `css/style.css`
   de `index.html` lleva el mismo `?v`. El plugin detecta
   módulos viejos por el contrato y avisa con Ctrl+F5.
7. **Sin `localStorage`**: prohibido para presets, imágenes y fuentes (sin excepciones
   ni lecturas legacy).
8. **Catálogo único por ámbito (v5.0)**:
   `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}`. Parser compartido
   `js/catalog.js` (clases `ok`/`free`/`invalid` con causa): `invalid` en GALERÍA =
   salto + `console.warn` + contador visible; en RENDER = rechazo `ambito:id:motivo`.
   Sprite fusionado por ámbito (fonts 180x30, img 100x100, presets 200x100), tile
   derivado `id-1`, cero manifiestos por tile. La **geometría del tile de las
   galerías sale de `thumbs`** (`catalog.js::geometriaTiles` → variables CSS
   `--tt-gal-ratio` / `--tt-gal-col`); nunca ratios hardcodeados (RC37).
9. **Refs de recursos en `.txm`**: `settings.font.src` es el **id numérico del
   catálogo** (identidad canónica única, p.ej. `58`). Los `.txm` guardados antes de
   RC39 referenciaban la fuente por título (`"Bangers"`, `"MUY-Alegría"`); esa forma se
   acepta por compatibilidad y se **normaliza a id** al cargar (`R-C6.1`). El título
   (con tildes y enes) se resuelve igual que uno ASCII. `FontLoader.resolveFontId` es el
   único resolvedor y devuelve siempre el id; el estado del proyecto **nunca** guarda
   claves internas (`user-<id>`, `server-<archivo>`). Las **imágenes** de settings sí
   referencian por `id` numérico; `api.js::prepareImgRefs` las resuelve a URL
   (fail-fast en render; base `urls.imagenesBase`).

### 7.1 Decisiones RC39 (001-fix-bugs-01) — fuentes y presets

Tres reglas que corrigen los bugs reportados por el administrador. Están
especificadas en `specs/001-fix-bugs-01/` (spec, plan, research, contracts).

- ✅ **Identidad única de fuente = id numérico del catálogo.** El índice vivo es
  `fontsById`; `fontRegistry` queda solo como mapa de compatibilidad. El selector se
  puebla con `FontLoader.listFontEntries()` (una entrada por identidad) y TODA entrada
  dispara carga por identidad. Un título repetido es **ambiguo** y falla con causa, no
  elige una al azar. `sanitizeFontKey` y las claves `user-<id>` / `server-<archivo>`
  desaparecieron como identidad: no se persisten en el estado.
- ✅ **Una sola forma de fijar la fuente de un contexto.** `editor.js::aplicarFuente`
  compone el valor de `ctx.font` con la familia **entrecomillada** (`FontLoader
  .getFontFamily`). Sin comillas, un nombre con espacios produce CSS inválido, el
  navegador lo **ignora en silencio** y el lienzo conserva la composición anterior:
  esa era la fuente fantasma. Prohibido componer `ctx.font` a mano.
- ✅ **El estado de carga de una fuente es explícito y reintentable.** Estados
  *no solicitada / pendiente / disponible / fallida* con causa consultable
  (`FontLoader.getFontState` / `getFontFailure`). Un fallo **no** marca la fuente como
  disponible, **no** carga ninguna otra (fin del fallback silencioso a `Bangers`) y
  **no** impide el reintento. El fallo se muestra en `#tt-font-error`, no solo en
  consola.
- ✅ **Cargar un preset REEMPLAZA la vista.** `loadPreset` sin `targetSettings` parte
  de defaults limpios en vez de escribir campo por campo sobre el estado vivo, y
  aplica los grupos que antes se perdían: **`fill.layers`** (el que el lienzo prioriza,
  causa del "el color cambia al de la vista"), **`lines`** (overrides y destino de
  estilo) y **`canvas`**. Con `targetSettings` (ruta API/export) el objeto es del
  llamador y se respeta igual.
- ✅ **Preview en vivo de la galería de fuentes.** Tocar un tile aplica la fuente al
  lienzo sin pulsar "Select" (`aplicarFuentePrevia`); cerrar sin confirmar revierte
  (`revertirFuentePrevia`), y una descarga tardía de una fuente descartada no repinta
  (se compara identidad). "Select" consolida la fuente sin cambiar el lienzo.
- ✅ **La galería de fuentes se puebla desde `listFontEntries`**, no desde el mapa de
  categorías + puente: esa doble ruta era la que duplicaba entradas y dejaba fuentes
  sin efecto.
- **Suites nuevas** (Node, sin navegador): `tests/fuente-composta.test.js`,
  `tests/fuente-carga-estados.test.js`, `tests/fuente-selector.test.js`,
  `tests/preset-roundtrip.test.js`. Total: 20 suites. Todas verdes.

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
  tombstone más bajo), walker `mapImgRefs`/`hasNumericImgRefs` (refs de imagen por id)
  y `geometriaTiles` (proporción y columna del tile de galería desde `thumbs`).
- **`editor.js`**: estado del proyecto (`createDefaultSettings`, `loadPreset`) y render
  de todas las capas: fill/pattern/palette, outline, shadows, bevel, specular, icon,
  background, lettering (blendmodes, textures).
- **`controls.js`**: binding de la UI al settings (inputs, sub-menús STYLES, anti-drag,
  bindCanvasDimension, gradient colors).
- **`galeria.js`**: componente único de galería de imágenes (tabs, búsqueda, subida,
  preview en vivo con rollback); lee el sprite `img` canónico (`tile = id-1`) y deduplica
  el inventario del puente contra el catálogo (identidad = `id`). Con `fuente='presets'`
  lista `presets.json` y dibuja cada miniatura desde la hoja `tm-presets` (solo lectura;
  sin hoja = placeholder de texto, nunca `<img>` del `.txm`) (RC37). El panel declara su
  ámbito en `data-ambito` para que el CSS aplique la geometría del tile.
- **`fuentes-galeria.js`**: galería de fuentes (mismo patrón visual `tt-galpanel-*`:
  buscador, tabs por categoría dinámica, upload TTF/OTF/WOFF/WOFF2, footer
  nombre+categoría+Save/Delete/Select, botón "+ Categoría" y botón "Generar miniaturas").
  RC37: los tiles salen de la hoja **canónica leída** (`TextMuyAPI.ensureSpriteCanonico`
  + `drawTileCanonico`); sin hoja certificada hay placeholder de texto y **cero
  descargas**; el preview real con el tipo de letra se pide al seleccionar la fuente
  (1 archivo). La regeneración de la hoja es explícita (botón), jamás al abrir.
  El CRUD físico va por el motor (`op=editar`; Google = solo lectura).
- **`preset-manager.js`**: CRUD de presets por el motor, formato `.txm`, miniaturas,
  `presetUrlBase()`, `getBridge()` y los listados iniciales que llegan por el puente.
- **`api.js`**: API pública (`renderTextToPNG`, `renderBatch`, `loadPresetById`,
  `prepareImgRefs`, `clearPresetCache`) y cache de presets + catálogos (1 fetch por
  recurso; no cachea fallos). Resolución de refs de imagen por id (fail-fast con causa
  en render). Ambito de presets: el motor habla `tm-presets`; `ambitoCanonico()`
  normaliza el alias `presets` en toda la API interna (una sola cache por recurso) (RC37).
- **`export.js`**: PNG transparente al tamaño exacto del canvas.
- **`fonts.js`**: carga Google Fonts + locales, `ensureFontReady`, resolución de la
  fuente de un preset (`resolveFontFromPreset`), `getCatalogThumbs` (retícula del
  catálogo) y `renderFontPreview(item, w, h, {cargar:false})` para dibujar **sin tocar
  la red** (placeholders de la galería) (RC37). `ensureFontsSprite` quedó solo para la
  generación explícita y manda la firma del catálogo.
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
  la fuente por TÍTULO (`font.src` string = título del catálogo o spec Google, o su `id`
  numérico) y las imágenes por id numérico.
- ✅ **Sprite canónico por ámbito (RC33/RC34)**: las galerías LEEN el `thumbs.webp` del
  servidor y derivan la celda del `id` (`tile = id-1`, huecos estables por tombstone);
  NO reconstruyen la hoja al abrir. La hoja se acepta solo si está **certificada**:
  el catálogo guarda `thumbs.sprite_firma` (`[w,h,c,items]`, ver
  `catalog.js::firmaCatalogo` = `PMU_Uploads::sprite`) y debe coincidir con el catálogo
  leído (una hoja vieja con las mismas dimensiones NO se reutiliza). Sin certificar o
  con retícula distinta: `ensureSpriteCanonico` devuelve `null` y el llamador
  **regenera una sola vez** (`reconstruirSpriteCanonico`, layout canónico + `op=sprite`
  con `firma`); toda mutación invalida la firma (`invalidarSpriteCanonico`).
  (RC34: la galería además descarta el catálogo en memoria
  (`TextMuyAPI.invalidarCatalogo`, vía `PresetManager.invalidarSprite`) y devuelve la
  hoja a `'pendiente'` (`invalidarSpriteVista`), así que la sesión en curso regenera
  la hoja con el catálogo nuevo sin Ctrl+F5.)
- ✅ **Fuentes**: catálogo con Google lazy por familia (sin extensión) y físicas subidas
  por el administrador (ámbito `fonts`). RC37: la galería lee la **hoja canónica**
  (`ensureSpriteCanonico('fonts')` + `drawTileCanonico`, celda `id-1`). El manifest en
  memoria de ThumbEngine (RC35, indexado por nombre STRING) quedó fuera del camino de
  lectura: su cache es solo memoria y cada apertura reconstruía la hoja entera, lo que
  descargaba TODAS las fuentes físicas (~1,4 MB en el mirror). Sin hoja certificada:
  placeholder de texto y **cero requests**; el preview real se carga al **seleccionar**
  la fuente (1 archivo) y la hoja se regenera solo con el botón "Generar miniaturas"
  (que manda `firma`). El renombre/movimiento usa `unregisterCustomFont` (solo memoria);
  SOLO el botón Delete manda `op=baja`, que en el motor hace unlink + tombstone.
- ✅ **Geometría de tiles data-driven (RC37)**: `.tt-galpanel-tile` ya no fuerza 1/1;
  proporción y columna salen de `thumbs` del catálogo (`catalog.js::geometriaTiles` →
  variables CSS `--tt-gal-ratio` / `--tt-gal-col`, con defaults por `data-ambito` en
  `style.css`). Fuentes: 2 columnas de ~175×29 px legibles (antes ~62×10 px, ilegibles).
  Ninguna galería hardcodea el tamaño de la celda.
- ✅ **Hojas certificadas (RC37)**: todo `ThumbEngine.ensureSprite` del módulo manda
  `firma`; sin ella el motor escribe `thumbs.sprite_firma=''` y la hoja queda
  INcertificable (se reconstruía en cada apertura). En `tm-presets` la generación es
  explícita (botón "Miniaturas" de la galería inferior): dibujar un preset carga su
  fuente, por eso nunca se hace al abrir.
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

**Entorno declarado (verificado 2026-10-03)**: Windows + **PowerShell 7 (`pwsh`) 7.6.6** +
VS Code + extensión **Cline**. La integración de **Spec Kit** es `cline` (predeterminada y
única) con scripts **`ps`**. Detalle, verificaciones y diagnóstico:
`docs/entorno-desarrollo.md`.

- ⚠️ **Diagnóstico antes que cambios**: ante un fallo, verificá primero shell activo
  (`$PSVersionTable.PSVersion` → 7.x; `(Get-Process -Id $PID).Path` → `pwsh.exe`), directorio
  actual (`Get-Location`), PATH y herramientas (`Get-Command pwsh,specify,uv,node,git`).
  No asumas Bash, WSL, `cmd` ni Windows PowerShell 5.1 como shell activo.
- ⚠️ **Ejecución**: todos los comandos se corren desde la **raíz de este repositorio** (el
  módulo) y las rutas con espacios van entre comillas. En pwsh secuenciá con `;` (y `&&`
  cuando el primer fallo deba cortar); no uses sintaxis de bash ni de cmd.
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
- ⚠️ **Vivir integrado**: este repositorio se importa dentro del plugin como
  `wp-content/plugins/personalizador-pdf/modules/textmuy/`; para probarlo hay que abrir
  la pestaña "Estilos de Texto" del plugin (no hay modo standalone).
- 🚫 **Sin aprobación explícita**: no modificar bases de datos, credenciales ni servicios
  externos, y no desplegar/publicar sin aprobación del usuario.

**Spec Kit**: los workflows `.clinerules/workflows/speckit-*.md` ejecutan
`.specify/scripts/powershell/*.ps1` desde la raíz del módulo (integración `cline`, scripts
`ps`). A diferencia del repo del plugin, aquí `.specify/` y `.clinerules/` SÍ están
versionados: lo que cambie un `upgrade` se revisa con `git status` / `git diff` y se
commitea. No editar a mano los archivos gestionados (workflows, scripts, templates): se
actualizan con el CLI. Para verificar/actualizar:

```powershell
specify integration status                      # esperado: OK; cline (default + instalada)
specify integration upgrade cline --script ps   # diff-aware; --force solo si es deliberado
```

## 9. Cómo probar

RC36: `PresetManager.invalidarSprite(ambito)` es el coordinador asincrono de
invalidacion tras mutaciones confirmadas: ThumbEngine + API (sprite/catalogo),
evento `textmuy:sprite-invalidado` para descartar vistas locales y, para `fonts`,
relectura del catalogo antes de resolver. Las galerias no invalidan por su cuenta.
Los tokens de version descartan respuestas antiguas en las vistas; esto NO
serializa las escrituras `op=sprite` en el servidor.

RC37: las galerias NO construyen hojas al abrir. `fonts` y `tm-presets` pasaron a la
ruta de lectura canonica (`ensureSpriteCanonico` + `drawTileCanonico`), la regeneracion
es explicita por boton ("Generar miniaturas" en la galeria de fuentes, "Miniaturas" en
la galeria inferior de presets) y todo `ThumbEngine.ensureSprite` manda `firma`.
`FontLoader.renderFontPreview(item, w, h, {cargar:false})` dibuja sin tocar la red: es
lo que usan los placeholders, asi que abrir la galeria de fuentes hace 0 requests de
fuentes. La geometria del tile sale de `thumbs` (`catalog.js::geometriaTiles`).

`catalog.js::itemsGaleriaImg` concentra el armado y filtrado existente de imagenes.
No cambia las tres tabs ni el criterio actual de primera categoria.
Hay 21 suites Node (verdes el 2026-10-03 con Node 22.20.0 sobre pwsh 7.6.6). La prueba
opcional `tests/galerias.browser.js` usa Chrome y Playwright instalados externamente
(variable `TEXTMUY_CHROME` para el ejecutable); valida DOM con motor/miniaturas
simulados, no sustituye la prueba en WordPress.


```powershell
# Desde la raiz del modulo. Cada suite imprime su propio "OK: <archivo>".
node tests/catalog-unified.test.js    # parser unico: ok/free/invalid + tile=id-1 + tombstone
node tests/tile-geometria.test.js     # geometria del tile desde thumbs (ratio/columna)
node tests/fonts-catalog.test.js      # wiring fonts.js al parser + rechazo legacy (tuplas string)
                                      # + preview sin carga (cero FontFace) + thumbs
node tests/img-refs.test.js           # refs de imagen por id (prepareImgRefs, fail-fast)
node tests/preset-cache.test.js
node tests/preset-ambito.test.js      # alias presets -> tm-presets (cache unica + firma)
node tests/preset-delta.test.js
node tests/preset-load.test.js        # valida los presets del administrador (lee de los uploads)
node tests/preset-roundtrip.test.js   # guardar/cargar un preset campo por campo (RC39)
node tests/distort-engine.test.js
node tests/flag-wave.test.js
node tests/pattern-block-box.test.js
node tests/controls-init.test.js      # smoke: Controls.init() corre sin lanzar (atrapa ReferenceError de scope)
node tests/galeria-items.test.js
node tests/invalidacion.test.js
node tests/sprite-canonico.test.js
node tests/fuente-compuesta.test.js   # familia compuesta entrecomillada (RC39)
node tests/fuente-carga-estados.test.js  # estados de carga explicitos + reintento (RC39)
node tests/fuente-selector.test.js    # selector sin duplicados, toda entrada funciona (RC39)
node tests/integridad-archivos.test.js   # sin caracteres corruptos + version RC documentada
node tests/rc-bump.test.js

# Todas las suites de una vez (frena en la primera que falle):
Get-ChildItem tests -Filter *.test.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Sintaxis de todos los scripts (node --check acepta UN archivo por invocacion):
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
Get-ChildItem js\effects -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
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
- ✅ OBLIGATORIO: trabajar en **PowerShell 7 (`pwsh`)** desde la raíz del módulo; ante un
  fallo, verificar shell, directorio, PATH y herramientas antes de cambiar el entorno
  (§8, `docs/entorno-desarrollo.md`).
- ✅ Mensajes e interfaz en español (sin tildes en código puro para evitar problemas de
  encoding).
- ✅ Las rutas, catalogos y archivos son datos del plugin: NO hardcodear rutas, NO
  escribir catalogos y NO asumir handlers; usar el puente (`urls.*`) y el motor (`op=`).
- ❌ NO DEBES: usar `localStorage` para presets/imágenes/fuentes.
- ❌ NO DEBES: introducir fallbacks client-side ni reactivar el modo standalone.
- ❌ NO DEBES: editar los vendors de `utils/`.
- ❌ NO DEBES: regenerar `.min` propios (eliminados a proposito; fuente unica los `.js`).
- ❌ NO DEBES: editar a mano los archivos gestionados de `.specify/` y `.clinerules/`
  (workflows, scripts, templates); actualizalos con
  `specify integration upgrade cline --script ps`.
- ❌ NO DEBES: modificar bases de datos, credenciales ni servicios externos, ni
  desplegar/publicar sin aprobación explícita del usuario.
