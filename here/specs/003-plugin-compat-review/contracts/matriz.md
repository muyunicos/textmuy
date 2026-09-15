# Contract: formato del artefacto matriz.md

**Fecha**: 2026-09-14 | Define el único entregable nuevo de la revisión (FR-013 / Clarificación Q1): `here/specs/003-plugin-compat-review/matriz.md`.

## Estructura obligatoria

```markdown
# Matriz de compatibilidad plugin ↔ TextMuy

**Feature**: 003-plugin-compat-review | **Fecha**: <fecha de cierre>
**Estado**: <PASS n / FAIL corregido n / CONDICIONADO n>

## 1. Matriz de puntos de contrato
(al menos una tabla por bloque B1–B11 de research.md)

| ID | Punto de contrato | Estado | Evidencia |
|----|-------------------|--------|-----------|
| PC-001 | <descripción> | PASS | <comando/observación> |

Estados válidos: PASS · FAIL · CONDICIONADO (con dependencia anotada).
Ningún punto "sin evaluar" al cierre.

## 2. Hallazgos

| ID | Punto | Severidad | Esperado | Observado | Resolución | Corrección |
|----|-------|-----------|----------|-----------|------------|------------|
| H-001 | PC-007 | MENOR | ... | ... | CORREGIDO_EN_REVISION | js/api.js (una línea) |

Severidades: BLOQUEANTE · MENOR · DOCUMENTAL.
Todo BLOQUEANTE debe quedar CORREGIDO_EN_REVISION.

## 3. Verificaciones de paridad

| Caso | Dimensiones iguales | Equivalencia visual | Nota |
|------|---------------------|---------------------|------|
| <estilo+texto> | sí | sí | |

## 4. Correcciones documentales aplicadas
(lista de archivos de documentación tocados y qué contradicción cerraba cada uno)

## 5. Pendientes registrados
(hallazgos REGISTRADO con su severidad y punto; vacío si no hay)
```

## Reglas del formato

- Los IDs `PC-nnn` y `H-nnn` son estables: no se renumeran entre sesiones.
- Toda fila `FAIL` final es inválida: si quedó FAIL, se corrige o el documento no cierra (FR-008/FR-009).
- La evidencia debe ser reproducible: comando exacto, paso manual o captura referenciada.
- El resumen de conteos del encabezado debe coincidir con las tablas.
