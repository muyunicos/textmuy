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
├── .gitattributes         <- EOL (LF) y binarios del repo (evita el worktree MIXTO)
├── .editorconfig          <- UTF-8 sin BOM + LF para todos los editores
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
│   └── utils/             <- (vacio) Los vendors minificados se retiraron en RC59:
│                             FileSaver/Sortable/gif-encoder/potrace/toastify-js/util en
│                             el refactor 03ea16e, y pica/stackblur/svgo en RC59. Nada de
│                             utils/ se carga: la descarga usa createObjectURL + <a
│                             download>, el blur usa ctx.filter nativo con fallback manual
│                             propio (RC66) y el SVG (cuando exista) NO dependera de potrace/svgo.
└── tests/                 <- 44 suites Node (catalog-unified, tile-geometria, fonts-catalog,
                              img-refs, preset-cache, preset-ambito, preset-delta,
                              preset-load, distort-engine, flag-wave, pattern-block-box,
                              controls-init, galeria-items, invalidacion, sprite-canonico,
                              rc-bump, render-dependencias, fuente-compuesta,
                              fuente-carga-estados, fuente-selector, preset-roundtrip,
                              integridad-archivos, entorno, hoja-generacion,
                              fuentes-filtros-footer, fuentes-preview-us3,
                              curva-snapshot, curva-sin-webgl, barra-line-target,
                              area-util, avance-lineas, encaje-final,
                              lineas-resolucion, lineas-tamano, lineas-ciclos,
                              lineas-formato, fuente-por-linea,
                              estilo-tema, sombra-no-recortada, sombra-blur,
                              sombra-posicion, carga-gradient-imgrefs, option-schema)
                              + galerias.browser.js (opcional; Chrome/Playwright externos)
                              + text-tab.browser.js (spec 002, pendiente de escribir)
└── specs/002-text-tab/     <- Spec de la correccion de la pestana TEXT (spec, plan,
                              research, data-model, contracts, quickstart, tasks)
└── specs/003-option-schema/ <- Spec del schema unico de opciones + fail-fast de rutas
                              (spec, contracts/opciones.md, tasks)
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
5. **Formato `.txm`**: payload `{format:'textmuy-project', version:2, name, settings}`
   donde `settings` es el **DELTA** contra los defaults (`diffSettings` /
   `settingsFromDelta`). El `.json` crudo de TextStudio es SOLO de importación.
   La **version se valida al leer** (fail-fast, constitución IV/VII v3.2.0): un
   `.txm` v1 se rechaza con causa `presets:<nombre>:formato:version`, aunque no
   declare `lines` — antes la version no se comprobaba y un preset viejo entraba
   en silencio.
6. **Cache-bust `?v=RCn`**: al cambiar CUALQUIER JS del módulo, subir el número en los
   `<script>` de `index.html` Y `render-core.html` (hoy **RC68**); el `css/style.css`
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
- ✅ **El estado por defecto declara la fuente por IDENTIDAD, no por nombre.** `src: 1`
  y no `'Bangers'`: el desplegable se puebla con identidades numéricas, así que una
  referencia por nombre visible no encuentra su opción y el desplegable queda
  mostrando la primera entrada de la lista (otra fuente). `controls.js::sincronizar`
  resuelve la referencia a identidad antes de buscar la opción, y si no puede
  representarla deja el desplegable vacío en vez de mentir (FR-031, FR-033).
- ✅ **El catálogo manda en la identidad.** `fontRegistry` es un espejo: al resolver
  por nombre, si el catálogo tiene la familia se usa **solo** el catálogo; el registro
  se consulta únicamente si el catálogo no tiene ninguna. Con el catálogo pendiente
  **no se inventan identidades** (era la regresión que dejaba toda fuente ambigua:
  `titulo ambiguo (1,100001)`), y al llegar el catálogo se descartan las identidades
  provisionales de las familias que él provee (R-C1.5–R-C1.8).
- ✅ **La galería nombra su identidad por tipo de entrada.** Las del catálogo usan
  `fontId` y las subidas en la sesión `fontKey`; el preview debe leer el campo que
  corresponda. Ninguna entrada usa `id` (FR-034).
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

### 7.3 Decisiones RC46 (spec 009 `galerias-sprite-unificado`, US1+US2)

Implementación de `specs/009-galerias-sprite-unificado` (plugin), fases Phase 2
(certificación) y Phase 3+4 (lectura y generación). **Causa raíz del bug de
miniaturas**: `PMU_Uploads::sprite()` solo certificaba `img` (dentro de
`if ($ambito === 'img')`), de modo que las hojas de `fonts` y `tm-presets` se
persistían sin `thumbs.sprite_firma` y la lectura canónica las rechazaba siempre:
presets y fuentes mostraban el nombre del elemento en cada recarga y la hoja
generada se perdía. El botón "Generar miniaturas" subía la hoja y el motor la
descartaba: por eso "no hacía nada".

- ✅ **La certificación se generaliza a todo ámbito catalogado CON firma no vacía**
  (`inc/class-pmu-uploads.php::sprite()`). La condición NO es `AMBITOS_GALERIA`:
  `mockups` no manda firma (no usa `ThumbEngine` ni la ruta canónica) y debe
  seguir por la rama simple. Verificado en `tests/certificacion_hoja.php`.
- ✅ **`guardar_catalogo()` invalida `thumbs.sprite_firma` en todo ámbito con
  catálogo** (antes solo `img`): un alta/baja/editar deja la hoja vieja
  marcada como no vigente y la próxima apertura la regenera.
- ✅ **Núcleo de generación en dos fases** (`api.js::asegurarHojaCompleta`):
  **F1** dibuja en memoria solo las celdas pendientes (1 descarga por celda, nunca
  el conjunto) y **F2** persiste **exactamente una vez y solo si `fallos === 0`**
  (FR-008: nunca una hoja con celdas sin dibujar). Progreso `N/M` al usuario.
- ✅ **Reentrancia por ámbito** (`generando[ambito]`): la segunda galería o
  pestaña espera a la primera en vez de emitir un segundo `POST op=sprite`.
- ✅ **Los items van `1..maxId` con huecos estables** (celda = `id-1`): el motor
  mide el ALTO de la hoja contra `maxId`, no contra `count(items)`.
- ✅ **`catalog.js::geometriaTiles` devuelve el ratio reducido con MCD**
  (`180x30 → 6 / 1`), de modo que coincide con los defaults por `data-ambito`
  del CSS; `w`/`h` crudos se conservan para el cálculo del alto (SC-006).
- ⚠️ **US3 cerrado en RC47**: las 57 familias Google ahora se dibujan con **su
  tipografía real** (ver 7.5). Antes se dibujaban con `sans-serif` y salían todas
  iguales. Queda solo pendiente, si algún día, persistir la preview de una celda
  aislada sin regenerar la hoja entera (no hace falta: el núcleo la regenera).

### 7.4 Decisiones RC46 — galerías usables (US4 + Bloque C)

Cerrados con medición en navegador (WordPress local, WP 7.1.2 + SQLite + Playwright),
no solo con tests unitarios. Tres bugs que eran **independientes del spec 009** y
que producción arrastraba igual:

- ✅ **Las celdas se solapaban y la galería era inclicable.** Con `display:grid` +
  `grid-auto-rows:auto` el track de la fila **ignora el `aspect-ratio`** del tile
  (el canvas usa `height:100%` sobre una altura indeterminada y no aporta nada):
  en tipografías la fila medía **6 px** y el tile **29 px**, así que cada celda
  pisaba la siguiente y le interceptaba el clic. `align-items:start` NO alcanza.
  La rejilla pasó a **flex**, donde la altura de cada línea sí sale del
  `aspect-ratio`. Medido: **0 solapamientos** en 72 celdas de tipografías y 155 de
  imágenes; 20/20 clics correctos; tile 162×27 con ratio `6 / 1` exacto. El ancho
  de columna sigue saliendo de `--tt-gal-col` (×0.9 para que entren 2 columnas).
- ✅ **Los filtros por categoría no filtraban** (`custom/display/gaming/...`):
  las pestañas se derivaban de la lista **ya filtrada** y el clic llamaba `render()`
  (que no vuelve a filtrar). Ahora el listado completo vive en `itemsBase`, las
  pestañas salen de ahí y el clic **recarga**. Verificado contra `fonts.json`:
  todas 72 · custom 15 · display 10 · gaming 1 · handwriting 18 · serif 11.
- ✅ **El pie de la galería de fuentes estaba muerto.** El gate era
  `tipo==='server'`, que **nunca se cumplía**: `cargar()` deduplica las físicas
  del registro contra `fonts.json`, así que las 15 fuentes `MUY-*` entran como
  `tipo:'catalogo'`. Por eso `+ Categoría`, el select de categoría, **Save** y
  **Delete** no hacían nada y las físicas se anunciaban como *"Google Fonts (solo
  lectura)"*. Ahora manda **`esEditable()`**: una fuente es editable si tiene
  **físico** en el servidor, y el dato que lo distingue es **`online`**.
  Para dar de baja se agrega **`FontLoader.deleteFontFromCatalog(id)`** (op=baja
  con el archivo de `fonts.json`): `deleteCustomFont` solo servía para las subidas
  de la sesión y devolvía `false` en silencio. Una familia Google no se borra.

### 7.5 RC46 — dos bugs de carga que rompían la generación en producción

- 🔴 **Carrera en `fonts.js::asegurarGoogle`**: se inyectaba el `<link>` de Google
  y se llamaba `document.fonts.load()` **en el mismo tick**. Si la hoja de estilo
  todavía no estaba parseada, `load()` resuelve con **0 caras** y la fuente queda
  `fallida` con *"no se pudo cargar de Google"* — sin reintento útil, porque
  `googleLinksInjected` ya la daba por puesta. Medido: inyectar+`load` en el mismo
  tick → **0 caras**; inyectar, **esperar al `<link>`** y luego `load` → **1 cara**.
  Consecuencia real: **ningún preset con fuente Google tenía miniatura**, y el
  fallo era intermitente también en producción.
- 🔴 **`img` sin renderer por defecto** en F1: devolvía `null` (se asumía que
  `ThumbEngine` resolvía el original por su cuenta), pero F1 invoca el render
  directamente → las **128 celdas de `img` contaban como fallo** y la hoja jamás se
  persistía. Ahora pide el original de la celda y lo entrega como `Image`.
- ✅ **F1 tiene tope por celda** (`conTope`, 15 s por defecto): un render colgado
  ya no congela la galería; cuenta como fallo de esa celda y, con ella, la hoja no
  se persiste (I3) y la UI muestra la causa con su **Reintentar** (T020).
- ✅ **Las galerías pintan antes de generar** (estado `listando` del spec 009). En
  presets el listado esperaba a `cargarPresetSprite()`, que ahora *genera* la
  hoja: un render lento dejaba la galería en **0 tiles**.
- ✅ **US3 — las miniaturas de Google ya usan su tipografía real.** La rama
  `esOnline` de `renderFontPreview` devolvía `dibujarPreview(..., '14px
  sans-serif')` **sin tocar la red**: las 57 familias salían con la fuente del
  sistema y todas las celdas eran el mismo render (las 15 físicas sí pasaban por
  `loadFont`, y por eso se veían bien). Ahora descarga la familia y dibuja con ella
  (`cssReal`), degradando al nombre si la familia no llega. Medido: **72 celdas →
  72 renders con hash de píxeles distinto**, 56 peticiones `css2` + 57 woff2 y
  **1 solo POST** (30 s la primera vez; la segunda apertura 0 POST y 0 descargas).
  Esto solo era posible **después** de arreglar la carrera del punto anterior: sin
  `asegurarGoogle` confiable, las 57 familias habrían fallado en lote.
- ✅ **F1 con concurrencia acotada (≤4, `opciones.concurrencia`)**: generar la
  hoja de `img` (128 originales) o de `fonts` (57 familias) en secuencial tardaba
  la **suma** de todas; con 4 en paralelo el total baja al **máximo** por grupo.

### 7.5b RC47 — miniaturas invertidas en la galería de fuentes

La hoja se pinta con **fondo blanco y texto negro** (`dibujarPreviewFuente`), que en
el tema oscuro del editor deslumbra. Se invierte **solo por presentación** con un
`filter: invert(1)` en `.tt-galpanel-invertido .tt-galpanel-tile canvas|img`: la
hoja, el catálogo y su firma **no se tocan**, así que no requiere regenerar nada.
El interruptor (`Invertir`, chico, arriba a la derecha) vive **solo** en la galería
de fuentes y arranca encendido; en imágenes y presets **no** se invierte porque sus
tiles son renders reales y darlos vuelta se vería raro. Sin persistencia (ni
`localStorage` ni `wp_options`): es una preferencia de sesión.

### 7.7 RC48/RC49 — spec 002-text-tab: Bloques A y B

Entrega inicial del feature `specs/002-text-tab` (pestana TEXT). Se ejecuta en
cuatro bloques (A-D) para que cada uno sea verificable por separado; el Bloque A
no depende de la geometria unica y por eso va primero.

- ✅ **La curva ya no borra el texto** (US1, research R1). `curveWebGL` copiaba
  el resultado a un canvas 2D **después** de `loseContext()`: el contexto muerto
  dejaba el resultado vacío (medido: 0 px de tinta con ángulo 120, el texto
  desaparecía). Ahora el orden es dibujar → **copiar a 2D** → perder el contexto
  → devolver la copia, que es 2D y autocontenido. El `loseContext()` se conserva
  (límite de ~16 contextos GPU) pero sobre el canvas ya descartable.
- ✅ **La ruta de salida no degrada** (R-C2.1, constitución II).
  `DistortEngine.curve(capa, angulo, {requireWebGL})` devuelve `null` en vez de
  caer al fallback 2D, y `editor.js` (con `state.headlessRender`, que solo se
  activa en `renderToCanvas`) **rechaza con causa** `curva:webgl:no_disponible`
  en vez de devolver el texto recto. El **editor visible conserva el fallback 2D**
  (R-C2.2): sin WebGL sigue se puede previsualizar.
- ✅ **La barra "Style target" se ve al abrir** (US2, research R2). El registro y
  la llamada inicial de `applyLineTargetGating` estaban **anidados** dentro del
  listener de `textmuy:line-target-updated` que re-sincroniza los gradient
  pickers; ese evento nunca se dispara al arrancar, así que la barra quedaba
  `hidden=true` hasta que el usuario cambiaba de pestaña (medido). Ahora se
  registra al nivel de `bindLineStyleTabs()` y se aplica en el arranque.

**Estado del feature**: Bloques A, B, C y D1-D3 cerrados (US1-US5 y el nucleo de US6). US6 queda a medias solo en la parte diferida a R9 (rotacion y curva por linea).

### 7.18 RC61 — fuera los 136 URLs de TextStudio y los proxies CORS

Segunda pasada de la auditoría, sobre lo que quedaba diferido a decisión del
administrador. **Todo lo borrado era codigo inalcanzable o una fuga de datos.**

- ✅ **Fuera las galerias propias de iconos y fondos** (`controls.js`). Las dos
  funciones, `initIconGallery()` y `initBackgroundGallery()`, empezaban con un
  **`return`** en la primera linea util: todo lo que venia despues era
  inalcanzable. Encima arrastraban **136 URLs de `cdn.textstudio.com`**
  incrustadas (45 cliparts SVG + 91 fondos JSON + las miniaturas `.webp`
  derivadas), contra §5 (los recursos son datos del plugin) y §4.2 (cero fetches
  a terceros fuera del puente). Y el HTML **no tenia sus contenedores**
  (`#tt-icon-gallery`, `#tt-background-gallery`, los search, los `-list` y los
  `-no-result`): verificado por barrido de los 22 IDs `tt-*` del CSS contra
  `index.html`. Las funciones quedan como stub documentado y los iconos/fondos se
  eligen con la galeria unificada (`galeria.js`) sobre el catalogo `img`.
  `controls.js`: 2.647 → 2.389 lineas.
- ✅ **CSS huerfano limpiado** (`style.css`, ~95 lineas). El mismo barrido de IDs
  encontro **11 huerfanos**, cinco mas de los previstos: `#tt-icon-list`,
  `#tt-background-list`, los dos `-list-loading` y `#tt-background-list-no-result`.
  Se fue tambien **`@keyframes tt-spin`**, tras verificar que no lo usaba nada mas
  (era la animacion de esos spinners). `style.css`: 1.993 → 1.884 lineas,
  llaves 292/292.
- ✅ **Fuera los proxies CORS publicos del importador.** `allorigins.win`,
  `corsproxy.io` y `codetabs.com` recibian **la URL que pega el administrador**:
  en un panel de WordPress eso es una fuga de datos involuntaria hacia un destino
  no auditable. Eran ademas la unica via (desde el iframe, leer textstudio.com
  directo lo bloquea CORS). Ahora: `fetch` directo y, si el navegador no puede,
  un aviso que dice **como** pegar el HTML/JSON a mano. La extraccion
  (`window.__PRESET__` / JSON-LD) se conserva y dejo de tragarse los errores: los
  dos `catch(e) {}` vacios ahora informan la causa.
  **Pendiente por diseño**: lo correcto es un `op=fetch-remoto` en el motor (§3),
  para que la peticion salga del servidor del plugin. No se puede hacer solo
  desde el modulo.
- ⚠️ **Sin tocar**: los 5 `confirm()`/`prompt()` nativos (borrar preset, nombre de
  preset, nueva categoria, borrar fuente, borrar imagen). No son fuga ni riesgo de
  seguridad, y reemplazarlos exige inventar un componente inline que hoy no existe
  y que **ninguna suite cubre**: hacerlo a ciegas, sin navegador, es peor que
  dejarlos.
- ✅ **CSS del editor de `palette.styles` retirado** (`style.css`, 53 lineas). El
  barrido de IDs del CSS contra `index.html` lo marco como huerfano y se confirmo
  en la segunda pasada: `.tt-palette-styles` y `#tt-fill-palette-add-style-btn`
  **no se crean nunca** (no estan en el HTML ni en ningun `js`), y el boton
  *Edit* del `<div class="tt-palette">` de `index.html` quedo sin handler.
  **`fill.palette.styles` NO se toca**: sigue soportado por el motor
  (`editor.js::migrateLegacyFillLayers`, verificado en Node: capa con
  `repeat: method` y los estilos mapeados) y viaja en el `.txm`. Es la via de
  **compatibilidad con presets de TextStudio**. La UI para editar esa lista
  **no debe crearse**: ya existe `fill.layers` (controles de relleno, boton
  "+ Add style") y duplicarla seria tener dos formas de editar lo mismo (§7).

### 7.20 RC65 — la sombra exterior se recortaba en el borde de las miniaturas

Defecto visible en la hoja `tm-presets/thumbs.webp` (galeria de estilos): en cada
tile con `shadow.outer` aparecia un **"fantasma" cortado** en la esquina inferior
derecha — una copia del texto, en el COLOR de la sombra (magenta en neon-glow,
rosa en arcade-neon), recortada por el borde del tile. El unico tile limpio era
`script-dorado`, el unico sin `shadow.outer`. Verificado decodificando el WebP
punto a píxel (PIL), no por la vista: el color del fantasma coincidia con
`shadow.outer.fill.color` de cada preset.

- 🔴 **Causa raiz en el dimensionado de `textLayer`.** `calcExtraWidth` YA
  contabilizaba el extra de la sombra (`distance*2 + size*2`) y lo vertia en
  `sourceWidth/sourceHeight`, **pero** `needsExpandedTextLayer` solo usaba ese
  tamano contenido cuando habia ROTACION o CURVA. Con `shadow.outer` y sin
  rotacion, `textLayer` media EXACTO el canvas (200x100 en la miniatura): la
  sombra proyectada se salia del borde de la capa y se recortaba AHI, antes del
  `trimTransparent` + encaje (que solo re-escalaban lo que sobrevivia).
- ✅ **El fix** (`editor.js`): nuevo gate `efectoDesbordante`
  (`shadow.outer/outer2` o `depth/depth2` — efectos que se PROYECTAN fuera del
  glyph, no alrededor como el outline) que amplia `capaExpandida` a los dos
  tamanos. La capa ya no se recorta contra su propio borde; el recorte por tinta
  real + el encaje incondicional (§7.9) meten todo (texto+sombra) en el area
  util. El outline NO activa el gate a proposit: es una protesis alrededor del
  glyph y el autoFit ya le daba sitio (sin regresion).
- ⚠️ **Preexistente, no de los presets nuevos**: neon-hero y retro-comic (del
  administrador) mostraban el mismo fantasma; era un defecto del motor, mas
  visible en las miniaturas chicas (200x100) donde el autoFit llena el tile.
- **Verificado por inyeccion**: diagnostico de tamano de capa sobre los 6
  presets — SIN fix todos componen 200x100 (sombra cortada); CON fix los 5 con
  sombra componen 200x108 / 200x122 (excede el tile, sombra completa) y el que
  no tiene sombra sigue en 200x100 exacto. Regresion nueva
  `tests/sombra-no-recortada.test.js` (falla con el codigo anterior, pasa con el
  fix): 40 suites en verde.

### 7.21 RC65 — schema unico de opciones y fail-fast de rutas

Spec `003-option-schema`. Unifica la identidad y el alcance de cada opcion, que
estaban fragmentados en `OPTION_REGISTRY` (expuesto, sin consumidores), en las dos
listas `GLOBAL_PATHS`/`CANVAS_POR_LINEA` y en el fallback de sync de `controls.js`.
Esa duplicacion ya habia producido una lista desactualizada (RC58).

- ✅ **`OPTION_SCHEMA()`** (`editor.js`), derivado de `defaultSettings`, es la unica
  fuente de verdad: cada hoja declara `{id, nombre, type, default, scope}`.
  `nombre` es la etiqueta ES del menu (TEXT/3D & FILLING/OUTLINES/SHADOWS/...).
  Reemplaza a `OPTION_REGISTRY`, que se purga de la exportacion (sin consumidores).
- ✅ **`scopeDe()` unico** para el alcance (`global` | `linea`), con la precedencia
  excepcion-por-linea > prefijo-global (`canvas.maxFontSize` bajo `canvas`).
  `isGlobalPath` lo consulta. Se purgan `GLOBAL_PATHS` y `CANVAS_POR_LINEA`.
  `contracts/lineas.md` §4 deja de ser una tabla hardcodeada y apunta al schema.
- ✅ **Fail-fast de rutas** (`preset-manager.js::settingsFromDelta`): un `.txm` con
  una ruta inexistente bajo una raiz conocida se rechaza con
  `presets:<n>:ruta_desconocida:<ruta>`, sin aplicar nada (vista intacta, VI).
  **Conservador a proposito**: los ARRAYS se permiten completos (p.ej.
  `fill.gradient.colors[]`, vacio en defaults), los CONTENEDORES DINAMICOS
  (`fill.layers`, `lines.line`, `lines.inherit`) se permiten con su subarbol, y una
  raiz que no es opcion de `defaultSettings` se permite (campo de extension). Asi
  los 6 presets reales y los round-trips no dan falsos positivos.
- ⚠️ **`null` es una hoja, no un grupo vacio**: el walk heredado paraba en `null` y
  dejaba fuera del schema rutas reales como `fill.texture.src` o `icon.src`
  (default `null`). Corregido: entran al schema (`type:'null'`) para que el
  fail-fast no rechace un preset que setee una textura por id. Lo detecto el test
  nuevo antes de pasarlo por bueno.
- **Regresion nueva** `tests/option-schema.test.js`: cobertura de `defaultSettings`,
  alcance de `isGlobalPath`, fail-fast (ruta inventada + raiz desconocida permitida
  + dinamicos/arrays) y round-trip de los 6 presets reales sin rechazo. 41 suites.
- **No cambia** el formato `.txm` (sigue siendo delta anidado, IV) ni el motor de
  render ni `resolveLine`. La Mejora 3 (nombres/menus para regenerar la UI) queda
  fuera: el campo `nombre` ya viaja en el schema, listo para consumirse.

### 7.22 RC65 — el fail-fast rechazaba los presets que el editor producia

Regresion de RC64 detectada en produccion al validar en navegador. El validador
de rutas rechazaba presets REALES (`vsdvsdv`) con
`presets:?:ruta_desconocida:distort.active`. Causa: el schema, derivado de
`defaultSettings`, no cubre (a) los colores que `loadPreset` convierte a hex ni
(b) los campos derivados/legacy que el propio editor escribe. O sea: cualquier
preset que el usuario cargara y volviera a guardar (ciclo load->save->reload)
dejaba de recargar. Re-arreglar los presets NO bastaba: el editor re-producia el
formato rechazado en cada guardado.

- 🔴 **Barrido completo**: 227 asignaciones `s.*` en `loadPreset`, 37 rutas en
  hueco respecto al schema, en dos familias:
  - **Color hex (~20)**: `loadPreset` hace `s.X.color = rgbToHex(...)` donde
    defaults tienen `{r,g,b}` (schema solo conoce `.r/.g/.b`). Afecta `fill.color`,
    `background.fill.color`, `depth.fill.color`, `shadow.*.fill.color`,
    `outline.*.fill.color`, `bevel.*.highlight|shadow.color`, etc.
  - **Derivados/legacy (~5+2)**: `distort.active` (loadPreset lo escribe, defaults
    no; nunca se lee), `canvas.background`, `fill.gradient.startColor`/`endColor`,
    `lettering.reverseOverlap.active`, y los subarboles `outline.first|second.specular`.
- ✅ **Fix en el validador** (`preset-manager.js`), sin tocar `loadPreset` ni el
  formato `.txm`:
  - **Color hex** (R-O4.4): se acepta `X.color` como STRING cuando `X.color.r/.g/.b`
    existe en el schema. Cubre la familia entera de un salvo.
  - **Allowlist `CAMPOS_LEGADO`** (R-O4.5): `distort.active`, `canvas.background`,
    `fill.gradient.startColor`/`endColor`, `lettering.reverseOverlap.active`. Va en
    el validador, NO en `defaultSettings` (legacy/muerto: Constitucion VII).
  - **`outline.*.specular`** agregado a `RUTAS_DINAMICAS` (`editor.js`) como
    subarbol dinamico (defaults no lo declaran; loadPreset lo copia entero).
- ✅ **El fail-fast no se quedo ciego**: un typo real (`fill.colorx`, `font.sz`)
  sigue rechazando con causa. Verificado por inyeccion.
- ✅ **Regresion del ciclo**: `tests/option-schema.test.js` ahora simula el ciclo
  load->save->reload (preset con colores objeto -> `loadPreset` -> `diffSettings` ->
  `settingsFromDelta`) y exige que el delta que PRODUCE el editor recargue sin
  rechazo. 41 suites en verde.
- ⚠️ **Limite conocido**: el allowlist cubre todo lo que produce `loadPreset` (la
  fuente principal de datos del editor), pero no garantiza al 100% que un preset
  hecho a mano no traiga otro campo exotico; en desarrollo eso es aceptable (si
  aparece, se agrega al allowlist con su causa). Bajarlo a "solo warn" es de una linea.


### 7.23 RC66 — la sombra exterior salia como COPIA DURA corrida abajo-derecha

El usuario confirmo el sintoma en `retro-comic` (y era preexistente): una copia
**dura** del texto, en el color de la sombra, desplazada hacia abajo-derecha.
Al apagar "Outer Shadow #1" desaparecia: la capa culpable era la sombra exterior.

- 🔴 **Causa raiz en `editor.js::applyBlur` (bug real, NO del navegador).**
  El canvas de la sombra trae la transformacion CENTRADA del llamador
  (`offCtx.setTransform(ctx.getTransform())`). `applyBlur` corria
  `clearRect`/`drawImage` **sin resetear esa transformacion**: el clear solo
  barria el cuadrante inferior-derecho y el difuminado se pegaba corrido media
  capa. La copia dura sobrevivia en un cuadrante. Medido en navegador real
  (Chrome + GPU NVIDIA D3D11): 757 px duros y centro del blob en 149,110
  contra el 110,80 esperado; con el reset: **0 px duros** y centrado.
- ✅ **Verificado end-to-end con el preset real**: render de `retro-comic` con
  el codigo del modulo en Chrome (Playwright + datos de `uploads/pmu`):
  **VIEJO** = 2.282 px de sombra DURA con bbox pegado a la esquina
  (485,267→578,385 en un lienzo 600x400); **NUEVO** = **0 duros / 15.951
  suaves**. El blur nativo (ctx.filter) SI funcionaba: el diagnostico de un
  cuadradito lo confirmo en la misma maquina (el texto con blur se esparce
  142→220 px).
- ✅ **Espacio identidad**: `applyBlur` hace `save()` +
  `setTransform(1,0,0,1,0,0)` antes de `clearRect`/`drawImage`/`putImageData`
  y `restore()`. Vale para las dos ramas (nativa y manual).
- ✅ **Fallback manual con auto-test** (decision del usuario: Opcion B).
  `detectarBlurNativo()` corre UNA vez por sesion: dibuja un cuadradito de
  12x12 y mide si se esparce con el blur nativo. Si no (ctx.filter declarado
  pero sin efecto — pasa en renderizado por software), todas las sombras van
  por `boxBlurData` (box blur separable de 3 pasadas, puro, sin vendors:
  StackBlur fue retirado y no se reintroduce). `applyBlur(canvas, radio,
  modo)` admite `'auto'|'nativo'|'manual'` para que las suites cubran las dos
  ramas sin GPU.
- ⚠️ **Falso positivo del auto-test original corregido**: un puntito de 2 px
  difuminado queda tan tenue que el umbral de alpha lo daba por "blur roto"
  (0 px). El cuadradito es de 12x12 y el criterio es comparativo
  (despues > antes * 1.3), no un umbral absoluto.
- **Regresion nueva** `tests/sombra-blur.test.js`: (1) boxBlurData difumina un
  buffer real; (2) la rama nativa limpia y pega en espacio identidad aunque el
  canvas traiga transformacion centrada (falla con el codigo anterior);
  (3) la rama manual devuelve por putImageData; (4) el modo auto cae al manual
  cuando el cuadradito no se esparce. 42 suites en verde.


### 7.24 RC67 — las capas offscreen se pegaban corridas media capa (sombra centrada en la esquina)

Tras RC66 la sombra salio por fin DIFUMINADA, pero el usuario vio que seguia
mal ubicada: "su centro esta en su esquina superior izquierda / se centra en la
esquina inferior derecha del canvas". Medido en navegador (Playwright + Chrome
real, preset `retro-comic` en 600x400): la bbox de la sombra quedaba centrada
en (516,310), con el texto en (300,200).

- 🔴 **Causa raiz: el composite de las capas offscreen usaba `drawImage(img,
  0, 0)` bajo la transformacion CENTRADA del lienzo.** El contenido de la capa
  (sombra, relieve) se dibuja en el CENTRO de la imagen (se pinta con la misma
  transformacion centrada, `setTransform(ctx.getTransform())` o
  `translate(w/2,h/2)`). Con `drawImage(..., 0, 0)` la ESQUINA de la imagen
  cae en el centro del lienzo y el contenido, centrado en la imagen, termina
  en la esquina inferior-derecha, recortado a un cuarto. El propio codigo lo
  documentaba en otro efecto (`drawTextStrokeAligned`: "la transformacion debe
  resetearse, sino el dibujo cae a media capa de distancia"); la sombra y el
  relieve no lo hacian.
- ✅ **Fix: compositar CENTRADO** — `ctx.drawImage(img, -img.width/2,
  -img.height/2)` en los 8 sitios: sombra exterior (2 ramas x offset/sin
  offset, 4 sitios), sombra interior (3 sitios, rama mask y sin mask) y
  relieve WebGL `drawBevel` (1 sitio). El specular (1 sitio) lleva el mismo
  composite corregido; su fuente sigue siendo `state.canvas` en vez de la
  capa de texto (pendiente aparte, nadie lo usa).
- ✅ **Medido en navegador tras el fix**: sombra aislada de `retro-comic`
  centrada en (299,191) [antes 516,310]; render completo con todas las capas:
  tinta oscura centrada en (303,191), bbox [192,84 → 413,298] alrededor del
  centro del lienzo.
- ✅ **Regresion nueva** `tests/sombra-posicion.test.js`: mock que registra
  las coordenadas de cada `drawImage` y exige composites en (-w/2, -h/2)
  para sombra exterior, sombra interior y relieve (con stub de
  `BevelWebGLEngine` inyectado, sin GPU). 43 suites en verde.


### 7.25 RC68 — letra blanca con gradiente + 404 al aplicar una imagen de la galeria

Dos defectos reportados por el usuario en produccion, con causas raiz distintas:

- 🔴 **Letra blanca al cargar un preset con gradiente** (`cyber-pop`). De los 10
  sitios de gradiente de `loadPreset` (outline x4, shadow x2, depth x2,
  background, fill), el PRINCIPAL (`fill.gradient`) era el UNICO que no copiaba
  `colors`: calculaba `startColor`/`endColor` con `rgbToHex(colors[0])`, pero
  `colors[0]` es un STOP `{color,pos}` y no `{r,g,b}` — quedaba basura y el
  array `colors` VACIO. `migrateLegacyFillLayers` (que exige >=2 stops) caia al
  fallback de color plano = default BLANCO. Fix: copiar `colors` como los otros
  sitios. Verificado en navegador: 24.851 px de color (cian 8.547 / magenta
  2.206) contra los ~1.060 blancos que son el outline claro del propio preset.
- 🔴 **"Aplicar" una imagen desde la galeria: preview OK pero al confirmar 404
  (`GET .../modules/textmuy/6`) y la imagen no se ve.** La galeria guarda el ID
  numerico en el settings (contrato R2) y el editor no lo resolvia al aplicar:
  (a) los cargadores pedian `img.src = 6` como URL RELATIVA (caminos sin guard
  del motor de capas de relleno y refs numerico-STRING del fondo); (b) la
  imagen no se mostraba porque render() omite refs numericas hasta que
  `prepareImgRefs` las resuelve (y eso solo pasaba al cargar presets).
  Fix: (1) `esRefImgNumerica` pasa a helper de MODULO (detecta number y string
  numerico sin depender de TextMuyCatalog) y guarda la entrada de los 3
  cargadores (`loadIconImage`/`loadTextureImage`/`loadBackgroundImage`);
  (2) `controls.js::repintarConRefsResueltas` replica el camino de `loadPreset`
  (`prepareImgRefs` + render) y lo invocan los callbacks de aplicar de fondo y
  textura de capa. Verificado en navegador: 0 `Image` con src relativo.
- ⚠️ **Comportamiento documentado, no nuevo**: tras resolver, el estado queda
  con URLs (igual que `loadPreset` hoy), asi que un preset guardado tras
  aplicar puede llevar la URL en el `.txm`. Normalizar URL->id al guardar queda
  como mejora aparte si se quiere el contrato R2 estricto.
- **Regresion nueva** `tests/carga-gradient-imgrefs.test.js`: (A) `cyber-pop`
  carga los 3 stops y la capa migrada es de tipo `gradient` (no el fallback
  blanco); (B) refs numericas (number y string) no generan NINGUN `Image.src`
  relativo y una URL real SI se carga (el guard no sobre-bloquea). 44 suites en
  verde.


### 7.19 RC62 — cargar un preset de la galeria rompia el editor (`defaultSettings is not a function`)

Defecto visto en produccion (muyunicos.com, RC61): al tocar un tile de la galeria
de presets la consola mostraba `TypeError: defaultSettings is not a function` y el
preset no cargaba. **No era un problema de cache**: el `?v=RC61` del log coincide
con el repo.

- 🔴 **`editor.js::loadPreset` llamaba `defaultSettings()` como si fuera funcion.**
  `defaultSettings` es un **objeto** (`const defaultSettings = {...}`); la funcion
  que devuelve una copia limpia es `createDefaultSettings()`. El error estaba en
  las dos lineas de la rama `else` (la que corre cuando se carga **sin**
  `targetSettings`, o sea el camino real de la galeria:
  `PresetManager.loadPreset(name)` -> `TextEditor.loadPreset(settings)`):
  - linea 3739: `state.settings = JSON.parse(JSON.stringify(defaultSettings()))`
  - linea 3832: `s.lines = JSON.parse(JSON.stringify(defaultSettings().lines))`
  Ambas ahora usan `createDefaultSettings()`.
- ⚠️ **Por que ninguna suite lo veia**: las 39 suites anteriores pasaban SIEMPRE
  `target` como 2o argumento de `loadPreset`, que toma la rama `if (targetSettings)`
  y nunca ejecuta el `else` con el bug. La rama sin-target es justo la que usa la
  galeria. **Leccion**: un contrato con dos ramas necesita cobertura de AMBAS.
- ✅ **Regresion nueva**: `tests/preset-load-sintarget.test.js` carga un preset
  (con y sin `lines`) por el camino sin-target y exige que no lance. Verificado que
  **falla con el codigo anterior** (`defaultSettings is not a function` en
  editor.js:3739) y **pasa con el arreglo**. 40 suites en verde.


### 7.17 RC60 — auditoría: fail-fast del `.txm`, `eval` y la guarda que no guardaba

Cierre de la auditoría completa del módulo. Las 38 suites siguen en verde y el
bump quedó en **RC60**. Cuatro arreglos, todos con regresión en Node:

- ✅ **La versión del `.txm` se valida al leer** (era un agujero de fail-fast).
  `api.js::loadPresetByName` y `preset-manager.js::fetchPreset` comprobaban
  `format` y `settings` pero **nunca `version``, y `validarFormatoLineas` solo
  rechaza cuando el delta trae `overrides` 0-based o `sizing` global. Un `.txm`
  v1 sin `lines` entraba en silencio y el render salía con defaults donde el
  delta ya no significaba lo mismo. Ahora: `presets:<nombre>:formato:version`.
  La deteció la suite nueva sobre un fixture real: `neon-glow.txm` de los uploads
  del administrador está **en v1** y pasaba el portón (los otros dos, v2).
  El rechazo no se cachea, igual que un fallo de red: el retry reevalúa.
- ✅ **AGENTS.md §4.5 decía `version:1`** mientras `preset-manager.js` escribía
  `PROJECT_VERSION = 2`. Corregido a v2 y documentado el fail-fast. Quien leyera
  solo la regla crítica escribía un preset que el propio módulo rechazaría.
- ✅ **Fuera el `eval()` de las burbujas de slider** (`controls.js`). Los 11
  sliders resolvían `data-bubble` con `eval()` sobre un atributo del DOM, en
  cada render: ejecución de código arbitrario heredable por cualquier input
  nuevo. Ahora `data-bubble` es un **nombre de formato** (`pct` / `pct-directo` /
  `grado`) y `textoBubble()` compone el texto. Cero `eval` ejecutable.
- ✅ **Una sola composición de `ctx.font`** (RC39). `autoFitText` y
  `fitSingleLine` armaban el valor a mano y quedaban fuera del punto único de
  `aplicarFuente`. Extraída `componerFuente(s, px)`: la usan las tres, y la
  familia sigue llegando entrecomillada de `familiaDeFuente`.
- ✅ **La guarda de entorno no guardaba.** `tests/entorno.test.js` pasaba la ruta
  **absoluta** a `esTextoDelModulo()`, que compara contra nombres **relativos**
  con `/`: en Windows ningún `js/...` coincidía, así que el barrido real solo veía
  los 2 arraigados. Los 90 "archivos verificados" que imprimía eran los de
  extensión suelta; `.editorconfig` y `.gitattributes` —los dos que fijan charset
  y EOL— estaban en **CRLF en el worktree** con la suite en verde. Ahora normaliza
  a relativo con `/`, valida **81 archivos** y exige que los arraigados entren.
  Verificado **por inyección**: con CRLF en `.editorconfig` la suite falla.
- ✅ **Higiene**: borrados los 3 `.cjs` de 0 bytes versionados
  (`diag-maxfont`, `generar-presets`, `visible-editor`; el segundo entró vacío en
  `4e75650`); `estilo-tema.test.js` ya anuncia su OK como las demás; los `alert()`
  del importador pasaron a estado en línea (`#tt-import-status`) y el mensaje en
  inglés se tradujo; `assertWebGLDisponible()` cachea el resultado y suelta el
  contexto (creaba uno por item de `renderBatch` sin `loseContext`, acercándose al
  límite de ~16 que los motores sí respetan).

⚠️ **Pendiente por decisión del administrador, no por olvido**: quedan 4
`confirm()`/`prompt()` nativos (borrar preset, nombre de preset, nueva categoría,
borrar fuente) porque no tienen equivalente inline obvio; los 136 URLs de
`cdn.textstudio.com` incrustadas en `controls.js` (974-1175) y los proxies CORS
públicos del importador, que son decisiones de producto (§4.2/§5: los recursos
son datos del plugin). Está documentado en la auditoría, no implementado.

### 7.16 RC58 — cierre de US6 y bloque D4 (rotación y curva por línea)

Cierra US6 y deja anotado lo que queda aparte, con la decisión y el porqué.

- ✅ **`lineHeight` vuelve a ser POR LÍNEA** (revierte una desviación que se había
  registrado durante la implementación; el spec FR-016 siempre dijo que todo era
  por línea). Sale de la tabla global y resuelve por línea como el resto.
- ✅ **Escala de −100% a +200% con base 0% = ajuste justo**
  (`avance = (cola_i + asta_{i+1}) * (1 + pct/100)`, R-G1.2). Medido con tres
  tipografías reales a 90 px (Bangers 69, Permanent Marker 69, Rock Salt 122 de
  alto):
  - `-100%` → avance 0: las líneas quedan **encimadas** (el efecto "HOLA" grande
    atrás con un script delante encima).
  - `0%` → ajuste justo, sin hueco y **sin solape**: 68 px entre L1 y L2, 102 px
    entre L2 y L3 (la diferencia es la cola de la de arriba más el asta de la de
    abajo, que es lo que Rock Salt necesita).
  - `+200%` → **tres veces** el normal.
  - Con una sola tipografía el "justo" da el tamaño de línea y `0%` reproduce el
    comportamiento histórico: los presets existentes no se mueven.
  - El aire *anterior* a una línea lo controla **esa** línea, así que ir a L3 y
    subir su Line height separa L3 del resto. L1 queda sin efecto (no hay línea
    encima, FR-021).
- ✅ **Una sola fuente de verdad del alcance por línea**: `controls.js` tenía su
  propia lista de rutas globales, desactualizada (marcaba `align`,
  `letterSpacing` y `font.src` como globales cuando son por línea, y listaba un
  `lines.sizing` que ya no existía). Ahora consulta `editor.isGlobalPath`.
- ⚠️ **`rotate` y `distort` siguen GLOBALES** hasta el bloque D4. Aplican al
  bloque compuesto entero al final del render. Hacerlos por línea exige **partir
  el pipeline en una capa por línea** (componer cada línea con su estilo
  resuelto, aplicarle su giro o su curva, y recién después apilar): relleno,
  contorno, sombra, relieve y texto pasarían a existir una vez por línea en vez de
  una vez por bloque. Si solo se sacaran de la tabla global, el control por
  línea aceptaría el valor y **no haría nada**, sin aviso. Lo que se quiere:
  `ALL 90° + L1 +10 / L2 −10 / L3 +10` → `\/` y
  `ALL 90° + L1 curva + / L2 curva −` → `()`. Está documentado como fase
  aparte (D4) en `tasks.md` con sus tareas.
- **Pruebas**: `avance-lineas` reescrita a la escala nueva (0% justo, +200%
  triple, −100% encimadas, y el "justo" midiendo las métricas de **cada** línea
  del par), `pattern-block-box` igual, y `lineas-resolucion` fijando que
  `lineHeight` es por línea y `rotate` sigue global. 38 suites en verde y
  9/9 en el navegador.

### 7.15 RC56/RC57 — el texto es una MUESTRA, no el contenido

Aclaracion del objetivo de la herramienta (2026-10-04): **el editor sirve para
DISEÑAR un estilo**. El texto del cuadro es una muestra; lo que viaja al PDF es
el texto que escribe el cliente, que puede ser largo, de una o de varias lineas
y en general DISTINTO del que se uso para disenar. Tres correcciones:

- **Fuera el control "Tamano" de la barra.** Se habia agregado para cumplir
  FR-012, pero duplicaba "Max Font Size (1 character)" y se compensaban. El
  tamano lo gobierna ese unico control.
- **"Hereda de:" y "Sizing ref:" ofrecen SIEMPRE L1/L2/L3.** Antes se
  limitaban a las lineas escritas en ese momento (`if (li > nLineas) return`),
  lo cual ataba el diseno al texto de prueba: con una sola linea, "Hereda de" solo
  ofrecia ALL y no habia forma de definir la estructura de lineas (medido). Los
  botones L1/L2/L3 nunca se desactivan, y es lo correcto: se esta disenando como
  se vera un texto de tres lineas aunque ahora haya uno escrito.
- **"Max Font Size (1 character)" declara que es global** (chispeta `global` con
  tooltip) **solo en All**. Con una linea activa el mismo control manda sobre ESA
  linea (RC57, `canvas.maxFontSize` es la unica excepcion de la tabla global) y
  se compara contra lo que diga `Sizing ref:`. **El valor siempre es un porcentaje
  relativo, nunca pixeles fijos**: el lienzo es dinamico (500 px o 5000 px) y el
  texto debe seguir al tamano que necesite el cliente (decision del usuario).
- **Prueba nueva `tests/estilo-tema.test.js`**: diseña un estilo compuesto
  (fuente por linea, outline, depth 3D, herencia) con un texto de muestra y lo
  aplica a OTROS textos, que es el caso real: una linea larga, tres lineas, cuatro
  (L4 resuelve como All), texto vacio, con acentos. Nunca se habia probado este
  recorrido: todas las pruebas usaban el mismo texto para disenar y para
  renderizar, asi que un estilo que solo funcionaba con su muestra pasaba
  inadvertido. 38 suites en verde.

### 7.14 RC55 — prueba del EDITOR VISIBLE: solo se pintaba L1

Las mediciones anteriores eran todas del lienzo de SALIDA (`renderToCanvas`).
Al medir tambien el lienzo **visible** del editor, con capturas, aparecio un
defecto que ninguna de las 37 suites veia.

- 🔴 **Con estilo por línea solo se pintaba L1.** `forEachLineSetting` pasaba a
  los motores un array de **una** línea (`[lines[li]]`) junto al indice global
  `li` como filtro, y en `drawTextLines` ese filtro nunca coincidia para L2/L3:
  solo se pintaba la primera. Los motores que reciben el array completo
  (outline, sombras, icono) no lo sufrían; solo el *fill*, que es el que pinta el
  texto. Era un defecto **preexistente** que con D2 se volvía alcanzable desde la
  interfaz (antes casi nadie configuraba líneas, y el que lo hacía via un `.txm` guardado a mano).
  Ahora `forEachLineSetting` pasa texto y array completos con el indice, igual que
  la rama de bloque.
- **Cómo se detectó**: midiendo el lienzo visible por COLOR (el editor dibuja el
  damero de transparencia `#1a1a1a`/`#222`, así que la tinta es todo lo que no
  sea uno de esos dos tonos). Antes de arreglar: 6.209 px de tinta en 69 filas;
  después: **23.854 px en 259 filas**, y la captura muestra las tres líneas con
  tres tipografías distintas.
- **Regresión fijada** en `tests/lineas-resolucion.test.js`: se registran las
  baselines realmente pintadas y se exigen tres. Verificado que **falla con el
  código anterior** (`got 1 baselines`) y pasa con el arreglo.
- ⚠️ **Medir el editor visible es distinto de medir la salida**: el visible tiene
  fondo (damero) y la salida es transparente. Un recorrido que mida solo la
  salida puede dar verde mientras la pantalla muestra otra cosa.

### 7.13 RC54 — Bloque D3: fuente propia por línea (el corazón de US6)

Convierte el modelo en tres líneas con tres personalidades. Es el cambio que hace
que el estilo por línea valga algo: sin esto, tres líneas con tipografía distinta
se medían todas con la de la base y ajustaban mal.

- ✅ **`editor.fuentesPorLinea(s)`**: el manifiesto de fuentes del render, una
  entrada por línea **usada** (nada de `preloadAll`: constitución VI). Una línea que
  hereda no aporta fuente propia; la de la base se lista una sola vez.
- ✅ **Cada línea se mide con SU tipografía** (`blockLayout` y `drawTextLines`
  resuelven la línea antes de medir y de pintar). El defecto real era que todo se
  medía con una sola fuente: el ancho medido no era el que se pintaba.
- ✅ **El editor carga una fuente por línea** (`asegurarFuenteDeclarada`), en
  paralelo y con cache por identidad; un fallo **nombra la línea y la fuente**
  (`linea L2: fonts:2:no disponible`) sin impedir el resto (FR-017).
- ✅ **La ruta del PDF hace lo propio** (`api.js::ensureFontReady`): una fuente
  por línea usada, cada una una sola vez, sin precargar. Antes cargaba solo la de
  la base, así que el PDF salía con la tipografía equivocada en L2/L3.
- **Verificación**: `tests/fuente-por-linea.test.js` (37 suites en verde) y el
  recorrido integrado sube de 28 a **32/32** en el laboratorio, con **tres
  identidades reales del catálogo**: cada línea resuelve una fuente distinta, el
  manifiesto pide tres, las tres líneas **se miden con tipografías distintas**
  (anchos 123 / 170 / 297 px) y el PDF sale bien (FR-020).

### 7.12 RC53 — Bloque D2: la interfaz del sistema de líneas (US6)

Convierte el modelo de D1 en algo manejable desde el editor. Todo vive en la
**barra existente** (sin panel nuevo) y solo aparece con un target L1/L2/L3.

- ✅ **Selector de herencia** ("Hereda de:"): `ALL` por defecto o la línea que
  se le elija. Se guarda en `lines.inherit` y `setLineInherit` vuelve a validar
  contra ciclos aunque llegue por otra vía (FR-012, R-L1.2).
- ✅ **El tamaño de línea reescribe el porcentaje** (FR-011, FR-012): un slider
  nuevo en la barra cuya **unidad depende de la referencia** — con referencia a
  otra línea mueve el `pct` (la cadena sigue viva: si L1 crece, L2 la sigue) y
  con referencia al lienzo escribe px absolutos. Antes no existía ningún control
  de tamaño por línea: el tamaño solo se auto-ajustaba.
- ✅ **Anti-ciclos en la UI** (`editor.opcionesValidas`): los dos selectores
  ofrecen solo opciones que no cierran un ciclo, transitivas y por ambas aristas.
  Se prueba la asignación sobre una copia y se descarta si `detectarCiclos` la
  rechaza (FR-013, R-L3.1).
- ✅ **El sync muestra lo que la línea resuelve**, no la base, y marca
  `data-line-override` según si la línea **declara** la ruta o la hereda. El
  filtro por lista de "estilizables" desapareció en D1.
- Solo se ofrecen líneas que **existen en el texto**: lo configurado para líneas
  inexistentes se conserva y reaparece (FR-015).
- **Verificación**: el recorrido integrado sube de 20 a **28/28** (0 errores de
  consola). Comprueba en el navegador real que los selectores se ocultan en All,
  que al elegir L2 aparecen con `ALL` y sin ofrecerse a sí misma, que la
  herencia se guarda, **que la opción que cerraría un ciclo desaparece del
  selector**, que el slider escribe el porcentaje y que L2 resuelve al 70% de L1
  (L1=76 → L2=53).

### 7.11 RC52 — Bloque D1: el modelo de líneas (núcleo + formato v2)

Primera parte del Bloque D (US6). Reemplaza el modelo de líneas anterior sin
tocar la interfaz: **si no hay nada configurado por línea, el resultado es
idéntico al de antes**, y el recorrido integrado lo confirma (20/20 sin cambios).

- ✅ **`settings.lines` = `{ activeTarget, inherit, line }`** con claves **1-based**
  (`line["1"]` = L1). `inherit` es el padre de cada línea (ALL por defecto);
  `line["n"]` guarda su estilo propio y **su** regla `sizing {ref, refLine,
  mode, pct}`. Desaparecen `overrides` (0-based) y el `sizing` global.
- ✅ **Resolución en tres pasos** (`editor.js::resolveLine`): heredar (de ALL o
  del estilo **resuelto** de la otra línea) → mezclar el delta propio (disperso) →
  dimensionar por porcentaje. Con `memo` por render: la resolución es recursiva
  por la herencia y sin memoizar se multiplicaba por línea y motor (R-L1.1-R-L1.5).
- ✅ **Anti-ciclos por ambas aristas** (`detectarCiclos`): DFS con pila sobre
  herencia y dimensionamiento, cualquier longitud, con causa
  `lines:L2>L3>L2:ciclo`. Un archivo editado a mano con un ciclo **no cuelga el
  render**: la resolución cae a la base (R-L3.2, FR-014).
- ✅ **`.txm` `version:2`** con validación de formato: un delta con
  `lines.overrides` o `lines.sizing` (el formato v1) se **rechaza con causa**
  `presets:formato:lineas_v1`. Sin lectores ni migración (constitución VII
  v3.2.0). Las líneas configuradas **no se podan** al cargar (FR-015).
- **Purga** (constitución VII): `isGlobalOnlyPath`, `pruneGlobalOnlyOverrides`,
  `LINE_STYLE_PATHS`/`isLineStylePath` y `resolveLineSettings` desaparecieron.
  El alcance por línea ya no se filtra con una lista de "estilizables": decide
  `isGlobalPath` (contrato `contracts/lineas.md` §4).
- ⚠️ **Desviación de FR-016 registrada**: `lineHeight`, `rotate` y `distort`
  quedan **globales**. `lineHeight` por decisión del usuario (un control global
  coherente es mejor que uno por línea que a veces no mueve nada, FR-021);
  `rotate`/`distort` se extraen al spec de R9 (partir el pipeline en capas por
  línea). Está documentado en `spec.md` y en `contracts/lineas.md` §4.
- 4 suites nuevas (`lineas-resolucion`, `lineas-tamano`, `lineas-ciclos`,
  `lineas-formato`) que fallaban antes; **36 suites en verde**.

Pendiente: D3 (fuente por línea).

### 7.10 RC51 — recorrido integrado US1–US5 (20/20) y dos defectos que Node no veía

Validado en el WordPress de laboratorio (Chrome + Playwright, `C:\wp-lab`,
`localhost:8091`, iframe real del plugin, puente real, catálogo real con 72
fuentes y tipografía **Bangers**): **20/20 comprobaciones OK, 0 errores de
consola**. El recorrido mide la tinta sobre el lienzo de salida
(`renderToCanvas`, el mismo `render()` del editor) con el fondo desactivado, así
la cuenta es solo del texto.

El recorrido encontró **dos defectos que las 32 suites de Node no detectaban**:

- 🔴 **El recorte recentraba la capa y deshacía el anclaje de L1.** Al recortar
  la tinta y volver a centrar la capa, el origen del bloque se desplazaba: con
  dos líneas, subir el interlineado movía **también la primera** (medido: `y` de
  154 a 150). Es un conflicto entre US4 (encaje) y US5 (L1 anclada) que solo
  aparece al combinar ambos. `DistortEngine.trimTransparent` acepta ahora
  `{centrar: true}` y devuelve el menor rectángulo con **el mismo centro** que el
  lienzo original, de modo que el origen no se mueve.
- 🔴 **Con Margin 0 la tinta llegaba al borde.** El encaje apuntaba al área útil
  exacta, así que un texto que llena el ancho entraba en la columna 0 (medido:
  **112 píxeles** de tinta en el borde). Ahora el encaje apunta al área útil
  **reducida en 2 px por lado** (el margen de seguridad de R-G2.1), de modo que
  ni con Margin 0 hay tinta en filas o columnas del borde.

⚠️ **El laboratorio no traía datos**: `uploads/pmu/` en `C:\wp-lab\wordpress` no
tenía `fonts/` ni `tm-presets/`, así que el catálogo no cargaba y la prueba de
paridad fallaba con `fuente:fonts:1:ausente o invalido`. Se copiaron desde el
repo (`uploads/pmu/fonts` y `tm-presets`, 15 fuentes físicas + `fonts.json`). Sin
eso el módulo no puede resolver ninguna fuente y el editor cae a la del sistema.

Ambas regresiones quedan fijadas en Node: el recorte centrado en
`tests/curva-snapshot.test.js` (comprueba que el centro del lienzo queda en el
centro de la capa recortada) y el margen de seguridad en
`tests/encaje-final.test.js` (tres casos que llenan el lienzo).

### 7.9 RC50 — Bloque C: el encaje final se aplica siempre (US4)

El encaje final ya existía, pero **solo corría en el camino con recorte** (curva o
rotación). Por eso la rotación "enmascaraba" el desborde: con cualquier otra
combinación de layout la capa completa se volcaba en el lienzo y el texto se
salía del margen pedido (medido: tinta en la columna 479 y 50+ px en la fila 0).

- ✅ **El recorte y el encaje son incondicionales** (`editor.js::render`). La capa
  compuesta se recorta por su tinta real siempre y se escala a la caja
  disponible con el gutter de antialiasing como margen de seguridad (R-G2.1).
- ✅ **El encaje solo reduce** (`Math.min(1, ...)`): con un lienzo enorme el texto
  no crece para ocupar el espacio (R-G2.2, no compite con el ajuste).
- ✅ **El tamaño de salida no se toca**: `settings.canvas.width/height` siguen
  siendo la única fuente de verdad; el encaje es interno (R-G2.3, constitución II).
- ✅ **Un solo camino** para editor y motor: el encaje vive en `render()`, que es
  el mismo código en el editor visible y en `renderToCanvas` (paridad FR-020).
- **Prueba**: `tests/encaje-final.test.js` **no mira el código**: reproduce la
  matriz de transformación del contexto (`translate`/`scale`/`rotate`/`drawImage`)
  y comprueba que la caja que de verdad se dibuja cabe en el área útil, en 13
  combinaciones (texto largo, multilínea, rotación ±, margen 0,1/0,3/0,5,
  interlineado amplio, lienzo apaisado, vertical y apaisado con margen). Antes del
  arreglo fallaba en `margen al maximo` (`se sale por la izquierda: 0.0 < 132.0`).

### 7.8 RC49 — Bloque B: la geometría única de bloque (área útil + avances)

El eje del feature: **lo calculado tiene que ser lo pintado**. Antes el área útil
se calculaba en tres sitios distintos y el modelo de bloque tenía dos fórmulas
(`n * px * lineHeight` centrado en el ajuste y en el dibujado), así que lo que
se ajustaba no era lo que se pintaba.

- ✅ **Un solo cálculo del área útil** (`editor.js::areaUtil`). El margen se mide
  contra el **lado menor** del canvas —no contra el ancho— y se topa para
  conservar siempre un mínimo del 12% del lado menor. Con un lienzo apaisado
  (800x200) el margen ya no colapsaba al 13%; con margen al 50% el texto se
  achica pero **no desaparece** (US3, R-G1.4). Sustituye a los tres cálculos
  duplicados de `autoFitText`, `render` y `lineFontSizes`.
- ✅ **Un solo modelo de bloque** (`editor.js::blockLayout`): baselines por tinta,
  avances acumulados y caja del bloque. Lo usan `drawTextLines`, `drawFillUnits`,
  `drawIconLine`, `getTextBlockBox` y el dimensionado de la capa fuente. Con
  `lineHeight = 1` reproduce exactamente la geometría anterior (sin regresión).
- ✅ **L1 ancla el bloque** (US5, R-G1.2, FR-021): el anclaje se calcula con el
  interlineado de referencia, así la primera línea **no se mueve** al mover Line
  height y el bloque crece hacia abajo; con una sola línea la posición y el
  tamaño son invariantes en todo el rango (FR-007). La línea *i* baja
  `lineHeight * tamaño[i-1]`, o sea el avance lo da el tamaño **de la línea de
  arriba**: con tamaños por línea distintos nunca se superponen (R-G1.3).
- ✅ **La capa fuente sigue al bloque**: con interlineado > 1 se dimensiona por
  el semialto mayor, de modo que entra todo el texto y el origen sigue en el
  centro (esto es lo que evita el recorte al abrir la línea, y es la precondición
  del encaje final del Bloque C).
- **Purga**: `getTextBlockMetrics` se eliminó al quedar sin consumidores (VII: sin
  rutas dobles). Las dos suites nuevas (`area-util`, `avance-lineas`) fijan el
  contrato y además renderizan de verdad para comprobar que lo pintado sale del
  modelo, no solo que el helper sea correcto.

⚠️ **Gobernanza adelantada al código**: la constitución ya está en **v3.2.0**
(`.txm` `version:2`, claves 1-based, alcance por línea ampliado, sin migración),
pero el módulo sigue escribiendo el formato viejo hasta el Bloque D. Los `.txm`
con el formato de líneas anterior quedan inválidos al aplicar el nuevo, **por
diseño y sin lector** (constitución VII v3.2.0): no es un bug a arreglar.

### 7.6 Estado verificado (RC46, lab local)

WordPress 7.1.2 + SQLite en `C:\wp-lab\wordpress`, con copia de `uploads/pmu/`
(72 fuentes · 128 imágenes · 1 preset) y Playwright:

| Galería | Celdas con miniatura | POST | Descargas de contenido |
|---|---|---|---|
| Fuentes | 72 / 72 | 0 | 0 |
| Estilos (presets) | 1 / 1 | 0 | 0 |
| Imágenes | 155 canvas | 0 | 0 |

Hojas persistidas y **certificadas**: `fonts` 35,3 KB · `img` 252 KB ·
`tm-presets` 3,7 KB. Suites: **25** en verde (2 nuevas: `hoja-generacion`,
`fuentes-filtros-footer`).

⚠️ **T004 del `tasks.md` del spec 009 está mal y se aplicó corregido**: decía
certificar "todo ámbito de `AMBITOS_GALERIA`", lo que habría roto `mockups` (no
manda firma → el motor rechazaría con `desactualizado` y le crearía el catálogo
vacío). Su propio `contracts/motor-sprite.md` ya decía bien `fonts | img |
tm-presets`. La condición correcta es **"ámbito con catálogo ∧ firma no vacía"**.

### 7.2 Decisiones RC44/RC45 — arranque sin puente (bugfix)

Correcciones verificadas con una simulación real en Chrome (iframe same-origin,
puente postMessage en 3 momentos, motor/miniaturas simulados; escenario con
puente limpio y escenario sin puente):

- ✅ **`TextMuyAPI.loadCatalogo` RECHAZA la promesa, no lanza sincrónico.**
  Sin base de puente devuelve `Promise.reject(ambito:catalogo:sin_puente)`.
  El `throw` sincrónico anterior escapaba a los llamadores que envuelven la
  llamada con `Promise.resolve(...).catch(...)` —`Promise.resolve` evalúa el
  argumento ANTES de envolverlo—: abrir la galería de presets sin puente
  moría con una excepción no capturada y el panel quedaba vacío. Los dos
  call sites de `controls.js` quedaron además envueltos con `.then(...)` por
  defensa. Regresión cubierta en `tests/sprite-canonico.test.js`.
- ✅ **La galería de presets muestra estado sin puente.** Al abrir sin
  `bridgeAvailable()` el toolbar avisa ("Los presets requieren el plugin...")
  y no se intenta cargar la hoja: cero excepciones, cero red.
- ✅ **`fonts.js` no hace fetch relativo sin puente.** Al vencer el plazo del
  arranque diferido se resuelve catálogo vacío y se espera
  `textmuy-bridge-ready`; se eliminan los 404 a `fonts.json` del módulo
  (regla §4.2: cero fetches a rutas relativas sin puente).
- ✅ **`main.js` retira la clase `tt-loading` del contenedor** al ocultar el
  overlay (quedaba pegada para siempre; el overlay se ocultaba solo por
  estilo inline).
- ✅ **La fuente del proyecto se recupera sola con el puente tardío (RC45).**
  `main.js` escucha `textmuy-bridge-ready`: si la fuente declarada no está
  `disponible`/`pendiente`, relee el catálogo (ya con base del puente),
  reintenta `asegurarFuenteDeclarada()` y repinta; el aviso `#tt-font-error`
  se limpia sin que el usuario toque el selector.

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
- **`editor.js`**: estado del proyecto (`createDefaultSettings`, `loadPreset`),
  `OPTION_SCHEMA` (fuente unica de identidad + alcance por opcion, derivada de
  `defaultSettings`; `isGlobalPath` la consulta) y render de todas las capas:
  fill/pattern/palette, outline, shadows, bevel, specular, icon, background,
  lettering (blendmodes, textures).
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
  `settingsFromDelta` valida las rutas del delta contra `OPTION_SCHEMA` y rechaza
  con causa una ruta desconocida (`presets:<n>:ruta_desconocida:<ruta>`, fail-fast).
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

### 8.1 Diagnóstico 2026-10-03: por qué "se rompía el código" sin error real

Un barrido completo (historial + suites + `.specify`) **NO encontró un solo script
bash** en el módulo y las 22 suites originales estaban **verdes**. Los "roturas" eran
**defectos de configuración del entorno**, no de lógica. Quedan así:

| # | Hallazgo | Estado | Guardia |
|---|---|---|---|
| 1 | El único `bash` del PATH es `C:\Program Files\Wiimm\WIT\bash.exe` (cygwin de Wiimm, **no** Git Bash) y `C:\Windows\System32\bash.exe` de VS Code **no existe** | Documentado | `tests/entorno.test.js` |
| 2 | `core.autocrlf=true` (global) **sin `.gitattributes`** → worktree MIXTO (`w/mixed`, `w/crlf`) y diffs fantasma | **Corregido** | `tests/entorno.test.js` |
| 3 | BOM UTF-8 en `js/controls.js` y `js/galeria.js` (los demás sin BOM) | **Corregido** | `tests/entorno.test.js` |
| 4 | `[Console]::OutputEncoding` = `ibm850` (CP850) → mojibake en salida de herramientas | **Corregido** | perfil de pwsh (§8) |
| 5 | PowerShell instalado como **MSIX/Store** → `Get-Command pwsh` devuelve una ruta de `WindowsApps` protegida | **Falso positivo descartado** | `docs/entorno-desarrollo.md` §2.3 |

⚠️ **Falso positivo corregido (2026-10-03)**: el MSIX de PowerShell **funciona**. La ruta
`C:\Program Files\WindowsApps\...\pwsh.exe` da `Test-Path = True` desde otra sesión,
`Get-Acl` resuelve y Node la ejecuta. `WindowsApps` es una carpeta protegida que engaña a
algunas herramientas. **No reinstalar PowerShell como MSI**: `winget` además lo rechaza por
conflicto con el paquete MSIX instalado. El ruido `:\Program Files\WindowsApps\...\pwsh.exe\`
en la salida del runner **no** es un fallo del comando ejecutado.

🔴 **REGLA DURA — bash es un agujero negro en esta máquina.** `bash` resuelve a un cygwin
ajeno (`warning: could not find /tmp`) que NO es el shell del proyecto y rompe rutas. Todo
el módulo es **PowerShell (`ps`)**: Spec Kit, `.specify/scripts/powershell/*.ps1` y los
tests. **Nunca** invocar `bash`, `sh`, `wsl` ni `curl`; para fetching usar `Invoke-WebRequest`
y `Get-Content`. Si un `.sh` aparece en el repo, `tests/entorno.test.js` lo rechaza.

✅ **Convenciones de texto del repo (`.gitattributes` + `.editorconfig` + `.vscode`)**: todo
el texto es **UTF-8 sin BOM** y **LF**. Estan versionados para que el estado no vuelva a
derivar. `git ls-files --eol` debe mostrar siempre `i/lf w/lf`.

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
Hay 44 suites Node (verdes el 2026-10-10 con Node 22.20.0 sobre pwsh 7.6.6). La
prueba opcional `tests/galerias.browser.js` usa Chrome y Playwright instalados
externamente (variable `TEXTMUY_CHROME` para el ejecutable); valida DOM con
motor/miniaturas simulados, no sustituye la prueba en WordPress.

**Spec 002-text-tab (pestana TEXT)**: la guia completa de validacion esta en
`specs/002-text-tab/quickstart.md` (logica en Node, pixeles en Chrome con puente
simulado, y recorrido integrado en la pestana del plugin). Las tareas, con su
orden y dependencias, estan en `specs/002-text-tab/tasks.md`.


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
node tests/entorno.test.js           # entorno: cero scripts bash, .gitattributes/.editorconfig,
                                      # todo el texto UTF-8 sin BOM y LF (RC46)
node tests/render-dependencias.test.js   # dependencias del render en paralelo (RC41)
node tests/rc-bump.test.js
node tests/curva-snapshot.test.js      # US1: snapshot a 2D ANTES de loseContext + espejo por signo
node tests/curva-sin-webgl.test.js     # US1: la API rechaza con causa; el editor conserva el fallback 2D
node tests/barra-line-target.test.js   # US2: la barra Style target se ve al abrir (gating por pestana)
node tests/area-util.test.js        # US3: padding contra el lado menor + area util minima garantizada
node tests/avance-lineas.test.js    # US5: L1 ancla el bloque, avance por linea, sin solapes
node tests/encaje-final.test.js     # US4: el encaje final SIEMPRE; la caja dibujada entra en el area util
node tests/lineas-resolucion.test.js # US6: heredar -> mezclar -> dimensionar, claves 1-based
node tests/lineas-tamano.test.js     # US6: sizing por linea con cascada de porcentajes
node tests/lineas-ciclos.test.js      # US6: anti-ciclos por ambas aristas, sin colgarse
node tests/lineas-formato.test.js     # US6: .txm v2, delta estricto, lineas ausentes conservadas
node tests/fuente-por-linea.test.js  # US6: fuente propia por linea, una carga por identidad, fallo nombrado
node tests/estilo-tema.test.js      # el estilo disenado con una muestra se aplica a CUALQUIER texto
node tests/option-schema.test.js   # OPTION_SCHEMA unico + alcance data-driven + fail-fast de rutas (RC65)
node tests/sombra-blur.test.js     # RC66: blur de sombras en espacio identidad + fallback manual + auto-test
node tests/sombra-posicion.test.js # RC67: composites offscreen centrados en -w/2,-h/2 (sombra ext/int + bevel)
node tests/carga-gradient-imgrefs.test.js # RC68: gradiente copiado al cargar + refs numericas sin 404

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
- ✅ OBLIGATORIO: escribir archivos como **UTF-8 sin BOM** y con **LF**. No reintroducir
  CRLF ni BOM; `tests/entorno.test.js` lo verifica en cada corrida (§8.1).
- ✅ Mensajes e interfaz en español (sin tildes en código puro para evitar problemas de
  encoding).
- ✅ Las rutas, catalogos y archivos son datos del plugin: NO hardcodear rutas, NO
  escribir catalogos y NO asumir handlers; usar el puente (`urls.*`) y el motor (`op=`).
- ❌ NO DEBES: usar `bash`, `sh`, `wsl` ni `curl` en esta máquina (§8.1: `bash` resuelve a
  un cygwin ajeno y roto). Todo es PowerShell; para fetching, `Invoke-WebRequest`.
- ❌ NO DEBES: usar `localStorage` para presets/imágenes/fuentes.
- ❌ NO DEBES: introducir fallbacks client-side ni reactivar el modo standalone.
- ❌ NO DEBES: editar los vendors de `utils/`.
- ❌ NO DEBES: regenerar `.min` propios (eliminados a proposito; fuente unica los `.js`).
- ❌ NO DEBES: editar a mano los archivos gestionados de `.specify/` y `.clinerules/`
  (workflows, scripts, templates); actualizalos con
  `specify integration upgrade cline --script ps`.
- ❌ NO DEBES: modificar bases de datos, credenciales ni servicios externos, ni
  desplegar/publicar sin aprobación explícita del usuario.
