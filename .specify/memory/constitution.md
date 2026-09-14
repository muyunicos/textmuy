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
Formato unico `.txm`: `{format:'textmuy-project', version:1, name,
settings}`. Nombres sanitizados `[a-z0-9_-]`. `settings.lines`
(All/L1/L2/L3) MUST respetar `isGlobalOnlyPath`: rutas globales
nunca entran a overrides. Referencias a recursos por id numerico.

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

**Version**: 3.1.0 | **Ratified**: 2026-07-24 | **Last Amended**: 2026-09-14

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
