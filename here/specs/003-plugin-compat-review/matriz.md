# Matriz de compatibilidad plugin ↔ TextMuy

**Feature**: 003-plugin-compat-review | **Fecha**: 2026-09-14
**Estado**: PASS 20 (16 estáticos + 4 cerrados con corrección en la revisión) · CONDICIONADO 5 · FAIL 0
**Alcance ejecutado**: verificación automática + contraste estático de contrato. La fase integrada en navegador (circuito, paridad, degradados) queda CONDICIONADA — ver §5.

## 0. Entorno y prerrequisitos (T002)

| Prerrequisito | Estado | Evidencia |
|---|---|---|
| Plugin presente con motor y tests | OK | `personalizador-pdf/{admin,engine,inc,tests}` + `php -l` limpio |
| Módulo importado | OK | `personalizador-pdf/modules/textmuy/` (repo propio anidado) |
| Carpeta de datos del administrador | OK | `uploads/pmu/{fonts,img,tm-presets,pdfs}` con 10 `.txm` y `muestra.pdf` (2.6 MB) |
| PHP CLI | OK (sin GD) | PHP 8.5.9; `php -m` sin GD → el motor usa su ruta PHP puro y el smoke pasa completo |
| Node para testing | OK | Node v22.20.0; 10/10 suites en verde |
| Sesión integrada en navegador (WordPress + pestaña) | PENDIENTE | requiere ejecución manual del usuario (§5) |

## 1. Matriz de puntos de contrato

### B1 · Puente plugin ↔ módulo

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-001 | El puente se envía en los 3 momentos (load del iframe, aviso `textmuy-ready`, envío inmediato) | PASS | `admin/estilos-texto.php:90` (load), `:92-94` (ready), `:96` (inmediato) |
| PC-002 | Payload con claves vigentes: `urls.{motor,miniaturas,presetsBase,fuentesBase,imagenesBase}` + `nonces.motor` + `presets/imagenes/fuentes` | PASS | `admin/estilos-texto.php:43-59`; el módulo lee `bridge.nonces.motor` (`js/preset-manager.js:36,80,473`) y `bridge.urls.presetsBase` |

### B2 · Escritura única por el motor

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-003 | Toda mutación es POST a `urls.motor` con `_wpnonce` + `op=listar\|alta\|baja\|editar\|sprite\|miniatura` | PASS | `js/preset-manager.js:77-80`; ops reales en `inc/class-pmu-uploads.php:610` |
| PC-004 | Sin vías alternativas de escritura (claves viejas del puente) | PASS | grep de `nonces.(guardar\|borrar\|subir\|cambiar)` y `urls.*` viejas en `js/` → 0 coincidencias |

### B3 · Bases de lectura

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-005 | Lectura por las bases del puente (`presetUrlBase()` = `urls.presetsBase`) | PASS | `js/preset-manager.js:12,473`; `js/api.js:39,79,106,147` |
| PC-006 | Sin rutas hardcodeadas (`'presets/'`, relativas del módulo) | PASS | grep `'presets/'` en `js/` → 0 coincidencias |

### B4 · Catálogos y sprites v5.0

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-007 | Catálogo `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}` en `fonts`, `img`, `tm-presets`; parser `ok/free/invalid`; tile `id-1` | PASS | `uploads/pmu/fonts/fonts.json` (180x30 c4), `img/img.json` (100x100 c8), `tm-presets/presets.json` (200x100 c4); `js/catalog.js`; `tests/catalog-unified.test.js` OK |
| PC-008 | Un sprite `thumbs.webp` por ámbito, persistido por el motor (`op=sprite`) | PASS | `assets/miniaturas.js:174,327` (genera y persiste); galerías con fallback si falta (`js/galeria.js:31-40`, `js/fuentes-galeria.js:25-27`). Al día de hoy no hay `thumbs.webp` en disco: es generación perezosa, no defecto |

### B5 · Formato `.txm`

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-009 | `.txm` = `{format:'textmuy-project',version:1,name,settings}` con `settings` delta | PASS | 10/10 `.txm` del administrador cumplen formato y version 1; `tests/preset-delta.test.js` OK |
| PC-010 | Refs numéricas y rechazo documentado de refs legacy ("re-guardar el preset") | PASS | `js/api.js:45`, `tests/preset-load.test.js` (salta legacy con causa) → comportamiento conforme; la deuda de datos existente queda en H-003 |

### B6 · Contrato de render (API)

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-011 | `renderBatch(items,{onProgress}) -> [{id,blob}]`; rechazo ante el primer fallo; 0 lotes parciales | PASS (estático) | `js/api.js:212-228`: bucle secuencial con `await`; un `throw` rechaza toda la promesa (no hay `try` que devuelva parciales) |
| PC-012 | Salida del tamaño exacto de `settings.canvas` | PASS (estático) | `js/api.js:211-212` (overrides de `width/height` acotados a settings); `js/editor.js:729-730` (canvas = fuente de verdad) |
| PC-013 | `ensureFontReady` antes de dibujar (nunca fuente sustituta) | PASS (estático) | `js/api.js:218` invoca `ensureFontReady(settings)` tras `prepareImgRefs` |
| PC-014 | Sin WebGL la API falla con causa, sin degradación silenciosa | PASS (estático, corregido H-006) | Se agregó `assertWebGLDisponible()` en `js/api.js:180-191,199`; antes no existía compuerta y `render-core` (que comparte `editor.js`) caía al fallback 2D |

### B7 · Paridad editor ↔ motor sin interfaz

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-015 | Mismo texto+estilo produce resultado y dimensiones equivalentes en editor y `render-core` | CONDICIONADO | Comparten código (`render-core.html` carga los mismos `js/`); falta la comparación integrada (T011-T012) |

### B8 · Estados degradados

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-016 | Sin puente: error claro, cero fetches relativos, cero data-URL; `isFileProtocol` evita HEAD de miniaturas | CONDICIONADO | Verificación estática conforme en `js/preset-manager.js:14`; falta ejecución en `file://` (T018) |
| PC-017 | Sin internet: fallback documentado de tipografías remotas | CONDICIONADO | Falta ejecución sin red (T020) |
| PC-018 | Toda falla reporta operación/ámbito/causa | CONDICIONADO | Causas con formato `ambito:id:motivo` verificadas en `js/api.js` y `inc/class-pmu-uploads.php`; falta muestra integrada (T005-T022) |

### B9 · Versionado y caché

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-019 | `?v=RCn` idéntico y actualizado en `index.html` y `render-core.html` | PASS | Ambos en **RC29** tras las correcciones de esta revisión (`v=RC28` → `RC29`) |
| PC-020 | El plugin detecta módulo viejo y avisa con la acción de recuperación | CONDICIONADO | Falta la prueba con caché envejecida (T015) |

### B10 · Prohibiciones

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-021 | Sin `localStorage` para recursos (presets/imágenes/fuentes), sin lecturas legacy | PASS (corregido H-004) | `grep localStorage js/` (sin `utils/`) → solo comentarios; se eliminaron `saveCustomFonts`/`loadCustomFonts` de `js/fonts.js` |
| PC-022 | `js/utils/` intacto y sin `.min` propios | PASS | Sin cambios en `js/utils/`; no hay `.min` propios en el módulo |

### B11 · Documentación del contrato

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-023 | `modules/textmuy/AGENTS.md` describe el comportamiento real | PASS (corregido H-005) | Declaraba "hoy RC27" con RC28 real → actualizado a RC29; el resto de §4 coincide con lo verificado |
| PC-024 | `AGENTS.md` del plugin §2.1 + `modules/LEEME.md` describen el comportamiento real | PASS (estático) | Payload del puente, `op=` y "sin puente no opera" coinciden con `admin/estilos-texto.php` e `inc/class-pmu-uploads.php`; LEEME coincide en ubicación única, catálogos y sprites |
| PC-025 | Constitución v3.1.0 describe el contrato vigente | PASS (estático) | Principios II/III/IV verificados contra la implementación; H-006 cerraba una brecha real de II |

### Descartados (verificados, no son hallazgos)

- **Sprites ausentes en disco** (fonts/img/tm-presets): el motor los genera y persiste bajo demanda (`assets/miniaturas.js` → `op=sprite`) y las galerías toleran su ausencia con fallback → PC-008 PASS.
- **`localStorage` en `js/controls.js:2227` y `js/preset-manager.js:535`**: son comentarios, sin uso real.
- **PHP CLI sin GD**: el engine opera por su ruta PHP puro y el smoke pasa completo; el mensaje del motor indica activar GD en el servidor si se necesita el camino rápido.

## 2. Hallazgos

| ID | Punto | Severidad | Esperado | Observado | Resolución | Corrección |
|----|-------|-----------|----------|-----------|------------|------------|
| H-001 | PC de verificaciones automáticas del plugin | BLOQUEANTE (SC-007) | `motor_smoke` y `parity` leen `muestra.pdf` de la carpeta de datos del plugin | Resolvían `dirname(raiz_plugin)/uploads/...` (layout anidado viejo) → "No such file or directory" y excepción | CORREGIDO_EN_REVISION | `tests/motor_smoke.php:37-40` y `tests/parity.php:18-21`: raíz de datos = `raiz_plugin/uploads/pmu/`. Re-verificado: `SMOKE OK` y `PARIDAD OK` |
| H-004 | PC-021 | BLOQUEANTE (prohibición de contrato) | Sin `localStorage` para fuentes, sin lecturas legacy (AGENTS.md §4.7 / Const. III) | `js/fonts.js` persistía y leía fuentes en `localStorage` (`saveCustomFonts`/`loadCustomFonts`, llamada en el init) | CORREGIDO_EN_REVISION | `js/fonts.js`: eliminadas ambas funciones y sus llamadas; las fuentes van solo por el catálogo y `op=alta`. Re-verificado: grep = 0 usos reales; 10/10 suites OK |
| H-006 | PC-014 | BLOQUEANTE (Const. II, non-negotiable) | Sin WebGL la API falla con causa; nunca degrada en silencio | No existía compuerta: `render-core` comparte `editor.js`, que cae al fallback 2D con solo un `console.warn` | CORREGIDO_EN_REVISION | `js/api.js`: `assertWebGLDisponible()` invocada al inicio de `renderTextToPNG` (causa `render:webgl:no_disponible`). El editor conserva su fallback documentado |
| H-005 | PC-023 | DOCUMENTAL | La documentación vigente describe el estado real | `modules/textmuy/AGENTS.md` declaraba "hoy **RC27**" con RC28 real en ambos HTML | CORREGIDO_EN_REVISION | `AGENTS.md:141` → RC29 (tras el bump de esta revisión) |
| H-003 | PC-010 | BLOQUEANTE para el administrador (datos) | Estilos guardados con refs numéricas (`font.src` por id) | **10/10 `.txm` del administrador usan refs legacy** (`"src": "Bebas Neue"`, `"Montserrat"`, `"Cinzel"`, y refs de imagen en data-URL) → el módulo los rechaza con causa "volver a guardar el preset desde el editor" | REGISTRADO | Acción del administrador (no es corrección de código): re-guardar cada estilo desde la pestaña "Estilos de Texto" para convertirlos al formato con refs numéricas. El comportamiento del módulo es el documentado y no se migra bajo demanda |
| H-002 | PC-008 | — (descartado) | Sprites persistidos por ámbito | No hay `thumbs.webp` en disco | NO ES HALLAZGO | Generación perezosa por el motor (`op=sprite`) con fallback en galerías; verificado en `assets/miniaturas.js` |

## 3. Verificaciones de paridad

**CONDICIONADO**: requiere la sesión integrada en navegador (T011-T012). Los casos del conjunto representativo (relleno simple, relleno con imagen, contorno, sombras, relieve, distorsión, icono, fondo, líneas L1-L3) están definidos en `quickstart.md` §3; la tabla se completa en esa sesión.

| Caso | Dimensiones iguales | Equivalencia visual | Nota |
|------|---------------------|---------------------|------|
| (pendiente de ejecución integrada) | — | — | Base estática: editor y `render-core` cargan los mismos `js/` (paridad por construcción, pendiente de confirmación visual) |

## 4. Correcciones documentales aplicadas

| Archivo | Contradicción cerrada |
|---------|----------------------|
| `modules/textmuy/AGENTS.md` (§4.6) | Número de cache-bust declarado (RC27) ≠ valor real (RC28→RC29) |

## 5. Pendientes registrados

| Pendiente | Tipo | Dependency / acción |
|-----------|------|---------------------|
| PC-015 paridad editor ↔ motor sin interfaz | CONDICIONADO | Sesión integrada en navegador (T011-T012) |
| PC-016 editor sin puente (`file://`) | CONDICIONADO | Sesión integrada (T018) |
| PC-017 sin internet (fallback de tipografías) | CONDICIONADO | Sesión integrada (T020) |
| PC-018 causas accionables en operaciones reales | CONDICIONADO | Sesión integrada (T005-T022) |
| PC-020 aviso de módulo viejo en caché | CONDICIONADO | Sesión integrada (T015) |
| H-003 refs legacy en los 10 `.txm` del administrador | REGISTRADO | Re-guardar cada estilo desde el editor integrado (acción del administrador) |
| Circuito completo SC-002 y registro de operaciones reales | PENDIENTE | Sesión integrada (T005-T009) |

## 6. Verificaciones automáticas (evidencia de cierre de fase)

```bash
php -l personalizador-pdf.php admin/*.php engine/*.php inc/*.php   # 0 errores
php tests/motor_smoke.php    # SMOKE OK (sin GD en CLI; ruta PHP puro)
php tests/parity.php         # PARIDAD OK
node --check js/*.js         # limpio
node tests/*.test.js         # 10/10 en verde
```
