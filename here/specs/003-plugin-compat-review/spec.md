# Feature Specification: plugin-compat-review

**Feature Branch**: `main`

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "revisemos la compatibilidad y funcionalidad con el plugin C:\Users\Jonatan\Documents\GitHub\personalizador-pdf"

## Clarifications

### Session 2026-09-14

- Q: ¿Dónde deben quedar registrados los entregables de la revisión (matriz de compatibilidad y hallazgos)? → A: Ambos: matriz + hallazgos como artefacto de esta spec (carpeta del feature) y las correcciones documentales aplicadas a la documentación vigente del contrato.
- Q: ¿La revisión incluye la verificación del rendimiento del render? → A: No; fuera de alcance: solo compatibilidad y funcionalidad, sin criterios de tiempo.
- Q: ¿Qué umbral define que un hallazgo menor o documental se corrige dentro de esta revisión? → A: Solo si el cambio es contenido: un archivo, sin tocar el contrato ni la interfaz; el resto se registra.
- Q: ¿Qué cobertura de navegadores debe cumplir la verificación manual del circuito y la paridad? → A: Solo el navegador principal de desarrollo (escritorio).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Circuito completo plugin ↔ módulo verificado de punta a punta (Priority: P1)

El administrador abre la pestaña "Estilos de Texto" del plugin: el editor de estilos carga dentro del plugin, recibe las ubicaciones de recursos y credenciales del sistema, muestra sus galerías (tipografías, imágenes, estilos guardados) con el contenido real del administrador, permite guardar un estilo nuevo, asignarlo a un grupo de texto del PDF y procesar el documento obteniendo la imagen con el estilo elegido. La revisión debe confirmar que este circuito central funciona sin errores en un solo intento, y que cada punto de contacto entre el plugin y el módulo (entrega inicial de configuración, listados, lectura de recursos, operaciones de guardado/borrado) se comporta exactamente como el contrato vigente describe.

**Why this priority**: es el circuito que da valor al sistema completo; si falla cualquier eslabón, no hay personalización de PDFs.

**Independent Test**: recorrer el circuito completo (abrir pestaña → verificar galerías → guardar estilo → aplicar a un grupo → procesar PDF) y confirmar que cada paso produce el resultado esperado sin errores ni avisos de desactualización.

**Acceptance Scenarios**:

1. **Given** el plugin instalado con el módulo importado, **When** el administrador abre la pestaña "Estilos de Texto", **Then** el editor carga operativo (sin estado de error), recibe la configuración del sistema en los tres momentos acordados y las galerías listan exactamente los recursos existentes con sus miniaturas.
2. **Given** un estilo guardado en la biblioteca, **When** el administrador lo asigna a un grupo de texto y procesa el PDF, **Then** el grupo se renderiza con ese estilo y sus recursos, del tamaño definido por el propio estilo.
3. **Given** cualquier operación del editor sobre recursos (subir tipografía, subir imagen, guardar/borrar/renombrar estilo, regenerar miniatura), **When** se ejecuta, **Then** la operación pasa por el único punto de escritura acordado con credencial válida, persiste tras recargar y los catálogos e inventarios quedan coherentes con los archivos existentes.
4. **Given** un recurso cuyo dato físico falta o cuyo elemento del inventario está vacío, **When** se abre la galería o se lanza un render que lo usa, **Then** la galería lo salta con aviso visible y el render lo rechaza indicando ámbito, identificador y motivo (nunca una sustitución silenciosa).

---

### User Story 2 - Paridad entre el editor y el render que consume el PDF (Priority: P2)

Lo que el administrador ve en el editor debe ser exactamente lo que aparece en el PDF procesado. La revisión verifica que el render sin interfaz (el que consume el plugin al procesar grupos) produzca el mismo resultado visual que el editor para el mismo estilo y texto, respetando el contrato público de render: salida del tamaño exacto definido por el estilo, carga garantizada de la tipografía antes de dibujar, rechazo ante el primer fallo con causa y nunca lotes parciales.

**Why this priority**: la confianza del administrador depende de que "lo que veo es lo que obtengo"; la API de render es el fin último del módulo.

**Independent Test**: con un mismo estilo y texto, comparar el resultado del editor con el de un procesamiento de grupo del PDF (y/o un lote de la API de render): mismas dimensiones, mismos efectos, mismos recursos; y verificar que un lote con un elemento inválido falla completo con causa, sin entregar resultados parciales.

**Acceptance Scenarios**:

1. **Given** un estilo con efectos (relleno, contorno, sombras, relieve, distorsión, icono, fondo), **When** se renderiza el mismo texto desde el editor y desde el motor sin interfaz, **Then** ambos resultados son visualmente equivalentes y tienen las mismas dimensiones.
2. **Given** un lote de varios textos con estilos válidos y uno inválido, **When** se procesa el lote, **Then** se rechaza ante el primer fallo indicando causa y no se entrega ningún resultado parcial.
3. **Given** un estilo cuya tipografía aún no está cargada, **When** se lanza el render, **Then** el sistema espera a que la tipografía esté lista (o falla con causa si no puede cargarse) y nunca dibuja con una tipografía sustituta del sistema.

---

### User Story 3 - Compatibilidad de versiones, despliegue y documentación (Priority: P3)

El módulo vive integrado en el plugin y se actualiza copiándolo a su carpeta. La revisión confirma que la versión del módulo y la del plugin están sincronizadas: el versionado de estáticos coincide entre el editor y el motor sin interfaz, el plugin detecta y avisa correctamente cuando hay un módulo viejo en caché, la importación/actualización del módulo sigue las instrucciones vigentes sin encontrar archivos inexistentes, y la documentación del contrato (guías del plugin y del módulo) describe lo que el sistema realmente hace, sin contradicciones.

**Why this priority**: los desajustes de versión y la documentación contradictoria son la fuente más común de falsas "averías" (avisos de caché desactualizada, pasos de despliegue que fallan), pero no bloquean el circuito central.

**Independent Test**: actualizar el módulo siguiendo la guía del plugin paso a paso en un entorno limpio, forzar una recarga con módulo viejo en caché, y contrastar cada afirmación del contrato documentado contra el comportamiento real: 0 archivos inexistentes, 0 contradicciones.

**Acceptance Scenarios**:

1. **Given** un cambio en cualquier archivo del módulo, **When** se despliega, **Then** el número de versión de estáticos está actualizado y es idéntico en el editor y en el motor sin interfaz.
2. **Given** un navegador con el módulo anterior en caché, **When** se abre la pestaña "Estilos de Texto", **Then** el plugin detecta la desactualización y muestra un aviso claro con la acción de recuperación.
3. **Given** la documentación vigente del contrato (guías del plugin, contexto del módulo, ficha del módulo integrado), **When** se contrasta contra el comportamiento real del sistema, **Then** no hay contradicciones ni referencias a mecanismos superados.

---

### User Story 4 - Comportamiento degradado controlado y errores con causa (Priority: P3)

El sistema integrado debe fallar de forma predecible y accionable en los escenarios límite documentados: sin conexión de configuración el editor muestra un estado de error claro y no opera (cero lecturas a rutas locales propias, cero guardados); sin aceleración gráfica el render de la API falla con causa en lugar de degradar silenciosamente; sin internet las tipografías remotas caen a su comportamiento documentado; y toda operación fallida reporta operación, ámbito y causa.

**Why this priority**: garantiza diagnosticabilidad y evita estados corruptos, pero es complementario al circuito central.

**Independent Test**: provocar cada escenario límite (abrir el editor sin conexión de configuración, desactivar aceleración gráfica y renderizar vía API, cortar internet) y verificar que cada uno produce el comportamiento documentado, con mensaje accionable y sin efectos parciales.

**Acceptance Scenarios**:

1. **Given** el editor abierto sin la conexión de configuración del sistema, **When** se muestra la interfaz, **Then** aparece un estado de error claro y accionable y el módulo no realiza ninguna lectura a sus rutas locales ni operación de guardado.
2. **Given** un entorno sin aceleración gráfica, **When** se lanza un render por la API que la requiere, **Then** el render falla con causa explícita (sin degradación silenciosa ni resultado incorrecto).
3. **Given** una operación fallida en cualquier ámbito, **When** se reporta, **Then** el mensaje identifica operación, ámbito y causa, permitiendo actuar sin inspección técnica.

---

### Edge Cases

- ¿Qué pasa cuando el administrador abre el editor desde un archivo local sin servidor? Debe verse el estado de error del módulo, nunca un editor a medias con datos falsos.
- ¿Qué pasa con estilos guardados que referencian recursos por texto en vez de por identificador? Deben rechazarse con la causa "re-guardar el preset" documentada, sin migración bajo demanda.
- ¿Qué pasa cuando el inventario tiene huecos (recursos dados de baja)? Las galerías los saltan sin romper la numeración de miniaturas y los identificadores de altas reutilizan el hueco más bajo.
- ¿Qué pasa cuando el texto del grupo está vacío, tiene más líneas de las soportadas o el tamaño de salida definido por el estilo es extremo? El render debe fallar o ajustarse según las reglas vigentes, siempre con causa si falla.
- ¿Qué pasa cuando dos operaciones concurrentes tocan el mismo ámbito (por ejemplo, dos pestañas del editor)? El inventario resultante debe quedar coherente y sin duplicados.
- ¿Qué pasa si el catálogo de un ámbito no existe o está corrupto? Debe reportarse con causa y no inventarse contenido.

## Requirements *(mandatory)*

### Functional Requirements

**Alcance de la revisión (qué se verifica)**

- **FR-001**: La revisión MUST cubrir todos los puntos de contacto documentados entre plugin y módulo: entrega de la configuración del sistema (tres momentos), bases de lectura de recursos, credenciales y punto único de escritura, inventarios y hojas de miniaturas por ámbito, y aviso de módulo desactualizado.
- **FR-002**: La revisión MUST cubrir el contrato público de render: tamaño exacto definido por el estilo, carga garantizada de tipografía, rechazo ante el primer fallo con causa y ausencia de lotes parciales.
- **FR-003**: La revisión MUST verificar la paridad visual y funcional entre el editor y el motor sin interfaz para un conjunto representativo de estilos que incluya: relleno simple y con imagen, contorno, sombras, relieve, distorsiones, icono, fondo y estilos por línea (All/L1/L2/L3).
- **FR-004**: La revisión MUST verificar los comportamientos degradados documentados (sin configuración, sin aceleración gráfica en la ruta de API, sin internet) y que en cada uno el sistema falla o se abstiene según lo pactado, sin datos falsos ni degradaciones silenciosas.
- **FR-005**: La revisión MUST contrastar la documentación vigente del contrato (guías del plugin, contexto del módulo, ficha del módulo integrado) contra el comportamiento real, registrando cada contradicción como hallazgo.

**Resultado de la revisión (qué se entrega)**

- **FR-006**: Cada punto de contrato verificado MUST quedar registrado como PASS o FAIL, con evidencia del comportamiento observado; no se acepta un punto "sin verificar" al cierre, salvo que dependa de datos del administrador no disponibles (registrado como condicionado).
- **FR-007**: Cada incompatibilidad o mal funcionamiento detectado MUST registrarse como hallazgo con: punto de contrato afectado, severidad (bloqueante del circuito central / menor / documental) y descripción del comportamiento esperado vs observado.
- **FR-008**: Los hallazgos bloqueantes del circuito central (circuito de la historia P1) MUST corregirse dentro de esta revisión, respetando el contrato vigente y sin introducir funciones nuevas.
- **FR-009**: Los hallazgos menores y documentales se corrigen dentro de esta revisión solo si el cambio es contenido (un solo archivo del módulo o del plugin, sin alterar el contrato vigente ni la interfaz); en caso contrario MUST quedar registrados con su severidad para decidirse fuera de esta revisión.
- **FR-010**: Al cierre, las verificaciones automáticas del proyecto (suites de prueba del módulo y comprobaciones del plugin) MUST pasar en verde; los resultados condicionados a datos del administrador quedan anotados como tales.
- **FR-013**: La matriz de compatibilidad y el registro de hallazgos MUST publicarse como artefacto de esta revisión (en la carpeta del feature), y toda corrección documental derivada MUST aplicarse además a la documentación vigente del contrato, dejando la documentación sin contradicciones.

**Restricciones (cómo NO se cambia el sistema)**

- **FR-011**: Ninguna corrección derivada de la revisión MAY alterar el contrato vigente entre plugin y módulo (formato de configuración, formato de estilos guardados, punto único de escritura, bases de lectura); si la revisión revela que el contrato debe cambiar, se registra como hallazgo para una revisión de contrato, no se cambia de facto.
- **FR-012**: La revisión MAY NOT introducir funciones nuevas del editor, modos de uso fuera del plugin ni persistencia local de recursos.

### Key Entities *(include if feature involves data)*

- **Punto de contrato**: cada compromiso verificable entre plugin y módulo (entrega de configuración, bases de lectura, escritura única con credencial, inventarios, formato de estilos guardados, contrato de render, aviso de versión). Tiene identificador, descripción y estado de verificación (PASS / FAIL / condicionado).
- **Hallazgo**: incompatibilidad o mal funcionamiento detectado; referencia al punto de contrato, severidad, comportamiento esperado vs observado, y resolución (corregido en esta revisión / registrado para después).
- **Verificación de paridad**: comparación del mismo texto + estilo renderizado por el editor y por el motor sin interfaz; registra dimensiones y equivalencia visual.
- **Matriz de compatibilidad**: conjunto ordenado de puntos de contrato y su estado; es el entregable central de la revisión.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los puntos de contrato identificados en la matriz de compatibilidad queda con estado PASS, FAIL corregido o condicionado (con su dependencia anotada); 0 puntos sin evaluar al cierre.
- **SC-002**: El circuito completo (abrir pestaña → galerías correctas → guardar estilo → aplicar a grupo → procesar PDF) se completa sin errores en el 100% de las ejecuciones de prueba manuales de esta revisión.
- **SC-003**: En todas las verificaciones de paridad, el resultado del motor sin interfaz coincide con el del editor en dimensiones (100%) y en equivalencia visual (100% de los casos del conjunto representativo).
- **SC-004**: 0 lotes de render entregan resultados parciales: ante un elemento inválido, el 100% de los lotes falla completo con causa que identifica ámbito, identificador y motivo.
- **SC-005**: 100% de los escenarios degradados provocados producen el comportamiento documentado (estado de error sin operación local, fallo con causa, comportamiento de tipografías remoto) con 0 degradaciones silenciosas detectadas.
- **SC-006**: 0 contradicciones entre la documentación vigente del contrato y el comportamiento real; cada contradicción detectada durante la revisión queda corregida o registrada como hallazgo documental.
- **SC-007**: El 100% de las verificaciones automáticas del proyecto (suites de prueba del módulo y comprobaciones del plugin) pasa en verde al cierre; las condicionadas a datos del administrador quedan anotadas como tales, no como fallos.
- **SC-008**: Todo hallazgo no corregido al cierre queda registrado con severidad y punto de contrato afectado (100% de hallazgos clasificados), de modo que ninguna incompatibilidad conocida quede sin documentar.

## Assumptions

- Se asume que la revisión opera sobre el contrato vigente documentado (entrega de configuración en tres momentos, punto único de escritura con credencial, inventarios por ámbito, formato de estilos guardados como delta referenciando recursos por identificador, contrato de render con rechazo ante el primer fallo): verificar ese contrato, no redefinirlo.
- La spec previa de alineación del motor (2026-09-14) ya resolvió la deuda de claves y rutas heredadas; esta revisión parte de ese estado y su foco es la verificación integral de compatibilidad y funcionalidad, no repetir esa corrección.
- El entorno de prueba es el de desarrollo local del plugin (pestaña "Estilos de Texto" y procesamiento de un PDF de muestra del administrador); no se requiere validar en un despliegue de producción. La cobertura de navegadores de las verificaciones manuales es el navegador principal de desarrollo en escritorio; otras combinaciones quedan fuera de alcance.
- Algunas verificaciones (procesar un PDF real, PDF de muestra, recursos existentes del administrador) dependen de datos locales disponibles; si no lo están, quedan registradas como condicionadas y no bloquean el cierre.
- Correcciones de hallazgos bloqueantes se hacen dentro del marco vigente del proyecto: sin persistencia local de recursos, sin modo de uso fuera del plugin, sin migraciones bajo demanda de formatos superados.
- **Fuera de alcance**: funciones nuevas del editor o del plugin, cambios del formato de estilos guardados o del contrato de configuración, rediseños de interfaz, compatibilidad con versiones históricas del módulo o del plugin anteriores al estado vigente, y la medición o verificación de rendimiento del render (tiempos, presupuestos): la revisión cubre solo compatibilidad y funcionalidad.