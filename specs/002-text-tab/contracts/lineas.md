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

- **R-L2.1**: `ref:'canvas'` dimensiona contra el area util (fase 1 por
  linea); `ref:'linea'` calcula el porcentaje sobre el tamano resuelto de
  esa linea, en cascada.
- **R-L2.2**: `mode:'fontsize'` copia el porcentaje del tamano;
  `mode:'width'` ajusta la linea al ancho objetivo con el alto restante del
  canvas.
- **R-L2.3**: Un `font.size` en px sustituye la regla para esa linea (no se
  combinan).
- **R-L2.4**: Fase 2: si la pila supera el alto util, todas las lineas se
  escalan por el mismo factor hasta el 100% vertical (proporciones
  intactas).
- **R-L2.5**: Referencia a linea inexistente: la linea usa sus valores
  guardados o los de All; nunca falla el pintado.

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
real, para que el contrato y el codigo digan lo mismo:

**Global de bloque** (nunca entra a overrides de linea):

| Ruta | Motivo |
|---|---|
| `text` | El texto es global por definicion (FR-016). |
| `canvas.*` | Canvas Size es la unica fuente de verdad del tamano de salida. **Excepcion**: `canvas.maxFontSize` es global en All pero con una linea activa manda sobre ESA linea (decision del usuario, 2026-10-04). |
| `lines` | El contenedor del sistema de lineas. |
| descarga / procesado | Rutas de salida. |
| `rotate`, `distort` | **Globales hasta el bloque D4.** Aplican al bloque compuesto entero al final del render. Hacerlos por linea exige partir el pipeline en una capa por linea (componer cada linea con su estilo resuelto, aplicarle su giro o su curva, y recien despues apilar), que es un cambio de arquitectura del render: ver D4 en `tasks.md`. |
| `lettering.flag`, `lettering.boggle`, `lettering.reverseOverlap`, `lettering.blendmode` | Actuan sobre el bloque completo. |

**Por linea**: `align`, `letterSpacing`, **`lineHeight`**, `font.*`, `fill.*`,
`outline.*`, `depth.*`, `depth2.*`, `bevel.*`, `shadow.*`, `specular.*`,
`lettering.shadow`, `lettering.active`, `icon.*`, y `canvas.maxFontSize`.

- **R-L4.1**: Una ruta de la tabla global MUST escribirse en la base aunque el
  target activo sea L1/L2/L3, para no crear overrides huerfanos. La unica
  excepcion es `canvas.maxFontSize` (R-L4.4).
- **R-L4.2**: Las rutas por linea se mezclan en el paso 2 de la resolucion, con
  el mismo criterio de delta disperso del resto (R-L1.3).
- **R-L4.3**: `canvas.maxFontSize` es la excepcion de la tabla global. En All
  manda sobre el texto completo; con una linea activa manda sobre ESA linea.
  El valor es **siempre un porcentaje relativo** (del lado limitante del lienzo,
  o del tamano de la linea de referencia segun `Sizing ref:`), **nunca pixeles
  fijos**: el lienzo es dinamico (500 px o 5000 px) y el texto debe seguir al
  tamano que necesite el cliente. Con `Sizing ref: <Lx> · ancho` el tamano lo
  decide el ancho de la referencia y el control queda sin efecto.
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
- **R-L4.5**: El aire *anterior* a una linea lo controla ESA linea (no la que
  lo deja). `lineHeight` de L1 se guarda pero no mueve nada, porque no hay linea
  encima (FR-021, coherente con contracts/geometria.md R-G1.5).