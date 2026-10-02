# Implementation Plan: Correccion de bugs de fuentes y presets del editor

**Branch**: `001-fix-bugs-01` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fix-bugs-01/spec.md`

## Summary

Corregir cuatro defectos reportados por el administrador en el editor de estilos de
texto: (1) el lienzo dibuja una tipografía distinta de la declarada —Times al abrir,
"Bangers" al tocar cualquier control—; (2) la galería de fuentes obliga a pulsar
"Select" para ver una fuente aplicada; (3) el selector de fuentes muestra entradas
duplicadas y las situadas arriba no funcionan; (4) un preset cargado no reproduce lo
guardado y conserva ajustes de la vista anterior, lo que se manifiesta como "el
color cambia al que tenía puesto en la vista actual".

El plan ataca las causas raíz verificadas durante la fase de especificación, no los
síntomas. El eje del trabajo es **una única fuente de verdad por ajuste**: la
identidad de una fuente y la definición de un preset dejan de depender de
representaciones paralelas y de escrituras parciales sobre el estado vivo. El
comportamiento fail-fast de la constitución se aplica en toda la cadena: una fuente
ausente o un preset incompleto se informan con causa, nunca se sustituyen en
silencio.

Ninguna de las cuatro correcciones cambia el formato en disco: los presets ya
guardados y el catálogo de fuentes siguen siendo válidos tal cual.

## Technical Context

**Language/Version**: JavaScript ES2020 en scripts clásicos tipo IIFE (sin bundler,
sin módulos ES). Código sin tildes en identificadores; UI en español.

**Primary Dependencies**: APIs nativas del navegador — Canvas 2D (`ctx.font`,
`FontFace`, `document.fonts`), WebGL para bevel/specular, `fetch`, y `postMessage`
para el puente con el plugin. Sin frameworks ni librerías externas en el código
propio; `js/utils/*.min.js` son vendors y no se editan.

**Storage**: Archivos del plugin WordPress gestionados por el motor único
(`uploads/pmu/`): `fonts.json` y `thumbs.webp` por ámbito, y `tm-presets/{nombre}.txm`
como delta estricto contra defaults. Prohibido `localStorage` para recursos. El
módulo solo lee catálogos; toda escritura va por `POST` a `urls.motor` con `op=`.

**Testing**: Suites Node en `tests/*.test.js` (16 suites, todas en verde al iniciar
esta planificación) para lógica pura, más `node --check` sobre cada JS tocado. La
verificación de la ruta integrada es manual, en la pestaña "Estilos de Texto" del
plugin.

**Target Platform**: Navegador moderno del administrador de WordPress, dentro de un
iframe same-origin. Sin soporte standalone: sin puente el editor no opera.

**Project Type**: Módulo web embebido (editor visual + API de render headless),
consumido por un plugin WordPress mediante iframe y puente `postMessage`.

**Performance Goals**: El editor no descarga fuentes de forma masiva al abrir (RC37:
las galerías leen el sprite certificado y solo la fuente seleccionada se descarga al
elegirse). El render del PDF no debe degradarse por cargar la fuente declarada, que
es la única que necesita.

**Constraints**:
- Prohibido `preloadAll` en la ruta de render (constitución VI): el motor carga solo
  los recursos que el preset declara.
- Prohibidos fallbacks silenciosos y sustituciones de recursos (constitución VI).
- Un solo responsable por archivo; cero rutas dobles, cero código legado
  (constitución VII).
- Todo cambio de JS obliga a subir `?v=RCn` en `index.html` y `render-core.html`.
- `render-core.html` mantiene paridad de comportamiento con el editor.
- Catálogos y rutas son datos del plugin: prohibido hardcodearlos.

**Scale/Scope**: 15 fuentes físicas propias y ~42 de catálogo público; 4 capas de
relleno máximo; 4 destinos de estilo (All/L1/L2/L3); 1 preset activo. El cambio es
## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación de puerta | Estado |
|---|---|---|
| **I. Editor de estilos; el editor es el medio, la API el fin** | Los cambios de paridad editor/motor (FR-014, FR-020) cubren ambas rutas | PASS |
| **II. API de render fail-fast, sin lotes parciales ni sustituciones** | FR-005, FR-012 y FR-013 prohíben la sustitución y exigen causa visible. La corrección **elimina** un fallback silencioso preexistente, no lo introduce | PASS |
| **III. Integrado a WordPress, sin standalone** | No se añaden rutas ni accesos nuevos; se opera solo por puente y catálogo | PASS |
| **IV. Preset delta estricto y catálogos únicos** | FR-015 a FR-018 respetan el delta: cargar aplica defaults + delta. FR-019 fija compatibilidad de formato, sin migración | PASS |
| **V. 100% libre, alcance cerrado, preview en vivo con rollback** | US2 es exactamente el patrón de preview en vivo con rollback exigido aquí; no se abre alcance | PASS |
| **VI. Firmeza fail-fast, carga modular, `preloadAll` prohibido en render** | FR-002 garantiza cargar solo la fuente declarada; FR-005 y FR-006 evitan marcar un fallo como resuelto | PASS |
| **VII. Cero legado, responsabilidad única** | Unificar identidades (US3) elimina las rutas dobles en vez de documentarlas | PASS |
| **Restricciones técnicas: sin `localStorage`, vendors no editables, sin `.min` propios** | El plan no toca `js/utils/`, no introduce `localStorage` y no regenera `.min` | PASS |
| **Restricción: bump `?v=RCn` en ambos HTML** | Queda como tarea obligatoria en el plan de implementación | PASS |

**Gate result: PASS.** No hay violaciones que justificar; la tabla Complexity
Tracking queda vacía.

### Riesgo observado (no es violación de puerta)

FR-016 —cargar un preset debe partir de defaults limpios en lugar de escribir sobre
el estado vivo— cambia el comportamiento compartido por el editor, la importación de
TextStudio y el motor headless del PDF. No contradice la constitución, que exige que
la vista refleje el preset, pero es el cambio de mayor radio de impacto del lote y su
ruta headless **no es verificable desde Node**. Se mitiga con una prueba de regresión
de round-trip en Node más verificación manual en WordPress, y queda registrado en
`quickstart.md` como puerta obligatoria antes de cerrar el feature.

### Re-chequeo post-diseño (Phase 1)

Repasada la constitución tras generar `research.md`, `data-model.md`, `contracts/` y
`quickstart.md`, el resultado sigue siendo **PASS**. Ninguna decisión de diseño
introduce una vía nueva de acceso, un formato nuevo en disco ni un mecanismo de
respaldo silencioso; el feature elimina fuentes de verdad duplicadas en lugar de
añadir una tercera.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-bugs-01/
├── spec.md                 # Especificación (salida de /speckit-specify)
├── plan.md                 # Este archivo (salida de /speckit-plan)
├── research.md             # Phase 0: decisiones de diseño y alternativas
├── data-model.md           # Phase 1: entidades, estados e invariantes
├── quickstart.md           # Phase 1: guía de validación ejecutable
├── contracts/
│   └── font-resolution.md  # Contrato de identidad y ciclo de carga de fuentes
├── checklists/
│   └── requirements.md    # Checklist de calidad de la especificación
└── tasks.md                # Phase 2 (salida de /speckit-tasks, no incluida aquí)
```

### Source Code (repository root)

El módulo es un conjunto de scripts cargados por orden de dependencia desde dos
HTML que comparten el mismo código. La estructura real del repositorio es:

```text
modules/textmuy/
├── index.html              # Editor completo: carga los scripts en orden
├── render-core.html        # Motor headless off-screen: mismo código, sin UI
├── css/style.css           # Único CSS del módulo
├── js/
│   ├── catalog.js          # Parser único de catálogos (ok/free/invalid)
│   ├── fonts.js            # Carga de fuentes, identidad y resolución por título
│   ├── preset-manager.js   # CRUD de presets, delta, formato .txm, puente
│   ├── gradient-picker.js  # Picker de gradientes de N colores
│   ├── editor.js           # Estado del proyecto + render de todas las capas
│   ├── galeria.js          # Galería de imágenes (patrón de preview en vivo)
│   ├── fuentes-galeria.js  # Galería de fuentes (CRUD + preview)
│   ├── controls.js         # Binding de la UI a los ajustes
│   ├── export.js           # Exportación PNG transparente
│   ├── api.js              # API pública de render (renderBatch)
│   ├── main.js             # Bootstrap del editor
│   ├── effects/            # bevel-webgl, specular-webgl, distort-engine
│   └── utils/              # Vendors minificados — NO EDITABLES
└── tests/                  # 16 suites Node (una por archivo)
```

### Mapa de archivos tocados por este feature

| Archivo | Cambio previsto | Historias |
|---|---|---|
| `js/fonts.js` | Identidad única de fuente; resolución por título con acentos; estado de carga con reintento; fin del fallback silencioso | US1, US3 |
| `js/editor.js` | Composición correcta de la familia tipográfica; esperar la fuente antes del primer pintado; repintar al quedar disponible | US1 |
| `js/editor.js` | Carga de preset sobre defaults limpios; aplicación completa del delta | US4 |
| `js/controls.js` | Picker de fuentes sin duplicados; sincronización del selector; preview en vivo y rollback | US2, US3 |
| `js/fuentes-galeria.js` | Previsualización en vivo sobre el lienzo, con reversión | US2 |
| `js/preset-manager.js` | Verificación del round-trip y paridad de la carga | US4 |
| `index.html`, `render-core.html` | Bump de versión de recarga | transversal |
| `tests/*.test.js` | Suites nuevas y ampliadas | todas |

**Structure Decision**: Se conserva la estructura existente sin reorganizar carpetas
ni introducir bundler. El módulo depende del orden de carga de los scripts y
`index.html` y `render-core.html` comparten ese código; extraerlo a módulos ES
rompería la paridad entre editor y motor, que es un requisito de la constitución.
Las pruebas nuevas siguen la convención de un archivo por suite en `tests/`,
cargando el módulo con los mismos *shims* de navegador que usan las suites
existentes.

## Complexity Tracking

> Sin violaciones del Constitution Check: tabla vacía.