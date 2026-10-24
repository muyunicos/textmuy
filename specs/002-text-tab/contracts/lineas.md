# Contrato: Resolucion por linea (herencia + dimensionamiento)

**Feature**: `002-text-tab` | **Plan**: [plan.md](../plan.md)

Contrato de como cada linea resuelve su estilo final. Cubre US6, FR-009 a
FR-015, FR-019, FR-021. Es interno al modulo.

---

## 1. Resolucion en tres pasos

### 1.1 Operacion

| Entrada | Salida |
|---|---|
| Base (All) + herencia + ajustes propios + regla de tamano de la linea | Estilo resuelto de la linea, listo para medir y pintar |

### 1.2 Requisitos

- **R-L1.1**: El orden es fijo: heredar -> mezclar lo propio ->
  dimensionar. La dimension va ultima porque el porcentaje se calcula sobre
  el tamano ya mezclado de la referencia.
- **R-L1.2**: Heredar de ALL (o sin `inherit`) parte de la base tal cual.
  Heredar de otra linea parte del estilo **resuelto** de esa linea (con sus
  propios ajustes y su propio tamano ya aplicados).
- **R-L1.3**: Los ajustes propios se mezclan como delta disperso: solo las
  rutas presentes cambian; lo ausente conserva lo heredado.
- **R-L1.4**: La resolucion es por linea direccionable (L1-L3); las filas
  fuera de rango resuelven como All sin entradas propias.
- **R-L1.5**: El target activo no participa en la resolucion: solo dice que
  muestran los controles (FR-009).

---

## 2. Dimensionamiento relativo

### 2.1 Requisitos

- **R-L2.1**: en modo **Proporcional** (`mode:'fontsize'`) `ref:'canvas'` (= ALL) toma el
  tamaño del ajuste y `ref:'linea'` el tamaño **resuelto** de esa línea, en cascada;
  los dos multiplican por `pct/100`.
- **R-L2.2**: en modo **Ancho** (`mode:'width'`) el tamaño se elige para que el **ancho de
  tinta** de la línea sea `pct/100` del ancho de tinta de su referencia (menor, igual o
  mayor que el 100%), con el alto restante del lienzo como techo. `pct` ausente = 100.
  *(Hasta RC78 el `pct` se ignoraba en este modo: el ancho quedaba clavado al de la
  referencia y el control parecía muerto.)*
- **R-L2.3**: un `font.size` en px **por línea** sustituye la regla para esa línea (no se
  combinan). Es un campo avanzado: no tiene control en el panel (§5) y la frase de estado
  lo declara cuando está presente.
- **R-L2.4**: Fase 2: si la pila supera el alto util, todas las lineas se
  escalan por el mismo factor hasta el 100% vertical (proporciones
  intactas).
- **R-L2.5**: Referencia a linea inexistente: la linea usa sus valores
  guardados o los de All; nunca falla el pintado.

### 2.2 Los valores del "tamaño de una línea" (vocabulario, 2026-10-24)

Cuatro valores distintos comparten palabras parecidas; confundirlos es el error más
fácil de cometer, y es la causa de que el panel quedara **sin control de proporción**
durante RC52-RC77 (había un solo slider y era el *tope*). El panel declara la
referencia en cada etiqueta (I-D2) y la repite en su frase de estado; el mapeo
control -> dato está en §5. `canvas.maxFontSize` es, además, la única ruta `canvas.*`
declarada `scope: línea` (`contracts/opciones.md` R-O1.3).

| Valor | Dato | Default | Significado | NO es |
|---|---|---|---|---|
| Herencia de ESTILO | `lines.inherit["n"]` | ALL (delta vacío) | "igual que ALL" = **los mismos valores**: ALL con `maxFontSize=2` => L1/L2/L3 con 2 | un porcentaje |
| **Modo** | `lines.line["n"].sizing.mode` | `fontsize` | *Proporcional*: el tamaño de la línea sigue al de la referencia. *Ancho* (`width`): el tamaño se elige para que su **ancho de tinta** siga al de la referencia | el tamaño del texto |
| **Ref** | `.sizing.ref` + `.refLine` | `canvas` (= **ALL**) | `canvas`/`all` = el tamaño del ajuste (**que es el de ALL**); `linea` + `refLine:N` = el de esa línea **resuelta** (cascada) | el lienzo: `ref:canvas` NO es "% del canvas" |
| **Proporción** | `.sizing.pct` (1..300) | 100 | `100` = **igual que la referencia**; `50` = la mitad; `150` = una vez y media. En modo Ancho es `%` del ancho de la referencia | un tope |
| **Tope** | `canvas.maxFontSize` y `lines.line["n"].canvas.maxFontSize` | 100 (**ausente = hereda el de ALL**) | **% del eje limitante del AREA UTIL** (misma cuenta para ALL y para cada línea: `singleRef`x`pct`); `100` = sin recorte | el tamaño del texto, ni un px |

- **R-L2.6**: el panel muestra los cuatro valores **resueltos** y sólo escribe al
  cambiarlos. El tope **no se materializa**: la casilla "Heredar de ALL" deja la clave
  **ausente** (un `100` explícito en la línea pisaría el tope de ALL, que es lo que hoy
  impide que el tope de ALL muerda en esa línea).
- **R-L2.7**: un `pct` ausente vale 100 (retrocompatible), en los dos modos.
- Consecuencia buscada (2026-10-24): una línea **PUEDE superar el tamaño de ALL** (un
  `pct` mayor que 100): el límite lo pone el AREA, no la base. Eso es lo que hace que el
  tope "muerda"; antes no podía, porque ninguna línea pasaba de ALL.

### 2.3 Jerarquia del tamaño (orden de calculo, 2026-10-24)

1. Cada linea resuelve su tamaño: `pct` sobre el tamaño del ajuste (ALL) o sobre otra
   linea (cascada); en modo Ancho, `pct` sobre el ANCHO de tinta de su referencia.
2. El **tope** de cada linea (`%` del eje limitante del AREA UTIL) la limita por arriba;
   el de ALL ya se aplico al calcular el ajuste.
3. Si la pila no cabe en el area, **TODAS** se escalan por el mismo factor
   (`lineFontSizes`, Fase 2): las proporciones quedan intactas.
4. El **encaje final** del render escala la capa compuesta como ultima red (solo reduce).

Consecuencias declaradas:

- El **ratio** de una regla se mantiene siempre (la escala es uniforme); cuando el texto
  no entra, lo que baja es el **absoluto de todas** las lineas, no la proporcion.
- `state.lineFontPx` es **pre-encaje**: los pixeles del lienzo son post-encaje. Los ratios
  coinciden; los px absolutos no.
- Un `mode:'width'` se calcula sobre el area **previa** al encaje: si el conjunto se
  reescala, el ancho dibujado queda en esa misma proporcion (aproximacion declarada; la
  version exacta exigiria un bucle de convergencia, que NO se hace).
- Un **px propio** (`font.size` de linea) tambien es previo al encaje.

La consecuencia de arriba sigue en pie: "100 % de ALL" y "100 % del ajuste" dan el
**mismo número** (el tamaño de ALL *es* el del ajuste), y por eso `ref:canvas` y
`ref:all` son sinónimos al leer: el alias existe para que la etiqueta pueda decir
**ALL** sin cambiar el token guardado (dato persistido: §10 de `AGENTS.md`). El tamaño
previo al encaje de una línea es `min(tamaño resuelto, su tope)`.
## 3. Ciclos

### 3.1 Requisitos

- **R-L3.1**: La UI oculta transitivamente, por ambas aristas (herencia +
  dimensionamiento), toda opcion que cerraria un ciclo al editar una linea.
- **R-L3.2**: Un ciclo por archivo editado a mano se rechaza con causa
  (`lines:<detalle>:ciclo`) dejando la vista intacta; nunca cuelga ni pinta
  parcial.
- **R-L3.3**: La deteccion cubre ciclos de cualquier longitud y mixtos
  (herencia+dimensionamiento combinados).

---

## 4. Alcance por linea (desviacion de FR-016, 2026-10-04)

FR-016 pedia "todo estilo y layout por linea". Al implementar se fijo el alcance
real. **Desde `003-option-schema` la fuente de verdad del alcance es el
`OPTION_SCHEMA`** (`{id, nombre, type, default, scope}`, ver
`../003-option-schema/contracts/opciones.md` §1-2): cada hoja declara su `scope`
(`global` | `linea`) y `isGlobalPath` lo consulta, en vez de listas hardcodeadas.
La tabla de abajo es un RESUMEN legible; el dato vive en el schema.

**Global de bloque** (nunca entra a overrides de linea; `scope:'global'`):

| Ruta | Motivo |
|---|---|
| `text` | El texto es global por definicion (FR-016). |
| `canvas.*` | Canvas Size es la unica fuente de verdad del tamano de salida. **Excepcion**: `canvas.maxFontSize` es global en All pero con una linea activa manda sobre ESA linea (decision del usuario, 2026-10-04). |
| `lines` | El contenedor del sistema de lineas. |
| descarga / procesado | Rutas de salida. |
| `rotate`, `distort` | **Globales hasta el bloque D4.** Aplican al bloque compuesto entero al final del render. Hacerlos por linea exige partir el pipeline en una capa por linea (componer cada linea con su estilo resuelto, aplicarle su giro o su curva, y recien despues apilar), que es un cambio de arquitectura del render: ver D4 en `tasks.md`. |
| `lettering.flag`, `lettering.boggle`, `lettering.reverseOverlap`, `lettering.blendmode` | Actuan sobre el bloque completo. |

**Por linea** (`scope:'linea'`): `align`, `letterSpacing`, **`lineHeight`**,
`font.*`, `fill.*`, `outline.*`, `depth.*`, `depth2.*`, `bevel.*`, `shadow.*`,
`specular.*`, `lettering.shadow`, `lettering.active`, `icon.*`, y
`canvas.maxFontSize`. Ver el schema para el detalle completo hoja por hoja.

- **R-L4.1**: Una ruta de la tabla global MUST escribirse en la base aunque el
  target activo sea L1/L2/L3, para no crear overrides huerfanos. La unica
  excepcion es `canvas.maxFontSize` (R-L4.3).
- **R-L4.2**: Las rutas por linea se mezclan en el paso 2 de la resolucion, con
  el mismo criterio de delta disperso del resto (R-L1.3).
- **R-L4.3**: `canvas.maxFontSize` es la excepcion de la tabla global. En All
  manda sobre el texto completo; con una linea activa manda sobre ESA linea.
  El valor es **siempre un porcentaje relativo** (del lado limitante del lienzo),
  **nunca pixeles fijos**: el lienzo es dinamico (500 px o 5000 px) y el texto debe
  seguir al tamaño que necesite el cliente.
  Con `Mode: Ancho` el tamaño lo decide el ancho de la referencia y la **Proporción**
  es su `%`: el control NO queda sin efecto (era el defecto de RC77, corregido en RC78).
- **R-L4.4**: `lineHeight` es **por linea** (revierte la desviacion que se
  registro durante la implementacion). Escala de **-100% a +200%** con base
  **0% = ajuste justo**: la linea se apoya sobre la anterior sin hueco y sin
  solape. Medido con tres tipografias reales a tamano 90 (Bangers 69 px,
  Permanent Marker 69 px, Rock Salt 122 px de alto):
  - `-100%` -> avance 0: las lineas quedan **encimadas** (util para un "HOLA"
    grande detras con un script delante encima).
  - `0%` -> ajuste justo (68 px entre L1 y L2, 102 px entre L2 y L3: la
    diferencia es la cola de la de arriba mas el asta de la de abajo).
  - `+200%` -> **tres veces** mas de separacion que el normal.
  Con una sola tipografia la base da el tamano de linea y `0%` reproduce el
  comportamiento historico: los presets existentes no se mueven.
---

## 5. Panel de Font Size (mapeo control -> dato, 2026-10-24)

El panel vive en el bloque **Font Size** de la pestaña TEXT y **sólo aparece con un
target L1/L2/L3**; en All quedan el tamaño del texto y el tope global, como siempre.
Los dos selects (Modo, Ref) dicen *a qué se compara* y los dos sliders (Proporción,
Tope) dicen *cuánto*; la frase de estado lo escribe en palabras.

| Control | Dato que escribe | Default | Nota |
|---|---|---|---|
| `Modo` | `.sizing.mode` | `fontsize` (Proporcional) | `width` (Ancho) |
| `Ref` | `.sizing.ref` + `.refLine` | `canvas` (ALL) | Proporcional: ALL/L1/L2/L3. Ancho: L1/L2/L3. Nunca la propia línea (`opcionesValidas`) |
| `Proporción` | `.sizing.pct` (1..300) | 100 | En modo Ancho es `%` del ancho de la referencia |
| `Tope` | `lines.line["n"].canvas.maxFontSize` | ausente = **hereda el de ALL** | `%` del eje limitante del área útil; la casilla "Heredar de ALL" BORRA la clave |
| (sin control) | `lines.line["n"].font.size` | ausente | Campo avanzado (R-L2.3): un px propio gana sobre la proporción y la frase de estado lo declara |

- **R-L2.8**: la frase de estado muestra la relación **resuelta** y el px resultante
  ("L2 = 50 % del tamaño de ALL · tope heredado · ≈62 px"). El px es **pre-encaje** (§2.3).
- **R-L2.9**: con el default (Proporcional + ALL + 100 % + tope 100 %) el tamaño es
  **idéntico en todas las líneas** y el panel **no escribe nada** hasta que se mueve un
  control: un preset sin reglas se muestra correcto y no gana un delta vacío (IV).
- **R-L2.10**: el panel **no** escribe el tope al abrir ni al cambiar de target: sólo al
  mover su slider o al destildar "Heredar de ALL" (R-L2.6).
- **R-L4.5**: El aire *anterior* a una linea lo controla ESA linea (no la que
  lo deja). `lineHeight` de L1 se guarda pero no mueve nada, porque no hay linea
  encima (FR-021, coherente con contracts/geometria.md R-G1.5).