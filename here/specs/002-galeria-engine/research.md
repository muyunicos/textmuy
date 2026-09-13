# research.md — Motor de Galerias del Plugin (002)

**Feature**: `002-galeria-engine` | **Fecha**: 2026-09-12 | **Fase**: 0
(decisiones ya tomadas por el usuario en sesion y codificadas en Const.
v3.0.0/v3.0.1; sin NEEDS CLARIFICATION).

## R1 — Clase unica vs handlers sueltos

- **Decision**: una clase PHP unica (ej. `inc/class-tm-galeria.php`, clase
  `TM_Galeria`) responsable de catalogos, tuplas, fisicos, seed y sprite; UN
  endpoint `admin-post.php?action=tm_galeria` con `op=`.
- **Rationale**: Const. VII (MUST). Los ~10 handlers sueltos duplican saneo,
  nonce y capability; el endpoint unico centraliza seguridad y contrato.
- **Alternativas**: mantener handlers y solo agrupar en clase — RECHAZADO
  (Const. VII exige "no handlers sueltos"); REST/JSON API de WP — RECHAZADO
  (admin-post ya es la superficie usada y same-origin via iframe).

## R2 — Render de miniaturas: cliente

- **Decision**: el render de thumbs permanece en el cliente (ThumbEngine +
  canvas → POST del blob); el motor recibe y persiste `thumbs.webp`.
- **Rationale**: Const. VII PROHIBE renderizador server-side; SVG complejos en
  GD/imagick son costosos y de calidad inferior; cero dependencias nuevas de
  hosting.
- **Alternativas**: render server-side — RECHAZADO.

## R3 — Superficie del endpoint (op=)

- **Decision**: `op=listar|alta|baja|editar|sprite|miniatura` (listado por
  scope; alta/baja/editar por scope+file; sprite = persistir `thumbs.webp`;
  miniatura = persistir miniatura individual de grupo PDF). Nonce UNICO del
  endpoint + `op` en whitelist.
- **Rationale**: 1 superficie de saneo/nonce/capability; mapping directo con
  las operaciones actuales (los handlers actuales son 1:1 con estas ops).
- **Alternativas**: un nonce por op — RECHAZADO (complejidad sin beneficio);
  GET para listar — RECHAZADO (POST unico con nonce simplifica).

## R4 — Listados en el motor

- **Decision**: `op=listar` devuelve `{catalogo:{thumbs,items}, items:[...]}`
  por scope; el modulo ya no mergea bridge.imagenes/bridge.presets con el
  catalogo: el catalogo es la unica fuente (R2 de 001 ya lo hacia).
- **Rationale**: una sola fuente de verdad; elimina el doble listado
  (bridge + catalogo) que existe hoy.
- **Alternativas**: mantener listado del puente + catalogo paralelo — RECHAZADO
  (Const. VIII).

## R5 — Purga standalone del modulo

- **Decision**: quitar bases relativas (`'presets/'`, `'fonts/'`, `'img/'`),
  `descargarTxm`, `usarLocalEmbebida`, `migrateLegacyPresets` (+ UI de
  migracion), data-URL de `persistirSheet` (ya fuera en R010-remediacion) y
  cualquier `bridgeAvailable()` condicional: sin puente → estado de error
  claro (bloque del editor con mensaje accionable).
- **Rationale**: Const. III/VIII (sin fallbacks; purga en la misma entrega).
- **Alternativas**: degradacion elegante — PROHIBIDA (Const. III v3.0.0).

## R6 — Purga de lecturas de formato anterior

- **Decision**: `parseCats` sin split de separadores (tupla con cats que traiga
  separadores → `invalid` con causa); `catalog-unified.test.js` ajustado (el
  caso "cats string multi" pasa a invalid); scopes canonico sin alias
  (`imagenes`/`fuentes` purgados de PHP y JS).
- **Rationale**: Const. IV v3.0.1 + VIII (REEMPLAZA no convive).
- **Alternativas**: mantener lectura tolerada — PROHIBIDA (v3.0.1).

## R7 — Orden de entrega (sin big-bang)

- **Decision**: (1) clase motor que envuelve los helpers actuales (comportamiento
  idéntico) + endpoint nuevo en paralelo; (2) modulo migra al endpoint; (3)
  handlers viejos y fallbacks purgados; (4) RC28 + docs. Todo en la MISMA
  entrega/PR (Const. VIII), pero con pasos internos verificables.
- **Rationale**: riesgo controlado sin convivencia final.
- **Alternativas**: big-bang — RECHAZADO (riesgo sin beneficio).

## R8 — Ramificacion

- **Decision**: entregar en rama `002-galeria-engine` DESPUES de commitear 001
  en `main` (001 tiene trabajo sin commitear: constitucion v3.0.1, artefactos
  alineados, miniaturas.js).
- **Rationale**: separacion limpia de features; evita mezclar remediacion con
  refactor.
- **Alternativas**: continuar sobre main — RECHAZADO (mezcla historiales).

## R9 — Ambitos futuros (usr_img, orders)

- **Decision**: FUERA de alcance aqui; se agregan al motor (nueva carpeta +
  catalogo mismo formato) en features posteriores.
- **Rationale**: Const. VII ("todo ambito nuevo se agrega AL MOTOR"); alcance
  cerrado Const. V.