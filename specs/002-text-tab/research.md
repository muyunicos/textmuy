# Research: Correccion de la pestana TEXT

**Feature**: `002-text-tab` | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-04

Este documento registra las decisiones de diseno tomadas para cerrar los
puntos abiertos del Technical Context y las alternativas evaluadas. Cada
decision sigue el formato Decision / Rationale / Alternatives considered.

Todas las causas raiz fueron verificadas con Chrome + Playwright contra el
WordPress de laboratorio (iframe real del plugin), midiendo pixeles del
lienzo. Las decisiones resuelven **como** corregir, no **donde** esta el
defecto.

---

## R1. La curva borra el texto por `loseContext()` antes de devolver el canvas

**Decision**: `curveWebGL()` copia el resultado a un canvas 2D (snapshot) y
devuelve la copia; el `loseContext()` se aplica despues, sobre el canvas
WebGL ya descartable. En la ruta headless, sin WebGL el render rechaza con
causa en vez de usar el fallback 2D.

**Rationale**: Medido. El calculo del arco es correcto: con la perdida de
contexto neutralizada, `curve()` devuelve el texto curvado (12.256 px de
tinta, caja con forma de arco a 120 grados). Prueba minima: un canvas WebGL
pintado de rojo y copiado tras `loseContext()` sale vacio; sin perder el
contexto sale intacto. El `loseContext()` se conserva (el limite de
contextos GPU ronda 16), pero despues del snapshot. El fallback 2D funciona
y queda solo para el editor visible (la constitucion II prohibe degradar en
la API).

**Alternatives considered**:
- *No llamar `loseContext()` nunca*: agota los contextos WebGL de la pagina;
  descartado.
- *Leer con `readPixels` en vez de `drawImage`*: equivalente en costo y mas
  codigo; `drawImage` con `preserveDrawingBuffer:true` (ya asi) es una linea.
- *Devolver el canvas WebGL vivo y perderlo en el llamador*: reparte la
  responsabilidad entre dos archivos; viola responsabilidad unica (VII).

---

## R2. La barra de Style target nace oculta por un listener anidado

**Decision**: Mover el registro de `applyLineTargetGating` y su llamada
inicial fuera del listener de `GradientPicker`, al nivel de `bindControls()`.

**Rationale**: Medido: la barra nace con `hidden=true` y aparece al cambiar
de pestana. El registro y la llamada inicial viven dentro del callback de
`textmuy:line-target-updated` que re-sincroniza los gradient pickers: ese
evento nunca se dispara al arrancar. Al cambiar de pestana, `bindMenuTabs`
si lo invoca directo, y por eso aparece. Mover dos lineas de sitio; cero
cambio de comportamiento una vez visible.

**Alternatives considered**:
- *Quitar el `hidden` inicial del HTML*: parpadearia en BACKGROUND/DOWNLOAD
  hasta el primer gating; peor.
- *Disparar un evento sintetico al arrancar*: esconde el problema (el
  registro seguiria anidado y fragil); descartado.

---

## R3. El margen colapsa porque el area util llega a cero sin tope

**Decision**: Calcular el padding contra el **lado menor** del canvas y
topear el padding efectivo para preservar un area util minima; unificar el
calculo entre `render()` y `autoFitText()` en un unico helper.

**Rationale**: Medido: con margin 45% el texto queda en 34 px, igual a 50%.
Doble causa: (1) `padding = canvasWidth * margin`, asi que en un canvas
apaisado el margen vertical colapsa mucho antes (800x200 muere con ~13%);
(2) `avail = canvas - 2*padding` sin tope, y `Math.max(1, ...)` solo existe
en `render()`, no en `autoFitText()`, que biseca sobre area cero/negativa y
devuelve el minimo de 8 px. El tope preserva legibilidad como miniatura y la
vuelta a cero restaura el tamano exacto.

**Alternatives considered**:
- *Bajar el maximo del slider*: esconde el colapso pero no lo elimina;
  descartado.
- *Padding separado horizontal/vertical*: dos controles donde hoy hay uno;
  cambia la UI sin pedirlo; descartado.

---

## R4. Una sola geometria de bloque + encaje final siempre

**Decision**: Ajuste de tamano y todos los motores comparten un unico modelo
de bloque (origen, avances y baselines por tinta, con avances acumulados
para tamanos por linea). Tras componer la capa final (con o sin
curva/rotacion), se aplica siempre el encaje a la caja disponible (hoy solo
corre con recorte), con margen de seguridad de pocos pixeles.

**Rationale**: Medido: tinta en columna 479 y 50+ px en fila 0. Dos causas:
(1) ajuste y dibujo usan formulas distintas de centrado, lo calculado no es
lo pintado; (2) el encaje final solo existe en el camino con recorte, por
eso la rotacion "enmascaraba" el desborde. Unificar elimina la divergencia
en origen; el encaje siempre aplicado la hace imposible por construccion.

**Alternatives considered**:
- *Solo encaje final, sin unificar*: deja dos modelos divergiendo (fill vs
  outline con `lh != 1`); descartado.
- *Solo unificar, sin encaje final*: ante metricas de fuente raras el texto
  podria tocar el borde; el encaje es barato y cierra SC-004.

---

## R5. Line height como avance por linea, con L1 inerte

**Decision**: Cada linea se coloca a `lineHeight * tamano` debajo de la
anterior; L1 se ancla al modelo de bloque y su propio `lineHeight` se guarda
pero no la mueve. Es la misma geometria unica de R4, no un modelo aparte.

**Rationale**: Semantica pedida ("separacion con respecto a la linea de
arriba, siempre"); de ella sale gratis la invariancia con una sola linea
(FR-007). El modelo actual centra `n*px*lh`, por eso una sola linea se
desplaza y el bloque multilinea nace descentrado.

**Alternatives considered**:
- *Avance simetrico*: moveria L1 al cambiar el interlineado; descartado.
- *Ignorar `lineHeight` con una sola linea solo en UI*: el valor guardado
  divergiria del mostrado; se guarda y no se aplica (FR-021).

---

## R6. Resolucion por linea en tres pasos con claves 1-based

**Decision**: Cada linea resuelve su estilo como heredar (`lines.inherit`,
default ALL) -> mezclar sus ajustes propios (delta disperso) ->
dimensionar por su regla (`sizing = {ref, mode, pct}`). Las claves de linea
en el formato son 1-based (`line["1"]`=L1). El slider de tamano reescribe
`pct` con referencia a linea y px absolutos con referencia a canvas. Sin
`inherit` ni `sizing`, la resolucion es identica a la actual (sin codigo de
migracion: no hay presets existentes).

**Rationale**: Modelo acordado con el usuario: el tab indica que se edita
(todo aplica siempre); "mas chico" es proporcion sobre el valor resuelto
(cascada L1->L2->L3); ramificacion libre via Sizing ref; lineas inexistentes
conservan sus valores. El `sizing` global actual solo describe una
referencia (la del target activo) y no representa una cadena; por eso vive
dentro de cada linea. Claves 1-based por decision del usuario; formato nuevo
sin presets que migrar.

**Alternatives considered**:
- *Porcentajes sobre la base en vez de sobre lo resuelto*: L2 al 80% de L1
  no la seguiria al crecer; rompe la cascada; descartado.
- *Diferencias en px en vez de porcentajes*: la proporcion se deforma al
  crecer la referencia; descartado.
- *Un `sizing` global extendido a mapa*: equivale a lo decidido con peor
  localidad (la regla lejos de la linea); se guarda en la linea.

---

## R7. Fuente propia por linea con carga bajo demanda y fallo nombrado

**Decision**: Cada linea declara su `font.src` (identidad de catalogo); el
manifiesto del render incluye una fuente por linea usada; cada una se carga
una sola vez por identidad antes de pintar; el fallo rechaza nombrando linea
y fuente; cada linea se mide con su propia familia; el desplegable muestra
la fuente del target activo.

**Rationale**: Corazon del feature (tres lineas, tres tipografias). Medir
cada linea con su familia corrige un defecto latente: hoy todo se mide con
una sola fuente y las demas ajustan mal. El fallo nombrado aplica la firmeza
VI sin cambios.

**Alternatives considered**:
- *Una sola fuente por preset (estado actual)*: contra el requisito
  principal; descartado.
- *Resolver por linea pero medir todo con la base*: mantiene el defecto de
  ajuste; descartado.

---

## R8. Anti-ciclos por ocultamiento transitivo + rechazo con causa

**Decision**: Los selectores de herencia y de referencia ocultan,
transitivamente y por ambas aristas (herencia + sizing), toda linea que
cerraria un ciclo al editar una linea. Si un ciclo llega por archivo editado
a mano, la carga lo rechaza con causa y deja la vista intacta.

**Rationale**: Un ciclo mixto tambien cuelga el render (L3 hereda de L1
mientras L1 dimensiona contra L3), por eso el ocultamiento sigue ambas
aristas y es transitivo. El rechazo cubre el unico camino que la UI no
impide (archivo a mano) con la regla de firmeza vigente.

**Alternatives considered**:
- *Deteccion en render con ruptura a base*: pinta algo distinto de lo
  guardado sin avisar; sustitucion silenciosa prohibida por VI; descartado.
- *Ocultamiento solo directo*: deja ciclos de longitud 3 seleccionables;
  insuficiente.

---

## R9. Rotate/distort por linea ultimos: una capa por linea

**Decision**: Rotacion y curva por linea parten el pipeline en una capa
compuesta por linea (cada una con su estilo resuelto) que despues se apilan
con la geometria del bloque; la curva y rotacion globales mantienen su orden
(primero curva, despues rotacion) sobre el conjunto.

**Rationale**: Hoy curva y rotacion se aplican al final sobre la capa del
bloque entero; no hay punto de aplicacion por linea sin partir el pipeline.
Es el cambio mas invasivo, por eso va ultimo (las demas historias no lo
necesitan). La curva global arreglada (R1) sigue igual sobre el conjunto.

**Alternatives considered**:
- *Curva por linea con mascaras sobre la capa del bloque*: acopla
  geometrias y rompe la independencia de capas; descartado.
- *Dejar rotate/distort globales para siempre*: contra FR-016; descartado.

---

## R10. Sin codigo de migracion: el formato de lineas es nuevo

**Decision**: No se escribe migracion ni lectores del formato anterior de
lineas. Un archivo con formato de lineas desconocido se rechaza con causa
(vista intacta), igual que cualquier delta invalido.

**Rationale**: Declaracion del usuario: entorno de desarrollo sin presets
existentes, todo nuevo. Escribir migracion seria codigo para cero casos
reales, y VII prohibe codigo obsoleto desde el inicio. La regla de rechazo
ya existe para deltas invalidos; se reutiliza.

**Alternatives considered**:
- *Migracion automatica silenciosa*: codigo muerto desde el dia uno;
  descartado por VII y por decision del usuario.
- *Aceptar ambos formatos*: rutas dobles, prohibidas por VII; descartado.