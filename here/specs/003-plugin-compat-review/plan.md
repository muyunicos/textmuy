# Implementation Plan: plugin-compat-review

**Branch**: `003-plugin-compat-review` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `here/specs/003-plugin-compat-review/spec.md`

## Summary

Verificación integral de compatibilidad y funcionalidad del módulo TextMuy integrado al plugin personalizador-pdf. Enfoque: construir una **matriz de compatibilidad** con todos los puntos de contrato documentados (puente en 3 momentos, bases de lectura, punto único de escritura, catálogos v5.0, formato `.txm` delta, contrato de render fail-fast, paridad editor↔render-core, versionado RC, estados degradados), verificar cada punto con evidencia (verificaciones automáticas + pruebas manuales integradas), corregir hallazgos bloqueantes y cambios contenidos, y publicar matriz + hallazgos como artefacto del feature aplicando además las correcciones documentales a la documentación vigente. La revisión **verifica el contrato vigente, no lo redefine** (FR-012).

## Technical Context

**Language/Version**: PHP 7.4+/8 (plugin WordPress) + JavaScript vanilla ES6+ (módulo, sin build). Node SOLO para testing.

**Primary Dependencies**: WordPress (admin-post, postMessage same-origin), Canvas 2D + WebGL; vendors en `js/utils/` (NO editar).

**Storage**: datos del administrador en `uploads/pmu/` del plugin (`fonts/`, `img/`, `tm-presets/`); el módulo es consumidor y escribe SOLO vía el motor (`urls.motor` + `_wpnonce` + `op=`).

**Testing**: 10 suites Node del módulo (`node tests/*.test.js`) + `node --check` de los JS tocados; lado plugin: `php -l`, `php tests/motor_smoke.php`, `php tests/parity.php`.

**Target Platform**: WordPress admin, pestaña "Estilos de Texto", navegador principal de desarrollo en escritorio (única cobertura acordada — Clarificación Q4).

**Project Type**: revisión/auditoría de un plugin WordPress existente + su módulo frontend integrado (sin build, sin servicios nuevos).

**Performance Goals**: N/A — fuera de alcance (Clarificación Q2): la revisión cubre solo compatibilidad y funcionalidad.

**Constraints**: contrato vigente no renegociable (FR-012); correcciones de hallazgos no bloqueantes solo si son contenidas a un archivo sin tocar contrato ni interfaz (FR-009 / Clarificación Q3); sin localStorage, sin modo standalone, sin migraciones legacy; bump `?v=RCn` en `index.html` y `render-core.html` si se toca cualquier JS.

**Scale/Scope**: 1 módulo (`index.html`, `render-core.html`, `js/`, `css/`, `tests/`) y su integración con el plugin (`admin/estilos-texto.php`, `inc/class-pmu-uploads.php`, documentación del contrato). Un solo entregable nuevo: la matriz + registro de hallazgos en esta carpeta.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio (v3.1.0) | Gate de esta revisión | Estado |
|---|---|---|
| I. Editor como medio | No se agregan funciones ni modos de uso; FR-013 | PASS |
| II. API de render (non-negotiable) | US2 verifica fail-fast con causa, tamaño exacto, `ensureFontReady`, sin lotes parciales; sin WebGL → fallo con causa | PASS |
| III. Integrado único (non-negotiable) | US4: sin puente → error claro, cero fetches relativos, cero data-URL; escrituras solo `op=` por motor | PASS |
| IV. Preset delta + catálogos únicos | Verificar `.txm` delta con refs numéricas y catálogos v5.0 (`ok/free/invalid`, tile `id-1`); rechazo legacy "re-guardar" | PASS |
| V–VI. Versionado RC + cero legado documental | US3 + FR-011: RC sincronizado en ambos HTML, doc sin contradicciones, correcciones documentales aplicadas | PASS |
| Flujo de desarrollo | Tests Node + `node --check` de JS tocados; prueba integrada única vía pestaña del plugin | PASS |

Sin violaciones: `Complexity Tracking` queda vacío.

## Project Structure

### Documentation (this feature)

```text
here/specs/003-plugin-compat-review/
├── plan.md              # Este archivo
├── research.md          # Fase 0: puntos de contrato y decisiones de la revisión
├── data-model.md        # Fase 1: entidades de la revisión y sus estados
├── quickstart.md        # Fase 1: guía de ejecución de la revisión paso a paso
├── contracts/
│   └── matriz.md        # Fase 1: formato del artefacto matriz + registro de hallazgos
└── tasks.md             # Fase 2 (/speckit-tasks; NO se crea aquí)
```

Artefacto de salida de la revisión (se crea al ejecutarla, no en el plan): `here/specs/003-plugin-compat-review/matriz.md`, conforme a `contracts/matriz.md`.

### Source Code (repository root)

Rutas relativas a la raíz del plugin (`personalizador-pdf/`); el módulo integrado vive en `modules/textmuy/`.

```text
modules/textmuy/            # Editor + render-core + js/ + tests/ (posible corrección contenida)
├── index.html              # Editor (iframe pestaña "Estilos de Texto")
├── render-core.html        # Motor sin interfaz (render-core) off-screen (paridad, API)
├── js/                     # catalog, editor, controls, galeria, fuentes-galeria,
│   │                       # preset-manager, api, export, fonts, gradient-picker, effects/
│   └── utils/              # vendors: NO EDITAR
└── tests/                  # 10 suites Node

admin/estilos-texto.php     # Puente del plugin hacia el módulo (posible corrección contenida)
inc/class-pmu-uploads.php   # Motor de recursos del plugin (posible corrección contenida)
modules/LEEME.md            # Ficha del módulo integrado (contraste documental US3)
AGENTS.md (plugin y módulo) # Contrato documentado (fuente de la matriz)
```

**Structure Decision**: no se crea estructura nueva: la revisión opera sobre el código y la documentación vigentes. El único entregable nuevo es el artefacto `matriz.md` en esta carpeta del feature; las correcciones (bloqueantes y contenidas) se aplican in-place en los archivos listados arriba.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

*(Vacío: sin violaciones constitucionales.)*
