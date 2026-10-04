# Implementation Plan: Correccion de la pestana TEXT

**Branch**: `002-text-tab` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-text-tab/spec.md`

## Summary

Corregir la pestana TEXT del editor (unica pestana tocada): curva que borra
el texto (US1), selector de linea invisible al abrir (US2), margen que mata
el texto (US3), texto que sobresale del lienzo (US4), line height que mueve
una sola linea (US5) y estilo por linea completo con herencia, tamano
relativo en cascada y tipografia propia por linea (US6, con rotate/distort
por linea ultimos por partir el pipeline en capas por linea).

El eje del trabajo es **una sola geometria de bloque**: el ajuste de tamano
y todos los motores de dibujo comparten el mismo modelo, de modo que lo
calculado sea lo pintado (US4/US5). El otro eje es **resolucion por linea en
tres pasos** (heredar -> mezclar lo propio -> dimensionar por porcentaje),
con claves 1-based en el formato nuevo y sin migraciones (entorno de
desarrollo sin presets existentes).

Ninguna correccion toca catalogos, puente, motor de recursos ni otras
pestanas (salvo barra visible en STYLES/ICON y paridad del PDF).

## Technical Context

**Language/Version**: JavaScript ES2020 en scripts clasicos tipo IIFE (sin
bundler, sin modulos ES). Codigo sin tildes en identificadores; UI en
espanol.

**Primary Dependencies**: APIs nativas del navegador — Canvas 2D (`ctx.font`,
`FontFace`, `document.fonts`), WebGL para bevel/specular/curva
(`curveWebGL`), `fetch`, y `postMessage` para el puente con el plugin. Sin
frameworks ni librerias externas en el codigo propio; `js/utils/*.min.js`
son vendors y no se editan.

**Storage**: Archivos del plugin WordPress gestionados por el motor unico
(`uploads/pmu/`): `fonts.json` / `img.json` / `presets.json` + sprites
`thumbs.webp` por ambito, y `tm-presets/{nombre}.txm` como delta estricto
contra defaults. Prohibido `localStorage` para recursos. El modulo solo lee
catalogos; toda escritura va por `POST` a `urls.motor` con `op=`.

**Testing**: Suites Node en `tests/*.test.js` (26 suites verdes al iniciar
esta planificacion) para logica pura con shims de navegador, mas
`node --check` sobre cada JS tocado, mas prueba DOM/pixeles en Chrome con
Playwright (`channel: 'chrome'`, puente simulado o `file://` + inyeccion,
patron de `tests/galerias.browser.js` y de las mediciones del laboratorio de
este feature). La verificacion de la ruta integrada es manual, en la pestana
"Estilos de Texto" del plugin (WordPress de laboratorio en
`C:/wp-lab/wordpress`, servidor `php -S` en puerto 8091), con Ctrl+F5.

**Target Platform**: Navegador moderno del administrador de WordPress, dentro
de un iframe same-origin. Sin soporte standalone: sin puente el editor no
opera.

**Project Type**: Modulo web embebido (editor visual + API de render
headless), consumido por un plugin WordPress mediante iframe y puente
`postMessage`.

**Performance Goals**: El editor no descarga fuentes de forma masiva al abrir
(las galerias leen el sprite certificado; solo la fuente declarada se
descarga al elegirse). Cada linea carga su propia fuente (FR-017) bajo
demanda, una sola vez por identidad (deduplicacion como la vigente). El
encaje final del conjunto (US4) es una pasada de escala sobre capas ya
compuestas, sin re-pintados.

**Constraints**:
- Prohibido `preloadAll` en la ruta de render (constitucion VI): cada linea
  carga solo su fuente declarada.
- Prohibidos fallbacks silenciosos y sustituciones de recursos (VI).
- WebGL se ASUME disponible; sin WebGL la API falla con causa, sin degradar
  (constitucion II). En el editor, el fallback 2D de la curva se conserva
  como existe hoy.
- Un solo responsable por archivo; cero rutas dobles, cero codigo legado
  (VII): lo viejo se purga en la misma entrega.
- Todo cambio de JS obliga a subir `?v=RCn` en `index.html` y
  `render-core.html`.
- `render-core.html` mantiene paridad de comportamiento con el editor.
- Catalogos y rutas son datos del plugin: no hardcodear, no escribir
  catalogos, no asumir handlers.
- Codigo UTF-8 sin BOM con LF; mensajes e interfaz en espanol.
- Sin `bash`/`sh`/`wsl`/`curl`: todo PowerShell 7 desde la raiz del modulo.

**Scale/Scope**: 6 historias (4 P1, 2 P2) sobre la pestana TEXT + barra en
STYLES/ICON + paridad PDF. Archivos tocados: `js/effects/distort-engine.js`
(US1), `js/controls.js` (US2, parte UI de US6), `js/editor.js` (US3-US6,
nucleo), `js/preset-manager.js` (formato de lineas 1-based, sin migracion),
`js/api.js` (carga de fuente por linea en render), `index.html` +
`render-core.html` (bump RC). Sin dependencias nuevas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I (editor con lineas All/L1/L2/L3, API como fin)**: PASA. El feature
  completa el estilo propio por linea que la constitucion ya anuncia; la API
  mantiene paridad (FR-020).
- **II (API fail-fast, tamano exacto, WebGL asumido)**: PASA con una decision
  de diseno (R7): en la ruta headless, la curva sin WebGL rechaza con causa
  en vez de usar el fallback 2D (el fallback queda solo para el editor
  visible). El encaje final y la geometria unica no alteran el tamano de
  salida (`settings.canvas.width/height` sigue siendo la unica fuente de
  verdad).
- **III (integrado WP unico, puente, motor)**: PASA. Cero fetches nuevos,
  cero rutas hardcodeadas, cero escrituras fuera de `op=`; las pruebas
  browser usan puente simulado como `tests/galerias.browser.js`.
- **IV (delta estricto, catalogos, `isGlobalOnlyPath`, formato `.txm`
  `version:1`)**: FRICCION con FR-016/FR-019 del spec — ver enmienda propuesta
  abajo (version 2 del formato, claves de linea 1-based, alcance por linea
  ampliado casi total). El delta estricto se mantiene: solo viaja lo que
  difiere.
- **V (100% libre, alcance cerrado)**: PASA. Sin premium, sin animacion, sin
  formatos nuevos de export, sin paneles nuevos (solo un selector de herencia
  dentro de la barra existente).
- **VI (fail-fast, sin `preloadAll`, `?v=RCn`, vendors intactos)**: PASA. Los
  ciclos por archivo editado a mano se rechazan con causa (FR-014); cada
  linea carga solo su fuente; el bump RC va en la entrega.
- **VII (cero legado, responsabilidad unica)**: FRICCION aparente — ver
  enmienda: al no haber presets existentes (entorno de desarrollo declarado
  por el usuario), NO se escribe codigo de migracion ni lectores del formato
  anterior; el formato nuevo reemplaza, no convive. Es exactamente lo que VII
  pide.

### Enmienda propuesta a la constitucion (v3.2.0, MINOR)

Motivo: el spec 002 (acordado con el usuario) exige lineas 1-based y alcance
por linea casi total, y el usuario declaro entorno de desarrollo sin presets
existentes. La constitucion vigente (IV: `version:1`, `isGlobalOnlyPath` con
layout/fuente globales) lo contradice. En vez de violarla en silencio, se
enmienda:

- IV: el formato `.txm` pasa a `version:2`; `settings.lines` usa claves
  1-based (`line["1"]`=L1); el alcance por linea cubre todo estilo y layout
  salvo Canvas Size, el contenedor del sistema de lineas y
  descarga/procesado; el texto es global por definicion.
- VII: se registra que, por entorno nuevo sin datos, esta entrega NO incluye
  migracion ni lectores del formato anterior (aplicacion directa del
  principio, no excepcion).
- Sin cambio en I, II, III, V, VI. Sync Impact Report en la seccion de
  gobierno de `constitution.md` al implementar (con la version y fecha
  reales).

## Project Structure

### Documentation (this feature)

```text
specs/002-text-tab/
├── spec.md                 # Especificacion (salida de /speckit-specify)
├── plan.md                 # Este archivo (salida de /speckit-plan)
├── research.md             # Phase 0: decisiones de diseno y alternativas
├── data-model.md           # Phase 1: entidades, estados e invariantes
├── quickstart.md           # Phase 1: guia de validacion ejecutable
├── contracts/
│   ├── lineas.md           # Contrato de resolucion por linea (herencia+sizing)
│   ├── geometria.md        # Contrato de geometria unica ajuste/dibujo
│   └── curva.md            # Contrato de la curva (snapshot antes de perder GL)
├── checklists/
│   └── requirements.md     # Checklist de calidad de la especificacion
└── tasks.md                # Phase 2 (salida de /speckit-tasks, no incluida aqui)
```

### Source Code (repository root)

El modulo es un conjunto de scripts cargados por orden de dependencia desde
dos HTML que comparten el mismo codigo. Estructura real (sin carpetas nuevas,
sin bundler, sin modulos ES — romperian la paridad editor-motor): `index.html`
+ `render-core.html`, `css/style.css`, `js/` (catalog, fonts, preset-manager,
gradient-picker, editor, galeria, fuentes-galeria, controls, export, api,
main, effects/, utils/ vendors NO editables) y `tests/` (26 suites Node).

Tocados por este feature: `js/effects/distort-engine.js` (US1, snapshot 2D
antes de `loseContext()`); `js/controls.js` (US2 desanidar gating; US6
herencia, slider pct/px, fuente del target); `js/editor.js` (US3-US6:
padding lado menor + area minima, geometria unica, encaje final siempre,
line height por avance con L1 inerte, lineas 1-based, fuente propia por
linea, pipeline por capas por linea ultimo); `js/preset-manager.js` (lineas
1-based sin migracion, rechazo de ciclos); `js/api.js` (fuente por linea
bajo demanda); ambos HTML (bump RC); `tests/*.test.js` (suites nuevas por
historia + browser de curva y bordes).

**Structure Decision**: se conserva la estructura existente; pruebas nuevas
con los shims vigentes y patron Playwright de `tests/galerias.browser.js`.

## Complexity Tracking

> Sin violaciones del Constitution Check tras la enmienda v3.2.0 MINOR
> propuesta arriba. Tabla vacia.
