---

description: "Plan de trabajo para la correccion de bugs de fuentes y presets del editor"
---

# Tasks: Correccion de bugs de fuentes y presets del editor

**Input**: Design documents from `/specs/001-fix-bugs-01/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Las suites Node son obligatorias. Son la unica cobertura automatizable del
feature, y las 16 suites existentes en `tests/` son la puerta de regresion que impide
que el arreglo rompa lo que ya funciona.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US4)
- Include exact file paths in descriptions

## Path Conventions

- Rutas relativas a `modules/textmuy/`.
- Codigo: `js/` · Pruebas: `tests/` · Documentacion: `specs/001-fix-bugs-01/`
- Convenciones vigentes: codigo sin tildes en identificadores, UI en espanol,
  `node --check` por archivo, bump `?v=RCn` en ambos HTML.

## Constantes de la feature

- **Version de recarga**: RC39 (la vigente es RC38). Debe quedar coherente en
  `index.html`, `render-core.html` y la hoja de estilos de `index.html`.
- **Historias**: US1 (fuente declarada = fuente pintada), US2 (preview en vivo de la
  galeria), US3 (identidad unica de fuente), US4 (fidelidad de preset).

## Causas raiz ya verificadas (base de los mensajes de error y de las pruebas)

No volver a investigar; usar estos hallazgos como punto de partida:

- `js/fonts.js` `preloadAll` lee un `state` que pertenece al IIFE de `js/editor.js` y
  por tanto nunca esta definido: asegura siempre la fuente por defecto.
- `js/editor.js` compone el valor de fuente de los contextos de dibujo sin entrecomillar
  la familia y sin esperar a que la fuente este disponible.
- `js/controls.js` puebla el selector con claves de identidad distintas a las que usa
  al cargar, y el camino de carga solo mira el registro interno.
- `js/editor.js` `loadPreset` escribe campo por campo sobre el estado vivo y nunca
  aplica el grupo de capas de relleno ni el de estilos por linea.
- `js/preset-manager.js` aplica fallback silencioso a la fuente por defecto al fallar
  una carga, marcando ademas el fallo como si estuviera resuelto.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verificable antes de tocar codigo.

- [x] T001 Ejecutar las 16 suites existentes en `tests/` y registrar el baseline: todas
  deben imprimir `OK: <archivo>`. Anotar cualquier fallo previo a estos cambios
- [x] T002 Ejecutar `node --check` sobre `js/*.js` y `js/effects/*.js` y confirmar que
  la sintaxis esta limpia antes de empezar
- [x] T003 [P] Registrar en `specs/001-fix-bugs-01/quickstart.md` la version de recarga
  vigente (RC38) como referencia para el bump de la fase final

**Checkpoint**: baseline verde, sin regresiones preexistentes que confundir el trabajo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prerrequisitos que bloquean a las cuatro historias: la correccion de
identidad de fuente y el contrato compartido de ciclo de carga, de los que dependen
US1, US2 y US3.

**CRITICAL**: Ninguna historia puede empezar hasta completar esta fase.

- [x] T004 En `js/fonts.js`, sustituir el registro interno de fuentes por un indice unico
  indexado por identidad numerica de catalogo: cada fuente fisica del catalogo tiene una
  sola entrada y una sola clave. Ninguna fuente aparece dos veces (R-C1.3, R-C4.1)
- [x] T005 En `js/fonts.js`, hacer que la resolucion de una referencia acepte identidad
  numerica y, por compatibilidad, titulo; un titulo con espacios, tildes, enes o signos
  debe resolverse igual que uno ASCII. Si dos fuentes comparten titulo, devolver error de
  ambiguedad en lugar de elegir una (R-C1.1, R-C1.2, R-C1.4)
- [x] T006 En `js/fonts.js`, normalizar toda referencia a identidad numerica antes de
  devolverla: el estado del proyecto nunca debe guardar una clave interna de registro
  (R-C1.3)
- [x] T007 En `js/fonts.js`, implementar el ciclo de carga con estados explicitos (no
  solicitada, pendiente, disponible, fallida). Un fallo deja el estado en fallida con
  causa visible y **nunca** marca la fuente como disponible; un reintento vuelve a
  intentar la carga (R-C2.2)
- [x] T008 En `js/fonts.js`, eliminar todo fallback silencioso a la fuente por defecto en
  los caminos de fallo: una fuente no disponible rechaza con causa y no carga ni declara
  ninguna otra (R-C2.1, constitucion VI)
- [x] T009 En `js/fonts.js`, deduplicar descargas concurrentes de la misma fuente: dos
  peticiones simultaneas comparten una sola descarga (R-C2.3)
- [x] T010 En `js/fonts.js`, anadir un resolvedor puro de familia tipografica que **no**
  toque la red ni modifique el estado de carga (R-C2.5)
- [x] T011 En `js/fonts.js`, eliminar la lectura del estado del editor en la precarga: la
  fuente que se quiere asegurar se recibe como parametro explicito, porque la precarga
  actual nunca apunta a la fuente real del proyecto (R5)

---

## Phase 3: User Story 1 - Ver la fuente seleccionada desde el primer instante (Priority: P1) - MVP

**Goal**: El texto del lienzo se dibuja siempre con la fuente que declara el estado del
proyecto, sin tipografias fantasma al abrir ni al tocar controles, y con nombres que
contienen espacios, tildes o enes.

**Independent Test**: Abrir la pestana, comparar la familia del texto con el nombre del
selector, y repetir tras mover el zoom, el tamano de fuente y la rotacion. Ningun
repintado puede cambiar la familia. Contrastar con quickstart.md §3.1.

### Tests for User Story 1

> Escribir estas pruebas primero y confirmar que fallan antes de implementar.

- [x] T012 [P] [US1] Crear `tests/fuente-compuesta.test.js`: comprobar que el valor de
  fuente compuesto entrecomilla la familia y que un nombre con espacios, tilde o ene
  produce un valor que el contexto acepta; comprobar que el valor no contiene ninguna
  familia generica de reserva
- [x] T013 [P] [US1] Crear `tests/fuente-carga-estados.test.js`: comprobar que un fallo
  de descarga deja el estado en fallida con causa y no en disponible, que un reintento
  posterior puede tener exito, que dos peticiones simultaneas descargan una sola vez, y
  que el camino de fallo no carga ninguna otra fuente

### Implementation for User Story 1

- [x] T014 [US1] En `js/editor.js`, crear un unico constructor del valor de fuente de un
  contexto de dibujo que reciba la familia ya resuelta y la entrecomille. Ningun punto de
  dibujado construye el valor por su cuenta (R-C3.1, R-C3.2)
- [x] T015 [US1] En `js/editor.js`, reemplazar todas las composiciones existentes del
  valor de fuente por el constructor de T014, incluidas las del ajuste automatico de
  tamano y del ajuste por linea (FR-001)
- [x] T016 [US1] En `js/editor.js`, hacer que el pintado espere a que la fuente declarada
  este disponible antes del primer repintado visible, y registrar un repintado pendiente
  que se dispare al quedar disponible (FR-002)
- [x] T017 [US1] En `js/editor.js`, no repintar con una composicion anterior si el valor
  compuesto fuera rechazado: el fallo debe ser visible y perceptible (R-C3.4, FR-013)
- [x] T018 [US1] En `js/editor.js`, no pedir al modulo de fuentes que asegure una fuente
  distinta de la declarada en ningun punto del arranque ni del repintado
- [x] T019 [US1] En `js/editor.js`, informar con causa visible cuando la fuente declarada
  no se puede obtener, sin dibujar el texto con otra tipografia (FR-005)
- [x] T020 [US1] Ejecutar las suites T012 y T013 y confirmar que pasan; despues repetir
  quickstart.md §3.1 en WordPress con Ctrl+F5

---

## Phase 4: User Story 2 - Previsualizar fuentes en vivo desde la galeria (Priority: P2)

**Goal**: Tocar un tile de la galeria aplica la fuente al lienzo de inmediato, sin pasar
por el boton de confirmacion, y cerrar sin confirmar restaura la fuente previa.

**Independent Test**: Abrir la galeria, tocar tres fuentes y observar el lienzo; cerrar
sin confirmar y comprobar que vuelve al estado previo. Contrastar con quickstart.md
§3.2.

**Note**: Depende de US1 para que la fuente previsualizada se pinte de verdad. Si se
implementa antes, la previsualizacion aplicaria la fuente pero el lienzo seguiria
mostrando la fallback, y la prueba daria un falso negativo.

### Implementation for User Story 2

- [x] T021 [US2] En `js/fuentes-galeria.js`, aplicar al lienzo la fuente del tile
  seleccionado de forma inmediata, conservando la referencia previa del proyecto sin
  modificarla (R-C5.1, R-C5.4, FR-007)
- [x] T022 [US2] En `js/fuentes-galeria.js`, mantener como maximo una previsualizacion
  activa: seleccionar una segunda fuente reemplaza a la primera (R-C5.2)
- [x] T023 [US2] En `js/fuentes-galeria.js`, revertir al estado previo al cerrar la
  galeria sin confirmar, incluso con descargas en curso; una descarga que termine
  despues de revertir no debe repintar el lienzo (R-C5.3, FR-008)
- [x] T024 [US2] En `js/fuentes-galeria.js`, hacer que el boton de confirmacion consolide
  la fuente en el estado del proyecto y cierre, sin cambiar el lienzo al confirmar
  (R-C5.5, FR-009)
- [x] T025 [US2] En `js/fuentes-galeria.js`, no dejar el lienzo en un estado que el
  usuario no pueda distinguir de una fuente aplicada mientras la fuente aun no ha
  terminado de descargarse (R-C5.6)
- [x] T026 [US2] Verificar que abrir y cerrar repetidamente la galeria no acumula fuentes
  descargadas ni deja previsualizaciones residuales
- [x] T027 [US2] Ejecutar quickstart.md §3.2 en WordPress con Ctrl+F5
---

## Phase 5: User Story 3 - Una unica identidad por fuente (Priority: P3)

**Goal**: El selector de fuentes muestra cada fuente una sola vez y todas sus entradas
son funcionales; el selector y el estado del proyecto quedan sincronizados siempre.

**Independent Test**: Abrir el desplegable, comprobar que las 15 fuentes propias
aparecen exactamente una vez, elegir cada una de las primeras diez y comprobar que
todas cambian el texto del lienzo. Contrastar con quickstart.md §3.3.

### Tests for User Story 3

- [x] T028 [P] [US3] Crear `tests/fuente-selector.test.js`: dado un catalogo de ejemplo,
  enumerar el selector y comprobar que cada titulo aparece exactamente una vez; comprobar
  que elegir cualquier entrada cambia la familia efectiva; comprobar que un titulo con
  tilde y ene resuelve y que un titulo ambiguo devuelve error con causa

### Implementation for User Story 3

- [x] T029 [US3] En `js/controls.js`, reconstruir el selector de fuentes desde una sola
  fuente de verdad, eliminando las rutas que agregan la misma fuente con claves distintas
  (R-C4.1, FR-003)
- [x] T030 [US3] En `js/controls.js`, hacer que toda entrada del selector disponga la
  carga de su fuente por identidad de catalogo, no solo cuando la clave existe en el
  registro interno: ninguna entrada puede quedar sin efecto (R-C4.2)
- [x] T031 [US3] En `js/controls.js`, mantener sincronizados el valor mostrado en el
  selector y el estado del proyecto al arrancar, al aplicar un preset y al deshacer o
  rehacer; eliminar la carrera entre la reconstruccion del selector y la escritura del
  valor (R-C4.3, FR-010)
- [x] T032 [US3] En `js/controls.js`, no mostrar entradas cuando el catalogo aun no esta
  disponible, para que ninguna pueda fallar al elegirse (R-C4.4)
- [x] T033 [US3] Ampliar `tests/fonts-catalog.test.js` para cubrir la resolucion por
  titulo acentuado y la ausencia de entradas duplicadas
- [x] T034 [US3] Ejecutar la suite T028 y verificar que todas las suites siguen en verde;
  despues repetir quickstart.md §3.3 en WordPress

---

## Phase 6: User Story 4 - Un preset cargado se ve exactamente como se guardo (Priority: P1)

**Goal**: Cargar un preset reproduce lo guardado y reemplaza la vista completa: ningun
ajuste ausente del preset conserva un valor de la vista anterior.

**Independent Test**: Guardar un preset con un color de capa propio, cambiar el color de
la vista, recargar el preset y comprobar que vuelve el color guardado. Repetir con
tipografia, capas y estilos por linea. Contrastar con quickstart.md §3.4.

**Note**: Es la historia con mayor radio de impacto del lote. El camino de carga lo
comparten el editor, el importador de TextStudio y el motor headless del PDF.

### Tests for User Story 4

> Escribir estas pruebas primero y confirmar que fallan antes de implementar.

- [x] T035 [P] [US4] Crear `tests/preset-roundtrip.test.js`: guardar un preset y
  recargarlo debe reproducir el estado campo por campo; cargar sobre una vista modificada
  debe devolver a defaults los campos ausentes del delta; cargar el mismo preset dos
  veces no debe acumular capas ni estilos; un preset que referencia una fuente por titulo
  debe seguir cargando
- [x] T036 [P] [US4] Anadir a `tests/preset-roundtrip.test.js` la regresion explicita del
  defecto reportado: guardar con un color de capa de relleno, cambiar el color de la
  vista y recargar debe devolver el color guardado y no el de la vista

### Implementation for User Story 4

- [x] T037 [US4] En `js/editor.js`, hacer que la aplicacion de un preset construya el
  estado como defaults mas delta sobre un objeto **nuevo**, y que ese objeto reemplace al
  estado de la vista en lugar de escribir campo por campo sobre el estado vivo
  (FR-015, FR-016, R-P1.1, R-P1.2)
- [x] T038 [US4] En `js/editor.js`, aplicar el grupo completo de capas de relleno (capas,
  estilos, repeticiones, modos de mezcla, texturas) que hoy no se aplica al cargar (FR-015)
- [x] T039 [US4] En `js/editor.js`, aplicar tambien el grupo de estilos por linea y el
  destino de estilo activo, que hoy no se aplican al cargar (FR-015)
- [x] T040 [US4] En `js/editor.js`, eliminar la conversion que reescribe un color entre
  dos representaciones distintas al cargar, de modo que el campo conserve el tipo que usa
  la vista; el round-trip debe revelar si el editor guarda de una forma y lee de otra
  (R-P3.3)
- [x] T041 [US4] En `js/preset-manager.js`, validar la referencia de fuente al leer de
  modo que un rechazo **no** quede cacheado y un reintento valido resuelva (R-P2.1)
- [x] T042 [US4] En `js/preset-manager.js`, rechazar un delta con estructura invalida con
  causa y sin aplicar parcialmente nada; la vista debe quedar intacta ante un fallo
  (R-P2.2, R-P2.3)
- [x] T043 [US4] En `js/preset-manager.js` y `js/editor.js`, usar una unica funcion de
  carga compartida por el editor, el importador de TextStudio y el motor headless, sin
  una variante solo para la vista del editor (R-P4.1, FR-020)
- [x] T044 [US4] En `js/editor.js`, reconstruir los controles de la interfaz tras aplicar
  un preset para que reflejen el preset y no los valores anteriores; comprobar que deshacer
  y rehacer preservan la integridad del preset aplicado (R-P5.1, R-P5.2)
- [x] T045 [US4] En `js/editor.js`, informar con causa y dejar la vista anterior en pie ante
  un fallo de carga, para que el usuario no pierda el trabajo abierto (R-P5.3)
- [x] T046 [US4] Ejecutar las suites T035 y T036 y confirmar que pasan; verificar que un
preset ya existente en el servidor carga sin migracion (FR-019, SC-011)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cierre transversal de las cuatro historias.

- [x] T047 Subir la version de recarga a **RC39** de forma coherente en `index.html`,
  `render-core.html` y la hoja de estilos referenciada en `index.html`
- [x] T048 Ejecutar todas las suites existentes y las 4 nuevas, y confirmar que pasan;
  ejecutar `node --check` sobre `js/*.js` y `js/effects/*.js`
- [ ] T049 Ejecutar el recorrido completo de `specs/001-fix-bugs-01/quickstart.md` en
  WordPress con Ctrl+F5, incluidas las secciones §3.1 a §3.4
- [ ] T050 **Puerta obligatoria**: ejecutar quickstart.md §3.5, la paridad entre el editor
  y el PDF renderizado. Es la unica cobertura del cambio de mayor riesgo y no es
  alcanzable desde Node (R9). No cerrar el feature sin esto
- [x] T051 Revisar que no queden restos de las tres identidades de fuente en `js/fonts.js`,
  `js/controls.js` y `js/fuentes-galeria.js`, ni claves internas de registro persistidas
  en el estado (constitucion VII)
- [x] T052 Revisar que no quede ningun fallback silencioso a la fuente por defecto en
  `js/fonts.js` ni en `js/preset-manager.js` (constitucion VI)
- [x] T053 [P] Actualizar `AGENTS.md` en el modulo: registrar la identidad unica de fuente,
  el constructor unico de familia y la carga de preset sobre defaults limpios, con la
  version vigente
- [x] T054 [P] Actualizar `specs/001-fix-bugs-01/checklists/requirements.md` registrando
  que los criterios se verificaron en WordPress, con la fecha del recorrido
que los criterios se verificaron en WordPress, con la fecha del recorrido

---

## Phase 8: Regresión RC40 — identidad de fuente (P1)

**Purpose**: Corregir la regresión que impide cargar cualquier fuente por nombre. La
implementación de Phase 2 trató el registro interno como una segunda fuente de verdad y
lo sumó a la búsqueda por nombre visible, de modo que toda fuente quedaba ambigua
cuando el catálogo llegaba. Requisitos: FR-021 a FR-025. Contrato:
`contracts/font-resolution.md` R-C1.5 a R-C1.8.

**Note**: Es un defecto de implementación, no de requisito: el contrato ya pedía fallar
ante un título repetido, pero la ambigüedad era falsa (la misma fuente contada dos
veces).

### Tests for the regression

> Las pruebas se escriben primero y se confirman fallando.

- [x] T055 [P] [US3] Regresión en `tests/fuente-selector.test.js`: resolver un nombre
  visible con el catálogo vacío y comprobar que NO crea identidad; luego cargar el
  catálogo con esa fuente y comprobar que resuelve a la identidad del catálogo, sin
  ambigüedad y sin duplicado en el listado (R-C1.5 a R-C1.8, SC-012, SC-013)
- [x] T056 [P] [US1] Regresión en `tests/fuente-composta.test.js`: componer el valor de
  fuente de una familia que el navegador normaliza (p.ej. entrecomillada cuando no lo
  necesita) y comprobar que NO se emite el aviso de rechazo (FR-025, SC-014)

### Implementation of the regression fix

- [x] T057 [US3] En `js/fonts.js`, al resolver por nombre visible, usar **solo** las
  coincidencias del catálogo cuando el catálogo tiene alguna; consultar el registro
  únicamente cuando no tiene ninguna (FR-022, R-C1.6)
- [x] T058 [US3] En `js/fonts.js`, no crear identidades provisionales mientras el
  catálogo esté pendiente: la resolución espera al catálogo en lugar de inventar
  (FR-023, R-C1.7)
- [x] T059 [US3] En `js/fonts.js`, al indexar el catálogo, descartar la identidad
  provisional de cualquier familia que el catálogo pase a proveer, para que una
  familia nunca tenga dos identidades vivas (FR-024, R-C1.8)
- [x] T060 [US1] En `js/editor.js`, no tratar como rechazo del navegador una diferencia
  de formato en la lectura del valor de fuente: comparar normalizando o consultar si
  la familia está disponible, y no emitir el aviso en un valor que el navegador aceptó
  (FR-025)
- [x] T061 [US3] Ejecutar las suites T055 y T056 y confirmar que pasan; verificar que
  las 21 suites previas siguen en verde

---

## Phase 9: US5 — dependencias del render en paralelo (Priority: P2)

**Purpose**: Que el render declare sus dependencias y las espere juntas, no encadenadas.
Hoy espera todas las imágenes y después la fuente: el tiempo total es la suma.
Requisitos: FR-026 a FR-030. Contrato: `contracts/render-dependencies.md`.

### Tests for US5

- [x] T062 [P] [US5] En `tests/render-dependencias.test.js`: comprobar que el render
  inicia la tipografía y los recursos de imagen de forma concurrente y que la suma de
  esperas no se encadena (R-D1.1, R-D1.3, SC-015)

### Implementation of US5

- [x] T063 [US5] En `js/api.js`, en el render, iniciar las dependencias de forma
  concurrente y esperar a todas antes de dibujar, en lugar de encadenarlas
  (FR-026, FR-027, R-D1.1, R-D1.2)
- [x] T064 [US5] En `js/api.js`, nombrar en el fallo la dependencia concreta que no se
  pudo obtener, sin confundir un fallo de imagen con uno de tipografía (FR-028,
  R-D2.1, R-D2.2)
- [x] T065 [US5] En `js/api.js` y `js/editor.js`, verificar que no se piden fuentes ni
  imágenes que el estilo no declara (FR-030, R-D1.5)
- [ ] T066 [US5] Ejecutar la suite T062 y repetir la verificación de paridad del render
  (T050): el PDF debe seguir coincidiendo con la vista del editor

---

## Phase 10: Sincronía de la identidad en la interfaz (P1)

**Purpose**: Corregir los dos defectos reportados tras RC41: el desplegable muestra una
fuente distinta de la del proyecto al abrir, y el preview de la galería no aplica nada.
Ambos son incumplimientos de FR-010. Requisitos: FR-031 a FR-034.

**Note**: La migración a identidad numérica (R1) llegó a las opciones, al lienzo y a
los presets, pero no al estado por defecto ni al preview de la galería.

### Tests for the phase

> Las pruebas se escriben primero y se confirman fallando.

- [x] T067 [P] [US1] Regresión en `tests/fuente-selector.test.js`: con el proyecto
  declarando una fuente por nombre visible (referencia antigua) y el desplegable
  poblado con identidades numéricas, la sincronía MUST dejar seleccionada la fuente
  declarada y MUST NOT dejar una entrada arbitraria (FR-031, FR-033, SC-016)
- [x] T068 [P] [US2] Regresión en `tests/fuente-selector.test.js`: la previsualización
  de la galería MUST resolver la identidad de una entrada de catálogo (`fontId`) y de
  una subida en la sesión (`fontKey`), y aplicar la fuente correspondiente (FR-034,
  SC-017)

### Implementation of the phase

- [x] T069 [US1] En `js/controls.js`, resolver la referencia de fuente del proyecto a
  identidad antes de buscar la opción, para que un valor antiguo por nombre visible
  siga encontrando su entrada; y cuando no pueda resolverse, no dejar una entrada
  arbitraria seleccionada (FR-031, FR-033)
- [x] T070 [US1] En `js/editor.js`, dejar el estado por defecto en la forma canónica de
  identidad, sin depender de un nombre visible suelto (FR-032)
- [x] T071 [US2] En `js/fuentes-galeria.js`, resolver la identidad de la fuente
  explorada con el campo que corresponda a cada tipo de entrada de la galería, y no
  aplicar en silencio una previsualización que no se pudo resolver (FR-034)
- [x] T072 Ejecutar las suites T067 y T068 y confirmar que pasan; verificar que todas
  las suites siguen en verde

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias, puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup, **BLOQUEA** a las cuatro historias
- **User Stories (Phases 3-6)**: dependen de Foundational
  - US1 es el MVP y no depende de ninguna otra historia
  - US2 se apoya en US1 para que la fuente previsualizada se pinte de verdad
  - US3 se apoya en la identidad unica de la Phase 2
  - US4 es independiente de las historias de fuente
- **Polish (Phase 7)**: depende de las historias que se quiera entregar

### User Story Dependencies

- **User Story 1 (P1)**: arranca tras Foundational. Sin dependencias de otras historias.
  Es el MVP recomendado
- **User Story 2 (P2)**: arranca tras Foundational, pero **conviene implementarla despues
  de US1**; con US1 incompleta la previsualizacion aplica la fuente y el lienzo sigue
  mostrando la fallback, y la prueba da un falso negativo
- **User Story 3 (P3)**: arranca tras Foundational, que ya aporta la identidad unica.
  Combina bien con US1
- **User Story 4 (P1)**: arranca tras Foundational. **Totalmente independiente** de US1,
  US2 y US3: puede implementarse en paralelo

### Within Each User Story

- Las pruebas se escriben y se confirman fallando antes de implementar
- La identidad y el contrato de carga antes que cualquier historia
- El nucleo de la correccion antes que la integracion con la interfaz
- Historia completa antes de pasar a la siguiente de mayor prioridad

### Parallel Opportunities

- T003 en paralelo con cualquier trabajo de lectura
- T004 a T011 tocan `js/fonts.js`: **no pueden ejecutarse en paralelo entre si** porque
  es un unico archivo y generarian conflictos; se reparten por trabajo, no por persona
- T012 y T013 en paralelo (archivos de prueba distintos)
- T028, T035 y T036 en paralelo (archivos de prueba distintos)
- T053 y T054 en paralelo (documentos distintos)
- US1 y US4 pueden implementarse simultaneamente, pero **ambas tocan `js/editor.js`**:
  con dos personas, conviene que cada una tome una historia y se acuerde el orden de
  integracion en ese archivo antes de empezar
- US2 y US3 pueden trabajarse en paralelo tras US1

---

## Parallel Example: User Story 1

```bash
# Lanzar las pruebas de US1 juntas (archivos distintos):
Task: "T012 [P] [US1] Crear tests/fuente-composta.test.js"
Task: "T013 [P] [US1] Crear tests/fuente-carga-estados.test.js"

# Luego la implementacion, en orden porque las tareas tocan js/editor.js:
Task: "T014 [US1] js/editor.js: constructor unico del valor de fuente"
Task: "T015 [US1] js/editor.js: reemplazo de las composiciones existentes"
Task: "T016 [US1] js/editor.js: esperar la fuente antes del primer pintado"
```

## Parallel Example: User Story 4

```bash
# Las dos pruebas de US4 en paralelo:
Task: "T035 [P] [US4] Crear tests/preset-roundtrip.test.js"
Task: "T036 [P] [US4] Anadir la regresion del color de capa de relleno"
```

## Parallel Example: las dos historias P1

```bash
# US4 no depende de US1 y puede repartirse a otra persona:
Persona A: "T014-T020 [US1] eje de fuentes en js/editor.js"
Persona B: "T037-T046 [US4] eje de presets en js/editor.js y js/preset-manager.js"

# AVISO: ambas series tocan js/editor.js. Acordar el orden de integracion en ese
# archivo antes de empezar, o ejecutarlas de forma secuencial.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (baseline verde)
2. Completar Phase 2: Foundational (identidad y ciclo de carga)
3. Completar Phase 3: User Story 1
4. **PARAR y VALIDAR**: comprobar US1 de forma independiente (quickstart.md §3.1)
5. Subir a RC39 y comprobar en WordPress con Ctrl+F5

**Motivo**: US1 entrega el mayor valor de confianza con el menor riesgo, y desbloquea a
US2 para que su prueba sea válida.

### Entrega incremental

1. Setup + Foundational, e identico y usable
2. US1, e identico y usable
3. US4, e identico y usable (independiente, puede ir en paralelo con US1)
4. US3, e identico y usable
5. US2, e identico y usable
6. Polish, con verificacion en WordPress

### Estrategia de equipo

Con dos personas, la division natural es **una persona con US1 + US3 + US2** (el eje de
fuentes, que comparte `js/fonts.js`, `js/controls.js` y `js/editor.js`) y **otra con
US4** (el eje de presets, que comparte `js/preset-manager.js`). El unico punto de
contacto es `js/editor.js`, y conviene acordar el orden de integracion en ese archivo
antes de empezar.

---

## Notes

- [P] = archivos distintos, sin dependencias
- [Story] = historia del spec a la que pertenece la tarea
- Cada historia debe poder completarse y probarse por separado
- Verificar que las pruebas fallan antes de implementar
- Confirmar commit tras cada tarea o grupo logico
- Parar en cualquier checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos sobre el mismo archivo y dependencias entre historias
  que rompan la independencia
- Las cuatro suites nuevas se crean en Phase 3, 5 y 6; ninguna requiere dependencias
  externas de Node mas alla de los *shims* de navegador que ya usan las suites actuales
