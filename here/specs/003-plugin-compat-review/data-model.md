# Data Model: plugin-compat-review

**Fecha**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

Entidades de la revisión (no hay cambios en el modelo de datos del sistema revisado: la revisión no altera catálogos, `.txm` ni el puente).

## PuntoDeContrato

Unidad verificable de la matriz.

| Atributo | Descripción |
|---|---|
| `id` | `PC-nnn` (secuencial, estable entre sesiones) |
| `bloque` | B1–B11 (ver research.md) |
| `descripcion` | Compromiso verificable en lenguaje del contrato |
| `fuente` | Documento(s) y archivo(s) que lo definen |
| `estado` | `PASS` \| `FAIL` \| `CONDICIONADO` |
| `evidencia` | Comando, captura u observación que sostiene el estado |

Reglas: ningún punto queda `sin evaluar` al cierre (SC-001); `CONDICIONADO` exige anotar la dependencia (dato del administrador no disponible).

## Hallazgo

| Atributo | Descripción |
|---|---|
| `id` | `H-nnn` |
| `punto` | `PC-nnn` afectado |
| `severidad` | `BLOQUEANTE` (rompe el circuito P1) \| `MENOR` \| `DOCUMENTAL` |
| `esperado` / `observado` | Comportamiento según contrato vs real |
| `resolucion` | `CORREGIDO_EN_REVISION` \| `REGISTRADO` |
| `correccion` | Archivo(s) tocados y en qué consistió (si aplica) |

Reglas: `BLOQUEANTE` MUST quedar `CORREGIDO_EN_REVISION` (FR-008); `MENOR`/`DOCUMENTAL` solo se corrigen si el cambio es contenido a un archivo sin tocar contrato ni interfaz (FR-009 / Q3); si el arreglo exige cambiar el contrato → `REGISTRADO` (FR-011).

## VerificacionDeParidad

| Atributo | Descripción |
|---|---|
| `caso` | Estilo + texto del conjunto representativo (relleno simple, relleno imagen, contorno, sombras, relieve, distorsión, icono, fondo, líneas L1-L3) |
| `dimensiones_iguales` | bool (editor vs render sin interfaz) |
| `equivalencia_visual` | bool |
| `nota` | Diferencias observadas, si las hay |

Regla: 100% de casos con ambas propiedades verdaderas (SC-003).

## Matriz

El entregable central: lista ordenada de `PuntoDeContrato` agrupados por bloque + tabla de `Hallazgo` + resumen de conteos (PASS / FAIL corregido / CONDICIONADO). Formato en [contracts/matriz.md](./contracts/matriz.md).

## Transiciones de estado

```
PuntoDeContrato: (sin evaluar) → PASS | FAIL | CONDICIONADO
FAIL ──(corrección contenida)──► re-verificación ──► PASS
Hallazgo: (registrado) → CORREGIDO_EN_REVISION | REGISTRADO
```

Toda corrección de JS implica: bump `?v=RCn` en `index.html` y `render-core.html` + suites Node + verificación integrada antes de marcar PASS.
