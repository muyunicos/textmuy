# Implementation Plan: Motor de Galerias del Plugin (Const. VII)

**Branch**: `002-galeria-engine` | **Spec**: `spec.md` | **Created**: 2026-09-12

**Input**: Feature specification de `here/specs/002-galeria-engine/spec.md`
(US1-4 P1/P1/P2/P2; FR-001..008; SC-001..004).

**Nota de ruta**: el motor vive SOLO en el plugin
(`C:\Users\Jonatan\Documents\GitHub\personalizador-pdf\personalizador-pdf`);
el modulo (`textmuy`) es consumidor via puente. Datos en
`wp-content/uploads/tm/{fonts,img,presets}/` (ubicacion unica, feature 001).
Se recomienda rama `002-galeria-engine` tras commit de 001.

## Summary

Centralizar TODAS las operaciones de galeria de `uploads/tm/` en una clase PHP
unica (`TM_Galeria`) expuesta por UN endpoint `action=tm_galeria` con `op=`,
migrar el puente del modulo a ese endpoint, eliminar los handlers sueltos y
purgar los fallbacks standalone/legacy del modulo (Const. III/VII/VIII). Sin
cambio de formato de datos ni de comportamiento observable (salvo el estado de
error sin puente).

## Technical Context

**Language/Version**: PHP 7.4+ (WP plugin, sin dependencias) + Vanilla JS
modulo (IIFE ES5, sin build). Node 18+ SOLO testing.

**Primary Dependencies**: WordPress (admin-post + nonce + capability
`manage_options`). ThumbEngine (cliente, render de miniaturas — Const. VII:
PROHIBIDO renderizador server-side). Sin frameworks.

**Storage**: `uploads/tm/{fonts,img,presets}/` — tuplas v5.0
`[id,title,cats,file]`, catalogo `{thumbs:{w,h,c},items}`, `thumbs.webp`
unico por ambito, seed lazy (heredado de 001; sin migraciones).

**Testing**: `node tests/*.test.js` (10 suites; `catalog-unified` se ajusta a
la purga de `parseCats`) + `node --check` + `php -l`. Prueba: unicamente
integrada (Const. III v3.0.0).

**Constraints**: Todo cambio JS del modulo MUST subir `?v=RCn` (RC27 → RC28).
UI espanol, codigo sin tildes. Sin compatibilidad hacia atras (Const. VIII):
handlers viejos y fallbacks se purgan en la misma entrega. `pdfs/`/datasets
FUERA del motor.

**Scale/Scope**: 3 ambitos, ~72 fuentes + ~128 imagenes + 10 presets. A tocar:
plugin (`inc/class-tm-galeria.php` nuevo, `personalizador-pdf.php`,
`admin/estilos-texto.php`, `assets/miniaturas.js`), modulo (`js/preset-manager.js`,
`js/api.js`, `js/fonts.js`, `js/galeria.js`, `js/controls.js`, `js/catalog.js`,
`js/fuentes-galeria.js`, `js/main.js`, `index.html`, `render-core.html`,
`tests/`), docs (AGENTS.md x2, LEEME).

## Constitution Check (v3.0.1)

*GATE pre-Phase 0:*

- **I. Editor como medio, API como fin**: PASS — no cambia UI ni render; solo
  la capa de transporte/escritura.
- **II. API de Render (NON-NEGOTIABLE)**: PASS — `renderBatch` intacto,
  fail-fast con causa; `render-core.html` en paridad (carga el mismo JS).
- **III. Integrado WordPress UNICO**: PASS — el plan ELIMINA los fallbacks
  standalone del modulo (US3) y define el estado de error sin puente.
- **IV. Preset Delta + Catalogos Unicos**: PASS — formato sin cambios; purga
  de la lectura de separadores (US4, Const. IV v3.0.1).
- **V. 100% Libre y alcance cerrado**: PASS — sin UI nueva ni alcance extra.
- **VI. Fail-fast y calidad**: PASS — rechazos con causa `motor:<op>:<motivo>`;
  suites + node --check + php -l.
- **VII. Motor de Galerias**: PASS POR CONSTRUCCION — esta feature ES el motor
  (clase unica + endpoint unico `op=`; handlers sueltos purgados).
- **VIII. Cero Legado**: PASS POR CONSTRUCCION — purga en la misma entrega
  (handlers, fallbacks, alias, parseCats).

**Re-chequeo post-Phase 0**: el diseno no agrega violaciones; Complexity
Tracking vacio.

## Project Structure

### Documentation (this feature)

```text
here/specs/002-galeria-engine/
├── spec.md / plan.md / research.md / data-model.md / quickstart.md
└── contracts/
    ├── motor-contract.md    (clase PHP + endpoint op= — lado plugin)
    ├── bridge-contract.md   (puente/JS del modulo — lado consumidor)
    └── errors.md            (causas motor:<op>:<motivo>)
```

### Source Code

```text
personalizador-pdf/
├── inc/class-tm-galeria.php   (NUEVO: motor unico)
├── personalizador-pdf.php     (registro del endpoint; handlers sueltos ELIMINADOS)
├── admin/estilos-texto.php    (puente: motorUrl + nonce)
└── assets/miniaturas.js       (endpoint config; sin data-URL)
textmuy/
├── js/preset-manager.js       (ops via motor; purga descargarTxm/migrate/base)
├── js/api.js js/fonts.js js/galeria.js  (purga de bases relativas)
├── js/controls.js             (purga usarLocalEmbebida; error claro sin puente)
├── js/catalog.js js/fuentes-galeria.js js/main.js
├── index.html render-core.html (RC28)
└── tests/                     (parseCats purgado)
```

## Phases

### Phase 0: Research

Ver `research.md` (decisiones R1-R9; todas resueltas por decision del usuario
y Const. VII/VIII; sin NEEDS CLARIFICATION).

### Phase 1: Design & Contracts

- `data-model.md`: entidades (Ambito, Tupla, Catalogo, Fisico, Sprite,
  Operacion) — heredadas de 001, sin cambios de forma.
- `contracts/`: `motor-contract.md` (clase + endpoint), `bridge-contract.md`
  (consumidor), `errors.md` (causas).
- `quickstart.md`: validacion integrada end-to-end.

## Complexity Tracking

Vacio (sin violaciones; el plan implementa directamente Const. VII/VIII).