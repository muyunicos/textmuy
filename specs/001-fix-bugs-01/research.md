# Research: Correccion de bugs de fuentes y presets del editor

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-01

Este documento registra las decisiones de diseño tomadas para cerrar los
`NEEDS CLARIFICATION` del Technical Context y las alternativas evaluadas. Cada
decisión sigue el formato Decision / Rationale / Alternatives considered.

Todas las causas raíz de los cuatro defectos reportados fueron verificadas leyendo
y ejecutando el código del módulo antes de especificar; las decisiones de abajo
resuelven **cómo** corregir, no **dónde** está el defecto.

---

## R1. Identidad canónica de una fuente

**Decision**: La identidad de una fuente es su **id numérico del catálogo**, y es el
único valor que viaja por el estado del proyecto y por los presets. El título y la
clave interna de registro son solo metadatos de presentación y de resolución.

**Rationale**: Hoy conviven tres identidades para la misma fuente —el id de catálogo,
una clave de tipo `user-<id>` y otra de tipo `server-<archivo>`— y se acumulan en el
mismo selector, lo que produce las entradas duplicadas y las que no funcionan. El
catálogo ya define un id numérico denso desde 1 que el resto del módulo respeta
(tile = id - 1, sprite certificado, referencias de imagen). Reutilizar ese id como
identidad única elimina la ambigüedad sin inventar un identificador nuevo y sin
tocar el formato en disco.

**Alternatives considered**:
- *Clave de archivo como identidad*: el nombre de archivo distingue mejor dos fuentes
  con el mismo título, pero obliga a sanear el nombre, no cubre el archivo renombrado
  y contradice el contrato vigente de referencias numéricas.
- *Título visible como identidad*: es lo que hace el importador actual, pero un título
  puede repetirse y contener caracteres que rompen el selector; además obliga a una
  búsqueda O(n) en cada resolución.
- *Un UUID por fuente generado en el cliente*: rompería la compatibilidad con presets
  y catálogos existentes sin aportar nada.

---

## R2. Composición de la familia tipográfica al dibujar

**Decision**: Toda composición de `ctx.font` se hace con un único constructor que
recibe la familia ya resuelta y **la entrecomilla**, de modo que un nombre con
espacios, tildes o eñes produce siempre un valor CSS válido.

**Rationale**: El fallo reportado —el texto se queda con la tipografía anterior al
tocar un control— se explica por este punto. Un nombre con espacios construido sin
comillas genera una abreviatura CSS inválida, y el navegador **ignora la asignación
en silencio**, dejando `ctx.font` con el valor previo. Ese valor previo es
precisamente la fuente fantasma que el usuario ve. El constructor único evita además
que cada punto del código de dibujo resuelva la familia por su cuenta.

**Alternatives considered**:
- *Añadir un `sans-serif` de reserva al final de la cadena*: está prohibido por la
  constitución (fallback silencioso) y además ocultaría el fallo en vez de corregirlo.
- *Sanear el nombre antes de componer* (quitar espacios y acentos): rompería las
---

## R3. Espera de la fuente antes del primer pintado

**Decision**: El editor resuelve y carga la fuente declarada **antes** del primer
repintado visible, y registra un repintado pendiente que se dispara en cuanto la
fuente queda disponible.

**Rationale**: Hay dos síntomas distintos en juego. Al abrir, el pintado ocurre antes
de que la fuente exista, así que el lienzo muestra la tipografía del sistema —el
usuario la describe como "parecida a Times"—. Y la precarga actual consulta un estado
que no es visible desde el módulo de fuentes, por lo que nunca apunta a la fuente real
del proyecto y acaba cargando una etiqueta por defecto. Ambos se resuelven con una
fuente de verdad: el editor expone su fuente vigente y el pintado la espera.

**Alternatives considered**:
- *Repintar solo cuando el usuario mueve algo*: es el comportamiento actual y es
  justamente el que produce el síntoma "al tocar un control cambia la fuente".
- *Precargar todas las fuentes al abrir*: prohibido explícitamente por la constitución
  (carga modular) y contrario a la decisión RC37 de no descargar fuentes en masa.

---

## R4. Fin del fallback silencioso en la carga de fuentes

**Decision**: Un fallo de carga de fuente **no** se resuelve con otra tipografía. Se
informa con causa visible y el estado queda marcado como fallido de forma reintentable.

**Rationale**: La constitución VI prohíbe los fallbacks silenciosos, y el módulo incumple
hoy esa regla en varios puntos de la cadena de carga. El efecto no es solo teórico: el
fallback a la fuente por defecto es la razón por la que el usuario ve "Bangers" sin
haberla elegido. Además, un fallo registrado como resuelto impide el reintento, así que
un problema transitorio de red se vuelve permanente en la sesión.

**Alternatives considered**:
- *Mantener el fallback pero avisar*: seguiría mostrando una tipografía que el usuario
  no eligió, que es exactamente lo que se quiere eliminar.
- *Rechazar la operación entera*: más severo de lo necesario; el resto del preset sigue
  siendo válido y usable, así que se informa el componente fallido en lugar de perder
  el trabajo completo.

---

## R5. Precarga con el estado real del proyecto

**Decision**: El módulo de fuentes deja de intentar leer el estado del editor. Recibe
como parámetro explícito la fuente que se quiere asegurar, y quien lo invoca —el
editor al arrancar o al aplicar un preset— se la pasa.

**Rationale**: El estado del editor es privado a su propio módulo y no es visible desde
el de fuentes. El código actual lo consulta a ciegas, la comprobación siempre falla y el
resultado es que se asegura la etiqueta por defecto en lugar de la fuente del
proyecto. Pasar el dato como parámetro hace la dependencia explícita y elimina la
ambigüedad sin exponer estado interno ni crear un espacio de nombres global.

**Alternatives considered**:
- *Exponer el estado del editor en el ámbito global*: crea un acoplamiento implícito y
  una fuente de verdad duplicada; contradice la responsabilidad única por archivo.
- *Un evento que el editor emita al cambiar de fuente*: más indirección para el mismo
---

## R6. Preview en vivo de la galería de fuentes

**Decision**: Seleccionar un tile de la galería aplica la fuente al lienzo de forma
inmediata y reversible; cerrar sin confirmar restaura la fuente previa. El botón de
confirmación consolida la elección en lugar de ser el paso que la hace visible.

**Rationale**: El usuario reporta que al recorrer la galería la tipografía del texto no
cambia, y que recién al tocar "Select" ve el resultado. Eso convierte la galería en un
catálogo sin función de exploración. La galería de imágenes del mismo módulo ya
resuelve este patrón con preview en vivo y reversión, de modo que unificar el
comportamiento elimina una inconsistencia interna y satisface el requisito de
constitución de preview en vivo con rollback.

**Alternatives considered**:
- *Dejar el botón "Select" como paso único*: es el comportamiento actual y el reportado
  como defectuoso.
- *Aplicar de inmediato sin reversión*: perdería el trabajo de exploración si el usuario
  cierra la galería sin decidirse.

---

## R7. Carga de preset sobre defaults limpios

**Decision**: Aplicar un preset construye el estado completo como **defaults + delta**
sobre un objeto nuevo, y ese objeto reemplaza al estado de la vista. Ningún campo
ausente del preset sobrevive de la vista anterior.

**Rationale**: El preset se guarda correctamente —verificado ejecutando el round-trip:
el color guardado se recupera exacto—, por lo que el defecto está en la lectura. La
lectura actual escribe campo por campo sobre el estado vivo, así que todo campo que el
preset no declara conserva el valor que tenía la vista. Eso explica el síntoma
reportado: las capas de relleno nunca se aplican en la lectura, de modo que el color
dibujado es el de la vista. Escribir sobre defaults limpios elimina la familia completa
de campos fantasma, no solo el color.

**Alternatives considered**:
- *Añadir únicamente la copia de las capas de relleno*: arregla el síntoma reportado pero
  deja vivos el resto de campos no declarados que sobreviven de la vista.
- *Borrar el estado y aplicar el delta sobre el objeto vacío*: rompería los valores por
  defecto que el delta asume como base y que el propio formato delta exige.

---

## R8. Compatibilidad de formato

**Decision**: El formato de almacenamiento no cambia. Los presets ya guardados siguen
cargando sin necesidad de regenerarlos ni migrarlos.

**Rationale**: El defecto está en la lectura, no en la escritura; el contenido de los
archivos es correcto. Cambiar el formato obligaría a migrar datos que no están dañados y
ampliaría el riesgo sin beneficio.

**Alternatives considered**:
- *Versionar el formato para reflejar la corrección*: innecesario, porque nada de lo
  escrito cambia.
- *Regenerar todos los presets al vuelo*: descarta ajustes editados a mano sin motivo.

---

## R9. Alcance de la verificación

**Decision**: La lógica de resolución de fuentes y de round-trip de presets se cubre con
suites de Node. La paridad de la ruta headless del motor de render se verifica
manualmente en WordPress, por no ser alcanzable desde Node.

**Rationale**: El módulo es un script de navegador; Node lo carga con *shims* mínimos. La
lógica de fuentes y el delta son funciones puras y se prueban bien así. La ruta headless,
en cambio, se ejecuta dentro de un iframe real con el puente del plugin y el motor PHP
detrás, y comprobarla exigiría una instalación de WordPress en marcha. Se registra como
puerta manual obligatoria en `quickstart.md` en lugar de declarar una cobertura que no
existe.

**Alternatives considered**:
- *Una prueba de navegador con Playwright*: el repositorio tiene una prueba opcional de
  este tipo para las galerías, pero no cubre el puente ni el motor, así que no resolvería
  la brecha que importa aquí.
- *Omitir la verificación de la ruta headless*: dejaría sin comprobar precisamente el
  cambio de mayor radio de impacto del lote.