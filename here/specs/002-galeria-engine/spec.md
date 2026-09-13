# Feature Specification: Motor de Galerias del Plugin (Const. VII)

**Feature Branch**: `002-galeria-engine`

**Created**: 2026-09-12

**Status**: Draft (pendiente revision del usuario antes de /speckit-tasks)

**Input**: Decisiones acordadas en sesion (2026-09-12): "motor de galerias que
unifique todos los tipos de galeria dentro de tm/ (fonts, img, presets) como
unico responsable de lectura/escritura/listado/persistencia en el plugin;
TextMuy consumidor via puente; cero fallbacks, cero standalone, cero legacy
(Const. III/VII/VIII v3.0.1)".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Motor unico PHP (Priority: P1)

El plugin centraliza TODAS las operaciones de galeria de `uploads/tm/`
(catalogos, tuplas, fisicos, sprite) en una clase unica (ej. `TM_Galeria`)
expuesta por UN endpoint `admin-post.php?action=tm_galeria` con `op=`.

**Why this priority**: Const. VII es MUST: los ~10 handlers sueltos
`admin_post_personalizador_pdf_textmuy_*` violan "clase + endpoint unico, no
handlers sueltos". Sin esto, todo lo demas es cosmético.

**Independent Test**: Con el motor instalado, subir/editar/borrar imagen y
fuente y guardar/borrar preset desde el editor: TODAS las operaciones pasan por
`action=tm_galeria`; el PHP delega en la clase; `php -l` verde.

**Acceptance Scenarios**:

1. **Given** el motor instalado, **When** el modulo pide `op=listar` (scope
   fonts/img/presets), **Then** recibe `{catalogo:{thumbs,items}, items:[{id,
   titulo,cats,file,url,...}]}` (catalogo + listado mergeado con fisicos).
2. **Given** una operacion de escritura (`alta|baja|editar|sprite|miniatura`),
   **When** llega con nonce y payload valido, **Then** la clase ejecuta y
   responde JSON `{ok:true, ...}`; invalida → rechazo con causa.
3. **Given** el seed lazy, **When** falta el JSON del ambito, **Then** el motor
   lo crea vacio canonico (comportamiento actual conservado).

---

### User Story 2 - Puente del modulo migrado al endpoint unico (Priority: P1)

El puente expone `{motorUrl, nonce, bases}` y el modulo ejecuta TODAS sus
operaciones (listar/alta/baja/editar/sprite) contra `action=tm_galeria&op=...`;
los handlers sueltos del plugin se ELIMINAN (Const. VIII: purga en la misma
entrega).

**Why this priority**: Sin migrar el modulo, los handlers viejos no pueden
borrarse y quedarian dos rutas (Const. VIII PROHIBIDO).

**Independent Test**: Grep del modulo: cero `admin_post_personalizador_pdf_textmuy_*`
referenciados; solo `action=tm_galeria`. Prueba integrada end-to-end de los 3
ambitos.

**Acceptance Scenarios**:

1. **Given** el puente nuevo, **When** el admin sube una imagen, **Then** la
   peticion va a `action=tm_galeria&op=alta` y la tupla se escribe igual que hoy.
2. **Given** handlers viejos eliminados, **When** se abre el editor, **Then**
   ninguna peticion apunta a endpoints sueltos y todo funciona como antes.

---

### User Story 3 - Purga de fallbacks standalone del modulo (Priority: P2)

Const. III/VIII v3.0.0: sin puente el editor NO opera. Purga: bases relativas
(`'presets/'`, `'fonts/'`, `'img/'`), `descargarTxm`, `usarLocalEmbebida`
(data-URL), `migrateLegacyPresets`, y sin-puente → estado de error claro.

**Why this priority**: Const. VIII exige purga en la misma entrega; el codigo
fallback sigue vivo y viola III.

**Independent Test**: Grep limpio de las clausulas purgadas; abrir el editor
fuera del plugin → pantalla de error clara (no un editor roto).

**Acceptance Scenarios**:

1. **Given** el modulo sin puente, **When** carga, **Then** muestra estado de
   error claro y NO dispara fetches a rutas locales.
2. **Given** el puente presente, **When** se usa el editor, **Then** el
   comportamiento es identico al actual (ninguna regresion).

---

### User Story 4 - Purga de lecturas de formato anterior (Priority: P2)

Const. IV v3.0.1: lectura de strings con separadores PROHIBIDA. Purga de
`parseCats` (split por separadores) + su test; alias legacy de scopes
(`imagenes`/`fuentes`) eliminados (el modulo envia `img`/`fonts`/`presets`).

**Why this priority**: Const. VIII (REEMPLAZA no convive); el formato anterior
ya no existe en datos.

**Independent Test**: Grep sin `split` de separadores en `parseCats`; test de
catalogo sin el caso "cats string multi"; scopes sin alias en PHP y JS.

**Acceptance Scenarios**:

1. **Given** un catalogo con tupla `cats` con separadores, **When** parsea,
   **Then** clasifica `invalid` con causa (no lo normaliza).
2. **Given** el modulo, **When** persiste sprite, **Then** envia scope canonico
   (`img|fonts|presets`) y el motor no contiene alias.

---

### Edge Cases

- Sin puente: error claro, cero fetches locales (Const. III).
- `op` inexistente / scope invalido / payload invalido: rechazo con causa
  `motor:<op>:<motivo>` (Const. VI; sin fallbacks).
- Archivo fisico ausente en `op=listar`: item omitido con warn (higiene vigente).
- Nonce expirado: respuesta accionable "recarga la pagina" (patron actual).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Clase unica (ej. `TM_Galeria`) responsable de catalogos, tuplas
  (alta reutiliza hueco mas bajo / baja tombstone), fisicos, seed lazy y
  persistencia de `thumbs.webp` de `uploads/tm/` (Const. VII).
- **FR-002**: Endpoint unico `admin-post.php?action=tm_galeria` con
  `op=listar|alta|baja|editar|sprite|miniatura`, nonce unico y capability;
  PROHIBIDOS handlers sueltos (Const. VII).
- **FR-003**: Puente expone `{motorUrl, nonce, bases{presetsBase,fuentesBase,
  imagenesBase}, miniaturas}`; los listados (`presets/imagenes/fuentes`) los
  construye el motor.
- **FR-004**: Sin puente: estado de error claro y cero operaciones client-side
  (Const. III).
- **FR-005**: Purga standalone del modulo: bases relativas, `descargarTxm`,
  `usarLocalEmbebida`, `migrateLegacyPresets`, fallbacks data-URL (Const. VIII).
- **FR-006**: Purga de lecturas de formato anterior: `parseCats` sin split de
  separadores (entra `invalid`), test actualizado; scopes sin alias (Const. IV
  v3.0.1 / VIII).
- **FR-007**: Los dominios ajenos a galerias (`pdfs/`, datasets, salidas)
  quedan FUERA del motor (Const. VII).
- **FR-008**: Todo cambio JS del modulo MUST subir `?v=RCn` (RC28); docs
  (AGENTS.md ambos repos, LEEME) sincronizadas en la misma entrega.

### Success Criteria *(mandatory)*

- **SC-001**: 100% de las operaciones de galeria del modulo viajan por
  `action=tm_galeria` (cero handlers sueltos activos).
- **SC-002**: Grep limpio en el modulo de bases relativas, `descargarTxm`,
  `usarLocalEmbebida`, `migrateLegacyPresets` y data-URL de fallback.
- **SC-003**: Suites `node tests/*.test.js` 10/10 (ajustadas a la purga de
  `parseCats`) + `node --check` + `php -l` verdes.
- **SC-004**: Prueba integrada end-to-end de los 3 ambitos (subir/editar/borrar
  + sprite) y, sin puente, pantalla de error clara.

## Assumptions

- La estructura de datos NO cambia: tuplas v5.0, tombstone, `thumbs.webp`
  unico por ambito (heredado de 001, sin migraciones).
- Compatibilidad hacia atras NO se mantiene (Const. VIII): los handlers viejos
  y las rutas standalone se purgan en la misma entrega.
- `usr_img`/`orders` u otros ambitos nuevos: se agregan AL MOTOR en features
  futuras (fuera de alcance aqui).
- Se recomienda entregar sobre rama `002-galeria-engine` tras commit de 001
  (evita mezclar el trabajo sin commitear de 001).
