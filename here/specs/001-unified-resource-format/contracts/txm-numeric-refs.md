# txm-numeric-refs.md — Referencias numericas en .txm + rechazo legacy

`{format:'textmuy-project', version:1, name, settings}` con `settings` = delta contra defaults. TODA referencia a recurso es **id numerico** del catalogo de su ambito:

- `settings.font.src: number` → id en `fonts.json` (fisico o Google segun `file`).
- Refs a bitmaps/texturas/fondos/iconos: ids numericos en `img.json` (campos exactos a fijar en implementacion segun `editor.js`: los que hoy guardan nombre de archivo pasan a guardar id).
- El catalogo `presets.json` indexa presets por id; el archivo fisico puede conservar `{nombre}.txm` durante la migracion.

## Rechazo legacy (Q4, ruptura total)

Cualquiera de estos casos MUST rechazar con causa y mensaje de accion, sin fallback:

- `font.src` string (ej. `"Nintender Regular"`) → `Error("presets:<name>:font.src string (legacy): re-guardar el preset desde el editor")`.
- Catalogo con objetos `{nombre,...}` o tuplas string `[slug,...]` o tuplas de 3 → `invalid` por entrada (ver `errors.md`).
- `.json` TextStudio crudo: SOLO lectura historica como hoy (no es salida de guardado).

Ejemplo canonico:

```json
{
  "format": "textmuy-project",
  "version": 1,
  "name": "nintendo",
  "settings": { "text": "Hola", "font": { "src": 12, "size": 114 } }
}
```
