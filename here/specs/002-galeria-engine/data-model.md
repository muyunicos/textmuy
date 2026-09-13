# data-model.md — Motor de Galerias del Plugin (002)

**Feature**: `002-galeria-engine` | **Fecha**: 2026-09-12. Las entidades de
DATOS son HEREDADAS de 001 (sin cambios de forma); lo nuevo es la capa de
operaciones (motor + endpoint).

## Entidades de datos (sin cambios, heredadas de 001)

| Entidad | Forma | Reglas |
|---|---|---|
| `Catalogo` | `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` por ambito en `tm/{ambito}/<ambito>.json` | seed lazy si falta; alta reutiliza hueco mas bajo o `max(id)+1`; baja = tombstone `[id,"","",""]` |
| `Tupla` | `[id,title,cats,file]` | `id` numerico >= 1; `title` legible; `cats` string (una) o array (varias), default `custom`; `file` fisico con extension (Google sin extension solo en fonts) |
| `Fisico` | archivo en `tm/{fonts,img,presets}/` | fuentes `.ttf/.otf/.woff/.woff2`; imagenes `.svg/.webp/.png/.avif/.jpg/.jpeg/.gif`; presets `.txm` |
| `Sprite` | `tm/{ambito}/thumbs.webp` | unico por ambito; SIN manifiesto persistido; tiles derivados `id-1` |

## Entidades nuevas (solo capa de operaciones)

| Entidad | Forma | Reglas |
|---|---|---|
| `Operacion` | `op=listar\|alta\|baja\|editar\|sprite\|miniatura` + scope + payload | POST unico a `action=tm_galeria`; nonce unico; capability `manage_options`; rechazo con causa `motor:<op>:<motivo>` |
| `TM_Galeria` (clase) | metodos: `catalogo($ambito)`, `listar($ambito)`, `alta(...)`, `baja(...)`, `editar(...)`, `sprite(...)`, `miniatura(...)` | unico responsable de `uploads/tm/` (Const. VII); `pdfs/`/datasets FUERA |
| `Puente` | `{motorUrl, nonce, bases{presetsBase,fuentesBase,imagenesBase}, miniaturas, error?}` | enviado en los 3 momentos (Const. III); `error` = mensaje si no hay motor |

## Validaciones (por operacion)

- `listar`: scope en `{fonts,img,presets}`; si el JSON falta → seed vacio.
- `alta`: file con extension permitida + firma valida (imagen/fuente) + nombre
  sanitizado `[a-z0-9_-]`; respuesta `{id, url, titulo, cats}`.
- `baja`: por file (imagen/fuente) o nombre (preset); tombstone + unlink fisico.
- `editar`: renombrar/mover categoria; actualiza tupla y fisico; respuesta
  `{id, nombre, url}`.
- `sprite`: WebP valido (magic bytes RIFF/WEBP), max 4 MB; destino
  `tm/{ambito}/thumbs.webp`; limpia restos `sprite.{webp,json}`.
- `miniatura`: WebP valido, max 500 KB; destino `tm/img/{nombre}.webp`.

## Transiciones de estado

- Catalogo: `inexistente` → `vacio` (seed lazy) → `con items` (alta) →
  `con tombstones` (baja) → reciclado (alta en hueco). Sin reindexado.
- Puente: `sin puente` → `estado de error claro` (el modulo no opera);
  `con puente` → operativo.