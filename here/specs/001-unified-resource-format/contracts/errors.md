# errors.md — Codigos ambito:id:motivo

Formato: `Error('<ambito>:<id|@pos>:<motivo>[ — accion]')`. `ambito` en `{fonts, img, presets}`. En galeria el `invalid` NO lanza: se salta + `console.warn` con este mismo codigo + contador visible (`"<n> entradas invalidas: ids 7, 9"` y `"<m> libres"` aparte). En render (`renderTextToPNG`/`renderBatch`) SIEMPRE lanza ante el primer fallo, sin parciales.

| codigo | cuando | accion sugerida |
|---|---|---|
| `fonts:7:no-tupla` | entrada no es array de 4 | corregir el JSON a tupla |
| `fonts:@3:id no numerico` | id string/slug legacy | migrar a id numerico |
| `fonts:5:duplicado` | id repetido | dejar un solo `5` |
| `fonts:9:google solo valido en fonts` | `file` sin extension fuera de `fonts` | poner extension o mover a `fonts` |
| `fonts:4:ausente MUY-X.ttf` | HEAD del fisico falla (render) | subir el archivo o dar de baja (tombstone) |
| `img:12:ausente 1182.webp` | idem ambito img | idem |
| `presets:nintendo:font.src string (legacy)` | `.txm` con src string | re-guardar desde el editor |
| `presets:8:txm ausente` | catalogo pide id sin `.txm` | regenerar o dar de baja |
| `<amb>:<id>:libre` | se pide un tombstone en render | elegir un id `ok` |
