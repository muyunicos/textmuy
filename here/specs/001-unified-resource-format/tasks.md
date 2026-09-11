# Tasks: Formato Unico de Recursos uploads/tm

**Input**: `here/specs/001-unified-resource-format/` (spec.md, plan.md, research.md R1-R6, data-model.md, contracts/ x5, quickstart.md)
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: incluidos por governance (Constitucion VI: suites `node tests/*.test.js` + `node --check`; no TDD, son regression/contract del formato unico).
**Organization**: por user story (US1 P1 MVP → US2 P2 → US3 P2). Single project: `js/`, `tests/`, fixtures en `../uploads/tm/` (espejo de `wp-content/uploads/tm/`, datos fuera del repo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (distintos archivos, sin dependencias)
- **[Story]**: historia del spec (US1/US2/US3). Setup/Foundational/Polish sin label.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: rama, fixtures legacy y linea base verde antes de tocar codigo.

- [X] T001 Verificar rama `001-unified-resource-format` y `git status` limpio salvo `js/fonts.js` previo en `c:\Users\Jonatan\Documents\GitHub\personalizador-pdf\textmuy`
- [X] T002 [P] Copiar fixtures legacy a area de trabajo: `fonts.json` (57 tuplas string), muestra de `img/catalogo.json` y `presets/nintendo.txm` (`font.src` string) desde `c:\Users\Jonatan\Documents\GitHub\personalizador-pdf\uploads\tm` a `here/specs/001-unified-resource-format/fixtures/`
- [X] T003 [P] Correr linea base `node tests/*.test.js` y anotar fallos preexistentes (`preset-load.test.js` apunta a ruta inexistente) en `here/specs/001-unified-resource-format/fixtures/BASELINE.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: parser unico + errores + tests base. BLOQUEA todas las historias.

**CRITICAL**: ninguna historia empieza hasta completar esta fase.

- [X] T004 Implementar `parseCatalog(catalogo, ambito)` con 3 clases `ok`/`free`/`invalid` en `js/fonts.js` (extraer `parseCatalogEntry` actual a modulo compartido `js/catalog.js` sin frameworks, IIFE): tupla exacta de 4, "`id` entero >= 1", "`title/cats/file` strings", tombstone `[id,"","",""]` exacto = `free`, duplicados/`file` Google fuera de `fonts` = `invalid` con causa `ambito:id:motivo` (contratos `contracts/catalog-schema.json`, `contracts/errors.md`)
- [X] T005 [P] Implementar `tileDeId(id, thumbs)` con "`tile = id-1`, `col=(id-1)%c`, `row=floor((id-1)/c)`, `x=col*w`, `y=row*h`" en `js/catalog.js` (contrato `contracts/sprite-layout.md`)
- [X] T006 [P] Crear `tests/catalog-unified.test.js`: tupla ok, tombstone libre, no-tupla/objeto/tupla-3/id-string/duplicado = `invalid` con causa, `tile=id-1` en 180x30/200x100/100x100, `cats` string multi (`"display, favs"`) y default `"custom"`
- [X] T007 Migrar `js/fonts.js` al parser compartido (`catalogFonts` por id numerico, `fontCategories` derivadas, HEAD previo para fisicos mantenido) y extender `tests/fonts-catalog.test.js` a ids numericos + rechazo de tuplas string legacy
- [X] T008 `node --check js/catalog.js js/fonts.js` y `node tests/catalog-unified.test.js tests/fonts-catalog.test.js` en verde

**Checkpoint**: parser + tile + tests base listos; las historias pueden empezar en paralelo.

## Phase 3: User Story 1 - Fuentes con catalogo unico (Priority: P1) 🎯 MVP

**Goal**: galeria de fuentes lee `fonts.json` numerico (fisicas + Google) con titulo, categorias y miniatura del sprite; elegir una la aplica al canvas.

**Independent Test**: (a) con un catalogo de PRUEBA sintetico (ids ok + 1 tombstone + 1 invalida) abrir la galeria, verificar titulo/cats/miniatura, contador `"1 libre, 1 invalida: ids 9"`, elegir fisica y Google y aplicar al canvas; (b) con el `fonts.json` REAL migrado (0 libres/0 invalidas) verificar listado completo sin contador, y `renderTextToPNG` con `font.src` numerico ok y con `src` string rechazado.

- [X] T009 [P] [US1] Leer `fonts.json` numerico + sprite derivado 180x30 en `js/fuentes-galeria.js` (titulo/cats/miniatura desde catalogo + sprite; `invalid` saltada con `console.warn` + contador en status; `free` oculta) segun `contracts/sprite-layout.md` y `contracts/errors.md`
- [X] T010 [P] [US1] Resolver `settings.font.src` numerico en `js/fonts.js` (`resolveFontFromPreset`/`loadFont`/`ensureFontReady` por id; string legacy → `Error('presets:<name>:font.src string (legacy): re-guardar el preset desde el editor')`) segun `contracts/txm-numeric-refs.md`
- [X] T011 [US1] (modulo) `invalidateCatalog` en `js/fonts.js` + llamado desde `js/fuentes-galeria.js` tras subir/borrar (el catalogo recarga la tupla nueva escrita por el plugin)
- [ ] T012 [US1] (plugin) handlers `subirFuente`/`borrarFuente`/`moverFuente` escriben tupla en fonts.json (baja = tombstone `[id,"","",""]`, alta reutiliza hueco mas bajo o `max(id)+1`) y regeneran sprite via `guardarSprite` — PENDIENTE lado plugin
- [X] T013 [US1] Fixture `../uploads/tm/fonts/fonts.json` migrado (ids 1..N densos, 15 `MUY-*.ttf` declarados fisicos, resto Google; sin tombstones: el contador del IT se valida con el catalogo sintetico (ver IT de US1)) + `node tests/catalog-unified.test.js` en verde

---

## Phase 4: User Story 2 - Imagenes con catalogo unico (Priority: P2)

**Goal**: galeria de imagenes (fondos/iconos/varios) con buscador y preview leida de `img/img.json` numerico + sprite 100x100.

**Independent Test**: con catalogo migrado abrir la galeria, verificar busqueda, tabs y preview por item; `invalid` con warn+contador; elegir una la aplica (fondo/icono/textura).

- [X] T014 [P] [US2] Migrar lectura de `PM().listImages()` (objetos `{nombre,categoria,titulo}`) a `img/img.json` numerico + sprite derivado 100x100 en `js/galeria.js` (tabs/buscador/preview con rollback; `invalid` saltada con warn+contador) segun `contracts/sprite-layout.md`
- [X] T015 [P] [US2] Resolver refs de imagen por id numerico en `js/editor.js` (campos que hoy guardan nombre de archivo pasan a id; inexistente en render → `Error('img:<id>:ausente <file>')`) segun `contracts/txm-numeric-refs.md` y `contracts/errors.md` — RESUELTO en modulo (2026-09-11): `prepareImgRefs` autoritativo en `js/api.js` (await en `renderTextToPNG`, fail-fast con causa) + hook best-effort en `js/editor.js::loadPreset` (in-place + re-render) + guardas anti-404 en los 4 call-sites de imagen; walker `mapImgRefs`/`hasNumericImgRefs` en `js/catalog.js`; test `tests/img-refs.test.js`

- [ ] T016 [US2] Alta/baja/Save via puente en `js/preset-manager.js` + `js/galeria.js` (`uploadImage`/`deleteImage`/`moverImagen` escriben tupla; tombstone al borrar) segun `contracts/bridge-contract.md` — PENDIENTE lado plugin: los handlers ya existen y el modulo los consume; la escritura de la tupla en img.json la hace el plugin hermano al migrar/regenerar.
- [X] T017 [US2] Fixture `../uploads/tm/img/img.json` migrado desde `catalogo.json` (renombrar a `img.json`, ids densos, `thumbs` 100x100) + verificar `node --check js/galeria.js js/editor.js`

---

## Phase 5: User Story 3 - Presets con referencias numericas (Priority: P2)

**Goal**: `.txm` con refs numericas cargan fuente/imagenes correctas; galeria muestra miniaturas 200x100 desde el sprite; `renderBatch` fail-fast con causa.

**Independent Test**: cargar preset migrado (`font.src` numerico) y verificar render + miniatura; lote con 1 id invalido → rechazo sin parciales.

- [X] T018 [P] [US3] (modulo) `presets/presets.json` numerico + listado por id en la galeria + `loadPresetById` con cache en `js/api.js` (el codigo ya no LEE `thumbs/presets.json` ni los `.webp` sueltos) segun `contracts/sprite-layout.md` y `contracts/bridge-contract.md`
- [ ] T019 [US3] (plugin) eliminar fisicamente `thumbs/presets.json` y los `.webp` sueltos del mirror/uploads y regenerar un unico `presets.webp` — PENDIENTE lado plugin
- [X] T020 [P] [US3] Rechazo legacy puro en `js/preset-manager.js` + `js/api.js` (`font.src` string u objeto legacy → `Error('presets:<name>:... (legacy): re-guardar el preset desde el editor')`; `renderBatch` rechaza ante el primer fallo con `ambito:id:motivo`) segun `contracts/txm-numeric-refs.md` y `contracts/errors.md`
- [X] T021 [US3] Galeria de presets por id en `index.html` + `js/preset-manager.js` (grid desde `presets.json` + sprite 200x100; Save guarda `.txm` numerico + tupla; Delete escribe tombstone) + fixture `../uploads/tm/presets/presets.json` migrado (10 presets con ids)
- [X] T022 [US3] `render-core.html` en paridad (carga `js/catalog.js` nuevo) + `node --check` de tocados

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 Subir `?v=RC23` → `?v=RC24` en `index.html` y `render-core.html` (todos los `<script>` propios)
- [X] T024 Enmienda menor Constitucion IV (`free[]` → tombstone `[id,"","",""]`) con Sync Impact Report en `.specify/memory/constitution.md`
- [X] T025 [P] Corregir `tests/preset-load.test.js` (ruta `uploads/personalizador-pdf/textmuy/presets` inexistente → `uploads/tm/presets`, preexistente anotado en T003)
- [X] T026 `node tests/*.test.js` (10 suites incl. `catalog-unified` + `img-refs`) + `node --check` de tocados en verde; correr `quickstart.md` end-to-end (integrado primero, standalone despues)

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sin dependencias, inicio inmediato.
- **Foundational (Phase 2)**: depende de Setup; BLOQUEA US1/US2/US3.
- **User Stories (Phase 3-5)**: dependen de Foundational; luego paralelizables (US1 → US2 → US3 en prioridad, o en paralelo con equipo).
- **Polish (Phase 6)**: depende de las historias entregadas (minimo US1 para MVP).
- **US1 (P1)**: tras Foundational, sin dependencias; es el MVP (`font.src` numerico).
- **US2 (P2)**: tras Foundational; testeable sola con su fixture.
- **US3 (P2)**: tras Foundational; integra US1+US2 pero test independiente con fixtures migrados.
- Dentro de cada historia: parser/entidades → galeria → puente → fixture → validacion. `invalid`/`free` con warn+contador en galeria y rechazo en render (R1).

## Parallel Opportunities

- T002 ∥ T003; T005 ∥ T006; T009 ∥ T010; T014 ∥ T015; T018 ∥ T020; T025 ∥ resto de Polish salvo T026.
- Tras Foundational: US1 ∥ US2 ∥ US3 con 3 personas (mismo `js/catalog.js` estable, distintos consumidores).

## Parallel Example: User Story 1

```bash
# Galeria y resolucion en paralelo (distintos focos, mismo contrato):
Task: "T009 leer fonts.json numerico + sprite 180x30 en js/fuentes-galeria.js"
Task: "T010 resolver font.src numerico en js/fonts.js"
# Despues: T011 (invalidate) + T013 fixture + verde.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup + Phase 2 Foundational (parser + tile + tests).
2. Phase 3 US1 (fuentes numericas end-to-end).
3. STOP y VALIDAR: galeria aplica fisica+Google, `src` string rechazado, suites verdes.
4. Demo en pestana Estilos de Texto con `fonts.json` migrado.

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 (imagenes sin romper fuentes) → US3 (presets + fail-fast) → Polish (RC24 + enmienda + quickstart).

### Parallel Team Strategy

Juntos: Setup + Foundational. Luego: A=US1 (fuentes), B=US2 (imagenes), C=US3 (presets+api). Integran en Polish.

## Notes

- Repo `c:\Users\Jonatan\Documents\GitHub\personalizador-pdf\textmuy`; datos `c:\Users\Jonatan\Documents\GitHub\personalizador-pdf\uploads\tm` (= `wp-content/uploads/tm/`).
- No editar `js/utils/*`; no `localStorage` para recursos; escritura solo via puente; standalone = harness.
- Commit por tarea o grupo logico; detener en checkpoints para validar cada historia sola.



---
## Estado de implementacion (2026-09-11)

- Completadas en el modulo: 23 (T001-T011, T013-T018, T020-T026). Sin
  parciales: T015 (refs numericas de imagen) quedo resuelta en modulo
  con `prepareImgRefs` + test `img-refs.test.js`.
- Pendientes de integracion con el plugin hermano: T012 (tuplas/
  regeneracion de fuentes), T016 (tuplas en img.json), T019 (limpieza
  fisica de `thumbs/presets.json` + `.webp` sueltos).
- Suite completa 10/10 verdes (incl. `img-refs`); `node --check` de los
  7 JS tocados OK (catalog, fonts, api, preset-manager, galeria,
  fuentes-galeria, editor).
- Espejo `../uploads/tm` migrado al canonico por `migrate-tm.mjs`
  (fonts 72, img 128, presets 10; backups .legacy).
- RC23 -> RC24 en `index.html` y `render-core.html`; `js/catalog.js`
  incluido antes de `fonts.js` en ambos.
- Constitucion enmendada a v2.1.0 (tombstone, sin free[]).
