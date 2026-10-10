# Contrato: Schema unico de opciones (identidad + alcance)

**Feature**: `003-option-schema`

Contrato interno al modulo. Fija el shape de `OPTION_SCHEMA`, el significado de
`scope` y las rutas dinamicas que el fail-fast debe respetar. No define una API
publica ni un formato de intercambio; su funcion es hacer el cambio verificable.

---

## 1. OPTION_SCHEMA

### 1.1 Entrada / Salida

Deriva de `defaultSettings` (walk de hojas, reutilizando el criterio de
`OPTION_REGISTRY`). Cada hoja produce:

`{ id, nombre, type, default, scope }` con `scope ∈ {'global','linea'}`.

- `id`: path sanitizado (mismo criterio que `OPTION_REGISTRY` hoy).
- `nombre`: etiqueta ES del menu (TEXT / 3D & FILLING / OUTLINES / SHADOWS /
  ICON / BACKGROUND / DOWNLOAD).
- `type`, `default`: del valor observado en `defaultSettings`.
- `scope`: calculado con la logica de alcance (ver §2).

### 1.2 Requisitos

- **R-O1.1**: UNA sola fuente de verdad. `isGlobalPath` consulta el schema; se
  purgan `GLOBAL_PATHS` y `CANVAS_POR_LINEA` (VII, sin rutas dobles).
- **R-O1.2**: `scope:'global'` para `text`, `canvas.*` (SALVO `canvas.maxFontSize`),
  `lines`, `download`, `processing`, `rotate`, `distort`, y
  `lettering.flag|boggle|reverseOverlap|blendmode`. `scope:'linea'` para lo demas.
- **R-O1.3**: `canvas.maxFontSize` es `scope:'linea'` (excepcion historica, R-L4.3
  de `contracts/lineas.md`).
- **R-O1.4**: Grupos vacios (`processing:{}`, `lines`) NO generan entradas basura.
- **R-O1.5**: `OPTION_REGISTRY` no tiene consumidores reales; se reemplaza por
  `OPTION_SCHEMA`. Si algun consumidor quedara, se migra en la misma entrega (VII).

## 2. Alcance por linea (fuente de verdad)

`contracts/lineas.md` §4 DELEGA aqui: la tabla global/por-linea pasa a ser DATO
del schema. `isGlobalPath` mantiene su firma y sus resultados (fijados por
`tests/lineas-resolucion.test.js`).

## 3. Rutas dinamicas (exentas del fail-fast)

El validador de rutas (§4) debe reconocer y permitir estos contenedores, validando
su interior contra la rama equivalente del schema:

- `fill.layers` (array con `id` estable) + `styles[]` internos
  (`{type:'color'|'gradient'|'texture', ...}`).
- `lines.line["<n>"]`, `lines.inherit["<n>"]`, `lines.activeTarget`.
- `outline.first.specular`, `outline.second.specular` (copiados enteros desde
  presets de TextStudio; defaults no los declaran).

Ante la duda sobre una sub-ruta dinamica, el validador PERMITE (no rechaza).

## 4. Fail-fast de rutas

- **R-O4.1**: una ruta hoja inexistente en el delta se rechaza con
  `presets:<nombre>:ruta_desconocida:<ruta>`, sin aplicar nada (vista intacta),
  igual que `validarFormatoLineas`.
- **R-O4.2**: el rechazo NO se cachea (un retry reevalua, como un fallo de red).
- **R-O4.3**: conservador: solo rechaza lo claramente invalido. Un path bajo un
  contenedor dinamico conocido (§3) nunca se rechaza por "desconocido".
- **R-O4.4 (COLOR HEX)**: `loadPreset` convierte los colores `{r,g,b}` a hex
  string al cargar. El schema, derivado de defaults (objetos), solo conoce
  `X.color.r/g/b`. El validador ACEPTA `X.color` como STRING cuando `X.color.r`
  (o `.g`/`.b`) existe en el schema. Sin esto, cualquier preset que el usuario
  cargara y guardara (ciclo load->save->reload) se rechazaria al recargarlo.
- **R-O4.5 (LEGADO)**: campos que `loadPreset` escribe/persiste y defaults no
  declaran se aceptan por un allowlist `CAMPOS_LEGADO` en el validador (no en
  `defaultSettings`, Constitucion VII): `distort.active`, `canvas.background`,
  `fill.gradient.startColor`, `fill.gradient.endColor`,
  `lettering.reverseOverlap.active`.
- **R-O4.6**: la raiz de una ruta que no es opcion de `defaultSettings` se
  permite (campo de extension); solo se rechaza un typo bajo una raiz conocida.
