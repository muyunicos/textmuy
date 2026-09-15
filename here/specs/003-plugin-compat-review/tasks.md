---
description: "Task list for feature implementation"
---

# Tasks: plugin-compat-review

**Input**: Design documents from `here/specs/003-plugin-compat-review/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Verificación automática existente (10 suites Node + `php -l` + `motor_smoke` + `parity`); no se crean tests nuevos salvo que un hallazgo lo justifique.

**Organization**: Tareas agrupadas por historia de usuario. Rutas relativas a la raíz del repo del módulo `modules/textmuy/` (el plugin vive en `../../`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (sin dependencias ni conflictos de archivos)
- **[Story]**: Historia de usuario (US1–US4 de spec.md)
- Incluir rutas exactas de archivos

---

## Phase 1: Setup

**Purpose**: Preparar el artefacto de la revisión y el entorno.

- [X] T001 Crear el esqueleto del artefacto `here/specs/003-plugin-compat-review/matriz.md` conforme a `here/specs/003-plugin-compat-review/contracts/matriz.md`: encabezado con contadores en 0, sección 1 con una tabla por bloque B1–B11 de `research.md` (filas PC pendientes "sin evaluar"), secciones 2–5 vacías.
- [X] T002 [P] Verificar prerrequisitos del entorno: WordPress con el plugin activo, módulo importado en `modules/textmuy/`, carpeta de datos `../../uploads/pmu/` con `fonts/`, `img/`, `tm-presets/`, y PDF de muestra del administrador disponible; si falta un dato, marcar en `matriz.md` las verificaciones afectadas como CONDICIONADO con su dependencia (FR-006, SC-001).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Línea base automática y enumeración de puntos de contrato. Debe completarse antes de cualquier historia.

**?? CRITICAL**: Ninguna historia puede empezar hasta completar esta fase.

- [X] T003 Correr la línea base automática de `here/specs/003-plugin-compat-review/quickstart.md` §1: `php -l` del plugin (`../../personalizador-pdf.php`, `../../admin/*.php`, `../../engine/*.php`, `../../inc/*.php`), `php ../../tests/motor_smoke.php`, `php ../../tests/parity.php`, y desde `modules/textmuy/`: `node --check js/*.js` + las 10 suites (`node tests/*.test.js`); registrar resultados como evidencia inicial en `matriz.md` (condicionados anotados, no como fallos).
- [X] T004 [P] Completar en `matriz.md` la enumeración de puntos de contrato PC-nnn a partir de `here/specs/003-plugin-compat-review/research.md` (bloques B1–B11), cada uno con su fuente documental (AGENTS.md módulo/plugin, constitución v3.1.0, archivos de implementación).

**Checkpoint**: Matriz preparada y línea base registrada — las historias pueden ejecutarse.

---

## Phase 3: User Story 1 - Circuito completo plugin ↔ módulo verificado de punta a punta (Priority: P1) — MVP

**Goal**: Confirmar que el circuito central (abrir pestaña → galerías → guardar estilo → aplicar a grupo → procesar PDF) y cada punto de contacto B1–B5 funcionan según el contrato.

**Independent Test**: Ejecutar el circuito completo de `quickstart.md` §2 sin errores y con cada operación persistiendo tras recargar.

### Implementation for User Story 1

- [ ] T005 [US1] Verificar el puente (B1) en la pestaña "Estilos de Texto" con consola abierta: envío en los 3 momentos (load del iframe, aviso `textmuy-ready`, envío inmediato) y payload con claves `urls.{motor,miniaturas,presetsBase,fuentesBase,imagenesBase}` + `nonces.motor` + `presets/imagenes/fuentes`; contrastar `../../admin/estilos-texto.php` contra `modules/textmuy/js/preset-manager.js` y registrar los PC de B1 en `matriz.md`.
- [ ] T006 [US1] Verificar galerías y bases de lectura (B3/B4): las tres galerías (`js/fuentes-galeria.js`, `js/galeria.js`, galería de presets de `index.html`) listan exactamente los recursos de `../../uploads/pmu/` con miniaturas del sprite, saltan huecos/tombstone con aviso visible y contador, y ninguna hardcodea rutas (grep de `'presets/'` y rutas relativas en `modules/textmuy/js/`); registrar PC de B3/B4.
- [ ] T007 [US1] Verificar el punto único de escritura (B2): subir imagen y tipografía, guardar/renombrar/borrar un estilo y regenerar miniatura desde el editor; confirmar en la pestaña Network que cada operación es POST a `urls.motor` (`admin-post.php?action=pmu_uploads`) con `_wpnonce` + `op=listar|alta|baja|editar|sprite|miniatura`, que persiste tras recargar y que el inventario queda coherente (secuencia de 20 operaciones según quickstart de la alineación 006); registrar PC de B2.
- [ ] T008 [US1] Verificar recurso inválido (edge case de spec.md): quitar físicamente un archivo referenciado por el catálogo, abrir la galería (salto con aviso) y lanzar un render que lo use (rechazo con `ambito:id:motivo`, sin sustitución silenciosa); restaurar el archivo al terminar y registrar en `matriz.md`.
- [ ] T009 [US1] Ejecutar el circuito de punta a punta (SC-002): guardar un estilo nuevo, asignarlo a un grupo de texto en la pestaña "PDFs" y procesar el PDF de muestra; el grupo sale con el estilo y los recursos elegidos, del tamaño definido por `settings.canvas` (CONDICIONADO si no hay PDF de muestra); registrar en `matriz.md`.
- [X] T010 [US1] Corregir los hallazgos BLOQUEANTES de US1 detectados (FR-008): solo cambios justificados por el contrato, con bump `?v=RCn` en `modules/textmuy/index.html` y `modules/textmuy/render-core.html` si se toca JS; re-verificar los PC afectados hasta PASS y anotar cada corrección en la sección 2 de `matriz.md`.

**Checkpoint**: MVP — el circuito central verificado; US2/US3/US4 pueden ejecutarse después sin depender entre sí.

---

## Phase 4: User Story 2 - Paridad entre el editor y el render que consume el PDF (Priority: P2)

**Goal**: Confirmar que el motor sin interfaz produce el mismo resultado que el editor y respeta el contrato de render (B6–B7).

**Independent Test**: Con los mismos estilos y textos, comparar editor vs motor sin interfaz (dimensiones + equivalencia visual) y provocar un fallo de lote para confirmar el rechazo completo con causa.

### Implementation for User Story 2

- [ ] T011 [US2] Preparar el conjunto representativo de estilos de prueba (FR-003): relleno simple, relleno con imagen, contorno, sombras, relieve, distorsión, icono, fondo y estilo por línea (All/L1/L2/L3), guardándolos como presets de prueba vía la galería de `modules/textmuy/index.html`.
- [ ] T012 [US2] Verificar la paridad (B7) caso por caso: renderizar el mismo texto en el editor y vía el motor sin interfaz (`modules/textmuy/render-core.html`, procesando un grupo o lote de la API); anotar dimensiones y equivalencia visual en la tabla §3 de `matriz.md` (SC-003).
- [ ] T013 [US2] Verificar el contrato de render fail-fast (B6): lote con un recurso inválido se rechaza completo con causa `ambito:id:motivo` (0 resultados parciales, SC-004); salida del tamaño exacto de `settings.canvas` (`modules/textmuy/js/api.js` + `render-core.html`); tipografía no cargada → espera (`ensureFontReady` en `modules/textmuy/js/fonts.js`) o fallo con causa, nunca fuente sustituta; registrar PC de B6.
- [X] T014 [US2] Corregir hallazgos de paridad/render según severidad (BLOQUEANTE obligatorio; MENOR solo si es contenido a un archivo, FR-009), con bump `?v=RCn` si se toca JS, y re-verificar los PC afectados hasta PASS.

---

## Phase 5: User Story 3 - Compatibilidad de versiones, despliegue y documentación (Priority: P3)

**Goal**: Confirmar versionado sincronizado, aviso de caché y documentación sin contradicciones (B9–B11).

**Independent Test**: Actualizar el módulo siguiendo la guía del plugin, forzar módulo viejo en caché y contrastar la documentación contra el comportamiento observado (0 archivos inexistentes, 0 contradicciones).

### Implementation for User Story 3

- [ ] T015 [US3] Verificar el versionado de estáticos (B9): `grep -n "v=RC" modules/textmuy/index.html modules/textmuy/render-core.html` (número idéntico y actualizado en ambos) y probar con JS viejo en caché que el plugin detecta la desactualización y muestra el aviso con la acción de recuperación (Ctrl+F5).
- [ ] T016 [US3] Contrastar la documentación del contrato (B11, FR-005): `modules/textmuy/AGENTS.md`, `../../AGENTS.md` §2.1, `../modules/LEEME.md` y la constitución v3.1.0 (`modules/textmuy/.specify/memory/constitution.md`) contra el comportamiento observado en US1/US2/US4; registrar cada contradicción como hallazgo DOCUMENTAL en `matriz.md`.
- [ ] T017 [US3] Aplicar las correcciones documentales contenidas (FR-009/FR-013): editar solo los archivos de documentación afectados (un archivo por corrección), completar la sección 4 de `matriz.md` con cada contradicción cerrada, y dejar 0 contradicciones (SC-006).

---

## Phase 6: User Story 4 - Comportamiento degradado controlado y errores con causa (Priority: P3)

**Goal**: Confirmar los escenarios límite documentados y que toda falla es accionable (B8).

**Independent Test**: Provocar cada escenario (sin puente, sin aceleración gráfica, sin internet, referencia legacy) y verificar el comportamiento documentado con mensaje accionable.

### Implementation for User Story 4

- [ ] T018 [US4] Verificar el editor sin puente (B8): abrir `modules/textmuy/index.html` como `file://` → estado de error claro y accionable, cero fetches a rutas relativas del módulo y cero data-URL de guardado en consola/Network.
- [ ] T019 [P] [US4] Verificar render sin aceleración gráfica: desactivar WebGL y lanzar render por la API → fallo con causa explícita, sin degradación silenciosa ni resultado incorrecto (Const. II).
- [ ] T020 [P] [US4] Verificar sin internet: con la pestaña abierta sin red, las tipografías remotas caen al fallback documentado (Google lazy) sin errores no controlados ni sustituciones silenciosas en render.
- [ ] T021 [P] [US4] Verificar rechazo de referencia legacy: cargar un preset `.txm` con string en vez de id numérico (`font.src` o imagen) → rechazo con causa "re-guardar el preset", sin migración bajo demanda.
- [ ] T022 [US4] Registrar los PC de B8 en `matriz.md` y corregir hallazgos según severidad (BLOQUEANTE obligatorio; MENOR solo contenido, FR-009); re-verificar hasta PASS.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cierre verificable de la revisión.

- [X] T023 Verificar prohibiciones transversales (B10): `grep -rn "localStorage" modules/textmuy/js/` (0 coincidencias para recursos), sin cambios en `modules/textmuy/js/utils/` y sin `.min` propios regenerados; registrar en `matriz.md`.
- [ ] T024 Cerrar `matriz.md` (SC-001/SC-008): ningún PC "sin evaluar", todo BLOQUEANTE en CORREGIDO_EN_REVISION, resumen de conteos del encabezado coincidente con las tablas, hallazgos REGISTRADO con severidad y punto.
- [X] T025 Re-corrida final de `quickstart.md` §1 completa (PHP + Node) y re-verificación de los PC corregidos: todo en verde, condicionados anotados (SC-007); confirmar el circuito SC-002 una última vez si hubo correcciones.
- [ ] T026 Revisar cumplimiento de `modules/textmuy/AGENTS.md` §10 y `checklists/requirements.md` del feature, y hacer commit de la revisión (matriz, hallazgos y correcciones) en la rama `003-plugin-compat-review`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T001 y T002 pueden correr en paralelo.
- **Foundational (Phase 2)**: depende de Setup; BLOQUEA todas las historias.
- **User Stories (Phases 3–6)**: dependen de Foundational; entre sí son independientes (US2/US3/US4 pueden correr en paralelo o en cualquier orden tras el MVP).
- **Polish (Phase 7)**: depende de todas las historias ejecutadas.

### User Story Dependencies

- **US1 (P1)**: primero (MVP); su evidencia alimenta el contraste documental de US3.
- **US2 (P2)**: independiente; usa presets de prueba propios (T011).
- **US3 (P3)**: mejor al final de US1/US2/US4 (contrasta lo observado), pero técnicamente independiente.
- **US4 (P3)**: independiente; los hallazgos alimentan el cierre de US3.

### Parallel Opportunities

- Setup: T001 ∥ T002.
- Foundational: T004 ∥ (tras T003) — no comparten archivos.
- US4: T018 ∥ T019 ∥ T020 ∥ T021 (escenarios distintos, sin archivos compartidos).
- US2: T012 ∥ T013 tras T011.
- Historias completas en paralelo si hay capacidad (US1 recomendado primero).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) + Phase 2 (Foundational)
2. Phase 3 (US1) completo, incluida la corrección de bloqueantes (T010)
3. **STOP and VALIDATE**: circuito completo en verde = valor central entregado

### Incremental Delivery

1. MVP (US1) → 2. US2 paridad → 3. US4 degradados → 4. US3 documentación (contraste final) → 5. Polish (cierre de matriz)

### Notes

- Toda corrección de JS exige bump `?v=RCn` en ambos HTML + suites Node + verificación integrada (D4 de research.md).
- Verificaciones dependientes de datos del administrador se registran CONDICIONADAS, nunca como fallo (D5).
- Si un arreglo exige cambiar el contrato → hallazgo REGISTRADO, no cambio de facto (FR-011).


