# Data Model: Correccion de bugs de fuentes y presets del editor

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Modelo de datos de las entidades que el feature modifica. Solo se documentan las
entidades afectadas por el cambio; el resto de la estructura de ajustes del editor
permanece igual. Los campos se describen por su significado y sus reglas, no por su
representación en el archivo.

---

## 1. Fuente

Tipografía disponible para el administrador. Es la entidad central del feature: su
identidad única es el eje de US3 y su ciclo de carga el de US1.

| Campo | Regla |
|---|---|
| **Identidad** | Id numérico del catálogo. Entero >= 1, denso, inmutable durante la sesión. Es el único valor que viaja en el estado del proyecto y en los presets. |
| Nombre visible | Texto libre del catálogo. Puede contener espacios, tildes, eñes y signos. Nunca se usa para identificar, solo para mostrar y para componer la familia tipográfica. |
| Categoría | Lista de categorías del catálogo. Deriva las pestañas de la galería y los grupos del selector. |
| Origen | Física propia del administrador (archivo en el servidor) o de catálogo público (descarga bajo demanda). |
| Archivo | Nombre del archivo en el servidor cuando la fuente es física. Vacío cuando es pública. |
| Estado de carga | Ver sección 2. |

**Reglas de validación**:
- Un nombre visible no puede ser el criterio de búsqueda para resolver la fuente: dos
  fuentes pueden compartirlo. La resolución por título es un **auxilio de
  compatibilidad** para leer referencias antiguas, no un identificador.
- Una fuente no disponible no se sustituye por otra en ningún punto (FR-005, FR-012).
  Se informa y se conserva la identidad declarada.
- Un título con caracteres no ASCII debe resolverse igual que uno sin ellos.

**Relaciones**:
- Una fuente se referencia desde el estado del proyecto (campo de fuente), por su
  identidad.
- Una fuente pertenece a una o varias categorías del catálogo.
- Una fuente ocupa una celda del sprite del ámbito de fuentes, derivada de su
  identidad.

---

## 2. Estado de carga de una fuente

Ciclo de vida de la disponibilidad de una fuente para el dibujo. Sustituye al
registro de "cargada" implícito del módulo de fuentes, que hoy confunde "pedida" con
"resuelta".

| Estado | Significado | Transiciones |
|---|---|---|
| **No solicitada** | La fuente está en el catálogo pero nadie la ha pedido todavía. | → Pendiente al seleccionarse o al aplicarse un preset que la referencia. |
| **Pendiente** | Se está descargando o registrando. | → Disponible al completarse. → Fallida al agotarse. |
| **Disponible** | La fuente puede pintarse. Estado terminal de éxito. | → No solicitada solo si el catálogo se invalida (baja o renombre). |
| **Fallida** | No se pudo obtener, con causa concreta. **Reintentable**: un reintento parte de Fallida. | → Pendiente al reintentar. → No solicitada si el recurso se da de baja. |

**Reglas de validación**:
- Un fallo **no** marca la fuente como disponible. Es la regla que hoy impide un
  reintento y convierte un problema transitorio de red en permanente (FR-006).
- Un fallo **no** dispara la carga de otra fuente (FR-012).
- Mientras el estado es Pendiente, el editor puede pintar un repintado provisional, pero
  queda registrado un repintado pendiente que se dispara al pasar a Disponible. El
  usuario nunca queda viendo un estado final con una tipografía que no eligió (FR-002,
  FR-013).
---

## 3. Estado de fuente del proyecto

Referencia a la fuente elegida para el texto del proyecto. Es la única fuente de
verdad de la tipografía.

| Campo | Regla |
|---|---|
| **Identidad de fuente** | Id numérico de la fuente (ver sección 1). Único valor persistente. |
| Tamaño | Configuración global del bloque de texto. |
| Peso | Configuración global del bloque de texto. |

**Reglas de validación**:
- La referencia es global al proyecto: nunca se duplica por línea ni entra en
  sobrescrituras por línea (regla vigente de alcance de estilo).
- El selector de la interfaz y este estado se mantienen sincronizados en todo momento
  (FR-010). Si el selector no puede representar la referencia actual, es un fallo
  visible, no un valor silenciosamente distinto.

---

## 4. Previsualización temporal

Aplicación transitoria de una fuente durante la exploración de la galería. Es lo que
habilita US2 y lo que impide que explorar cueste trabajo al usuario.

| Campo | Regla |
|---|---|
| **Identidad de fuente** | La fuente explorada, por su identidad. |
| Estado previo | La referencia que había antes de abrir la galería. Se conserva íntegra para poder revertir. |
| Activa | Si la previsualización está en curso. Al cerrar la galería se resuelve siempre a falso. |

**Reglas de validación**:
- Existe **como máximo una** previsualización activa. Explorar una segunda fuente
  reemplaza la primera.
- Cerrar la galería sin confirmar restaura siempre el estado previo, incluso si la
  descarga de la fuente sigue en curso (FR-008). Una descarga tardía no puede
  repintar el lienzo con una fuente que el usuario ya descartó.
- Confirmar consolida la fuente en el estado del proyecto y desactiva la
  previsualización; el lienzo no cambia al confirmar (FR-009).
- Mientras hay previsualización activa, el estado del proyecto **no** se modifica: el
  usuario explora sin ensuciar lo que va a guardar.

---

## 5. Preset

Estilo guardado por el usuario. El formato en disco no cambia en este feature (R8).

| Campo | Regla |
|---|---|
| Formato y versión | Identificadores fijos del formato actual. No se alteran. |
| Nombre | Identificador del archivo. Sanitizado. |
| **Delta de ajustes** | Solo los ajustes que difieren de los valores por defecto. Nunca el estado completo. |

**Reglas de validación**:
- Aplicar un preset produce **defaults + delta** sobre un objeto nuevo (R7). Ese objeto
  reemplaza la vista completa.
- Ningún campo ausente del delta conserva un valor de la vista anterior (FR-016,
  FR-018). Vuelve a su valor por defecto.
- El delta es la única autoridad sobre la vista tras la carga. La vista en curso no
  participa.
- La validación de la referencia de fuente al leer un preset admite tanto identidad
  numérica como título por compatibilidad con archivos anteriores, y rechaza cualquier
  otro tipo con causa.
- Cargar dos veces el mismo preset produce el mismo resultado: la operación es
  idempotente y no acumula capas ni estilos.

---

## 6. Vista en edición

Conjunto completo de ajustes que el usuario está modificando. Es la entidad que los
campos fantasma contaminaban.

| Campo | Regla |
|---|---|
| **Ajustes** | Todos los valores del proyecto, incluidos los de las capas de relleno y los estilos por línea. |
| Origen | Defaults (al arrancar), un preset aplicado o un ajuste manual del usuario. |

**Reglas de validación**:
- Tras aplicar un preset, la vista se reconstruye desde cero con defaults + delta. No se
  escribe campo por campo sobre el estado existente (FR-015, FR-016).
- Los ajustes que el preset no declara vuelven a su valor por defecto (escenario 3 de
  US4).
- Las capas de relleno, sus estilos, repeticiones y modos de mezcla forman parte de la
  vista y se aplican al cargar (FR-015). Ningún grupo de ajustes declarado en el preset
  queda sin aplicar.
- Los estilos por línea y el destino de estilo activo también se restauran; no quedan
  fuera por ser ajustes de estilo (escenario 5 de US4).

---

## 7. Invariantes del conjunto

1. **Una identidad, una fuente**: dos entradas del selector nunca apuntan a la misma
   fuente (FR-003).
2. **Declarado es pintado**: lo que el selector declara y lo que el lienzo muestra
   coinciden siempre, o el editor lo informa (FR-001, FR-013).
3. **Cero sustitución**: ningún fallo de fuente o de preset produce una tipografía o un
   estilo distinto del declarado (FR-012).
4. **Defaults como base**: un preset se aplica sobre defaults, nunca sobre la vista
   (FR-016, FR-018).
5. **Reversibilidad**: toda previsualización se revierte al cerrar (FR-008).
6. **Reintentabilidad**: un fallo transitorio no deja el sistema en un estado terminal
   (FR-006).
7. **Compatibilidad**: los datos ya guardados siguen siendo válidos sin migración
   (FR-019).
8. **Paridad**: el mismo comportamiento en el editor y en el motor de render (FR-014,
   FR-020).