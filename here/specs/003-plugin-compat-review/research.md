# Research: plugin-compat-review

**Fecha**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

## Fuentes del contrato vigente

1. `modules/textmuy/AGENTS.md` — contrato operativo del módulo (§4 reglas técnicas críticas).
2. `personalizador-pdf/AGENTS.md` §2.1 — contrato RenderCore (comunicación plugin ↔ módulo).
3. `modules/textmuy/.specify/memory/constitution.md` v3.1.0 — gobernanza.
4. `admin/estilos-texto.php` — envío real del puente (implementación actual).
5. `inc/class-pmu-uploads.php` — motor de recursos (`op=` reales).
6. `specs/006-align-textmuy-motor/` del plugin — alineación ya resuelta (estado de partida).

## Bloques de contrato (base de la matriz)

| Bloque | Puntos de contrato | Fuente de verificación |
|---|---|---|
| B1 Puente | Envío en 3 momentos (load del iframe, aviso `textmuy-ready`, envío inmediato); payload `urls.{motor,miniaturas,presetsBase,fuentesBase,imagenesBase}` + `nonces.motor` + `presets` + `imagenes` + `fuentes` | `admin/estilos-texto.php` vs `js/preset-manager.js` (`bridgeAvailable`/`getBridge`) |
| B2 Escritura única | Toda mutación = POST a `urls.motor` (`admin-post.php?action=pmu_uploads`) con `_wpnonce` + `op=listar\|alta\|baja\|editar\|sprite\|miniatura`; sin otras vías | grep en `js/` (claves viejas prohibidas) + prueba manual de cada `op` |
| B3 Bases de lectura | `presetUrlBase()` = `urls.presetsBase`; `fetchPreset`/`ensureThumbnail`/`api.js` usan las bases; sin hardcode de `'presets/'` ni rutas relativas del módulo | grep + prueba de carga de preset por id |
| B4 Catálogos v5.0 | `{thumbs:{w,h,c}, items:[[id,title,cats,file],...]}`; parser `catalog.js` clases `ok/free/invalid` con causa; tile = `id-1`; tombstone `[id,"","",""]`; sprites (fonts 180x30, img 100x100, presets 200x100) | `tests/catalog-unified.test.js` + inspección de `uploads/pmu/*/*.json` |
| B5 Formato `.txm` | `{format:'textmuy-project', version:1, name, settings}` con settings = DELTA (`diffSettings`/`settingsFromDelta`); refs numéricas (`font.src`, imágenes); string legacy = rechazo "re-guardar el preset" | `tests/preset-delta.test.js`, `tests/preset-load.test.js` + guardar/cargar preset manual |
| B6 API render | `renderBatch(items,{onProgress}) -> [{id,blob}]`; items `{id,text,preset\|settings,width,height,overrides?}`; rechazo ante el primer fallo con causa `ambito:id:motivo`; tamaño exacto `settings.canvas`; `ensureFontReady` antes de dibujar; sin WebGL → fallo con causa (sin fallback silencioso) | `render-core.html` + `js/api.js`; prueba manual de lote válido/inválido |
| B7 Paridad | Editor y `render-core.html` comparten código; mismo texto+estilo produce resultado equivalente y mismas dimensiones | Comparación manual con estilos representativos (relleno simple/imagen, contorno, sombras, relieve, distorsión, icono, fondo, líneas L1-L3) |
| B8 Estados degradados | Sin puente: error claro, cero fetches relativos, cero data-URL (`isFileProtocol` evita HEAD de miniaturas); sin internet: fallback Google documentado; toda falla reporta operación/ámbito/causa | `file://` + cortar red + consola |
| B9 Versionado | `?v=RCn` idéntico y actualizado en `index.html` y `render-core.html`; plugin detecta módulo viejo y avisa Ctrl+F5 | grep RC + prueba de caché |
| B10 Prohibiciones | Sin `localStorage` para recursos; sin editar `js/utils/`; sin `.min` propios | grep `localStorage` en `js/` |
| B11 Documentación | AGENTS.md (módulo y plugin), `modules/LEEME.md` y constitución describen el comportamiento real | Contraste punto por punto (US3, FR-005) |

## Verificaciones automáticas vigentes (reuso de la alineación 006)

```bash
php -l personalizador-pdf.php && php -l admin/*.php && php -l engine/*.php && php -l inc/*.php
php tests/motor_smoke.php      # SMOKE OK (condicionado a uploads/pmu/pdfs/muestra.pdf)
php tests/parity.php           # PARIDAD OK (mismo condicionado)
cd modules/textmuy && node --check js/*.js && node tests/*.test.js   # 10 suites en verde
```

## Decisiones de la revisión

- **D1**: la matriz se deriva de los 11 bloques anteriores (contrato documentado), completada con lo descubierto durante la verificación (FR-001).
- **D2**: el artefacto vive en esta carpeta del feature y las correcciones documentales se aplican a la doc vigente (Clarificación Q1, FR-013).
- **D3**: las correcciones de hallazgos no bloqueantes solo se ejecutan si caben en un archivo sin tocar contrato ni interfaz (Clarificación Q3); si un arreglo exige cambiar el contrato, se registra como hallazgo (FR-011) y no se cambia de facto.
- **D4**: toda corrección de JS exige bump `?v=RCn` en ambos HTML y re-corrida de suites + verificación integrada.
- **D5**: verificaciones dependientes de datos del administrador (PDF de muestra, recursos existentes) se registran CONDICIONADAS si el dato no está disponible, sin bloquear el cierre (SC-001).
