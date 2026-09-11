# TextMuy Constitution

<!--
Sync Impact Report (temporal, remover antes de commit):
- Version change: 2.0.0 -> 2.1.0 (MINOR: principio IV redefinido de
  free[] a tombstone + regla de higiene de listado en VI; responde a
  decisiones Q1/Q2 del usuario en here/specs/001-unified-resource-format).
- IV. Preset Delta Estricto y Catalogos Unicos (reescrito parcial):
  catalogo {thumbs:{w,h,c},items} SIN free[]; libre = tombstone
  [id,"","",""]; alta reutiliza hueco mas bajo; cats como string
  (coma/espacio/barra, default custom); parser con 3 clases
  ok/free/invalid.
- VI. Firmeza Fail-Fast (matiz): invalid en GALERIA = salto +
  console.warn + contador visible (higiene de listado, no sustitucion
  de render); en RENDER = rechazo duro ambito:id:motivo sin parciales.
- Flujo de Desarrollo: 8 suites -> 9 suites (nueva
  catalog-unified.test.js).
- Removed: lista free[] separada; manifiesto thumbs/presets.json
  mencionado como ejemplo (ya estaba prohibido, se explicita).
- TODOs: ninguno. AGENTS.md se MANTIENE (ver analisis al pie del
  resumen): es guia runtime operativa, no duplica gobernanza.
-->

## Core Principles

### I. Editor de Estilos de Textos Pequenos

TextMuy es un editor web de textos pequenos con efectos (tipografia,
colores, fondos bitmap, sombras, 3D, composiciones con imagenes) cuyo
fin es recrear estilos de marcas y cultura pop. El editor trabaja
sobre un lienzo donde se define como se comporta el texto, con hasta
4 lineas que pueden tener estilo propio (All/L1/L2/L3). El editor es
el MEDIO para producir presets; el FIN es la API de render. Abrir
`index.html` fuera del plugin es solo harness de desarrollo, sin
garantias contractuales.

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

### III. Integrado WordPress Primero

TextMuy se prueba y opera integrado al plugin propio via iframe
same-origin + puente postMessage `{type:'textmuy-bridge',
bridge:{urls:{presetsBase,fuentesBase,imagenesBase,guardarSprite,
miniaturas}, nonces, presets, imagenes, fuentes}}` en los 3 momentos:
load del iframe, aviso `textmuy-ready` y envio inmediato. Todo fetch
MUST resolverse via esas bases; hardcodear rutas esta PROHIBIDO. Los
datos viven en `uploads/tm/{fonts,img,presets}` gestionados por el
plugin. Este repo MUST NOT versionar datos. Escrituras al servidor
SOLO via puente (admin-post + nonce).

### IV. Preset Delta Estricto y Catalogos Unicos

El preset guarda absolutamente TODAS las opciones que cambia el
usuario y NINGUNA de las que no cambian: `settings` MUST ser el DELTA
estricto contra los defaults (`diffSettings` / `settingsFromDelta`).
Formato unico `.txm`: `{format:'textmuy-project', version:1, name,
settings}`. Nombres sanitizados `[a-z0-9_-]`. `settings.lines`
(All/L1/L2/L3) MUST respetar `isGlobalOnlyPath`: rutas globales
nunca entran a overrides. Referencias a recursos por id numerico.

Cada ambito (`fonts`, `img`, `presets`) MUST tener un unico catalogo
`{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` (SIN lista
`free[]` separada): `thumbs` con ancho/alto de tile y columnas
(filas = `ceil(maxId/c)`, derivable, no se guarda); `items` con
tuplas `[id,title,cats,file]` donde `id` es numerico denso desde 1
(salvo tombstones), `title` legible y editable, `cats` string con
una o mas categorias separadas por coma/espacio/barra (default
`custom`), `file` el nombre fisico con extension o, solo en
`fonts`, spec Google sin extension. Libre = tombstone
`[id,"","",""]` (todo vacio salvo `id`): la baja MUST escribir
tombstone sin reindexar; el alta MUST reutilizar el hueco mas bajo
antes de anexar `max(id)+1` (reciclaje diferido, sin huecos
infinitos en el sprite). Posicion del tile = `id-1`:
`col=(id-1)%c`, `row=floor((id-1)/c)`, `x=col*w`, `y=row*h`.
Cero manifiesto por tile, cero `thumbs/*.json` separados, cero
`.webp` sueltos. El parser MUST aceptar UN SOLO formato (tupla de
4 con id numerico) y clasificar cada entrada en `ok` / `free` /
`invalid` con causa (`ambito:id:motivo`): `invalid` en galeria se
salta con `console.warn` + contador visible (higiene de listado,
ver VI); en render se rechaza. Sin compat legacy, sin objetos,
sin tuplas string.

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
con UNA excepcion reglada (higiene de listado, decidida en
here/specs/001-unified-resource-format): una entrada `invalid` del
catalogo en GALERIA se salta con `console.warn` con causa mas
contador visible en el status (`"<n> invalidas: ids..."`, libres
aparte); ESO no es sustitucion porque nada se renderiza en su
lugar. En RENDER no hay excepcion: dependencia ausente o invalida
= rechazo con causa (`ambito:id:motivo`), nunca sustitucion ni
lote parcial. Carga modular: el render MUST resolver el manifiesto de dependencias
del preset (tipografia, bitmaps, texturas, efectos) y cargar SOLO lo
necesario (`preloadAll` PROHIBIDO en la ruta de render); cache por
id; dependencia ausente o invalida = rechazo con causa, nunca
sustitucion. Fuentes Google lazy por familia via `<link>` inyectado;
al abrir: cero fuentes salvo la etiqueta inicial. Todo cambio JS
MUST subir `?v=RCn` en `index.html` Y `render-core.html` (regla
generica, sin numero literal). Vendors `js/utils/` NO editables;
`.min` propios NO regenerables.

## Restricciones Tecnicas y de Integracion

Stack: Canvas 2D + WebGL en vanilla JS, sin frameworks; unico CSS
`css/style.css`. `settings.canvas.width/height` es la unica fuente
de verdad del tamano. Categorias dinamicas derivadas del catalogo;
sprites por ambito: fonts 180x30, presets 200x100, imagenes 100x100,
todos con posicion derivada de `id-1` (cero manifiestos por tile).
UI en espanol, codigo sin tildes. `localStorage` para recursos
PROHIBIDO salvo migracion legacy de lectura ya ejecutada. Sin
lectores legacy en parsers: un formato o error con causa.

## Flujo de Desarrollo y Puertas de Calidad

AGENTS.md MUST leerse completo antes de editar; si algo no esta
alli, preguntar, no inventar. AGENTS.md es la guia runtime
operativa del modulo (mapa de archivos, contrato del puente,
formato `.txm`, reglas RC, como probar); esta constitucion es la
gobernanza y prevalece en caso de conflicto. Node existe SOLO para
testing (`node tests/*.test.js`, 9 suites) y `node --check` de los
JS tocados. Probar integrado primero (pestana Estilos de Texto del
plugin: presets, imagenes, preview de grupo); standalone es
harness dev sin garantias. `render-core.html` MUST mantener
paridad con el editor.

## Governance

Esta constitucion prevalece sobre cualquier otra practica del
modulo. Toda enmienda MUST documentarse con Sync Impact Report,
version semantica y plan de migracion si rompe al plugin.
Versionado: MAJOR por eliminaciones o redefiniciones
incompatibles; MINOR por principio o seccion nueva; PATCH por
clarificaciones o typos. Todo PR MUST verificar cumplimiento
(AGENTS.md sec. 10) y justificar complejidad. Guia runtime:
AGENTS.md (operativa); esta constitucion (gobernanza).

**Version**: 2.1.0 | **Ratified**: 2026-07-24 | **Last Amended**: 2026-09-11
