# Contract: formato del artefacto matriz.md

**Fecha**: 2026-09-14 | Define el único entregable nuevo de la revisión (FR-011 / Clarificación Q1): `here/specs/003-plugin-compat-review/matriz.md`.

## Estructura obligatoria

```markdown
# Matriz de compatibilidad plugin ↔ TextMuy

**Feature**: 003-plugin-compat-review | **Fecha**: <fecha de cierre>
**Estado**: <PASS n / FAIL corregido n / CONDICIONADO n>

## 0. Entorno y prerrequisitos (opcional)
(estado de los datos del administrador y del entorno de ejecución)

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

Severidades: BLOQUEANTE (código) · BLOQUEANTE-DATOS (rompe el circuito para el administrador; la corrección es
una acción suya, no de código) · MENOR · DOCUMENTAL.
Todo BLOQUEANTE debe quedar CORREGIDO_EN_REVISION; todo BLOQUEANTE-DATOS queda REGISTRADO con la acción del
administrador y su punto de contrato.

### Descartados (opcional, dentro de §1 o como sección aparte)
(candidatos verificados que NO son hallazgos, con su justificación)

## 3. Verificaciones de paridad

| Caso | Dimensiones iguales | Apariencia visible (sin diferencias perceptibles) | Captura | Nota |
|------|---------------------|---------------------------------------------------|---------|------|
| <estilo+texto> | sí | sí | captura-<caso>.png | |

## 4. Correcciones documentales aplicadas
(lista de archivos de documentación tocados y qué contradicción cerraba cada uno)

## 5. Pendientes registrados
(hallazgos REGISTRADO con su severidad y punto; vacío si no hay)

## 6. Verificaciones automáticas (opcional)
(comando y resultado de la línea base y del cierre)
```

## Reglas del formato

- Los IDs `PC-nnn` y `H-nnn` son estables: no se renumeran entre sesiones.
- Toda fila `FAIL` final es inválida: si quedó FAIL, se corrige o el documento no cierra (FR-008/FR-009).
- La evidencia debe ser reproducible: comando exacto, paso manual o captura referenciada.
- El resumen de conteos del encabezado debe coincidir con las tablas.
- Los estados de §1 y §5 son espejo: §5 solo lista pendientes accionables y referencia a §1/§2 (sin duplicar tablas).
