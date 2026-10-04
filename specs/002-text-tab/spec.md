# Feature Specification: Correccion de la pestana TEXT

**Feature Branch**: `002-text-tab`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Correccion de la pestana TEXT: curva, style target, margin, desborde, line height y lineas con estilo propio"

Contexto: continua a `001-fix-bugs-01` (fuentes, presets y espera de
dependencias), que queda cerrado. Este spec cubre unicamente la pestana TEXT:
controles de layout (Margin, Line height, Curve the text, Rotation) y estilo
por linea (Style target All/L1/L2/L3). Character spacing queda fuera: medido
en laboratorio, separa caracteres de forma simetrica y el auto-ajuste lo
contiene. Causas raiz verificadas con Chrome + Playwright contra el WordPress
de laboratorio (iframe real del plugin), midiendo pixeles del lienzo.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Curvar el texto muestra el texto curvado (Priority: P1)

Muevo el control "Curve the text" y el texto se dobla en arco sobre el
lienzo, en ambas direcciones. Hoy el texto **desaparece por completo** al
tocar ese control (medido: 0 pixeles de tinta con angulo 120): el motor
calcula la curva pero la pierde antes de devolverla.

**Why this priority**: Es un control de la pestana que hoy destruye el trabajo
visible del usuario. Sin esto, la pestana TEXT no es usable por completo.

**Independent Test**: Con un texto corto, mover el control de curva a un valor
alto y comprobar que el lienzo muestra texto curvado; volverlo a cero y
comprobar que el texto vuelve recto. No depende de las demas historias.

**Acceptance Scenarios**:

1. **Given** un texto visible en el lienzo, **When** el usuario sube "Curve
   the text" a un valor positivo, **Then** el texto se muestra curvado hacia
   un lado sin desaparecer ni recortarse.
2. **Given** el mismo texto, **When** el usuario lo lleva a un valor negativo
   de igual magnitud, **Then** el texto se curva hacia el lado opuesto, espejo
   del caso anterior.
3. **Given** un texto curvado, **When** el usuario devuelve el control a cero,
   **Then** el texto vuelve a mostrarse recto, identico a antes de curvar.
4. **Given** un texto curvado al maximo, **When** se genera la vista previa
   del PDF, **Then** el PDF muestra la misma curva que el editor.

---

### User Story 2 - El selector de linea se ve al abrir (Priority: P1)

Abro la pestana "Estilos de Texto" y el selector "Style target" (All/L1/L2/L3)
ya esta visible al pie de TEXT, STYLES e ICON. Hoy nace oculto y solo aparece
tras cambiar de pestana (medido: `hidden=true` al abrir, `false` tras ir a
STYLES y volver).

**Why this priority**: Sin el selector visible, el usuario no descubre que
puede estilizar por linea; toda la funcionalidad de la historia 6 queda
invisible.

**Independent Test**: Abrir la pestana y comprobar que el selector esta
visible sin tocar nada; cambiar a STYLES e ICON y comprobar que sigue
visible; ir a BACKGROUND/DOWNLOAD y comprobar que se oculta.

**Acceptance Scenarios**:

1. **Given** la pestana recien abierta en TEXT, **When** el editor termina de
   mostrarse, **Then** el selector All/L1/L2/L3 esta visible sin interaccion.
2. **Given** el selector visible en TEXT, **When** el usuario pasa a STYLES o
   a ICON, **Then** el selector sigue visible con el mismo target activo.
3. **Given** el selector visible, **When** el usuario pasa a BACKGROUND o a
   DOWNLOAD, **Then** el selector se oculta (esos paneles no tienen lineas).

---

### User Story 3 - El margen achica sin matar el texto (Priority: P2)

Subo el control Margin al maximo y el texto se ve pequeno pero **presente**,
nunca desaparece. Hoy con margin alto el texto colapsa a un punto de ~34
pixeles (medido con 45%): el area util se calcula como `canvas - 2*padding`
sin tope, y llega a cero o negativa.

**Why this priority**: Un control que hace desaparecer el texto sin aviso
parece un borrado accidental; el usuario pierde la confianza en el lienzo.

**Independent Test**: Con un texto corto, llevar Margin al maximo y comprobar
que el texto sigue visible y legible como miniatura; bajarlo a cero y
comprobar que vuelve al tamano normal.

**Acceptance Scenarios**:

1. **Given** un texto visible, **When** el usuario lleva Margin a su valor
   maximo, **Then** el texto se muestra reducido pero reconocible, nunca
   vacio.
2. **Given** un canvas apaisado (ancho mayor que alto), **When** el usuario
   sube Margin, **Then** el texto se achica de forma proporcional al lado
   menor, sin colapsar antes de tiempo por usar el ancho en vertical.
3. **Given** un margin alto aplicado, **When** el usuario lo devuelve a cero,
   **Then** el texto recupera exactamente su tamano anterior.

---

### User Story 4 - El texto nunca sobresale del lienzo (Priority: P1)

Escribo un texto largo o de varias lineas y el texto **entra completo** en el
lienzo: nada se recorta en los bordes. Hoy quedan restos medidos: tinta en la
columna del borde derecho con textos largos y mas de 50 pixeles de tinta en
la fila del borde superior con textos de dos lineas. Ademas, la rotacion hoy
"enmascara" el problema porque es el unico camino con encaje final.

**Why this priority**: Un texto recortado en el editor sale recortado en el
PDF. Es la garantia visual basica del editor.

**Independent Test**: Con un texto de varias lineas y con una palabra larga,
comprobar que no hay tinta en ninguna fila ni columna del borde del lienzo;
repetir tras mover cada control de layout.

**Acceptance Scenarios**:

1. **Given** un texto de varias lineas que llena el lienzo, **When** se
   muestra en el editor, **Then** ninguna fila del borde superior ni inferior
   contiene tinta del texto.
2. **Given** una palabra larga con espaciado amplio, **When** se muestra,
   **Then** ninguna columna de los bordes laterales contiene tinta del texto.
3. **Given** cualquier texto, **When** se activa o desactiva la rotacion,
   **Then** el texto sigue entrando completo: la rotacion no es necesaria para
   que quepa, solo lo orienta.
4. **Given** un texto que llena el lienzo, **When** se genera el PDF,
   **Then** el PDF contiene el mismo texto completo que el editor.

---

### User Story 5 - La altura de linea separa lineas, no mueve texto (Priority: P2)

Con un texto de **una sola linea**, mover Line height no cambia nada visible:
el texto queda quieto. Con **varias lineas**, Line height separa o junta las
lineas (cada linea se coloca a esa distancia debajo de la anterior). Hoy una
sola linea se desplaza en vertical al mover el control, y en multilinea el
bloque nace descentrado respecto a lo calculado.

**Why this priority**: Es la semantica que el usuario espera del control
("separacion con respecto a la linea de arriba, siempre"): sin ella, ajustar
el interlineado deforma la posicion de todo el bloque.

**Independent Test**: Con una sola linea, mover Line height de minimo a maximo
y comprobar que la caja del texto no se mueve; con dos lineas, comprobar que
solo cambia la distancia entre ellas.

**Acceptance Scenarios**:

1. **Given** un texto de una sola linea, **When** el usuario varia Line height
   en todo su rango, **Then** la posicion y el tamano del texto no cambian.
2. **Given** un texto de dos lineas, **When** el usuario sube Line height,
   **Then** la primera linea queda fija y solo la segunda se desplaza hacia
   abajo.
3. **Given** un texto de dos lineas, **When** el usuario baja Line height al
   minimo, **Then** las lineas se juntan sin superponerse ni invertirse.

---

### User Story 6 - Cada linea con su propio estilo (Priority: P1)

Escribo tres lineas y les doy a cada una su tipografia, color, textura y
efectos desde el selector All/L1/L2/L3: L1 grande arriba, L2 mas chica con
otra fuente, L3 igual a L2 sin tocar nada mas. El tab solo dice **que estoy
editando ahora**: todo lo configurado en cualquier target esta siempre
vigente. Los tamanos pueden encadenarse por porcentaje (L2 al 80% de L1 es
siempre el 80%: si L1 crece, L2 la sigue, y L3 sigue a L2).

**Why this priority**: Es la funcionalidad diferencial de la pestana: tres
lineas con tres personalidades distintas en un solo estilo guardable. Sin
esto, el selector es solo decoracion.

**Independent Test**: Configurar tres lineas distintas (fuente, color y tamano
relativo), cambiar de tab entre ellas y comprobar que cada una conserva lo
suyo; agrandar L1 y comprobar que L2 y L3 la siguen en proporcion; guardar
como preset, recargar y comprobar que vuelve identico.

**Acceptance Scenarios**:

1. **Given** un texto de tres lineas, **When** el usuario elige L2 y cambia
   fuente, color y tamano, **Then** solo L2 cambia; L1 y L3 quedan intactas y
   en su posicion.
2. **Given** L2 configurada al 80% del tamano de L1, **When** el usuario
   agranda L1, **Then** L2 crece manteniendo el 80%, sin tocar nada mas.
3. **Given** L3 heredando de L2 sin cambios propios, **When** el usuario
   cambia el color de L2, **Then** L3 muestra el nuevo color automaticamente.
4. **Given** un estilo con lineas configuradas, **When** el texto pasa a una
   sola linea, **Then** L1 se muestra normal y lo de L2/L3 se conserva
   guardado; al recuperar las lineas, sus estilos reaparecen.
5. **Given** un preset guardado con estilos por linea, **When** se carga en el
   editor y se genera el PDF, **Then** ambos muestran las tres lineas con sus
   estilos propios.

---

### Edge Cases

- Curva al maximo (+/-360): el texto envuelve sin desaparecer ni recortarse;
  al volver a cero queda identico.
- Curva combinada con rotacion: ambas se aplican en orden (primero curva,
  despues rotacion) y el conjunto entra en el lienzo.
- Margin maximo + texto largo + curva a la vez: el texto sigue visible y
  completo.
- Texto de 4 o mas lineas: solo L1-L3 son direccionables; las demas usan la
  base (All) y entran en el encaje vertical del conjunto.
- Texto que pasa de 3 lineas a 1: lo de L2/L3 se conserva (no se poda) y
  reaparece al recuperar las lineas.
- Referencia de tamano o herencia en ciclo (directo o mixto herencia+tamano,
  incluso editando el archivo a mano): el selector lo hace imposible
  ocultando las opciones que cierran el ciclo; si igual llega un ciclo, la
  carga se rechaza con causa y la vista queda intacta.
- Referencia a una linea que no existe: la linea usa sus valores guardados o
  los de All, nunca falla el pintado.
- Fuente por linea que no carga: el fallo nombra la linea y la fuente, el
  resto de las lineas se pinta igual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El control de curva MUST mostrar el texto curvado en ambas
  direcciones sin hacerlo desaparecer ni recortarlo en ningun valor del rango.
- **FR-002**: El selector All/L1/L2/L3 MUST estar visible al abrir en
  TEXT/STYLES/ICON sin interaccion, y MUST ocultarse en BACKGROUND/DOWNLOAD.
- **FR-003**: Con Margin al maximo, el sistema MUST mostrar el texto reducido
  pero presente; MUST NOT dejar el lienzo vacio por colapso del area util.
- **FR-004**: El margen MUST calcularse contra el lado menor del canvas, de
  modo que un canvas apaisado no colapse antes de tiempo.
- **FR-005**: El texto pintado MUST entrar completo en el lienzo con cualquier
  combinacion de controles de layout: cero tinta en las filas y columnas del
  borde, con y sin rotacion.
- **FR-006**: El ajuste de tamano y todos los motores de dibujo MUST compartir
  una unica geometria de bloque, de modo que lo calculado sea lo pintado.
- **FR-007**: Con una sola linea, Line height MUST NOT alterar posicion ni
  tamano del texto en todo su rango.
- **FR-008**: Con varias lineas, Line height MUST separar cada linea respecto
  a la de arriba, manteniendo fija la primera.
- **FR-009**: El tab activo (All/L1/L2/L3) MUST indicar solo que se esta
  editando; todo lo configurado en cualquier target MUST aplicarse siempre.
- **FR-010**: Cada linea MUST resolver su estilo en tres pasos: heredar
  (de ALL u otra linea) -> mezclar sus ajustes propios -> dimensionar por su
  regla de tamano.
- **FR-011**: La regla de tamano de una linea MUST expresarse como porcentaje
  de su referencia resuelta (canvas u otra linea), en modo por tamano de
  fuente o por ancho; un tamano en pixeles escrito a mano MUST ganar sobre la
  regla.
- **FR-012**: Con el selector de tamano en referencia a otra linea, el control
  de tamano de fuente MUST reescribir el porcentaje (la cadena sigue viva);
  con referencia al canvas MUST escribir pixeles absolutos.
- **FR-013**: Los selectores de herencia y de referencia de tamano MUST
  ocultar, transitivamente, toda linea que cerraria un ciclo (directo o mixto
  herencia+tamano).
- **FR-014**: Un ciclo que llegue por archivo editado a mano MUST rechazarse
  con causa dejando la vista intacta; MUST NOT colgar ni pintar parcial.
- **FR-015**: Lo configurado para lineas inexistentes MUST conservarse y
  MUST reactivarse al reaparecer esas lineas; lo no definido MUST heredar de
  All.
- **FR-016**: Por linea MUST entrar todo ajuste de estilo y layout
  (tipografia, tamano, alineacion, espaciados, rotacion, curva, rellenos,
  contornos, sombras, relieves, brillos, letterings e icono); MUST quedar
  fuera unicamente Canvas Size, el contenedor del sistema de lineas y las
  rutas de descarga/procesado; el texto es global por definicion.
- **FR-017**: Cada linea MUST cargar y medir con su propia tipografia; un
  fallo MUST nombrar la linea y la fuente sin impedir el resto.
- **FR-018**: El desplegable de fuentes MUST mostrar la fuente del target
  activo (con L2, la de L2).
- **FR-019**: El formato de guardado usa lineas 1-based (`line["1"]`=L1).
- **FR-020**: El comportamiento MUST ser identico en el editor y en el motor
  del PDF, incluidas curvas, margenes, estilos por linea y encadenados de
  tamano.
- **FR-021**: `L1.lineHeight` se guarda pero MUST NOT mover nada (no tiene
  linea arriba).

### Key Entities

- **Linea (L1/L2/L3)**: cada fila del texto separada por salto de linea. Solo
  L1-L3 son direccionables; las demas usan la base. Atributos: indice
  estable, texto propio (del bloque global), estilo resuelto.
- **Target activo (All/L1/L2/L3)**: indica que se esta editando; no filtra lo
  que se aplica. Vive junto a la configuracion del sistema de lineas.
- **Herencia de linea**: de quien parte una linea (ALL u otra linea). Sin
  valor = ALL. No admite ciclos (ni directos ni mixtos con tamano).
- **Regla de tamano**: porcentaje (`pct`) sobre una referencia resuelta
  (`ref`: canvas u otra linea), en modo por tamano de fuente o por ancho.
  Un valor en pixeles la sustituye.
- **Override propio**: ajustes de la linea que difieren de lo heredado. Solo
  viaja la diferencia; lo ausente hereda.
- **Preset**: estilo guardado con lineas 1-based y solo lo que difiere de
  los valores por defecto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la curva al maximo en ambas direcciones, el 100% de los
  casos muestra texto curvado visible; cero desapariciones.
- **SC-002**: En el 100% de las aperturas, el selector de linea esta visible
  en TEXT sin tocar nada.
- **SC-003**: Con Margin al maximo, el 100% de los casos muestra texto
  presente; cero lienzos vacios.
- **SC-004**: Con textos largos y multilinea, cero pixeles de tinta en las
  filas y columnas del borde del lienzo, con y sin rotacion.
- **SC-005**: Con una sola linea, variar Line height en todo el rango produce
  cero desplazamiento de la caja del texto.
- **SC-006**: Tres lineas con fuente, color y tamano relativo propios se
  guardan, recargan y generan en PDF identicas al editor en el 100% de los
  casos.
- **SC-007**: Agrandar L1 con L2 al 80% mantiene el 80% exacto en el 100% de
  los casos (propagacion en cascada a L3 incluida).

## Assumptions

- El 001-fix-bugs-01 queda cerrado; este spec no lo reabre ni cambia
  identidad de fuentes ni el puente. Es entorno de desarrollo sin presets
  existentes: no hay migraciones ni retrocompatibilidad, todo el formato de
  lineas es nuevo.
- Character spacing, alineacion, Canvas Size, Zoom y Galeria de Fuentes andan
  bien y no se tocan.
- La verificacion de calidad combina pruebas automaticas (logica en Node +
  DOM/pixeles en Chrome con puente simulado) y comprobacion manual integrada
  en la pestana del plugin con Ctrl+F5, unico modo de probar el editor.
- El ajuste de la version de recarga de archivos del modulo es parte del
  trabajo de implementacion, no de esta especificacion.
- Rotacion y curva por linea van dentro de este feature pero ultimas, por
  exigir partir el pipeline en una capa por linea antes de apilarlas.
- Un preset guarda solo lo que difiere de los valores por defecto; el resto
  se toma de los valores por defecto al cargar.

## Out of Scope

- Pestanas STYLES, ICON, BACKGROUND y DOWNLOAD salvo lo que este spec les
  pida (barra visible en STYLES/ICON, paridad del PDF).
- Reorganizacion del catalogo, del puente o del motor de recursos del plugin.
- Exportacion a formatos distintos de PNG transparente y SVG.
- Animacion, pagos o niveles de calidad (la app es 100% libre).
- Texto o fuente compartidos por lineas parciales fuera de L1-L3.
