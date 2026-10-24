---

description: "Lista de tareas para la correccion de la pestana TEXT"
---

# Tasks: Correccion de la pestana TEXT

**Input**: Design documents from `/specs/002-text-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/{curva,geometria,lineas}.md, quickstart.md, constitution v3.2.0

**Tests**: SI, incluidos. El plan los exige explicitamente: suites Node con
shims de navegador para la logica pura, `node --check` de cada JS tocado, y
pruebas de pixeles en Chrome con Playwright siguiendo el patron de
`tests/galerias.browser.js`. La validacion integrada es manual (pestana del
plugin).

**Organization**: tareas agrupadas por historia de usuario, en orden de
prioridad del spec, para que cada historia se implemente, se pruebe y se
entregue por separado. Bloques A-D del plan de ejecucion.

**Constitution**: v3.2.0 (2026-10-04). El formato `.txm` es `version:2` con
`settings.lines` en claves 1-based. Al escribir codigo hay que respetar el
delta estricto, la resolucion en tres pasos y el rechazo con causa de ciclos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: US1..US6 a la que pertenece la tarea
- Rutas exactas en cada descripcion

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dejar el repo en condiciones de recibir el cambio.

- [x] T001 Normalizar a UTF-8 sin BOM y LF los artefactos de `specs/002-text-tab/` (los seis `.md` estaban en CRLF y rompian `tests/entorno.test.js`)
- [x] T002 [P] Confirmar la puerta de suites antes de tocar codigo: `Get-ChildItem tests -Filter *.test.js | ForEach-Object { node $_.FullName }` (las 26 suites deben estar en `OK`)
- [x] T003 Registrar en `AGENTS.md` el feature `002-text-tab` y su estado (seccion de.features y de testing), hoy ausente pese a existir el spec *(hecho 2026-10-24: el feature esta en AGENTS §2 y documentado en §7.7-§7.29)*
- [x] T004 [P] Documentar en `AGENTS.md` la decision de ejecucion en bloques A-D y que la rotten de la pestana TEXT no toca catalogos, puente ni motor de recursos *(hecho 2026-10-24: AGENTS §7.7 declara los bloques A-D y el alcance de la pestana TEXT)*

**Checkpoint**: repo limpio, suites en verde, feature documentado.

---

## Phase 2: Foundational (bloqueantes para todas las historias)

**Purpose**: la geometria unica de bloque. Sin ella, US3/US4/US5 no se
pueden probar de forma aislada porque las tres comparten el mismo modelo.

- [x] T005 [P] Suite `tests/area-util.test.js`: fijar que el area util se calcula **una sola vez** (padding contra el lado menor del canvas + area util minima) y que el margen al maximo deja texto visible (FR-003, FR-004, R-G1.4)
- [x] T006 [P] Suite `tests/avance-lineas.test.js`: fijar que cada linea i>1 se coloca a `lineHeight * tamano[i-1]` de la anterior, que L1 ancla el bloque y que una sola linea es invariante ante Line height (FR-007, FR-008, FR-021, R-G1.2)
- [x] T007 Suite `tests/encaje-final.test.js`: fijar que el encaje final se aplica siempre (con y sin rotacion/recorte), que solo reduce y que no altera `settings.canvas.width/height` (FR-005, R-G2.1 a R-G2.4)
- [x] T008 Implementar el helper unico de area util en `js/editor.js` (padding contra lado menor + minimo garantizado) y reemplazar los tres calculos duplicados de `autoFitText` (~745), `render` (~939, ~1115) y `lineFontSizes` (~3191)
- [x] T009 Implementar el modelo unico de bloque en `js/editor.js`: origen, avances acumulados por linea y baselines por tinta compartido por `autoFitText`, `getTextBlockMetrics` (~2467), `drawTextLines` (~2487), `getTextBlockBox` (~2812) y `lineFontSizes` (~3182)
- [x] T010 Implementar el encaje final siempre en `js/editor.js` como una pasada de escala sobre la capa ya compuesta, con margen de seguridad de pocos pixeles y limite `<= 1` *(cerrado en RC50: el encaje final corre siempre; suite `tests/encaje-final.test.js`)*
- [x] T011 `node --check` de `js/editor.js` y suite completa en verde *(RC50: `node --check` y suite completa verdes; hoy 45/45)*

**Checkpoint**: una sola geometria para ajuste y dibujo; toda linea entra
completa en el lienzo. Base para US3, US4 y US5.

---

## Phase 3: User Story 1 - Curvar el texto muestra el texto curvado (Priority: P1) MVP

**Goal**: el control "Curve the text" muestra texto curvado visible en ambas
direcciones, y el PDF muestra la misma curva.

**Independent Test**: con un texto corto, subir la curva a un valor alto y
comprobar que el lienzo muestra texto curvado (tinta > 0); devolverlo a cero y
comprobar que el texto vuelve recto e identico.

**Contract**: `contracts/curva.md` (R-C1.1 a R-C1.5, R-C2.1 a R-C2.3).

### Tests for User Story 1

- [x] T012 [P] [US1] Suite `tests/curva-snapshot.test.js`: fijar el orden dibujar -> copiar a 2D -> perder contexto -> devolver la copia, que el canvas devuelto es 2D y autocontenido, y que el angulo 0 no crea contexto GL (R-C1.1 a R-C1.4)
- [x] T013 [P] [US1] Suite `tests/curva-sin-webgl.test.js`: fijar que la ruta headless rechaza con causa sin WebGL y que el editor visible conserva el fallback 2D (R-C2.1, R-C2.2, constitucion II)

### Implementation for User Story 1

- [x] T014 [US1] En `js/effects/distort-engine.js`, copiar el resultado WebGL a un canvas 2D **antes** de `loseContext()` y devolver la copia (hoy `loseContext()` borra el resultado: 0 px de tinta con angulo 120)
- [x] T015 [US1] En `js/effects/distort-engine.js`, via rapida de angulo 0: devolver la capa sin tocar, sin crear contexto WebGL (R-C1.4)
- [x] T016 [US1] En `js/editor.js`, propagar la causa cuando la curva no puede calcularse en la ruta de render headless, en vez de degradar al fallback 2D (R-C2.1)
- [x] T017 [US1] `node --check` de `js/effects/distort-engine.js` y `js/editor.js`; suites de T012 y T013 en verde

**Checkpoint**: US1 verificable por si sola (curva visible en ambos signos,
paridad con el motor).

---

## Phase 4: User Story 2 - El selector de linea se ve al abrir (Priority: P1)

**Goal**: la barra "Style target" (All/L1/L2/L3) visible al abrir en TEXT,
STYLES e ICON, y oculta en BACKGROUND/DOWNLOAD.

**Independent Test**: abrir la pestana y comprobar que el selector esta visible
sin tocar nada; cambiar a STYLES e ICON y comprobar que sigue visible; ir a
BACKGROUND/DOWNLOAD y comprobar que se oculta.

**Decision**: research R2 (registro anidado en el listener de `GradientPicker`).

### Tests for User Story 2

- [x] T018 [P] [US2] Suite `tests/barra-line-target.test.js`: fijar que el registro de `applyLineTargetGating` no esta anidado dentro del listener de `textmuy:line-target-updated`, que el gating corre al arrancar, y el criterio de pestana (visible en text/custom/icon, oculta en background/save)

### Implementation for User Story 2

- [x] T019 [US2] En `js/controls.js`, sacar el registro de `applyLineTargetGating` y su llamada inicial del listener de `GradientPicker` y llevarlos al nivel de `bindControls()` (hoy la barra nace con `hidden=true` y solo aparece al cambiar de pestana)
- [x] T020 [US2] Verificar el gating de `[data-global-only]` (grupo Canvas Size) en el mismo arranque: visible en All, oculto en L1/L2/L3
- [x] T021 [US2] `node --check` de `js/controls.js`; suite de T018 en verde

**Checkpoint**: US2 verificable por si sola (barra visible sin interaccion).

---

## Phase 5: User Story 3 - El margen achica sin matar el texto (Priority: P2)

**Goal**: Margin al maximo reduce el texto pero nunca lo desaparece, y el
margen se mide contra el lado menor del canvas.

**Independent Test**: con un texto corto, llevar Margin al maximo y comprobar
que el texto sigue visible; bajarlo a cero y comprobar que recupera su tamano.

**Contract**: `contracts/geometria.md` R-G1.4.

### Tests for User Story 3

- [x] T022 [US3] Suite `tests/margen.test.js`: fijar que con margen al maximo el area util no llega a cero ni negativa, que el texto sigue presente, que en canvas apaisado el margen no colapsa antes de tiempo y que volver a cero restaura el tamano (FR-003, FR-004)

### Implementation for User Story 3

- [x] T023 [US3] En `js/editor.js`, calcular el padding efectivo contra el **lado menor** del canvas y topearlo para preservar un area util minima (hoy `padding = canvasWidth * margin` sin tope: en 800x200 muere con ~13%)
- [x] T024 [US3] Verificar que la suite `tests/area-util.test.js` (T005) sigue en verde con el calculo unico compartido por ajuste y dibujo
- [x] T025 [US3] `node --check` de `js/editor.js`; suite de T022 en verde

**Checkpoint**: US3 verificable por si sola (margen al maximo sin lienzo vacio).

---

## Phase 6: User Story 4 - El texto nunca sobresale del lienzo (Priority: P1)

**Goal**: cero tinta del texto en las filas y columnas del borde con cualquier
combinacion de layout, con y sin rotacion.

**Independent Test**: con un texto de varias lineas y con una palabra larga,
comprobar que no hay tinta en ninguna fila ni columna del borde; repetir tras
mover cada control de layout.

**Contract**: `contracts/geometria.md` R-G1.1, R-G1.3, R-G2.1 a R-G2.4.

### Tests for User Story 4

- [x] T026 [P] [US4] Suite `tests/geometria-bloque.test.js`: fijar que ajuste y dibujo comparten origen, avances y baselines (una sola definicion), y que con tamanos por linea distintos las Y usan avances acumulados sin superposicion (R-G1.1, R-G1.3)

### Implementation for User Story 4

- [x] T027 [US4] En `js/editor.js`, sustituir el centrado duplicado del ajuste y de cada motor de dibujo por el modelo unico de bloque (hoy el ajuste y el dibujo usan formulas distintas de centrado: "tinta en la columna 479 y 50+ px en la fila 0")
- [x] T028 [US4] En `js/editor.js`, aplicar el encaje final **siempre** tras componer la capa (con y sin curva/rotacion), con margen de seguridad de pocos pixeles y limite `<= 1` (hoy solo corre en el camino con recorte, por eso la rotacion "enmascaraba" el desborde)
- [x] T029 [US4] En `js/editor.js`, aplicar el encaje en el camino de render headless igual que en el visible, sin alterar `settings.canvas.width/height` (paridad FR-020)
- [x] T030 [US4] `node --check` de `js/editor.js`; suites de T007, T026 y las 26 previas en verde

**Checkpoint**: US4 verificable por si sola (cero tinta en los bordes).

---

## Phase 7: User Story 5 - La altura de linea separa lineas, no mueve texto (Priority: P2)

**Goal**: con una sola linea, Line height no altera posicion ni tamano; con
varias lineas, cada linea se coloca a esa distancia de la de arriba.

**Independent Test**: con una sola linea, mover Line height de minimo a maximo y
comprobar que la caja del texto no se mueve; con dos lineas, comprobar que solo
cambia la distancia entre ellas.

**Contract**: `contracts/geometria.md` R-G1.2.

### Tests for User Story 5

- [x] T031 [US5] Suite `tests/line-height.test.js`: fijar la invariancia de una sola linea, que con dos lineas L1 queda fija y solo L2 se desplaza al subir, y que al minimo las lineas se juntan sin superponerse ni invertirse (FR-007, FR-008, SC-005)

### Implementation for User Story 5

- [x] T032 [US5] En `js/editor.js`, aplicar el avance por linea (`lineHeight * tamano[i-1]` debajo de la anterior) en todos los motores que hoy centran `n * tamano * lineHeight` (`getTextBlockMetrics` ~2467, `drawTextLines` ~2487, `getTextBlockBox` ~2812, `autoFitText` ~745)
- [x] T033 [US5] En `js/editor.js`, anclar L1 al modelo de bloque: su `lineHeight` se guarda pero no mueve nada (FR-021)
- [x] T034 [US5] `node --check` de `js/editor.js`; suites de T006, T031 y las 26 previas en verde

**Checkpoint**: US5 verificable por si sola (una sola linea quieta).

---

## Phase 8: User Story 6 - Cada linea con su propio estilo (Priority: P1)

**Goal**: tres lineas con tipografia, color, textura y efectos propios, con
herencia, tamano relativo en cascada y tipografia propia por linea.

**Independent Test**: configurar tres lineas distintas (fuente, color y tamano
relativo), cambiar de tab entre ellas y comprobar que cada una conserva lo
suyo; agrandar L1 y comprobar que L2 y L3 la siguen en proporcion; guardar como
preset, recargar y comprobar que vuelve identico.

**Contract**: `contracts/lineas.md` (R-L1.1 a R-L3.3) + `data-model.md`
(secciones 3, 4, 5, 7).

### Tests for User Story 6

- [x] T035 [P] [US6] Suite `tests/lineas-resolucion.test.js`: fijar el orden heredar -> mezclar lo propio -> dimensionar, que heredar de ALL parte de la base y heredar de linea parte de su estilo **resuelto**, que el delta disperso solo cambia las rutas presentes, y que el target activo no participa en la resolucion (FR-009, FR-010, R-L1.1 a R-L1.5)
- [x] T036 [P] [US6] Suite `tests/lineas-tamano.test.js`: fijar la cascada (L2 al 80% de L1 mantiene el 80% exacto y L3 sigue a L2), que con referencia a linea el slider reescribe el porcentaje y con referencia al canvas escribe px, y que la fase 2 escala todas las lineas por el mismo factor con proporciones intactas (FR-011, FR-012, SC-007, R-L2.1 a R-L2.5)
- [x] T037 [P] [US6] Suite `tests/lineas-ciclos.test.js`: fijar el ocultamiento transitivo por ambas aristas en los selectores y el rechazo con causa de un ciclo que llega por archivo editado a mano, dejando la vista intacta (FR-013, FR-014, R-L3.1 a R-L3.3)
- [x] T038 [P] [US6] Suite `tests/lineas-formato.test.js`: fijar las claves 1-based (`line["1"]`=L1) en el `.txm` `version:2`, que solo viaja el delta, y que lo configurado para lineas inexistentes se conserva y se reactiva (FR-015, FR-019, R10)

### Implementation for User Story 6 - modelo de lineas

- [x] T039 [US6] En `js/editor.js`, sustituir `lines.{activeTarget,overrides,sizing}` global por el modelo de `data-model.md`: `lines.inherit` (padre ALL u otra linea), overrides propios por linea y `sizing` **dentro** de cada linea (`{ref, mode, pct}`), con claves 1-based
- [x] T040 [US6] En `js/editor.js`, implementar la resolucion en tres pasos con deteccion de ciclos de cualquier longitud, incluidos los mixtos (herencia + tamano), con causa `lines:<detalle>:ciclo` y vista intacta
- [x] T041a [US6] Purga v1 de las listas duplicadas (RC51/RC58): `pruneGlobalOnlyOverrides` y `LINE_STYLE_PATHS`/`isLineStylePath` no existen, y las listas propias de `controls.js` desaparecieron (`isGlobalOnlyPath` delega en `editor.isGlobalPath`).
- [x] T041b [US6] Resto de la purga v1 (cerrado en RC76, 2026-10-24): borrados
      `editor.js::resolveLineSettings` (+ export) y `localApplyDelta` (que quedaba
      huerfano); `controls.js::isGlobalOnlyPath` pasó a `esGlobalDeBloque`; y
      `catalog.js::imgTargets` pasó de `lines.overrides` (v1) a `lines.line["<n>"]` (v2),
      que era un DEFECTO: las refs de imagen declaradas por linea no se resolvian (el
      test `img-refs` fijaba la forma v1, por eso pasaba).
- [x] T042 [US6] En `js/editor.js`, conservacion de las lineas inexistentes: no podar L2/L3 cuando el texto tiene menos lineas y reactivarlas al recuperar las (FR-015)

### Implementation for User Story 6 - UI

- [x] T043 [US6] En `index.html` y `js/controls.js`, selector de **herencia** por linea (ALL / L1 / L2 / L3) dentro de la barra existente, sin panel nuevo
- [x] T044 [US6] En `js/controls.js`, el selector de tamano reescribe `pct` con referencia a linea y px absolutos con referencia al canvas, conservando viva la cadena (FR-012)
- [x] T045 [US6] En `js/controls.js`, ocultar transitivamente por ambas aristas toda opcion que cerraria un ciclo al editar una linea (FR-013)
- [x] T046 [US6] En `js/controls.js`, el desplegable de fuentes muestra la fuente del target activo y marcar los overrides propios frente a los heredados (FR-018)

### Implementation for User Story 6 - persistencia y render

- [x] T047 [US6] En `js/preset-manager.js`, `PROJECT_VERSION` a 2, claves de linea 1-based, rechazo con causa de un formato de lineas desconocido y sin lectores del formato anterior (constitucion IV y VII v3.2.0, R10)
- [x] T048 [US6] En `js/api.js`, resolver y cargar por linea las fuentes declaradas bajo demanda, una vez por identidad, y nombrar linea y fuente en el fallo sin impedir el resto (FR-017, constitucion VI sin `preloadAll`)
- [ ] T049 [US6] En `js/editor.js`, partir el pipeline en una capa compuesta por linea para que rotacion y curva por linea se apliquen a cada linea y luego se apilen con la geometria del bloque (R9, ultimo por invasivo)

### Cierre de User Story 6

- [x] T050 [US6] `node --check` de los cinco JS tocados; suites T035-T038 y las 26 previas en verde
- [x] T051 [US6] Bump `?v=RCn` en `index.html` y `render-core.html` (y `css/style.css` en `index.html`) y actualizar `AGENTS.md`

**Checkpoint**: US6 CERRADA. Tres lineas con tres estilos, round-trip y paridad
con el PDF. Queda el bloque D4 (rotacion y curva por linea) como fase aparte.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: cierre transversal de las seis historias.

- [x] T052 [P] Suite `tests/text-tab.browser.js`: puerta de pixeles del editor visible.
      Contrato: `contracts/pixeles.md` (R-P1 a R-P8). Escrita y COMPLETA el 2026-10-24: T052a a T052h
      en verde (SC-001 a SC-007 verificados en el editor real). La
      cobertura previa fueron las mediciones de laboratorio (RC51 20/20, RC58 9/9) y
      `quickstart.md` §3. Desglose:
  - [x] T052a [P] Harness: `index.html` real + puente simulado + catalogo `fonts` de 3
        identidades + espia de `FontFace` + cero red (R-P1.1 a R-P1.6). Reusar el bootstrap de
        `tests/galerias.browser.js`; si la spec 009 extrae un harness compartido, reusarlo.
        *(hecho 2026-10-24: vive dentro de `tests/text-tab.browser.js`; la spec 009 no extrajo
        un harness compartido, asi que la reutilizacion es del patron.)*
  - [x] T052b [US1] SC-001: curva visible en ambos signos y vuelta a 0 sin estado residual
        (R-P2.1 a R-P2.3). *(hecho y verde en 3 corridas el 2026-10-24; el espejo fino del
        signo queda en la capa Node y R-P2.3 se mide con la tolerancia sub-pixel que fijo el
        contrato tras medir el residuo del redondeo del arco.)*
  - [x] T052c [US2] SC-002: barra visible al abrir en TEXT/STYLES/ICON, oculta en
        BACKGROUND/DOWNLOAD, y `[data-global-only]` gateado (R-P3.1 a R-P3.3). *(RC76,
        2026-10-24: verde sobre el DOM real, midiendo visibilidad computada (no el atributo).)*
  - [x] T052d [US3] SC-003: margen al maximo con tinta > 0 y caja dentro del area util
        (R-P4.1, R-P4.2). *(RC76, 2026-10-24: con Margin 50% el padding llega al tope (0,44), el
        texto sigue pintando tinta y su caja queda dentro del area util.)*
  - [x] T052e [US4] SC-004: cero tinta en filas y columnas del borde con y sin rotacion, con
        Margin 0 y combinando curva + margen (R-P5.1 a R-P5.3). *(RC76, 2026-10-24: 0 px de
        tinta en las 4 lineas del borde con rotacion 0 y +-45, y tambien con margen 40 + curva 120.)*
  - [x] T052f [US5] SC-005: una linea invariante ante Line height y L1 anclada con dos
        lineas (R-P6.1, R-P6.2). *(RC76, 2026-10-24: con UNA linea la caja y la tinta son
        invariantes; con DOS el top de L1 queda clavado (89 px) en -100..+200 y el bloque crece
        hacia abajo; en +200 el encaje reescala el conjunto, medido y fijado en el contrato.)*
  - [x] T052g [US6] SC-006/SC-007: tres lineas con estilo propio, cascada del 80% exacta,
        herencia, alternar tabs sin cambio de lienzo y round-trip sin motor (R-P7.1 a R-P7.6).
        *(RC77, 2026-10-24: verde. El ratio se mide con la FORMULA `P/100`: 0,808 para P=80 y
        0,515 para P=50; la cascada compone 0,414 = 0,8 x 0,5; el target no cambia el lienzo; y el
        round-trip conserva los px por linea. Hallazgo: el color efectivo vive en `fill.layers`, no
        en `fill.color`.)*
  - [x] T052h Cierre: puerta en verde, cero errores de pagina) *(hecho: el contrato R-P7.2 quedo con
        los umbrales medidos; la evidencia vive en la propia suite y en `quickstart.md` 1.1/5; el bump
        fue RC77 por el cambio de semantica del tope, no por la suite.)*
- [x] T053 [P] Recorrido integrado manual de `quickstart.md` §3 y §4 en la pestana "Estilos de Texto" del WordPress de laboratorio, con Ctrl+F5, incluyendo el PDF de un grupo con texto estilizado (paridad FR-020)
- [x] T054 Bump final `?v=RCn` en `index.html`, `render-core.html` y `css/style.css`, y verificar que las dos paginas cargan la misma version
- [x] T055 [P] Actualizar `AGENTS.md`: mapa de archivos (nuevas suites), seccion 9 (como probar, con los comandos nuevos) y una seccion de decisiones del feature `002-text-tab` (geometria unica, alcance por linea, formato `.txm` v2, sin migracion)
- [x] T056 [P] Actualizar `README.md` con la ficha del feature si corresponde
- [x] T057 Puerta final: suite completa en verde, `node --check` de todos los JS, `tests/entorno.test.js` en OK y paridad editor/PDF verificada

---

## Phase 10: Bloque D4 - rotacion y curva por linea (bloque aparte)

**Por que es un bloque aparte**: hoy `rotate` y `distort` se aplican al **bloque
compuesto entero, al final** del render. Hacerlos por linea exige **partir el
pipeline en una capa por linea**: componer cada linea con su estilo ya resuelto,
aplicarle a cada una su giro o su curva, y recien despues apilar el bloque. Eso
significa que relleno, contorno, sombra, relieve y texto existan **una vez por
linea** en vez de una vez por bloque: es un cambio de arquitectura del render, no
un ajuste de configuracion.

**Por que no se promete ahora**: si solo se sacaran de la tabla de globales, el
control por linea **aceptaria el valor y no haria nada** (el PDF saldria con el
mismo angulo en todas las lineas, sin aviso). Es peor que dejarlos globales.

**Que se quiere** (decision del usuario, 2026-10-04), con herencia como el resto:

- Rotacion: `ALL 90 grados` + `L1 +10`, `L2 -10`, `L3 +10` -> `\/`
- Curva: `ALL 90 grados` + `L1 curva +`, `L2 curva -` -> `()`

**Tareas** (sin numero hasta que se implemente):

- [ ] Suite que fije el orden: la rotacion por linea se aplica ANTES de componer
      el bloque, y cada linea conserva la suya al apilar.
- [ ] Partir la composicion en una capa por linea con su estilo resuelto.
- [ ] Aplicar la rotacion de la linea al pintar su capa.
- [ ] Aplicar la curva de la linea al pintar su capa.
- [ ] Sacar `rotate` y `distort` de la tabla global (se vuelven heredables).
- [ ] UI: el control deja de global y pasa a la linea activa; el rotulo dice
      para que linea es.
- [ ] Verificar en el laboratorio los dos ejemplos del usuario (`\/` y `()`) y el
      round-trip del preset.
- [ ] Actualizar `contracts/geometria.md`, `AGENTS.md` y el estado del feature.

---

## Phase 11: Panel de Font Size (Modo + Ref + Proporcion + Tope)

**Defecto de origen (medido 2026-10-24)**: el motor soporta la proporcion desde RC52
(`tests/lineas-tamano.test.js` lo fija) pero **ninguna UI la escribia**: el unico slider
estaba atado a `canvas.maxFontSize` (el *tope*, `controls.js:503`) y `setLineSizing` solo
escribia `ref/mode/refLine`. Lo reportado por el administrador: "no hay opcion de que L2
sea el 50% de ALL"; "50% de L1 no cambia de tamano" (el `pct` quedaba en 100); "Ancho no
funciona para nada" (`mode:'width'` ignoraba `pct` y el slider se deshabilitaba); "L2 al
10% del canvas y ALL se achica" (el slider del tope, **en All**, escribe la base).
Ademas: ninguna suite cubria la **ruta de escritura** de la UI, y por eso paso inadvertido.

Contrato: `contracts/lineas.md` §2.2 (los cuatro valores), §2.1 (R-L2.1..R-L2.3) y **§5**
(mapeo control -> dato, R-L2.6..R-L2.10).

- [x] T058 Contrato + vocabulario. *(hecho 2026-10-24: `lineas.md` 2.1/2.2/2.3/5, con la
      prosa rota de 2.2/2.3 reparada y el cross-ref R-L4.4 -> R-L4.3 corregido.)*
- [x] T059 Motor: `mode:'width'` aplica `pct` (`lineFontSizes`); `pct` ausente = 100 (R-L2.7).
- [x] T060 Motor: `sizingOf` acepta `ref:'all'` como alias de `'canvas'` al leer (R-L2.1).
- [x] T061 Motor: purga de lo inalcanzable: rama `patch.fontSizePx` de `setLineSizing`
      (`editor.js:3702-3706`) y el binding muerto de `#tt-font-size-input`
      (`controls.js:510`), que no existe en `index.html` (verificado: 0 coincidencias).
- [x] T062 UI: `#tt-line-size-mode-input`, `#tt-line-size-ref-input`,
      `#tt-line-size-pct-input` (1..300), `#tt-line-size-cap-input` (1..100) +
      `#tt-line-size-cap-inherit` + `#tt-line-size-estado` (bloque Font Size de `index.html`).
- [x] T063 UI: handlers en `controls.js` (escriben `sizing` por `editor.setLineSizing` y el
      tope por `setNestedSetting('canvas.maxFontSize', ...)`) + `refrescarLineasUI` que
      muestra lo **resuelto** (`getEffectiveSetting`, `getLineFontPx`) sin materializar el 100.
- [x] T064 [P] `tests/lineas-tamano.test.js`: Ancho con `pct` 50/100/150, Proporcional ALL
      50, cascada con Ancho, tope por linea que NO toca ALL, `pct` intacto sin `fontSizePx`,
      alias `'all'`.
- [x] T065 [P] Suite nueva `tests/lineas-escritura.test.js`: la ruta de ESCRITURA (modo, ref,
      `pct`, tope, "Heredar de ALL" que BORRA la clave) y que `settings.canvas.maxFontSize`
      de la base NO cambia al tocar una linea.
- [x] T066 [P] Puerta de pixeles: con el DOM real, Proporcional 50% = mitad de tinta de L1;
      Ancho 150% = 1,5 x el ancho de L1; tope 10% en L2 = L2 recortada y ALL intacta; el px
      de la burbuja ~ lo pintado.
- [x] T067 Cierre: bump `?v=RC78` (index + render-core + css), `AGENTS.md` 7.34, puerta verde.
      *(hechos el 2026-10-24: motor (`pct` en Ancho + `ref:all` + purgas), UI
      (panel Modo/Ref/Proporcion/Tope + R-L2.9/R-L2.10), suites `lineas-tamano` (extendida) y
      `lineas-escritura` (nueva: la RUTA DE ESCRITURA), y T066 en `text-tab.browser.js` sobre el DOM
      real. Dos defectos de MOTOR destapados al cubrir la UI: `mergeDelta` borraba `sizing` al
      escribir otro ajuste y `measureTextWidth` no componia la fuente. Ver `AGENTS.md` 7.34.)*

---
## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias, puede arrancar ya
- **Foundational (Phase 2)**: depende de Phase 1; BLOQUEA a US3, US4 y US5
- **User Stories (Phase 3+)**: US1 y US2 dependen solo de Phase 1 (son bloques
  A: `distort-engine.js` y `controls.js`, archivos distintos, van en paralelo).
  US3, US4 y US5 dependen de Phase 2. US6 depende de Phase 2 y se entrega al final
  (bloque D) porque parte el pipeline en capas por linea (R9)
- **Polish (Phase 9)**: depende de las historias que se entregaren

### User Story Dependencies

- **US1 (P1)**: arranca tras Phase 1. No depende de ninguna otra. MVP.
- **US2 (P1)**: arranca tras Phase 1. No depende de ninguna otra. En paralelo con US1.
- **US3 (P2)**: tras Phase 2 (helper de area util). Sin dependencia de US4/US5.
- **US4 (P1)**: tras Phase 2 (geometria + encaje). Se apoya en el area util de US3.
- **US5 (P2)**: tras Phase 2 (avances por linea). Se apoya en el modelo de bloque.
- **US6 (P1)**: tras Phase 2. Última entrega: el modelo de lineas reemplaza el
  estado actual y parte el pipeline por capas.

### Within Each User Story

- Tests primero, y deben fallar antes de implementar
- Modelo antes que servicios antes que UI
- Story completa antes de pasar a la siguiente

### Parallel Opportunities

- T005, T006 (Foundational) pueden ir en paralelo
- T012 y T013 (tests de US1) en paralelo; T018 (test de US2) en paralelo con US1
- T035, T036, T037, T038 (tests de US6) en paralelo entre si
- T022, T026, T031 (tests de US3/US4/US5) en paralelo
- US1 y US2 completas en paralelo (archivos distintos)
- T052 y T053 (validacion final) en paralelo

---

## Parallel Example: User Story 6

```powershell
# Las cuatro suites de US6 se escriben y se ejecutan juntas (deben fallar antes de T039).
node tests\lineas-resolucion.test.js
node tests\lineas-tamano.test.js
node tests\lineas-ciclos.test.js
node tests\lineas-formato.test.js
```

```powershell
# US1 y US2 en paralelo: archivos distintos.
#   US1 -> js/effects/distort-engine.js, js/editor.js
#   US2 -> js/controls.js
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 = Bloque A)

1. Complete Setup (Phase 1)
2. Complete Foundational solo lo de Phase 2 que no toque US1/US2 (T005, T006)
3. Complete US1 y US2 en paralelo (bloque A)
4. **STOP y VALIDAR**: curva visible en ambos signos y barra visible al abrir
5. Bump `?v=RCn` y Ctrl+F5; medir con `quickstart.md` §3.1 y §3.2

### Incremental Delivery (bloques del plan)

1. **Bloque A** (P1): US1 curva + US2 barra. Arregla lo que hoy destruye el trabajo
   visible. Commit propio.
2. **Bloque B** (P2): Phase 2 + US3 margen + US5 line height. Commit propio.
3. **Bloque C** (P1): US4 encaje final. Commit propio.
4. **Bloque D** (P1): US6 modelo de lineas completo. Commit propio, con el bump
   final y el formato `.txm` v2.
5. Cada bloque sube `?v=RCn` en `index.html` y `render-core.html` y se valida en la
   pestana del plugin antes de pasar al siguiente.
6. **Panel de Font Size** (Phase 11, fix de US6): el panel no escribia la proporcion. Va
   **antes** de D4 por prioridad del administrador (2026-10-24).

---

## Notes

- [P] = archivos distintos, sin dependencia de tareas incompletas
- Cada historia se puede probar sola por su checkpoint
- La geometria unica (Phase 2) es el eje: lo calculado debe ser lo pintado
- US6 es el bloque caro y el ultimo: reemplaza `lines.sizing` global y las claves
  0-based por `lines.inherit` + `sizing` por linea con claves 1-based
- El bump de version va en cada bloque que toque JS (regla AGENTS.md 4.6)
- Escribir UTF-8 sin BOM y LF en todo (verificado por `tests/entorno.test.js`)
- Al cargar un `.txm` con formato de lineas viejo se rechaza con causa: es el
  comportamiento previsto (constitucion VII v3.2.0), no un bug a arreglar
