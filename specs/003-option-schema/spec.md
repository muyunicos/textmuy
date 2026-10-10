# Feature Specification: Schema unico de opciones y fail-fast de rutas

**Feature Branch**: `003-option-schema`
**Status**: Draft
**Input**: User description: "cada opcion deberia tener un id y un nombre... algunas
pueden aplicarse al fondo, todo el texto, lineas individuales... que sea dinamico,
que se puedan traducir las opciones que el admin eligio de acuerdo a la jerarquia y
estructura del menu."

## Overview

Hoy el alcance por linea y la identidad de cada opcion estan fragmentados en
cuatro lugares: `OPTION_REGISTRY` (expuesto pero sin consumidores), `GLOBAL_PATHS`,
`CANVAS_POR_LINEA` y el fallback de sync de `controls.js`. Ese conocimiento
duplicado ya provoco una lista desactualizada (ver RC58 en AGENTS.md §7.16).

Este cambio unifica todo en un unico `OPTION_SCHEMA` derivado de `defaultSettings`
y hace que la carga de un preset rechace con causa cualquier ruta desconocida.

**Alcance**: cambio interno de gobernanza. NO cambia el formato `.txm` (sigue siendo
delta anidado, Constitucion IV) ni el motor de render ni la resolucion por linea.

## User Scenarios & Testing

### US1 - El alcance de cada opcion se define en un unico schema (P1)

Como mantenedor, existe UNA fuente de verdad del alcance (global vs. por linea)
de cada opcion. `isGlobalPath` la consulta; no hay listas hardcodeadas duplicadas.
Agregar o mover una opcion se hace en un solo lugar.

**Why this priority**: Es la precondicion de las dos mejoras siguientes y elimina
la clase de bug de "lista desactualizada" que ya mordio a `controls.js`.

**Independent Test**: Se verifica solo con el walk de `defaultSettings` y las
aserciones de `isGlobalPath`, sin tocar la carga de presets.

**Acceptance Scenarios**:

1. `OPTION_SCHEMA()` cubre todas las hojas de `defaultSettings`, cada una con
   `{id, nombre, type, default, scope}`.
2. `isGlobalPath` reproduce exactamente el alcance actual: `canvas.*` global,
   salvo `canvas.maxFontSize` (por linea); `text`/`rotate`/`distort`/
   `lettering.flag|boggle|reverseOverlap|blendmode` globales; el resto por linea.
3. Tras el cambio NO existen `GLOBAL_PATHS` ni `CANVAS_POR_LINEA` (purga, VII).

---

### US2 - Un preset con una ruta invalida se rechaza con causa (P1)

Como mantenedor, un `.txm` que declare una ruta inexistente se rechaza al cargar
con `presets:<nombre>:ruta_desconocida:<ruta>`, dejando la vista intacta, en vez
de aplicarse en silencio (Constitucion VI).

**Why this priority**: Un delta con una ruta inventada hoy entra sin ruido y
produce un preset que no se ve como se guardo. El fail-fast lo vuelve detectable.

**Independent Test**: Un delta minimo con una ruta inexistente; y el round-trip
de los 6 presets reales de `uploads/pmu/tm-presets/`.

**Acceptance Scenarios**:

1. Un delta con `fill.colorx.r` se rechaza con causa `ruta_desconocida`.
2. Los 6 presets reales siguen cargando SIN rechazo (sin falsos positivos).
3. Las rutas dinamicas validas NO se rechazan: `fill.layers[].styles[]` y
   `lines.line["<n>"]` / `lines.inherit["<n>"]` / `lines.activeTarget`.
4. El validador es conservador: ante la duda permite (no rompe el render).

## Out of Scope

- Nombres/menus derivados del schema para regenerar la UI (Mejora 3, futuro).
- Cambios en el formato `.txm`, la API de render o `resolveLine`.
