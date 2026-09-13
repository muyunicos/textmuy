# contracts/motor-contract.md — Motor de Galerias (lado plugin, 002)

Clase unica `TM_Galeria` (sugerido: `inc/class-tm-galeria.php`) + endpoint
unico `admin-post.php?action=tm_galeria` (Const. VII). Los handlers sueltos
`admin_post_personalizador_pdf_textmuy_*` se ELIMINAN en la misma entrega
(Const. VIII).

## Clase `TM_Galeria` (API interna PHP)

| Metodo | Firma | Responsabilidad |
|---|---|---|
| `catalogo($ambito)` | ambito in `{fonts,img,presets}` | lee JSON (seed lazy si falta); devuelve `{thumbs,items}` |
| `guardar_catalogo($ambito, $cat)` | escribe JSON canonico | unica via de escritura del catalogo |
| `listar($ambito)` | merge catalogo + fisicos | items `{id,titulo,cats,file,url,thumb:'',enUso}` |
| `alta($ambito, $title, $cats, $file)` | tupla via `tupla_alta` (hueco mas bajo / max+1) | devuelve id |
| `baja($ambito, $id)` | tombstone + unlink fisico | sin reindexar |
| `editar($ambito, $id/nombre, $nuevo...)` | renombra fisico + tupla | devuelve item nuevo |
| `sprite($ambito, $blob)` | persiste `tm/{ambito}/thumbs.webp` | borra restos `sprite.{webp,json}` |
| `miniatura($nombre, $blob)` | persiste `tm/img/{nombre}.webp` | para grupos de PDF |

Helpers existentes que ABSORBE (y desaparecen de `personalizador-pdf.php`):
`catalogo_textmuy`, `guardar_catalogo_textmuy`, `tupla_textmuy_*`,
`ruta_catalogo_textmuy_ambito`, `dir_textmuy_*`, `url_base_textmuy_*`,
`thumbs_textmuy_ambito`, `nombre_textmuy_seguro`, `firma_*_valida`.

## Endpoint unico (HTTP)

`POST admin-post.php?action=tm_galeria` — campo `op`:

| op | payload | respuesta success |
|---|---|---|
| `listar` | `scope` | `{catalogo, items}` |
| `alta` | `scope`, archivo (`imagen`\|`fuente`\|`txm`), `titulo/cats/nombre` | `{id, nombre, url}` |
| `baja` | `scope`, `nombre`/`id` | `{id}` |
| `editar` | `scope`, `nombre`, `nombreNuevo`, `categoriaNueva` | `{id, nombre, url}` |
| `sprite` | `scope`, archivo webp | `{spriteUrl}` |
| `miniatura` | `nombre`, archivo webp | `{url, nombre}` |

Seguridad: `seguridad('tm_galeria')` (capability + nonce unico
`wp_create_nonce('tm_galeria')`); `op` en whitelist; scope en whitelist; sin
fallbacks — todo rechazo con causa JSON (`motor:<op>:<motivo>`, Const. VI).

## Registro

`personalizador-pdf.php`: UN `add_action('admin_post_tm_galeria', ...)`;
hooks `admin_post_personalizador_pdf_textmuy_*` y
`personalizador_pdf_guardar_sprite|guardar_miniatura` ELIMINADOS
(`guardar_miniatura` de grupos PDF migra al motor como `op=miniatura`).

## Puente (`admin/estilos-texto.php`)

`urls.motor = admin_url('admin-post.php?action=tm_galeria')`,
`nonces.motor`, `bases{presetsBase,fuentesBase,imagenesBase}`, `miniaturas`
(URL del ThumbEngine). Las claves viejas (`guardarPreset`, `subirImagen`,
...) se eliminan (Const. VIII).