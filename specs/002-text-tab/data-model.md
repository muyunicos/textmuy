# Data Model: Correccion de la pestana TEXT

**Feature**: `002-text-tab` | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Modelo de datos de las entidades que el feature crea o modifica. Solo se
documentan las entidades afectadas; el resto de la estructura de ajustes del
editor permanece igual. Los campos se describen por su significado y sus
reglas, no por su representacion en el archivo. Sin migraciones: el formato
de lineas es nuevo (entorno de desarrollo sin presets existentes).

---

## 1. Linea (L1/L2/L3)

Cada fila del texto separada por salto de linea. Solo L1-L3 son
direccionables; las demas filas usan la base (All) y entran igual en el
encaje vertical del conjunto.

| Campo | Regla |
|---|---|
| **Indice** | 1-based en el formato (`line["1"]`=L1). Estable mientras el texto no cambie; el texto es global y define que es cada linea. |
| Texto propio | El del bloque global partido por `\n`. La linea no guarda texto. |
| Estilo resuelto | Herencia -> ajustes propios -> dimensionamiento (seccion 3). |

**Reglas de validacion**:
- Una linea inexistente conserva sus valores guardados; al reaparecer se
  reactivan sin intervencion (FR-015).
- Lo no definido en una linea se hereda (de su padre o de All), nunca se
  inventa.
- Las filas fuera de L1-L3 no tienen entrada propia y resuelven como All.

---

## 2. Target activo (All/L1/L2/L3)

Indica **que se esta editando**, no que se aplica. Todo lo configurado en
cualquier target esta siempre vigente en el lienzo y en el PDF.

| Campo | Regla |
|---|---|
| **Valor** | `All`, `L1`, `L2` o `L3`. Vive junto a la configuracion del sistema de lineas. |

**Reglas de validacion**:
- Cambiar de tab no altera lo pintado; solo cambia que muestran los
  controles (FR-009).
- La barra que lo expone esta visible en TEXT/STYLES/ICON y oculta en
  BACKGROUND/DOWNLOAD (US2).

---

## 3. Herencia de linea (`lines.inherit`)

De quien parte cada linea antes de aplicar sus ajustes propios.

| Campo | Regla |
|---|---|
| **Padre** | `ALL` (defecto, ausente = ALL) u otra linea (`L1`/`L2`/`L3`). Mapa separado de los ajustes: es metadato del sistema, no estilo. |

**Reglas de validacion**:
- Sin ciclos: ni directos (L2->L3 + L3->L2) ni mixtos con dimensionamiento
  (L3 hereda de L1 mientras L1 dimensiona contra L3). La UI los hace
  imposibles por ocultamiento transitivo (FR-013); un ciclo por archivo
  editado a mano se rechaza con causa, vista intacta (FR-014).
- El padre puede no existir como fila (texto mas corto): la linea usa sus
  valores guardados o los de All; nunca falla el pintado.
- L3 heredando de L2 sin ajustes propios es identica a L2 y la sigue ante
  cualquier cambio de L2 (escenario 3 de US6).

---

## 4. Regla de tamano (`sizing` dentro de cada linea)

Porcentaje sobre una referencia ya resuelta, en dos modos. Vive dentro de
la linea (el `sizing` global anterior, de una sola referencia, no puede
representar una cadena y desaparece).

| Campo | Regla |
|---|---|
| **ref** | `canvas` u otra linea. |
| **mode** | `fontsize` (porcentaje del tamano resuelto) o `width` (la linea se ajusta al ancho objetivo con el alto restante). |
| **pct** | Porcentaje 1-100+. 80% de L1 es siempre el 80% del valor resuelto de L1. |
| **px absoluto** | Un tamano en pixeles escrito a mano sustituye la regla para esa linea. |

**Reglas de validacion**:
- La resolucion es en cascada sobre valores resueltos: si L1 crece, L2 al
  80% crece con ella, y L3 sigue a L2 (escenario 2 de US6).
- Con referencia a linea, el control de tamano reescribe `pct` (la cadena
  sigue viva); con referencia al canvas escribe px (FR-012).
- Tras resolver cada linea contra su referencia (fase 1), si la pila supera
  el alto del canvas todas se escalan por el mismo factor hasta entrar al
  100% vertical (fase 2, proporciones intactas).

---

## 5. Override propio (ajustes de la linea)

Ajustes que difieren de lo heredado. Solo viaja la diferencia (delta
disperso); lo ausente hereda.

| Campo | Regla |
|---|---|
| **Contenido** | Cualquier ajuste de estilo o layout salvo Canvas Size, el contenedor del sistema de lineas y descarga/procesado (FR-016). Incluye tipografia (`font.src`), tamano, alineacion, espaciados, rotacion, curva, rellenos, contornos, sombras, relieves, brillos, letterings e icono. |
| **Texto** | Nunca: el texto es global por definicion. |

**Reglas de validacion**:
- `L1.lineHeight` se guarda pero no mueve nada (FR-021).
- Cada linea carga y mide con su propia tipografia; el fallo nombra linea y
  fuente (FR-017).
- Los overrides de lineas inexistentes se conservan (FR-015).

---

## 6. Bloque de texto (geometria unica)

Modelo compartido por el ajuste de tamano y todos los motores de dibujo:
origen, avances y baselines por tinta, con avances acumulados para tamanos
por linea. Lo calculado es lo pintado (FR-006).

| Campo | Regla |
|---|---|
| **Avance** | Cada linea se coloca a `lineHeight * tamano` debajo de la anterior (FR-008); L1 ancla el bloque. |
| **Area util** | Canvas menos padding, con padding contra el lado menor y minimo garantizado (US3). |
| **Encaje final** | Tras componer (con o sin curva/rotacion), escala a la caja disponible con margen de seguridad, siempre (US4). |

**Reglas de validacion**:
- Una sola linea es invariante ante Line height (FR-007).
- Cero tinta en filas/columnas del borde con cualquier combinacion de
  layout (FR-005).

---

## 7. Preset (formato de lineas nuevo)

Estilo guardado con lineas 1-based y solo lo que difiere de los valores por
defecto. Sin migraciones ni lectores del formato anterior.

| Campo | Regla |
|---|---|
| Formato y version | Identificadores fijos del formato actual. |
| Nombre | Sanitizado `[a-z0-9_-]`. |
| **Delta** | Solo ajustes distintos de defaults, con `line["1"]`=L1. |

**Reglas de validacion**:
- Un archivo con formato de lineas desconocido se rechaza con causa, vista
  intacta (igual que cualquier delta invalido).
- Guardar y recargar produce una vista identica, linea por linea (SC-006).

---

## 8. Invariantes del conjunto

1. **Editar no es aplicar**: el tab indica que se edita; todo lo configurado
   aplica siempre (FR-009).
2. **Proporcion, no pixeles**: el tamano relativo es porcentaje sobre lo
   resuelto; la cascada se propaga sola.
3. **Sin ciclos**: imposibles en UI, rechazados con causa por archivo.
4. **Calculado es pintado**: una sola geometria de bloque para ajuste y
   dibujo.
5. **Nada se pierde**: lineas inexistentes conservan sus valores.
6. **Lo que falla se nombra**: fuente por linea con causa, resto intacto.
7. **Paridad**: mismo resultado en editor y PDF (FR-020).