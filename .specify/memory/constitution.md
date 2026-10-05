# TextMuy Constitution

## Core Principles

### I. Editor de Estilos de Textos Pequenos

TextMuy es un editor web de textos pequenos con efectos (tipografia,
colores, fondos bitmap, sombras, 3D, composiciones con imagenes) cuyo
fin es recrear estilos de marcas y cultura pop. El editor trabaja
sobre un lienzo donde se define como se comporta el texto, con hasta
4 lineas que pueden tener estilo propio (All/L1/L2/L3). El editor es
el MEDIO para producir presets; el FIN es la API de render. El editor
NO existe fuera del plugin: sin el puente el editor MUST NOT operar
(estado de error claro y visible; ver III).

### II. API de Render (NON-NEGOTIABLE)

La API es la parte principal y de uso principal: dado un estilo +
texto (+ tamano y caracteristicas), devuelve el archivo final con el
texto acomodado a ese espacio con su estilo completo (colores,
imagenes, fondos, texturas, sombras). `TextMuyAPI.renderBatch(items,
{onProgress}) -> [{id, blob}]` con items `{id, text,
preset|settings, width, height, overrides?}` MUST rechazar ante el
primer fallo con causa (ambito:id:recurso ausente o invalido) y MUST
NOT devolver lotes parciales ni sustituciones silenciosas. La salida
MUST ser del tamano exacto de `settings.canvas.width/height` (unica
fuente de verdad). `render-core.html` MUST exponer el motor headless
off-screen en paridad con el editor. WebGL se ASUME disponible; sin
WebGL la API MUST fallar en vez de degradar (sin fallback).

### III. Integrado WordPress UNICO (sin standalone) — NON-NEGOTIABLE

TextMuy opera SOLO integrado al plugin via iframe same-origin + puente
postMessage. El plugin envia el puente en los 3 momentos (load del
iframe, aviso `textmuy-ready` y envio inmediato):

```
{type:'textmuy-bridge', bridge:{urls:{motor, miniaturas, presetsBase,
fuentesBase, imagenesBase}, nonces:{motor}, presets, imagenes, fuentes}}
```

**Handshake con acuse**: al aplicar el puente, el modulo MUST acusar
recibo al padre con `{type:'textmuy-bridge-ok'}` (mismo origen). El
padre MUST esperar ese acuse antes de invocar `renderBatch`. El
`postMessage` del puente se entrega como TAREA mientras que el
`.then()` de la promesa de carga del iframe corre como MICROTAREA: sin
esa espera el primer render arranca con `bridge=null` y rechaza con
`presets:sin_puente` (solo el segundo intento funciona). Excepciones
declaradas: sin puente configurado no se espera acuse, y un modulo
viejo en cache que no acuse MUST NOT dejar la promesa colgada (el padre
resuelve con un tiempo de espera acotado).

`urls.motor` es el endpoint UNICO del motor de recursos del plugin
(`admin-post.php?action=pmu_uploads`). El puente es REQUISITO de
funcionamiento: sin el, el editor MUST mostrar un estado de error
claro y accionable y MUST NOT operar. PROHIBIDOS: fetches a rutas
relativas del modulo (`presets/`, `fonts/`, `img/`), data-URL como
modo de guardado y cualquier fallback client-side (ver VII).

El modulo es CONSUMIDOR del storage: no define rutas, no escribe
catalogos ni archivos. La lectura MUST resolverse via las bases del
puente (`urls.presetsBase`, `urls.fuentesBase`, `urls.imagenesBase`) y
hardcodear rutas esta PROHIBIDO. Toda mutacion (alta / baja / edicion /
sprite / miniatura) MUST ser `POST` a `urls.motor` con `_wpnonce`
(`nonces.motor`) + `op` + payload. Los recursos viven en los uploads
del plugin (`uploads/pmu/`), su unico responsable de persistencia (ver
IV). Este repo MUST NOT versionar datos.

### IV. Preset Delta Estricto y Catalogos Unicos

El preset guarda absolutamente TODAS las opciones que cambia el
usuario y NINGUNA de las que no cambian: `settings` MUST ser el DELTA
estricto contra los defaults (`diffSettings` / `settingsFromDelta`).
Formato unico `.txm`: `{format:'textmuy-project', version:2, name,
settings}`. Nombres sanitizados `[a-z0-9_-]`.

**Alcance por linea (v3.2.0)**: `settings.lines` describe las lineas
direccionables (L1/L2/L3) con claves **1-based** (`line["1"]` = L1). El
alcance por linea cubre **todo estilo y layout por linea** (tipografia,
tamano, alineacion, espaciados, rotacion, curva, rellenos, contornos,
sombras, relieves, brillos, letterings e icono). Quedan FUERA unicamente
Canvas Size, el contenedor del sistema de lineas y las rutas de
descarga/procesado; el texto es global por definicion. Cada linea resuelve
su estilo en tres pasos fijos: heredar (de ALL u otra linea) -> mezclar sus
ajustes propios (delta disperso) -> dimensionar por su regla de tamano
(porcentaje sobre la referencia ya resuelta). La UI MUST hacer imposibles
los ciclos de herencia y dimensionamiento por ocultamiento transitivo por
ambas aristas; un ciclo que llegue por archivo editado a mano MUST
rechazarse con causa dejando la vista intacta. Lo configurado para lineas
inexistentes MUST conservarse y reactivarse al reaparecer.

Referencias a recursos: las imagenes por `id`
numerico del catalogo; la fuente (`settings.font.src`) como STRING (titulo
del catalogo o spec Google) o su `id` numerico (el editor escribe el valor
del picker y `FontLoader` lo resuelve por titulo).

Cada ambito expone UN unico catalogo `{thumbs:{w,h,c},
items:[[id,title,cats,file],...]}` (SIN lista `free[]` separada) que el
modulo PARSEA; `thumbs` con ancho/alto de tile y columnas (filas =
`ceil(maxId/c)`, derivable, no se guarda); `items` con tuplas
`[id,title,cats,file]` donde `id` es numerico denso desde 1 (salvo
tombstones), `title` legible y editable, `cats` con UNA categoria =
string, con VARIAS = array de strings (default `custom` si vacio; el
parser normaliza a array; la lectura de strings con separadores
—formato anterior— esta PROHIBIDA por VII), y `file` el nombre fisico
con extension o, solo en `fonts`, spec Google sin extension. Libre =
tombstone `[id,"","",""]` (todo vacio salvo `id`). Quien escribe las
tuplas es el motor del plugin: la baja sin reindexar y el alta
reutilizando el hueco mas bajo antes de anexar `max(id)+1` (reciclaje
diferido, sin huecos infinitos en el sprite); el modulo solo
interpreta lo leido. Posicion del tile = `id-1`: `col=(id-1)%c`,
`row=floor((id-1)/c)`, `x=col*w`, `y=row*h`. Cero manifiesto por tile,
cero `thumbs/*.json` separados, cero `.webp` sueltos. El parser MUST
aceptar UN SOLO formato (tupla de 4 con id numerico) y clasificar cada
entrada en `ok` / `free` / `invalid` con causa (`ambito:id:motivo`):
`invalid` en galeria se salta con `console.warn` + contador visible
(higiene de listado, ver VI); en render se rechaza. La lectura de
formatos superados queda PROHIBIDA, no tolerada: sin compat legacy,
sin objetos, sin tuplas string.

Los ambitos y sus catalogos son los del plugin (`fonts`/`fonts.json`,
`img`/`img.json`, `tm-presets`/`presets.json`): el modulo mapea su
ambito interno al scope del motor al hablar con el y NO introduce
aliases ni rutas propias.

### V. 100% Libre y Alcance Cerrado

La app es 100% LIBRE: premium, tiers y pagos estan PROHIBIDOS.
ANIMATION esta PROHIBIDA. Export SOLO PNG transparente y SVG. UI con
una sola galeria de presets y una sola de imagenes (tabs, buscador,
subida, preview en vivo con rollback). Recrear paneles viejos esta
PROHIBIDO.

### VI. Firmeza Fail-Fast y Calidad Verificable

Ambiente controlado: tenemos control de las variables, asi que lo
que falla MUST fallar visible con causa para corregirlo; PROHIBIDOS
los fallbacks silenciosos, las adivinanzas y el codigo obsoleto,
con UNA excepcion reglada (higiene de listado): una entrada
`invalid` del catalogo en GALERIA se salta con `console.warn` con
causa mas contador visible en el status (`"<n> invalidas: ids..."`,
libres aparte); ESO no es sustitucion porque nada se renderiza en su
lugar. En RENDER no hay excepcion: dependencia ausente o invalida
= rechazo con causa (`ambito:id:motivo`), nunca sustitucion ni
lote parcial. Carga modular: el render MUST resolver el manifiesto de
dependencias del preset (tipografia, bitmaps, texturas, efectos) y
cargar SOLO lo necesario (`preloadAll` PROHIBIDO en la ruta de
render); cache por id; dependencia ausente o invalida = rechazo con
causa, nunca sustitucion. Fuentes Google lazy por familia via
`<link>` inyectado; al abrir: cero fuentes salvo la etiqueta
inicial. Todo cambio JS MUST subir `?v=RCn` en `index.html` Y
`render-core.html` (regla generica, sin numero literal). Vendors
`js/utils/` NO editables; `.min` propios NO regenerables.

### VII. Cero Legado y Responsabilidad Unica

Toda decision de diseno REEMPLAZA (no convive): PROHIBIDO mantener
rutas dobles, fallbacks de compatibilidad, codigo obsoleto o lecturas
de formatos superados. Cuando un cambio invalida codigo, la purga va
en la MISMA entrega que lo introduce. Un responsable unico por
operacion/archivo; la redundancia se elimina, no se documenta. El
codigo se escribe limpio desde el inicio: no se acumula "temporal"
que se limpia despues.

**Sin lectores del formato anterior (v3.2.0)**: cuando un cambio de
formato ocurre en un entorno sin datos previos (declarado
explicitamente por el usuario), la ausencia de migracion NO es una
excepcion: es la aplicacion directa de este principio. El formato
nuevo reemplaza, no convive, y un archivo con formato de lineas
desconocido MUST rechazarse con causa dejando la vista intacta, igual
que cualquier delta invalido. Escribir codigo de migracion para cero
casos reales seria codigo muerto desde el dia uno.

## Restricciones Tecnicas y de Integracion

Stack: Canvas 2D + WebGL en vanilla JS, sin frameworks; unico CSS
`css/style.css`. `settings.canvas.width/height` es la unica fuente
de verdad del tamano. Categorias dinamicas derivadas del catalogo;
un sprite `thumbs.webp` por ambito (fonts 180x30, img 100x100,
presets 200x100) con posicion derivada de `id-1`; catalogos y
sprites los LEE el modulo, nunca los escribe. UI en espanol, codigo
sin tildes. `localStorage` PROHIBIDO para recursos (sin lecturas
legacy). Sin lectores de formatos superados en los parsers: un
formato o un error con causa.

La lectura de un sprite MUST ser canonica y certificada: la celda de
un recurso se DERIVA de su `id` (tile `id-1`, huecos estables) y la
hoja MUST coincidir con su catalogo via `thumbs.sprite_firma`
(`[w,h,c,items]`); una hoja sin certificar, con reticula distinta o
con catalogo cambiado MUST NOT usarse. Regenerarla es una operacion
EXCEPCIONAL (una vez por cambio real) y MUST pasar por `op=sprite`
del motor, que valida firma y dimensiones, rechaza con causa y
certifica el catalogo al persistir. Mutar un ambito MUST invalidar
esa certificacion. Las galerias MUST NOT reconstruir la hoja al
abrirse.

## Flujo de Desarrollo y Puertas de Calidad

AGENTS.md MUST leerse completo antes de editar; si algo no esta
alli, preguntar, no inventar. AGENTS.md es la guia runtime operativa
del modulo (mapa de archivos, contrato del puente, formato `.txm`,
reglas RC, como probar); esta constitucion es la gobernanza y
prevalece en caso de conflicto. Node existe SOLO para testing
(`node tests/*.test.js`, todas las suites vigentes de `tests/`) y
`node --check` de los JS tocados. Probar integrado es el unico modo:
pestana Estilos de Texto del plugin (presets, imagenes, fuentes y
preview de un grupo con texto estilizado); NO existe modo standalone
(las suites de `tests/` corren en Node: son testing, no un modo de
ejecucion). `render-core.html` MUST mantener paridad con el editor.

## Governance

Esta constitucion prevalece sobre cualquier otra practica del
modulo. Toda enmienda MUST documentarse con Sync Impact Report,
version semantica y plan de migracion si rompe al plugin.
Versionado: MAJOR por eliminaciones o redefiniciones
incompatibles; MINOR por principio o seccion nueva; PATCH por
clarificaciones o typos. Todo PR MUST verificar cumplimiento
(AGENTS.md sec. 10) y justificar complejidad. Guia runtime:
AGENTS.md (operativa); esta constitucion (gobernanza).

**Version**: 3.2.0 | **Ratified**: 2026-07-24 | **Last Amended**: 2026-10-04

## Sync Impact Report (v3.2.0, 2026-10-04)

- **Bump**: MINOR — se redefine el alcance por linea y la version del formato
  `.txm` (feature `specs/002-text-tab`, pestana TEXT).
- **Modificado**: IV — el formato pasa a `version:2`; `settings.lines` usa claves
  **1-based** (`line["1"]` = L1) y el alcance por linea se amplia de las rutas de
  estilo a **todo estilo y layout por linea**, dejando fuera solo Canvas Size, el
  contenedor del sistema de lineas y las rutas de descarga/procesado (el texto es
  global por definicion). Se fija la resolucion en tres pasos (heredar -> mezclar lo
  propio -> dimensionar por porcentaje sobre la referencia resuelta), los ciclos
  MUST ser imposibles en UI por ocultamiento transitivo por ambas aristas y
  rechazarse con causa si llegan por archivo editado a mano, y lo configurado para
  lineas inexistentes MUST conservarse. VII — se registra que, en entorno declarado
  sin datos previos, la entrega NO incluye migracion ni lectores del formato
  anterior: es aplicacion del principio, no excepcion.
- **Eliminado**: la mencion a `isGlobalOnlyPath` como regla de formato (la funcion
  desaparece del estado: sin rutas globales de layout/fuente).
- **Sin cambio en**: I, II, III, V, VI. El delta estricto se mantiene: solo viaja lo
  que difiere de los defaults.
- **Impacto en el plugin**: acotado. El plugin no lee `settings.lines`
  (el delta viaja opaco dentro de `renderBatch`), pero SI valida la version del `.txm`
  en `op=alta` (`inc/class-pmu-uploads.php::alta`): acepta 1 y 2 (lista cerrada). Un
  modulo que suba otra version exige actualizar el plugin. Requisito operativo: el
  editor MUST avisar con Ctrl+F5 tras el bump `?v=RCn`, porque los `.txm` con formato
  de lineas viejo dejan de ser validos por diseno (no hay lector).
- **Estado**: la gobernanza se adelanta a la implementacion (aprobada con el
  usuario al cerrar el plan). Hasta que el Bloque D de `specs/002-text-tab` aterrice
  en `js/editor.js` y `js/preset-manager.js`, el modulo sigue escribiendo
  `version:1` con `lines.sizing` global y claves 0-based: esos `.txm` quedan
  invalidos al aplicar el formato nuevo, por diseno y sin lector (VII).
- **Origen**: `specs/002-text-tab` (spec, plan, research R6/R8/R10, data-model,
  contracts/lineas.md) acordado con el usuario, con causas raiz medidas en
  laboratorio con Chrome + Playwright sobre el iframe real del plugin.

## Sync Impact Report (v3.1.2, 2026-10-01)

- **Bump**: PATCH — se completa el protocolo del puente con su acuse.
  Sin cambio de payload ni de responsabilidades.
- **Modificado**: III (Integrado WordPress UNICO) — el handshake queda
  bidireccional: el modulo MUST responder `textmuy-bridge-ok` al
  aplicar el puente, y el padre MUST esperar ese acuse antes de
  invocar `renderBatch`. Motivo: el `postMessage` del puente se
  entrega como TAREA y el `.then()` de la promesa de carga del iframe
  corre como MICROTAREA, de modo que el primer render arrancaba con
  `bridge=null` y rechazaba con `presets:sin_puente` (reproducido en
  WordPress real: "Probar" fallaba al primer clic y recien al segundo
  mostraba la imagen). Excepciones declaradas: sin puente configurado no
  se espera acuse, y un modulo viejo en cache no deja la promesa
  colgada (tiempo de espera acotado en el padre).
- **Impacto en el plugin**: `assets/admin.js` (consola) y
  `assets/tienda.js` (ficha del comprador) deben esperar el acuse antes
  de resolver la carga del render-core. Sin ese cambio el arreglo del
  modulo no tiene efecto. Desplegar plugin y modulo en el mismo paso
  (cache-bust RC37 -> RC38 en `index.html` y `render-core.html`).
- **Origen**: validacion manual del contrato de render en WordPress real
  (2026-10-01) previa a especificar la API (spec 010). El contrato
  `{id, text, preset|settings, width, height, overrides?}` ya existia y
  funciona; esto corrige la condicion de carrera del primer render.


## Sync Impact Report (v3.1.1, 2026-09-16)

- **Bump**: PATCH — clarificacion de restricciones tecnicas (lectura de
  sprites) sin cambio de contrato del puente.
- **Modificado**: seccion de restricciones tecnicas — la lectura de
  `thumbs.webp` MUST ser canonica y certificada (`thumbs.sprite_firma`),
  la regeneracion es excepcional via `op=sprite` (valida firma y
  dimensiones, rechaza con causa y certifica el catalogo) y mutar un
  ambito invalida la certificacion. Corrige la afirmacion previa de que
  el modulo nunca escribe sprites (el motor ya los persistia por
  `op=sprite`).
- **Impacto en el plugin**: `PMU_Uploads::sprite` gana `firma` +
  validacion de dimensiones; `guardar_catalogo` invalida la firma del
  ambito `img`. Requiere desplegar plugin y modulo en el mismo paso.


## Sync Impact Report (v3.1.0, 2026-09-14)

- **Bump**: MINOR — realineacion de III con la configuracion vigente del
  plugin (endpoint unico `pmu_uploads` + `op=`), eliminacion de un
  principio de responsabilidad ajena y purga del historial de reports.
- **Principios modificados**: III — payload real del puente
  (`urls.{motor,miniaturas,presetsBase,fuentesBase,imagenesBase}` +
  `nonces.motor`), escrituras SOLO por `urls.motor` con `op=`, ubicacion
  de recursos en los uploads del plugin (`uploads/pmu/`) y regla de
  consumidor unico del storage (sin otra via de acceso). IV — el motor
  del plugin es quien escribe catalogos/tuplas; el modulo solo los
  interpreta; se nombran los ambitos reales (`fonts`, `img`,
  `tm-presets`; catalogo `presets.json`).
- **Principios eliminados**: el antiguo VII "Motor de Galerias del
  Plugin" era gobernanza del plugin, no del modulo (sus duenos son el
  AGENTS.md y la constitucion del plugin). VIII pasa a ser VII.
- **Historial purgado**: se eliminaron los Sync Impact Reports v2.2.0,
  v3.0.0 y v3.0.1 (dos de ellos marcados TEMPORAL), conforme a VII
  (cero legado documental) y a la regla del plugin de reducir
  documentacion obsoleta.
- **Fuente**: revision de documentacion solicitada por el usuario
  (2026-09-14), contrastada con `inc/class-pmu-uploads.php`,
  `admin/estilos-texto.php` y los datos reales de `uploads/pmu/`.
- **Impacto en el plugin**: ninguno; el contrato documentado es el que
  el plugin ya expone. Pendiente ajena a esta enmienda: el cliente del
  modulo todavia usa las claves viejas del puente y el scope `presets`
  (tareas T006-T019 de `here/specs/002-galeria-engine/tasks.md`).
