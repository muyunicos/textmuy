# Tasks: Motor de Galerias del Plugin (002)

**Input**: `here/specs/002-galeria-engine/` (spec.md, plan.md, research.md R1-R9, data-model.md, contracts/ x3, quickstart.md)
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: governance (Constitucion VI): suites `node tests/*.test.js` + `node --check` + `php -l`; prueba unicamente integrada (Const. III).
**Organization**: por user story (US1/US2 P1 → US3/US4 P2). Entrega en fases internas SIN convivencia final (Const. VIII): la purga de handlers/fallbacks va en la misma feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (distintos archivos, sin dependencias)
- **[Story]**: historia del spec (US1-US4). Setup/Polish sin label.

## Phase 1: Setup

- [ ] T001 Verificar rama `002-galeria-engine` en ambos repos (textmuy + plugin) con 001 commiteado y tree limpio
- [ ] T002 [P] Linea base: `node tests/*.test.js` 10/10 + `node --check` + `php -l` (plugin) en verde antes de tocar codigo

## Phase 2: User Story 1 — Motor unico PHP (P1)

**Goal**: clase `TM_Galeria` absorbe helpers y expone `op=listar|alta|baja|editar|sprite|miniatura` por `action=tm_galeria` (en paralelo a handlers viejos hasta US2; convivencia solo transitoria dentro de la feature).

- [ ] T003 Crear `inc/class-tm-galeria.php` (clase `TM_Galeria`): dirs `tm/{fonts,img,presets}` (seed lazy), `catalogo()/guardar_catalogo()`, `tupla_alta/tupla_baja/tupla_id_de_file`, `listar($ambito)` (merge catalogo+fisicos), `alta/baja/editar` por ambito, `sprite($ambito,$file)` (persiste `thumbs.webp`, limpia restos `sprite.*`), `miniatura($nombre,$file)` (tm/img plano), `nombre_seguro`, `firma_imagen_valida`, `firma_fuente_valida`; responde JSON causas `motor:<op>:<motivo>` (`contracts/errors.md`)
- [ ] T004 Registrar en `personalizador-pdf.php`: UN `add_action('admin_post_tm_galeria', ...)` con dispatch por `op` (whitelist), nonce unico `tm_galeria`, capability `manage_options` (contrato `contracts/motor-contract.md`)
- [ ] T005 Validar motor aislado: `php -l` + prueba CLI de la clase (catalogo seed, alta con hueco, baja tombstone, listar) — sin tocar handlers viejos todavia

## Phase 3: User Story 2 — Puente del modulo migrado (P1)

**Goal**: modulo opera SOLO via `action=tm_galeria&op=...`; handlers sueltos y claves viejas del puente eliminados.

- [ ] T006 Crear `js/motor.js` (cliente unificado): `TMMotor.listar(scope)/alta(scope,payload)/baja(scope,nombre)/editar(scope,payload)/sprite(scope,blob)/miniatura(nombre,blob)` via `bridge.urls.motorUrl + nonces.motor`; sin fallbacks
- [ ] T007 Migrar `js/preset-manager.js`: savePreset/deletePreset (scope presets) y uploadImage/deleteImage/moverImagen/moverFuente (scope img/fonts) via TMMotor; PURGAR `descargarTxm`, `legacyLocalPresets`, `migrateLegacyPresets` y base fallback `'presets/'`
- [ ] T008 Migrar `js/galeria.js` (listado via `op=listar`, sin merge bridge), `js/fonts.js` (sin base `'fonts/'`), `js/api.js` (sin base `'presets/'`), `js/fuentes-galeria.js` (sin fallback)
- [ ] T009 `assets/miniaturas.js` + `assets/admin.js`: endpoint motor con `op=sprite`/`op=miniatura` (config via puente); sin data-URL
- [ ] T010 Puente `admin/estilos-texto.php`: `urls.motor` + `nonces.motor` + `bases` + `miniaturas`; ELIMINAR claves viejas (`guardarPreset/borrarPreset/subirImagen/borrarImagen/cambiarImagen/subirFuente/borrarFuente/cambiarFuente/guardarSprite/guardarMiniatura`)
- [ ] T011 (plugin) ELIMINAR handlers sueltos `admin_post_personalizador_pdf_textmuy_*` y `guardar_sprite`/`guardar_miniatura` de `personalizador-pdf.php` (la logica ya vive en la clase); mantener miniatura de grupos PDF via `op=miniatura`
- [ ] T012 Validar US1+US2: `php -l`, `node --check`, suites 10/10, grep `SC-001` (cero `admin_post_personalizador_pdf_textmuy_*` en JS)

## Phase 4: User Story 3 — Purga standalone (P2)

- [ ] T013 (modulo) Estado de error claro sin puente: bloque visible en `index.html` + gating en `js/main.js` (cero fetches locales)
- [ ] T014 [P] (modulo) Purga `usarLocalEmbebida` en `js/controls.js` (sin data-URL: error accionable)
- [ ] T015 [P] (modulo) Purga bases relativas restantes (`'img/'` en `js/galeria.js`/`js/api.js`) y fallbacks de `moverImagen`
- [ ] T016 Validar US3: grep limpio (`SC-002`), editor sin puente = error claro (manual)

## Phase 5: User Story 4 — Purga formato anterior (P2)

- [ ] T017 `js/catalog.js`: `parseCats` sin split de separadores (entrada con separadores → `invalid` con causa `ambito:id:cats formato anterior`)
- [ ] T018 [P] `tests/catalog-unified.test.js`: caso "cats string multi" pasa a `invalid`; default `custom` vigente; suites al dia
- [ ] T019 (plugin+modulo) Scopes sin alias: eliminar `imagenes→img`/`fuentes→fonts` del PHP y normalizar scopes enviados por el modulo (`img|fonts|presets`)
- [ ] T020 Validar US4: grep sin split de separadores en `parseCats`, sin alias en PHP/JS, suites verdes

## Phase 6: Polish

- [ ] T021 `?v=RC27` → `?v=RC28` en `index.html` y `render-core.html`
- [ ] T022 Desplegar modulo a `modules/textmuy/` (LEEME.md) en la rama 002 del plugin
- [ ] T023 Docs: AGENTS.md (modulo + plugin) y LEEME.md a Const. v3.0.1 + endpoint motor
- [ ] T024 Validacion final: `node tests/*.test.js` 10/10 + `node --check` + `php -l` + grep SC-001/SC-002 + quickstart.md end-to-end integrado

## Dependencies & Execution Order

- Setup (T001-T002) → US1 (T003-T005) → US2 (T006-T012) → US3 (T013-T016) ∥ US4 (T017-T020) → Polish (T021-T024).
- T003-T005 pueden convivir transitoriamente con handlers viejos; la purga (T010-T011, T013-T020) es MISMA entrega (Const. VIII).
- T007-T009 tocan archivos distintos (paralelizables tras T006).

## Notes

- Causas de rechazo: `contracts/errors.md` (`motor:<op>:<motivo>`).
- Sin compatibilidad hacia atras: handlers, claves del puente, alias y fallbacks NO vuelven (Const. VIII).
- El formato de datos NO cambia (tuplas v5.0, tombstone, `thumbs.webp`, seed lazy).