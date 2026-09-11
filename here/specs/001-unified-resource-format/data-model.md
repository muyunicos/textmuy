# data-model.md — Formato Unico de Recursos uploads/tm

**Feature**: `001-unified-resource-format` | **Fecha**: 2026-09-11. Derivado de `spec.md` + `research.md` (R1-R6). Ruta fisica: `../uploads/tm/` = espejo de `wp-content/uploads/tm/` (ver `plan.md` Nota Q5).

## Entidades

### 1. ResourceCatalog (un JSON por ambito)

| Campo | Tipo | Reglas |
|---|---|---|
| `scope` | implicito por ruta | `fonts` → `fonts/fonts.json`; `img` → `img/img.json` (migra `catalogo.json`); `presets` → `presets/presets.json` (nuevo) |
| `thumbs` | `{w,h,c}` enteros >0 | grilla del sprite fusionado; `c` = columnas; filas = `ceil(maxId/c)` derivado, no guardado |
| `items` | `ResourceItem[]` | orden libre en JSON; `id` manda, no la posicion en el array |

### 2. ResourceItem (tupla de 4, UNICO formato aceptado)

`[id, title, cats, file]`:

| Pos | Campo | Tipo | Reglas |
|---|---|---|---|
| 0 | `id` | entero >= 1 | unico por ambito; denso desde 1 salvo tombstones; `tile = id-1` |
| 1 | `title` | string | legible, editable desde la galeria (Save del footer); `""` solo en tombstone |
| 2 | `cats` | string | 1+ categorias separadas por coma/espacio/barra (`split(/[,/ ]+/)`, trim); default `custom` si vacio (salvo tombstone); editable; categorias dinamicas derivadas del catalogo |
| 3 | `file` | string | con extension = fisico (`fonts`: `.ttf/.otf/.woff/.woff2`; `img`: `.svg/.webp/.png`; `presets`: `.txm`); sin extension y no vacio = spec Google (SOLO valido en `fonts`, `Familia[:pesos]`); `""` = tombstone libre |

Clases del parser (R1): `ok` (las 4 validas y `file` no vacio) / `free` (`[id,"","",""]` exacto) / `invalid` (todo lo demas: no-tupla, largo !=4, id no entero, id duplicado, `file` Google fuera de `fonts`, tipos rotos). `invalid` → causa `ambito:id|pos:motivo`.

### 3. ThumbSprite (sheet fusionado por ambito)

| Campo | Valor |
|---|---|
| archivo | `{scope}.webp` junto al catalogo (`fonts.webp`, `img.webp`, `presets.webp`) |
| tile | fonts 180x30, presets 200x100, imagenes 100x100 (de `thumbs`) |
| layout | `col=(id-1)%c`, `row=floor((id-1)/c)`, `x=col*w`, `y=row*h` |
| regeneracion | al alta/baja/edicion via `guardarSprite`; sin sprite existiendo catalogo → render lazy del tile (fallback transitorio permitido por spec) |

### 4. PresetTxm (referencias numericas)

`{format:'textmuy-project', version:1, name, settings}` donde `settings` es delta contra defaults y TODA referencia a recurso es id numerico: `settings.font.src: number` (obligatorio numerico; string → rechazo legacy Q4), resto de refs a bitmaps/texturas/iconos por id numerico del ambito `img`. `name` conserva el nombre legible (el `.txm` fisico puede seguir llamandose `{nombre}.txm` en la migracion; el catalogo `presets.json` es el que indexa por id).

## Validaciones (parser, una sola forma)

1. Raiz objeto con `thumbs{w,h,c}` enteros >0 e `items` array; si no → `Error('ambito:catalogo:raiz invalida')`.
2. Cada item: tupla exacta de 4, `id` entero >=1, `title/cats/file` strings; si no → `invalid` con causa (posicion en array para localizarlo: `ambito:@pos:motivo` cuando ni hay id).
3. `id` duplicado → el 2do y siguientes `invalid` (`ambito:id:duplicado`).
4. Tombstone: `title==="" && cats==="" && file===""` → `free` (no entra a galerias ni busquedas; su tile queda vacio).
5. `file` Google (sin extension, no vacio) fuera de `fonts` → `invalid` (`ambito:id:google solo valido en fonts`).
6. Fisico inexistente (HEAD): en galeria se omite el tile (cero 404); en render se rechaza (`ambito:id:ausente <file>`).

## Transiciones de estado

- **Alta**: reutilizar tombstone de id mas bajo; si no hay, `max(id)+1`. Escribir tupla completa + regenerar sprite (tile `id-1`).
- **Baja**: escribir tombstone `[id,"","",""]` (NO reindexar, NO borrar sprite de inmediato); regeneracion diferida del sprite.
- **Save (editar)**: solo `title`/`cats` (`file` inmutable por Save; cambiar archivo = baja+alta). Renombrado fisico de `file` lo hace el plugin via puente (`moverFuente`/`moverImagen` extendidos).
- **Legacy**: cualquier entrada no-tupla o `font.src` string → rechazo con mensaje de accion (Q4), sin escritura correctiva automatica.
