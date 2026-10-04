# Contrato: Identidad y ciclo de carga de fuentes

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](./plan.md)

Contrato que deben cumplir las operaciones de fuente del módulo tras la corrección.
Cubre US1, US2 y US3. El contrato de carga de presets (defaults + delta) está
descrito en [data-model.md](../data-model.md#5-preset).

Este contrato es **interno al módulo**: no define una API pública ni un formato de
intercambio. Su función es fijar el comportamiento esperado para que la corrección
sea verificable y no dependa de detalles de implementación.

---

## 1. Resolución de identidad

### 1.1 Entrada

Una referencia a fuente puede llegar en cualquiera de estas formas, desde el estado
del proyecto, desde un preset guardado o desde un preset importado:

| Forma | Contexto | Tratamiento |
|---|---|---|
| Identidad numérica | Referencia canónica | Se resuelve directamente contra el catálogo. |
| Título del catálogo | Compatibilidad con referencias anteriores | Se busca por título; si hay coincidencias múltiples, es ambiguo y se informa. |
| Clave interna de registro | Solo interna; no debe llegar al estado | Se acepta por tolerancia y se traduce a identidad. |

### 1.2 Salida

| Resultado | Condición |
|---|---|
| Identidad numérica del catálogo | La referencia apunta a una fuente existente. |
| Error con causa `fonts:<id>:<motivo>` | La identidad no existe, está dada de baja o es ambigua. |

### 1.3 Requisitos

- **R-C1.1**: La resolución no depende del nombre visible para desambiguar. Un título
  repetido produce error de ambigüedad, no una elección arbitraria.
- **R-C1.2**: Un título con espacios, tildes, eñes o signos se resuelve igual que uno
  sin ellos.
- **R-C1.3**: Toda referencia se normaliza a identidad numérica antes de entrar en el
  estado del proyecto. El estado nunca guarda una clave interna de registro.
- **R-C1.4**: La resolución no tiene resultado por defecto. Si no puede resolver,
  falla con causa; nunca devuelve una fuente sustituta.
- **R-C1.5** *(añadido tras la regresión RC40)*: El catálogo es la **única** fuente de
  verdad de la identidad. El registro interno es un espejo de compatibilidad y jamás
  genera una identidad para una fuente que el catálogo ya provee.
- **R-C1.6** *(añadido tras la regresión RC40)*: Al resolver por nombre visible, si el
  catálogo tiene coincidencias se usan **solo** las del catálogo. El registro se
  consulta únicamente cuando el catálogo no tiene ninguna.
- **R-C1.7** *(añadido tras la regresión RC40)*: No se crea ninguna identidad mientras
  el catálogo esté pendiente. La resolución espera al catálogo en lugar de inventar.
- **R-C1.8** *(añadido tras la regresión RC40)*: Cuando el catálogo pase a proveer una
  familia que tenía una identidad creada por el registro, esa identidad se descarta.
  Una familia nunca tiene dos identidades vivas.

---

## 2. Ciclo de carga

### 2.1 Operaciones

| Operación | Entrada | Salida | Efectos |
|---|---|---|---|
| **Asegurar disponible** | Identidad de fuente | Promise que resuelve cuando la fuente queda disponible o rechaza con causa | Descarga el archivo si es física; registra la familia si es pública; marca el estado. |
| **Consultar estado** | Identidad de fuente | Estado (no solicitada / pendiente / disponible / fallida) | Ninguno. |
| **Resolver familia** | Identidad de fuente | Nombre de familia ya entrecomillado para composición | Ninguno; no dispara descargas. |

### 2.2 Requisitos

- **R-C2.1**: **Asegurar disponible** nunca resuelve con una familia distinta de la
  solicitada. Si la fuente no está disponible, rechaza con causa.
- **R-C2.2**: Un fallo deja el estado en Fallida y **no** en Disponible. Un reintento
  posterior vuelve a intentar la descarga y puede tener éxito.
- **R-C2.3**: Las descargas en curso se deduplican: dos peticiones simultáneas de la
  misma fuente comparten una sola descarga.
- **R-C2.4**: El estado disponible de una fuente permanece válido mientras el catálogo no
  se invalide. Una baja o un renombre en el catálogo la invalida.
- **R-C2.5**: **Resolver familia** es una función pura: no toca la red ni modifica el
  estado de carga.

---

## 3. Composición de la familia para el dibujo

### 3.1 Requisitos

- **R-C3.1**: Existe una única forma de componer el valor de fuente de un contexto de
  dibujo. Todos los puntos que pintan texto la usan; ninguno la construye por su
  cuenta.
- **R-C3.2**: La familia se entrecomilla siempre, de modo que un nombre con espacios,
  tildes o eñes produzca siempre un valor válido.
- **R-C3.3**: La composición no añade familias de reserva. Si la fuente declarada no
  está disponible, el editor informa y la ausencia se hace perceptible, en lugar de
  dibujar con una tipografía que el usuario no eligió.
- **R-C3.4**: Si por un motivo externo el valor compuesto fuera rechazado, el pintado
---

## 4. Sincronización con la interfaz

### 4.1 Requisitos

- **R-C4.1**: El selector de fuentes enumera cada fuente **una sola vez**. Ningún
  título, categoría o archivo produce una entrada duplicada.
- **R-C4.2**: Todas las entradas del selector son funcionales: elegir cualquiera cambia
  el texto del lienzo a esa fuente.
- **R-C4.3**: El valor mostrado en el selector y el valor del estado del proyecto
  coinciden siempre, incluidos al arrancar, al aplicar un preset y al deshacer o
  rehacer.
- **R-C4.4**: Si el catálogo aún no está disponible, el selector no muestra entradas que
  luego puedan fallar al elegirse.

---

## 5. Previsualización en la galería

### 5.1 Operaciones

| Operación | Entrada | Salida | Efectos |
|---|---|---|---|
| **Previsualizar** | Identidad de fuente | — | Aplica la fuente al lienzo y conserva la referencia previa. |
| **Revertir** | — | — | Restaura la referencia previa y descarta cualquier descarga pendiente. |
| **Confirmar** | Identidad de fuente | — | Consolida la fuente en el estado del proyecto y cierra. |

### 5.2 Requisitos

- **R-C5.1**: Previsualizar aplica la fuente al lienzo sin pasar por el botón de
  confirmación.
- **R-C5.2**: Hay como máximo una previsualización activa; una nueva reemplaza a la
  anterior.
- **R-C5.3**: Revertir restaura siempre el estado previo, incluso si la descarga sigue
  en curso. Una descarga que termina después de revertir **no** repinta el lienzo.
- **R-C5.4**: Mientras hay previsualización activa, el estado del proyecto del usuario
  no se modifica.
- **R-C5.5**: Confirmar deja el selector y el estado del proyecto sincronizados con la
  fuente elegida, y el lienzo no cambia al confirmar.
- **R-C5.6**: La previsualización nunca deja el lienzo en un estado que el usuario no
  pueda distinguir de una fuente aplicada.

---

## 6. Compatibilidad

- **R-C6.1**: Los presets existentes que referencian una fuente por título siguen
  cargando; la compatibilidad se resuelve en el punto de entrada, no en el estado.
- **R-C6.2**: La corrección no altera el formato de almacenamiento de presets ni el
  formato de los catálogos.
- **R-C6.3**: El motor de render headless comparte este contrato; no hay una versión
  solo para la vista del editor.
  MUST NOT dejar en pantalla una composición anterior sin avisar: el fallo es visible.