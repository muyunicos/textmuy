# Contrato: Aplicación de presets

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](./plan.md)

Contrato de la carga y guardado de presets tras la corrección. Cubre US4. El
contrato de fuentes está en [font-resolution.md](./font-resolution.md).

Contrato **interno al módulo**: no define API pública. Fija el comportamiento
esperado para que la corrección sea verificable.

---

## 1. Carga de un preset

### 1.1 Operación

| Entrada | Salida |
|---|---|
| Delta de ajustes almacenado | Objeto de ajustes completo, construido como defaults + delta |

### 1.2 Requisitos

- **R-P1.1**: El resultado es un objeto **nuevo**. La carga nunca escribe campo por
  campo sobre el estado de la vista en curso.
- **R-P1.2**: El resultado se construye aplicando el delta sobre una copia profunda de
  los valores por defecto. El delta asume los defaults como base.
- **R-P1.3**: La carga es idempotente: aplicarla dos veces produce el mismo resultado,
  sin acumular capas de relleno ni estilos.
- **R-P1.4**: La carga reemplaza la vista completa. Ningún campo ausente del delta
  conserva un valor de la vista anterior; vuelve a su valor por defecto.
- **R-P1.5**: Todo ajuste declarado en el delta se aplica, incluidos los grupos anidados
  y las listas con identidad estable (capas de relleno, estilos, repeticiones, modos de
  mezcla, estilos por línea, destino de estilo activo).
- **R-P1.6**: El formato en disco no se altera. Un preset guardado antes de la
  corrección sigue cargando sin necesidad de regenerarlo (FR-019).

---

## 2. Validación al leer

### 2.1 Requisitos

- **R-P2.1**: La referencia de fuente admite identidad numérica y título por
  compatibilidad. Cualquier otro tipo se rechaza con causa, y el rechazo **no** queda
  cacheado para que un reintento válido resuelva.
- **R-P2.2**: Un delta con estructura inválida se rechaza con causa y **no** produce un
  estado parcialmente aplicado.
- **R-P2.3**: La validación ocurre antes de tocar la vista. Un fallo deja la vista
  intacta.

---

## 3. Guardado

### 3.1 Requisitos

- **R-P3.1**: Se guarda solo el delta contra los valores por defecto, nunca el estado
  completo.
- **R-P3.2**: El round-trip guardar y recargar produce una vista idéntica a la del
  momento de guardar, campo por campo (FR-017, SC-009). Un ajuste no declarado en el
  delta no es un ajuste que el usuario haya cambiado.
- **R-P3.3**: El guardado no depende de la representación interna de un ajuste: si el
  editor guarda un color de una forma y lo lee de otra, el round-trip lo revela.
- **R-P3.4**: Guardar un preset recién cargado no lo altera: recargar un preset y
  volver a guardarlo produce un delta equivalente.

---

## 4. Paridad entreeditor y motor de render

### 4.1 Requisitos

- **R-P4.1**: La misma función de carga sirve a la vista del editor, a la importación
  de presets y al motor de render headless. No hay una versión solo para el editor.
- **R-P4.2**: Un preset produce el mismo resultado visual en el editor y en el PDF,
  porque ambos parten del mismo objeto de ajustes.
- **R-P4.3**: La aplicación de un preset no depende de que exista un puente disponible,
  salvo para leer el archivo en sí.

---

## 5. Interacción con la interfaz

### 5.1 Requisitos

- **R-P5.1**: Tras aplicar un preset, el selector de fuentes y el resto de controles
  reflejan el preset, no los valores anteriores.
- **R-P5.2**: Deshacer y rehacer preservan la integridad de un preset aplicado: se puede
  volver al estado previo y recuperar el preset completo.
- **R-P5.3**: Un fallo al cargar informa con causa y deja la vista anterior en pie, de
  modo que el usuario no pierde el trabajo que tenía abierto.