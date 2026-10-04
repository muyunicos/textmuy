# Feature Specification: Correccion de bugs de fuentes y presets del editor

**Feature Branch**: `001-fix-bugs-01`
**Created**: 2026-10-01
**Status**: Draft
**Input**: User description: "vamos a corregir muchos bugs en este spec! comenzamos con algunos: entro a https://muyunicos.com/wp-admin/admin.php?page=personalizador-pdf&tab=textos esta seleccionada la Font: MUY-Alegría pero se muestra 'TEXT' con una fuente parecida a Times.... toco cualquier control (zoom, font siza, etc,) la fuente que se ve cambia a 'Bangers' en Font sigue diciendo Font: MUY-Alegría voy a la galeria, elijo otras fuentes para ver como quedan. la fuente que se ve sigue siendo 'Bangers' ... toco Select y ahi recien se ve la fuente que seleccione"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la fuente seleccionada desde el primer instante (Priority: P1)

Abro la pestaña "Estilos de Texto" del plugin. El selector de fuentes declara una
fuente concreta y el texto dibujado en el lienzo se ve **con esa misma fuente**,
de inmediato, sin tocar ningún control. Muevo cualquier control (zoom, tamaño de
fuente, rotación) y el texto **sigue** con la fuente declarada. Nunca aparece una
tipografía distinta de la seleccionada: ni al abrir, ni después de interactuar,
ni con fuentes cuyo nombre contiene espacios o tildes.

**Why this priority**: Es el problema central del reporte y destruye la confianza
en todo el editor: el usuario no puede saber con qué fuente va a exportar. Sin
esto, las otras dos historias no tienen valor, porque se estaría previsualizando
o buscando fuentes sobre un lienzo que miente.

**Independent Test**: Abrir la pestaña, comparar la fuente del selector con el
texto del lienzo y repetir tras mover tres controles distintos. Se verifica sin
necesidad de implementar las historias 2 y 3.

**Acceptance Scenarios**:

1. **Given** un proyecto con una fuente física propia seleccionada y el editor
   recién abierto, **When** el lienzo termina de mostrarse por primera vez,
   **Then** el texto aparece con esa fuente y el selector la nombra.
2. **Given** el mismo proyecto, **When** el usuario mueve el zoom y luego el
   tamaño de fuente, **Then** el texto mantiene la misma tipografía en ambos
   repintados.
3. **Given** una fuente cuyo nombre incluye espacios, **When** se selecciona y
   se repinta el lienzo, **Then** el texto se dibuja con esa fuente y no con la
   última tipografía que hubiera quedado en el lienzo.
4. **Given** una fuente cuyo nombre incluye tildes o eñes, **When** se aplica un
   proyecto guardado que la referencia, **Then** se aplica con esa fuente, sin
   rechazos ni avisos de "fuente desconocida".
5. **Given** una fuente que no se puede cargar, **When** se selecciona, **Then** el
   editor informa el fallo de forma visible en lugar de dibujar en silencio con
   otra tipografía.

---

### User Story 4 - Un preset cargado se ve exactamente como se guardo (Priority: P1)

Armo un preset con un color de relleno, lo guardo, cambio el color y todo lo
demás de la vista actual, y vuelvo a cargar el preset. El texto vuelve **exactamente
como lo guardé**. Ningún ajuste que no pertenece al preset sobrevive de lo que
tenía puesto antes: si el preset no define un campo, ese campo vuelve a su valor
por defecto y no al valor que tenía la vista.

Lo mismo aplica a cualquier otro ajuste del preset: tipografía, tamaño, efectos,
capas de relleno, estilos por línea y opciones de guardado.

**Why this priority**: Un preset que no se restaura fielmente es peor que no
tener presets: el usuario cree que guardó un estilo y en realidad mezcla el
guardado con lo que tenía abierto. El usuario pierde trabajo sin enterarse, y el
resultado final del PDF no coincide con lo que veía al guardar. Comparte raíz con
la historia 1: ambas son ajustes que el editor aparenta tener pero no aplica.

**Independent Test**: Guardar un preset con un color de relleno conocido, cambiar
el color de la vista a otro valor, recargar el preset y comprobar que el color
vuelve al guardado. Repetir con tipografía, capas de relleno y estilos por línea.

**Acceptance Scenarios**:

1. **Given** un preset guardado con un color de relleno, **When** el usuario cambia
   el color en la vista y luego carga el preset, **Then** el texto se dibuja con el
   color guardado, no con el de la vista.
2. **Given** un preset guardado, **When** el usuario lo carga, **Then** todos los
   ajustes que el preset define se aplican, incluidas las capas de relleno, sus
   estilos, repeticiones y modos de mezcla.
3. **Given** un preset que no define un campo, **When** el usuario lo carga sobre
   una vista que sí tenía ese campo modificado, **Then** ese campo vuelve a su
   valor por defecto y no conserva el valor de la vista anterior.
4. **Given** un preset recién guardado, **When** el usuario lo carga de inmediato,
   **Then** la vista es idéntica a la que había al guardar, campo por campo.
5. **Given** un preset guardado con estilos distintos por línea, **When** el
   usuario lo carga, **Then** el destino de estilo activo vuelve al del preset y
   los estilos por línea se restauran completos.

---

### User Story 2 - Previsualizar fuentes en vivo desde la galeria (Priority: P2)

Abro la galería de fuentes y recorro los tiles para ver "cómo quedan". Cada
fuente que toco se aplica **de inmediato al lienzo**, sin pulsar nada más. Si
finalmente no me convence y cierro la galería sin confirmar, el lienzo vuelve
exactamente a la fuente que tenía antes de abrirla.

**Why this priority**: Elegir tipografía es la tarea central de la galería y hoy
obliga a un segundo clic ("Select") para ver siquiera el resultado. Sin
previsualización el usuario no puede evaluar una fuente sin aplicarla.

**Independent Test**: Abrir la galería, tocar tres fuentes distintas y observar el
lienzo; cerrar sin confirmar y comprobar que se restauró la fuente previa. No
depende de las historias 1 ni 3 para comprobarse.

**Acceptance Scenarios**:

1. **Given** la galería de fuentes abierta, **When** el usuario selecciona un
   tile, **Then** el lienzo muestra el texto con esa fuente sin pulsar "Select".
2. **Given** un tile con fuente física que aún no se descargó, **When** el
   usuario lo selecciona, **Then** el lienzo acaba mostrando esa fuente: la
   descarga ocurre en segundo plano y el lienzo se repinta al completarse.
3. **Given** una fuente previsualizada en el lienzo, **When** el usuario cierra
   la galería sin confirmar, **Then** el lienzo vuelve a la fuente anterior.
4. **Given** una fuente previsualizada, **When** el usuario confirma la selección,
   **Then** el selector de fuentes queda sincronizado con esa fuente y el lienzo
   no cambia.

### User Story 3 - Una unica identidad por fuente (Priority: P3)

Las fuentes del administrador se comportan igual entre sí, sin importar si son
subidas por el plugin, declaradas en el catálogo o restauradas desde un preset
guardado. No existen referencias ambiguas ni valores que queden "congelados" en
un estado viejo: si el proyecto declara una fuente, esa es la fuente en todas
las pantallas y durante toda la sesión.

**Why this priority**: Es la causa de fondo de la historia 1 y de parte de la 2.
Sin esto, los arreglos anteriores son parches que reaparecen.

**Independent Test**: Seleccionar una misma fuente por sus distintos caminos
(selector, galería, proyecto guardado) y comprobar que el resultado visible es
idéntico; comprobar además que, tras un fallo de carga, el estado global de
fuentes no queda alterado.

**Acceptance Scenarios**:

1. **Given** una fuente propia del administrador, **When** se elige desde el
   selector, desde la galería y desde un proyecto guardado, **Then** las tres vías
   producen exactamente la misma tipografía en el lienzo.
2. **Given** un proyecto guardado que referencia una fuente renombrada o dada de
   baja, **When** se abre el proyecto, **Then** el editor informa la causa en
   lugar de mostrar una tipografía distinta de la declarada.
3. **Given** un fallo transitorio al cargar una fuente, **When** se reintenta la
   misma fuente, **Then** el editor la carga correctamente: el fallo anterior no
   la deja marcada como resuelta.
4. **Given** el editor abierto durante toda la sesión, **When** se consulta el
   estado de "fuente por defecto" en cualquier momento, **Then** refleja la
   fuente vigente y no un valor capturado al inicio.

---
---

### User Story 5 - El render espera a TODO lo que necesita, en paralelo (Priority: P2)

Genero el mockup de un producto, o el admin mira la vista previa de un placeholder, y el
estilo usa tipografía **y** además fondos, texturas o logos. Hoy esas cosas se piden una
detrás de otra: primero todas las imágenes, y recién después la fuente. El render no
empieza hasta que la última termina, así que el tiempo total es la **suma** de los
tiempos.

Quiero que el render **declare lo que necesita y espere a todo junto**: la fuente y los
recursos empiezan a cargarse al mismo tiempo, y el dibujo ocurre cuando están todos
listos. El total pasa a ser el tiempo del recurso más lento, no la suma.

**Why this priority**: Es la misma idea que US1 aplicada al camino de salida. US1
corrige que se pinte con la fuente correcta; esta historia corrige que no se haga
esperando de más. Juntas, el render es correcto **y** predecible. Sin esto, corregir
US1 vuelve más lento el PDF, porque ahora la fuente se espera de verdad y se suma al
resto de la espera.

**Independent Test**: Con un preset que use fuente más tres imágenes, el tiempo total
del render no crece al sumar recursos: mide un preset de una sola imagen y uno de
cuatro con la misma fuente, y compara contra el tiempo de solo la fuente. No depende de
las historias 1 a 4 para comprobarse.

**Acceptance Scenarios**:

1. **Given** un preset que usa tipografía y varios recursos de imagen, **When** se
   renderiza, **Then** la fuente y las imágenes empiezan a cargarse al mismo tiempo y
   el render ocurre cuando todas están listas.
2. **Given** un preset que usa tipografía y varios recursos de imagen, **When** se
   renderiza, **Then** el tiempo total no es la suma de los tiempos de cada recurso.
3. **Given** que un recurso tarda mucho más que el resto, **When** se renderiza,
   **Then** el render espera a ese recurso y no a los demás por turnos.
4. **Given** que uno de los recursos no se puede obtener, **When** se renderiza,
   **Then** el render informa la causa de ese recurso concreto y no dibuja el resultado
   con sustituciones.
5. **Given** el editor abierto y un preset con tipografía e imágenes, **When** se
   muestra la vista previa, **Then** el comportamiento de espera es el mismo que en el
   render del PDF.

---

- **Resolución con el catálogo todavía pendiente**: el editor arranca antes de que el
  puente entregue el catálogo. Resolver en ese momento con un nombre visible es
  justamente lo que produjo la regresión (una identidad inventada que después se
  volvió ambigüedad). Debe esperar, no adivinar.
- **Una familia pedida por un import que el catálogo no trae**: no es un error, es una
  fuente nueva. Debe funcionar y quedar seleccionable, sin duplicar ninguna del
  catálogo.
- **El catálogo llega después de que una fuente ya se estaba usando**: la identidad
  real debe asumir el lugar de la provisional, sin dejar dos referencias vivas a la
  misma familia.
- **Recurso de imagen que falla mientras la fuente sí carga**: el error debe nombrar al
  recurso que falló, no a la fuente.
- **Preset sin recursos de imagen**: el render debe funcionar igual, sin esperar nada
  que no declaró.
- **Fuente con espacios, tildes o eñes en el nombre**: es el caso exacto de las

### Edge Cases

- **Fuente con espacios, tildes o eñes en el nombre**: es el caso exacto de las
  fuentes propias del administrador, como "MUY-Alegría" o "MUY-Señorita". Hoy
  rompen la resolución y quedan en una tipografía del sistema.
- **Dos fuentes con el mismo nombre visible y archivos distintos**: el
  administrador puede subir un archivo con un título repetido. Deben distinguirse
  por su identidad de recurso, no por su nombre visible.
- **Selección de fuente con la galería abierta**: el usuario puede tocar controles
  del lienzo mientras la galería está abierta; la previsualización no debe dejar
  el lienzo en un estado intermedio.
- **Previsualización con la red lenta o caída**: la fuente elegida se sigue
  mostrando con la tipografía anterior y un aviso visible; nunca con una
  tipografía arbitraria.
- **Cierre de la galería mientras la fuente sigue descargándose**: la descarga
  tardía no debe repintar el lienzo con una fuente que el usuario ya descartó.
- **Reapertura repetida de la galería**: no debe acumular fuentes descargadas ni
  dejar vistas residuales de sesiones anteriores.
- **Apertura con un proyecto que referencia una fuente inexistente**:
  comportamiento fail-fast con causa visible, coherente con la política del
  proyecto ante dependencias ausentes.
- **Tipografía del sistema con el mismo nombre que una fuente del catálogo**: la
  fuente del catálogo debe tener prioridad sobre la del sistema.
- **Preset guardado con un ajuste y cargado sobre una vista que tiene otro**: el
  ajuste del preset manda y no se mezclan los dos valores.
- **Preset que solo define una parte de los estilos**: el resto vuelve a los
  valores por defecto, no a los de la vista.
- **Carga de un preset repetida varias veces seguidas**: cargar el mismo preset dos
  veces debe dar el mismo resultado, sin acumulación de capas ni de estilos.
- **Carga de un preset sobre otro ya cargado**: el segundo reemplazo por completo al
  primero, sin residuos del anterior.
- **Deshacer y rehacer después de cargar un preset**: el usuario debe poder volver
  al estado previo y recuperar el preset completo.
- **Preset guardado con estilos por línea y luego cargado con un destino de línea
  distinto activo**: el destino activo se ajusta al del preset, no al que quedara
  seleccionado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST dibujar el texto del lienzo con la misma fuente que
  declara el estado del proyecto, sin excepciones ni sustituciones.
- **FR-002**: El sistema MUST garantizar que la fuente declarada esté disponible
  para el dibujo **antes** del primer repintado visible, y MUST repintar el lienzo
  cuando la fuente termine de estar disponible.
- **FR-003**: El sistema MUST identificar de forma unívoca cada fuente por su
  identidad de recurso del catálogo, con independencia de su nombre visible, su
  formato de archivo o el camino por el que se haya elegido.
- **FR-004**: El sistema MUST aceptar como referencia válida de una fuente su
  nombre completo, incluidos espacios, tildes, eñes y signos, y también su
  identificador numérico de catálogo.
- **FR-005**: Ante una fuente ausente, inválida o que falla al cargar, el sistema
  MUST informarlo de forma visible y accionable, y MUST NOT dibujar el texto con
  una tipografía distinta de la declarada.
- **FR-006**: Ante un fallo de carga, el sistema MUST permitir reintentar la misma
  fuente y MUST NOT registrar el fallo como si la fuente estuviera resuelta.
- **FR-007**: La galería de fuentes MUST aplicar al lienzo la fuente seleccionada
  de forma inmediata, sin requerir una confirmación adicional.
- **FR-008**: La galería de fuentes MUST restaurar el estado previo del lienzo al
  cerrarse sin confirmación, incluidos los casos en que la descarga de la fuente
  sigue en curso al cerrar.
- **FR-009**: La confirmación en la galería de fuentes MUST dejar el selector de
  fuentes y el estado del proyecto sincronizados con la fuente elegida.
- **FR-010**: El selector de fuentes y el estado del proyecto MUST permanecer
  sincronizados en todo momento, incluidos la apertura del editor, la carga de un
  proyecto guardado y las acciones de deshacer y rehacer.
- **FR-011**: El sistema MUST NOT mantener valores de fuente por defecto capturados
  en un momento anterior de la sesión; el valor vigente debe consultarse siempre
  que se necesite.
- **FR-012**: El sistema MUST NOT sustituir una fuente por otra ante un fallo en
  ningún punto de la cadena: ni al resolver la fuente, ni al cargarla, ni al medir
  el texto, ni al pintarlo.
- **FR-013**: Cuando la fuente declarada no esté disponible, el usuario MUST poder
  distinguir en el propio editor que el texto mostrado no corresponde a la fuente
  declarada.
- **FR-014**: El comportamiento corregido MUST ser idéntico en la vista del editor
  y en el motor de renderizado que el plugin emplea para generar los textos de los
  PDF.
- **FR-015**: Al cargar un preset, el sistema MUST aplicar la definición completa
  del preset, sin excluir ningún ajuste que el preset declare, incluidas las capas
  de relleno con sus estilos, repeticiones y modos de mezcla, y los estilos por
  línea.
- **FR-016**: Al cargar un preset, el sistema MUST partir de un estado limpio de
  valores por defecto en lugar de escribir sobre el estado de la vista en curso, de
  modo que ningún campo ausente del preset sobreviva de la vista anterior.
- **FR-017**: Un preset recién guardado y recargado de inmediato MUST producir una
  vista idéntica a la del momento de guardar, campo por campo.
- **FR-018**: El sistema MUST NOT mezclar el contenido de un preset con el de la
  vista en la que se carga; la vista resultante MUST depender únicamente del preset
  y de los valores por defecto.
- **FR-019**: El formato de almacenamiento de presets MUST permanecer compatible
  con los archivos ya guardados: cargar un preset existente MUST seguir funcionando
  sin necesidad de regenerarlo.
- **FR-020**: El comportamiento de carga de presets MUST ser idéntico en la vista
  del editor y en el motor de renderizado, incluidos los presets importados desde
  TextStudio.
- **FR-020**: El comportamiento de carga de presets MUST ser idéntico en la vista
  del editor y en el motor de renderizado, incluidos los presets importados desde
  TextStudio.

### Requisitos de resolución de identidad (contrato de fuentes)

Estos requisitos formalizan el contrato que la implementación de RC39 incumplió. La
regresión documentada en `checklists/requirements.md` bornó de aquí.

- **FR-021**: El catálogo de fuentes MUST ser la única fuente de verdad de la
  identidad de una fuente. El registro interno MUST NOT generar identidades para
  fuentes que el catálogo ya provee.
- **FR-022**: Al resolver una referencia por nombre visible, si el catálogo tiene
  coincidencias, el sistema MUST usar **solo** las del catálogo. Las entradas del
  registro interno se consultan únicamente cuando el catálogo no tiene ninguna.
- **FR-023**: El sistema MUST NOT crear una identidad para una fuente antes de que
  el catálogo esté disponible. Con el catálogo pendiente, la resolución MUST esperar.
- **FR-024**: Cuando el catálogo pase a prover una familia que tenía una identidad
  creada por el registro, esa identidad MUST descartarse para que no queden dos
  referencias a la misma fuente.
- **FR-025**: El aviso de "el lienzo rechazó la fuente" MUST distinguir un rechazo
  real del navegador de una diferencia de formato en la lectura del valor. El sistema
  MUST NOT informar como error un valor que el navegador aceptó.

### Requisitos del render (US5)

- **FR-026**: El render MUST declarar sus dependencias —tipografía y recursos de
  imagen— e iniciarlas de forma concurrente, no encadenarlas.
- **FR-027**: El render MUST comenzar a dibujar solo cuando todas las dependencias
  declaradas estén resueltas.
- **FR-028**: Si una dependencia no puede obtenerse, el render MUST informar la causa
  de esa dependencia concreta y MUST NOT producir un resultado con sustituciones.
- **FR-029**: El editor y el motor de render MUST usar el mismo mecanismo de espera
  de dependencias, de modo que la vista previa y el PDF produced el mismo resultado.
- **FR-030**: El render MUST NOT descargar tipografías que el estilo no declara, ni
  recursos de imagen que el estilo no usa.

### Requisitos de sincronía de la identidad en la interfaz

Añadidos tras el reporte del administrador: el desplegable mostraba una fuente
distinta de la del proyecto al abrir, y el preview de la galería no aplicaba nada.
Ambos son incumplimientos de FR-010.

- **FR-031**: El desplegable de fuentes MUST resolverse contra la identidad que el
  proyecto declara. Si el proyecto guarda una referencia antigua por nombre visible,
  el sistema MUST resolverla a su identidad antes de buscar la opción, para que el
  selector MUST NOT quedar sin selección válida.
- **FR-032**: El estado por defecto del editor MUST usar la forma canónica de
  identidad, de modo que el desplegable MUST NOT requerir una migración aparte para
  mostrar la fuente inicial.
- **FR-033**: Cuando el desplegable no pueda representar la fuente declarada —porque
  el catálogo aún no llegó o la fuente no existe—, el sistema MUST NOT dejar que el
  navegador muestre una entrada arbitraria como si fuera la fuente elegida: la
  ausencia MUST ser visible o el desplegable MUST quedar vacío.
- **FR-034**: La previsualización de la galería de fuentes MUST resolver la
  identidad de la fuente explorada con el mismo criterio que el resto del módulo, con
  independencia del campo que use internamente cada tipo de entrada de la galería.
  Una previsualización que no puede resolver MUST NOT aplicarse en silencio.

### Key Entities

- **Fuente**: tipografía disponible para el administrador. Atributos: identidad de
  recurso (única e inmutable), nombre visible (puede contener espacios y acentos),
  categoría, origen (propia del administrador o de catálogo público) y
  disponibilidad actual.
- **Estado de fuente del proyecto**: la fuente declarada por el proyecto en
  edición. Referencia a una Fuente por su identidad de recurso; es la única fuente
  de verdad de la tipografía del texto.
- **Previsualización temporal**: aplicación transitoria de una fuente al lienzo
  durante la exploración de la galería, reversible y con reversión obligatoria al
  cerrar.
- **Carga de fuente**: proceso de poner a disposición una fuente para el dibujo,
  con estado distinguible entre pendiente, disponible y fallida, donde el estado
  fallida no impide un reintento.
- **Preset**: estilo guardado por el usuario. Contiene únicamente los ajustes que
  difieren de los valores por defecto; al aplicarse, reemplaza la vista completa en
  lugar de mezclarse con ella.
- **Vista en edición**: el conjunto completo de ajustes que el usuario está
  modificando. Al cargar un preset pasa a reflejar el preset y los valores por
  defecto, sin conservar nada de la vista anterior.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de las verificaciones, el texto del lienzo y el nombre del
  selector coinciden, sin que el usuario necesite tocar ningún control para que
  lo hagan.
- **SC-002**: En el 100% de las fuentes propias del administrador, incluidas las de
  nombre acentuado, seleccionar la fuente produce esa tipografía en el lienzo
  dentro de los 3 segundos, con o sin conexión rápida.
- **SC-003**: En el 100% de las fuentes cuyo nombre contiene espacios, el texto se
  dibuja con esa fuente y nunca con una tipografía residual de una selección
  anterior.
- **SC-004**: El usuario puede evaluar una fuente en la galería con un solo clic
  por fuente, sin pulsar un botón de confirmación para verla aplicada.
- **SC-005**: El 100% de los cierres de galería sin confirmación devuelven el
  lienzo al estado previo, sin excepciones por descargas en curso.
- **SC-006**: Cero casos en los que el texto se pinte con una tipografía distinta de
  la declarada; cualquier indisponibilidad se comunica de forma visible.
- **SC-007**: El 100% de las fuentes quedan referenciadas por una única identidad
  de recurso, con independencia del camino de selección.
- **SC-008**: Un fallo de carga seguido de un reintento resuelve correctamente en
  el 100% de los casos verificados.
- **SC-009**: Un preset guardado y recargado de inmediato reproduce la vista
  original con el 100% de los ajustes coincidentes, verificado campo por campo.
- **SC-010**: Al cargar un preset sobre una vista modificada, el 100% de los
  ajustes ausentes del preset vuelven a su valor por defecto; cero ajustes
  sobreviven de la vista anterior.
- **SC-011**: El 100% de los presets existentes en el servidor siguen cargando
  correctamente después de la corrección, sin necesidad de volver a guardarlos.
- **SC-011**: El 100% de los presets existentes en el servidor siguen cargando
  correctamente después de la corrección, sin necesidad de volver a guardarlos.
- **SC-012**: Con el catálogo disponible, el 100% de las fuentes del catálogo se
  resuelven a su identidad de catálogo, sin ambigüedad y sin aparecer duplicadas en el
  selector.
- **SC-013**: Con el catálogo aún no disponible, el sistema no crea identidades
  provisionales: cero fuentes aparecen como ambiguas una vez que el catálogo llega.
- **SC-014**: El editor no emite avisos de "fuente rechazada" cuando el navegador aceptó
  el valor. Cero avisos falsos positivos por pintado.
- **SC-015**: El tiempo total de un render con tipografía y N recursos de imagen no
  crece de forma acumulativa con N: duplicar los recursos no duplica el tiempo total
  (medido sobre el mismo preset con una y con cuatro imágenes).
- **SC-016**: Al abrir el editor, el desplegable muestra la fuente que el proyecto
  declara, no una entrada arbitraria. Cero casos en los que el desplegable y el
  texto del lienzo muestren fuentes distintas.
- **SC-017**: Tocar cualquier fuente en la galería la aplica al lienzo en el 100% de
  los casos, tanto si es del catálogo como si fue subida en la sesión. Cero
  previsualizaciones que no apliquen nada.

## Assumptions

- El catálogo de fuentes del administrador es la única fuente de verdad de las
  tipografías disponibles; el módulo solo lo lee.
- Las tipografías se cargan bajo demanda desde los archivos del plugin; el módulo
  no distribuye fuentes propias.
- La corrección aplica tanto a la vista del editor como al motor de renderizado que
  el plugin usa para generar los textos de los PDF, ya que ambos comparten la
  lógica de fuentes.
- La previsualización en vivo y el botón de confirmación conviven: la
  previsualización es reversible y la confirmación consolida la elección.
- El proyecto mantiene su política de firmeza: lo que falla se informa, nunca se
  sustituye en silencio. No se relaja esa regla para mejorar la experiencia.
- La verificación de calidad se apoya en pruebas automáticas de la lógica y en la
  comprobación manual integrada en la pestaña del plugin, ya que el editor no
  tiene modo independiente.
- El ajuste de la versión de recarga de archivos del módulo es parte del trabajo
  de implementación, no de esta especificación.
- Las 15 fuentes físicas propias del administrador (las de prefijo MUY) son el
  caso de prueba principal, por incluir tildes y eñes en el nombre.
- Los presets ya guardados en el servidor se consideran correctos: el defecto está
  en la lectura y no en la escritura, por lo que no se requiere migrar ni regenerar
  ningún archivo existente.
- Un preset guarda solo lo que difiere de los valores por defecto; el resto de los
  ajustes se toma de los valores por defecto al cargar, y no de la vista en curso.

## Out of Scope

- Reorganización del catálogo, del puente de comunicación o del motor de recursos
  del plugin.
- Reestructuración de la galería de imágenes y de la galería de presets.
- Exportación a formatos distintos de los ya soportados.
- Cualquier funcionalidad de animación, pago o nivel de calidad.
- Migración o regeneración de los presets ya guardados: no hace falta, porque el
  contenido de los archivos es correcto y el defecto está en cómo se leen.
- Cambio del formato de almacenamiento de presets o de la estructura de sus
  archivos.

