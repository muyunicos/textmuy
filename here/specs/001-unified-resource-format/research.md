# research.md — Formato Unico de Recursos uploads/tm

**Feature**: `001-unified-resource-format` | **Fecha**: 2026-09-11 | **Fase**: 0 (todas las NEEDS CLARIFICATION resueltas por decision del usuario + inspeccion de codigo y datos reales).

**Ruta de datos (Q5)**: `C:\Users\Jonatan\Documents\GitHub\personalizador-pdf\uploads\tm` = espejo local de dev de **`wp-content/uploads/tm/` en WordPress** (ubicacion unica definitiva desde 2026-09-12; ruta historica `wp-content/uploads/personalizador-pdf/textmuy/` abandonada sin migracion). Estado legacy verificado por lectura (antes de R008/R009): `fonts/fonts.json` 57 tuplas string, 0 fisicas declaradas (15 `MUY-*.ttf` huerfanos en disco); `img/catalogo.json` objetos sin ids; `presets/*.txm` con `font.src` string + `.webp` sueltos + `presets/thumbs/presets.json` separado.

## R1 — Q1: invalid en galeria vs en render

- **Decision**: parser puro de una sola forma clasifica cada entrada en `ok` / `free` / `invalid` y retorna causa por entrada. La galeria **salta** `invalid`, emite `console.warn` con causa y muestra contador visible en el status (`"2 entradas invalidas: ids 7, 9"`; libres aparte: `"3 libres"`). `renderBatch`/`renderTextToPNG` **rechaza** con `Error('ambito:id:motivo')` si el id pedido es `invalid`, `free` o inexistente.
- **Rationale**: reconcilia FR-007 ("ignorar") con Const. IV/VI ("rechazar con causa, sin silencios"): el listado es higiene (no sustituye nada) pero deja rastro visible + warn; la ruta de render es dura (fail-fast, sin parciales).
- **Alternatives considered**: (a) rechazo duro tambien en galeria — rompe el listado entero por 1 entrada mala, rechazado; (b) silencio total — viola Const. VI y esconde corrupcion, rechazado; (c) cuarentena con reintento — complejidad sin beneficio a esta escala, rechazado.

## R2 — Q2: forma canonica del catalogo (tombstone, cats string)

- **Decision**: canonico `{"thumbs":{"w":N,"h":N,"c":N},"items":[[id,title,cats,file],...]}` donde `id` numerico entero >=1, `title` string, `cats` **string** con 1+ categorias separadas por coma/espacio (default `custom`), `file` string. Libre = **tombstone** `[id,"","",""]`. Se elimina la lista `free[]` de Const. v2.0.0 (enmienda menor pendiente). La propuesta `{"cat1","cat2"}` del usuario se corrige porque **es JSON invalido** (no existen sets literales en JSON).
- **Rationale**: `cats` string mantiene compat con el parser actual (`split(/[,/]+/)`) y es editable a mano; el tombstone hace la reserva atomica (una sola lista, sin doble escritura `items`+`free[]` que pueda desincronizarse); `file:""` no contamina busquedas (titulo/cats vacios).
- **Alternatives considered**: (a) `cats` array — mas verboso, obliga a reescribir parser/tests, rechazado; (b) `free[]` separado (Const. v2.0.0) — dos estructuras sincronizadas a mano, riesgo de deriva, rechazado por el usuario; (c) `null` en vez de `""` para libre — `JSON.stringify` y edicion manual mas fragiles, rechazado.


## R3 — Q3: sprite fusionado, posicion derivada

- **Decision**: un sprite `.webp` por ambito, sin manifiesto por tile (se elimina `presets/thumbs/presets.json` y los `.webp` sueltos). Posicion derivada: `tile=id-1`, `col=(id-1)%c`, `row=floor((id-1)/c)`, `x=col*w`, `y=row*h`. Filas = `ceil(vivos/c)` derivado, no guardado. Tiles: fonts 180x30, presets 200x100, imagenes 100x100. Falta de sprite existiendo catalogo = render lazy del tile hasta regenerar (spec Edge Cases, se mantiene).
- **Rationale**: 1 peticion por ambito; el tile es funcion pura del id (O(1), cero lookups); la baja no reindexa (el tombstone deja el tile vacio hasta regenerar el sprite).
- **Alternatives considered**: (a) manifiesto por tile — N entradas sincronizadas a mano, deriva garantizada, rechazado; (b) `.webp` suelto por item — N peticiones + inodes, estado actual que se abandona, rechazado.

## R4 — Q4: legacy = rechazo puro

- **Decision**: ruptura total (Opcion A). `.txm` con `font.src` string (u otro formato legacy), objetos `{nombre,...}` en catalogos, tuplas string o tuplas de 3 → **rechazo con causa y mensaje de accion** (`"preset 'nintendo' usa font.src string (legacy): re-guardar desde el editor"`). Sin migracion bajo demanda ni lectores legacy permanentes en esta feature.
- **Rationale**: el sistema esta en construccion (AGENTS.md v4.3); sostener formatos viejos en el parser lo agranda sin beneficio. La migracion de ~10 presets + 57 fuentes + ~150 imagenes es puntual y la ejecuta el plugin/editor al re-guardar.
- **Alternatives considered**: (a) migracion bajo demanda — fuera de alcance, rechazado por el usuario; (b) doble lector permanente — viola "un formato o error", rechazado.

## R5 — Q5: alcance fisico y contrato con el plugin

- **Decision**: este repo define formato + parsers + galerias + tests y provee fixtures en `../uploads/tm/` (espejo de `wp-content/uploads/tm/`). La migracion/escritura fisica la ejecuta el plugin hermano via puente; este modulo solo **lee** el canonico y **escribe via puente** (handlers extendidos a 3 ambitos en `contracts/bridge-contract.md`).
- **Rationale**: respeta AGENTS.md sec. 4.7 (escritura SOLO via puente) y sec. 5 (datos en uploads del plugin, no versionados aqui).
- **Alternatives considered**: (a) versionar datos aqui — prohibido por AGENTS.md v4.1, rechazado; (b) migrar con fs directo — viola "sin puente", rechazado (solo fixtures).

## R6 — Carga modular y resolucion por id (best practice, Const. VI)

- **Decision**: la ruta de render resuelve el manifiesto de dependencias del preset (fuente por `font.src` numerico, bitmaps/texturas por id) y carga SOLO lo necesario con cache por id; `preloadAll` prohibido en render. Fisicos con HEAD previo (patron `fontFileExists`); inexistente = rechazo con causa en render, omision en galeria (cero 404). Google lazy por `<link>`; al abrir: cero fuentes.
- **Rationale**: evita precargar 57 fuentes + 150 imagenes por cada lote; el fallo es visible y accionable.
- **Alternatives considered**: precarga total al abrir — simple pero lenta y contraria a la Constitucion, rechazado.
