# Tasks: Schema unico de opciones y fail-fast de rutas

**Feature**: `003-option-schema` | **Plan**: alcance interno, sin cambios de
formato `.txm` ni de motor de render.

## Phase 1 - Schema unico y alcance data-driven

- [x] T001 En `js/editor.js`, derivar `OPTION_SCHEMA()` de `defaultSettings`
      (id/nombre/type/default/scope). Reemplaza `OPTION_REGISTRY`.
- [x] T002 Reescribir `isGlobalPath` para consultar el schema; purgar
      `GLOBAL_PATHS` y `CANVAS_POR_LINEA` (VII). Mantener resultados de
      `tests/lineas-resolucion.test.js` (canvas.* global salvo maxFontSize).
- [x] T003 Declarar en el schema las rutas dinamicas (fill.layers + styles[],
      lines.line/inherit/activeTarget) para el validador de §4.
- [x] T004 Exportar `OPTION_SCHEMA`; migrar/ purgar `OPTION_REGISTRY` de la
      exportacion publica si queda sin consumidores.

## Phase 2 - Fail-fast de rutas

- [x] T005 En `js/preset-manager.js::settingsFromDelta`, validar las rutas del
      delta contra `window.TextEditor.OPTION_SCHEMA`; rechazar ruta inexistente
      con `presets:<n>:ruta_desconocida:<ruta>` (conservador, sin falsos
      positivos en fill.layers/lines.line; vista intacta).

## Cierre

- [x] T006 Nuevo `tests/option-schema.test.js`: cobertura de defaultSettings,
      alcance (isGlobalPath), fail-fast (ruta inventada) y round-trip de los 6
      presets reales de `uploads/pmu/tm-presets/` sin rechazo.
- [x] T007 Las 41 suites previas en verde + `node --check` de los JS tocados.
- [x] T008 Bump `?v=RC64` en `index.html` y `render-core.html` (+ `css/style.css`
      en `index.html`).
- [x] T009 Actualizar `AGENTS.md` (§6 y nota en §7) y `contracts/lineas.md` §4
      (puntero al schema). Sync Impact Report en constitucion si aplica.
