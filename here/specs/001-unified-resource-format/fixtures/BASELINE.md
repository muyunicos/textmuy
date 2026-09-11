# BASELINE (T003 + final T024) — rama `001-unified-resource-format`.

**Linea base (antes de tocar codigo, 2026-09-11)**: 7/8 suites verdes.
`preset-load.test.js` fallaba (ruta `uploads/personalizador-pdf/textmuy/presets`
inexistente; los datos reales estan en `uploads/tm`). Corregido en T023.

**Estado FINAL (10 suites verdes, T024 + img-refs)**:
- catalog-unified, fonts-catalog (real en Node), img-refs (refs numericas
  de imagen), preset-cache (con rechazo legacy numerico), preset-delta,
  preset-load (10 presets, legacy reportados como SKIP por font.src
  string), distort-engine, flag-wave, pattern-block-box, controls-init:
  PASS.
- `node --check` de js/{catalog,fonts,api,preset-manager,galeria,fuentes-galeria,editor}: OK.

**Migracion del espejo `../uploads/tm` (T012/T016/T019, via
`here/specs/001-unified-resource-format/migrate-tm.mjs`)**:
- `fonts/fonts.json`: 72 items (57 Google legacy + 15 fisicas MUY-*.ttf nuevas), 0 libres, 0 invalidas.
- `img/img.json` (nuevo, desde `catalogo.json`): 128 items, 0 invalidas (ext recursa avif).
- `presets/presets.json` (nuevo): 10 items, 0 invalidas.
- Backups conservados: `fonts.json.legacy`, `catalogo.json.legacy`.
- Pendiente plugin: re-guardar `.txm` para pasar `font.src` string -> id (Q4).

Nota de entorno: Git-Bash pierde el cwd con `here/` en comandos largos (ENOENT
fantasma con cp/mkdir); usar rutas absolutas Windows, `node -e` fs, o la
herramienta editor.
