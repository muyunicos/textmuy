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

---

## 3. Ciclos

### 3.1 Requisitos

- **R-L3.1**: La UI oculta transitivamente, por ambas aristas (herencia +
  dimensionamiento), toda opcion que cerraria un ciclo al editar una linea.
- **R-L3.2**: Un ciclo por archivo editado a mano se rechaza con causa
  (`lines:<detalle>:ciclo`) dejando la vista intacta; nunca cuelga ni pinta
  parcial.
- **R-L3.3**: La deteccion cubre ciclos de cualquier longitud y mixtos
  (herencia+tamanio combinados).