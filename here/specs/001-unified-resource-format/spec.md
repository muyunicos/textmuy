# Feature Specification: Formato Unico de Recursos uploads/tm

**Feature Branch**: `001-unified-resource-format`

**Created**: 2026-09-11

**Status**: Implemented (pendiente integracion plugin: T012/T016/T019, ver tasks.md R006/R007)

**Input**: User description: "recursos (fuentes, imagenes, presets y thumbs) en uploads/tm/ con un json unico por ambito {thumbs:{w,h,c,f}, items:[[id,title,cats,file]]}; id numerico unico = posicion en thumbs; file sin extension = Google. Opcion A: id numerico puro con migracion y ruptura total."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fuentes con catalogo unico (Priority: P1)

El admin abre la galeria de fuentes y ve todas las fuentes (fisicas y Google) con titulo, categorias y miniatura, leidas del unico `fonts.json` con ids numericos.

**Why this priority**: Cada preset referencia su fuente via `settings.font.src`; hoy son slugs string. Sin migrar fuentes, nada mas funciona.

**Independent Test**: Abrir la galeria con `fonts.json` migrado y verificar titulo, categorias y preview de cada fuente; elegir una la aplica al canvas.

**Acceptance Scenarios**:

1. **Given** un `fonts.json` con formato unico e ids numericos, **When** el admin abre la galeria, **Then** ve cada entrada con titulo, categorias y miniatura del sprite.
2. **Given** una entrada con `file` con extension, **When** la elige, **Then** el editor carga el fisico y lo aplica al texto.
3. **Given** una entrada con `file` sin extension, **When** la elige, **Then** el editor la carga lazy desde Google y la aplica.

---

### User Story 2 - Imagenes con catalogo unico (Priority: P2)

El admin navega la galeria de imagenes (fondos/iconos/varios) con buscador y preview, leida del catalogo unico con ids numericos y sprite propio 100x100.

**Why this priority**: Hoy `img/catalogo.json` usa objetos `{nombre,categoria,titulo}` sin ids ni thumbs; unificarlo elimina el tercer formato.

**Independent Test**: Abrir la galeria con el catalogo migrado y verificar busqueda, tabs y preview por item.

**Acceptance Scenarios**:

1. **Given** el catalogo migrado, **When** el admin abre la galeria, **Then** ve fondos/iconos/varios con titulo y miniatura.
2. **Given** el buscador, **When** escribe parte del titulo, **Then** la lista se filtra a coincidentes.
3. **Given** un item visible en la galeria, **When** el admin lo elige y aplica, **Then** el recurso se aplica al control correspondiente (fondo/icono/varios) segun el contexto desde el que se abrio la galeria.

---

### User Story 3 - Presets con referencias numericas (Priority: P2)

Los `.txm` guardan referencias por id numerico y la galeria muestra miniaturas 200x100 desde el sprite del ambito presets.

**Why this priority**: Es la ruptura central de la opcion A: `font.src` hoy es slug string; pasar a numerico rompe compat y exige enmendar la constitucion.

**Independent Test**: Cargar un preset migrado y verificar que renderiza con la fuente correcta y muestra su miniatura.

**Acceptance Scenarios**:

1. **Given** un `.txm` con referencias numericas, **When** se carga, **Then** el texto renderiza con fuente e imagenes correctas.
2. **Given** la galeria de presets, **When** se lista, **Then** cada preset muestra su miniatura desde el sprite.
---

### Edge Cases

- `file` fisico inexistente: en galeria se omite con warning (cero 404); en render rechazo con causa `ambito:id:ausente`. HEAD previo para fisicos como hoy.
- id duplicado o fuera de rango del sprite (no deberia suceder): el parser la clasifica `invalid` con causa (`ambito:id:duplicado` / fuera de rango); por ahora se reporta en consola (`console.warn` + contador visible en galeria) y la entrada no se muestra. La resolucion definitiva de conflictos queda a futuro (proponer solucion entonces).
- `.txm` viejos con `font.src` string tras migrar: formato legacy, rechazo explicito con causa y mensaje "re-guardar el preset desde el editor" (decision Q4 del plan; ver FR-010). Sin migracion bajo demanda.
- Falta el sprite del ambito (via `ThumbEngine.ensureSprite`; el directorio `thumbs/` ya no existe en el formato unico) existiendo catalogo: en galeria tile placeholder + `console.warn` + contador visible (higiene de listado, Const. VI); en render no aplica (las miniaturas no participan del render).
- Altas/bajas: el id es estable y unico; la posicion en sprite deriva de `id-1`; baja = tombstone `[id,"","",""]`, alta reutiliza el hueco mas bajo (sprite fusionado, Q3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada ambito (`fonts`, `img`, `presets` bajo `uploads/tm/`) MUST tener un unico JSON `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}`. Entrada libre = tombstone `[id,"","",""]` (SIN lista `free[]`; la baja escribe tombstone, el alta reutiliza el hueco mas bajo).
- **FR-002**: `id` MUST ser numerico, unico por ambito, y corresponderse con la posicion del tile en el sprite del ambito.
- **FR-003**: `title` MUST ser legible y editable desde la galeria (Save del footer).
- **FR-004**: `cats` con UNA categoria = string `"cat"`; con VARIAS = array `["cat","cat"]`; editables; default `custom` si vacio. El parser (`parseCats` en `js/catalog.js`) admite ambas formas y normaliza a array (la forma string con separadores coma/espacio/barra queda como lectura legacy). Requiere enmienda de Const. IV (tarea R003).
- **FR-005**: `file` con extension = archivo fisico (fuentes `.ttf/.otf/.woff/.woff2`; imagenes `.svg/.webp/.png/.avif/.jpg/.jpeg/.gif`, lista cerrada (regex inline en `parseCatalogEntry` de `js/catalog.js`); presets `.txm`); sin extension = elemento Google (solo valido en `fonts`).
- **FR-006**: `thumbs` MUST describir el sprite con `{w,h,c}` (ej. fonts 180x30, presets 200x100, imagenes 100x100); filas = `ceil(maxId/c)` derivable, no se guardan.
- **FR-007**: El parser MUST clasificar cada entrada en `ok` / `free` / `invalid` con causa (`ambito:id:motivo`). `invalid` en galeria MUST saltarse con `console.warn` + contador visible en el status; en render MUST rechazarse con causa (`ambito:id:motivo`). Sin compat legacy, sin objetos, sin tuplas string, sin `free[]`.
- **FR-008**: Los `.txm` MUST referenciar recursos por id numerico (`settings.font.src` numerico incluido).
- **FR-009**: Las galerias MUST leer titulo, categorias y miniatura desde el catalogo unico + sprite de su ambito.
- **FR-010**: La migracion de datos viejos (slugs, objetos, `font.src` string) MUST tener comportamiento legacy explicito (migrar bajo demanda o rechazar con mensaje).
- **FR-011**: Escritura al servidor SOLO via puente del plugin; standalone 100% client-side.
- **FR-012**: El principio IV de la constitucion MUST enmendarse a ids numericos con su ruptura (bump semver).

### Key Entities

- **ResourceCatalog**: JSON unico por ambito `{thumbs, items}`; ambito, grilla sprite, lista items.
- **ResourceItem**: tupla `[id, title, cats, file]`; id numerico = posicion en sprite; title/cats editables; file fisico o Google.
- **ThumbSprite**: sheet `.webp` por ambito; posicion del tile derivada de `id-1` (`col=(id-1)%c`, `row=floor((id-1)/c)`, `x=col*w`, `y=row*h`), sin manifiesto.
- **Preset (.txm)**: `{format:'textmuy-project', version:1, name, settings}` con referencias numericas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El admin encuentra y aplica cualquier recurso por titulo/categoria en menos de 30 segundos desde su galeria.
- **SC-002**: El 100% de las entradas de los 3 catalogos cumplen el formato unico en datos migrados.
- **SC-003**: El 100% de presets migrados cargan su fuente correcta por id al primer intento, sin fallback a sistema.
- **SC-004**: Las galerias muestran miniatura para el 100% de items con sprite generado, sin 404.

## Assumptions

- Datos en `uploads/tm/` del plugin hermano (este repo define formato y parsers; la migracion fisica la ejecuta el plugin).
- `thumbs:{w,h,c}` describe la grilla y la posicion del tile se deriva (`tile=id-1`); cero manifiestos por tile (decision Q3: sprite fusionado). El campo `f` del input original fue descartado (filas derivables de `c`).
- Google = solo lectura; fisicos = CRUD con puente. Standalone = listas vacias, sin escrituras.
- Constitucion vigente v2.1.0 (ya enmendada por esta feature: ids numericos + tombstone, sin `free[]`); FR-001/FR-006/FR-007 quedan sincronizados con ella. PENDIENTE: enmienda de Const. IV a la representacion `cats` string|array de FR-004 (tarea R003 en tasks.md); hasta entonces FR-004 prevalece como decision del usuario.

