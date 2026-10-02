# Specification Quality Checklist: Correccion de bugs de fuentes y presets del editor

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] CHK001 No implementation details (languages, frameworks, APIs)
- [x] CHK002 Focused on user value and business needs
- [x] CHK003 Written for non-technical stakeholders
- [x] CHK004 All mandatory sections completed

## Requirement Completeness

- [x] CHK005 No [NEEDS CLARIFICATION] markers remain
- [x] CHK006 Requirements are testable and unambiguous
- [x] CHK007 Success criteria are measurable
- [x] CHK008 Success criteria are technology-agnostic (no implementation details)
- [x] CHK009 All acceptance scenarios are defined
- [x] CHK010 Edge cases are identified
- [x] CHK011 Scope is clearly bounded
- [x] CHK012 Dependencies and assumptions identified

## Feature Readiness

- [x] CHK013 All functional requirements have clear acceptance criteria
- [x] CHK014 User scenarios cover primary flows
- [x] CHK015 Feature meets measurable outcomes defined in Success Criteria
- [x] CHK016 No implementation details leak into specification

## Notes

**Validation pass 1 (2026-10-01).** All 16 items pass.

- The three reported symptoms are covered by three independent user stories:
  the phantom font on first paint and on repaint (P1), the missing live preview
  in the font gallery (P2), and the duplicated/ambiguous source of truth (P3).
  Each story states an independent test that does not depend on the others.
- Requirements deliberately avoid naming files, functions, CSS properties or
  third-party libraries. The "font identity", "load state" and "temporary
  preview" entities are described as behaviour, not as data structures.
- FR-012 and FR-013 encode the project constitution rule that a missing
  dependency must fail visibly rather than be silently substituted. This is
  a governance constraint already in force, not a new decision, so it is not
  marked as a clarification.
- No clarification markers were needed: the constitution, AGENTS.md and the
  catalogue format already fix the canonical reference form for a font, the
  fail-fast policy and the reload-versioning rule, leaving no open product
  decision that changes scope, security or user experience.
- Out-of-scope items were added explicitly so later planning does not absorb
  unrelated catalogue, gallery or export work.

**Validation pass 2 (2026-10-01), after the preset round-trip report.**

Added User Story 4 (P1), requirements FR-015 to FR-020, success criteria SC-009
to SC-011, seven preset edge cases, two new entities and three assumptions. All
16 items still pass; the new content was reviewed against the same criteria.

- The report "I saved a preset with a colour and loading it shows the colour from
  the current view" is covered by US4 scenario 1. The user chose the broad fix:
  loading a preset replaces the view instead of writing over it, so no field absent
  from the preset can survive from the previous view.
- The scope question was settled by evidence rather than assumption: the stored
  file was verified to contain the colour correctly, so the defect is in reading,
  not in saving. This is recorded in the assumptions, and migration or
  regeneration of existing files is explicitly out of scope.
- The report "the font list shows duplicates and the top ones do not work" was
  inspected and maps onto US3, which already requires a single identity per font
  regardless of the selection path. It is covered and needs no separate story.
- FR-019 exists so planning does not treat a format change as in scope: existing
  files on the server must keep loading unchanged.
- One item is verified as testable only in the integrated environment, not in the
  automated suites: the preset load path is shared by the editor, the TextStudio
  import and the headless PDF render engine, so FR-020 must be confirmed manually
  in WordPress during implementation. This is noted here so the gap is not
  mistaken for missing coverage.

**Verificacion de la implementacion (2026-10-02).**

Revision del codigo tras implementar las cuatro historias, con suites nuevas. Todos
los criterios siguen en PASS.

- Hallazgo 1: el camino de SALIDA (export del PNG y miniatura del preset) dibujaba
  sin esperar a la fuente, con lo que podia producir una imagen con la tipografia
  del sistema. Corregido con un render que espera la fuente declarada y RECHAZA
  con causa si no puede, en vez de dibujar con otra.
- Hallazgo 2: confirmar la previsualizacion en la galeria no soltaba la fuente
  explorada, con lo que el lienzo podia quedar con una tipografia distinta de la
  que el selector declaraba. Corregido.
- Hallazgo 3: la garantia de fuente de la ruta de la API se tragaba el fallo y
  seguia adelante, es decir una sustitucion silenciosa prohibida por la
  constitucion. Ahora el fallo se propaga con causa.
- Correccion de una reportacion propia previa: se senalo un fallo en la guarda
  de aviso de fuente que no existia (la condicion ya era correcta). Verificado
  contra el codigo antes de tocar nada, y descartado.
- Al escribir las pruebas de regresion aparecieron referencias al cargador de
  fuentes sin el prefijo window. en el editor: funcionan en el navegador pero
  no en Node, por eso nunca se habian detectado. Se normalizaron en todos los
  modulos afectados.
- Estado: 21 suites en verde, sintaxis limpia, version de recarga coherente en los
  tres sitios (RC40).
- Sigue PENDIENTE la verificacion integrada en WordPress (T049 y T050), que no es
  automatizable: incluye comprobar que el PDF renderizado coincide con la vista.

**Reviewer note**: this checklist records requirements quality only. It does not
assert that any fix has been implemented.
