# Contrato: Geometria unica de bloque (ajuste = dibujo)

**Feature**: `002-text-tab` | **Plan**: [plan.md](../plan.md)

Contrato del modelo de bloque compartido por el ajuste de tamano y todos
los motores de dibujo. Cubre US3, US4, US5 y FR-003 a FR-008, FR-021. Es
interno al modulo.

---

## 1. Modelo de bloque

### 1.1 Requisitos

- **R-G1.1**: Una sola definicion de origen, avances y baselines por tinta,
  usada por el ajuste (`autoFitText` y equivalentes) y por todos los
  motores (`drawTextLines`, `drawFillUnits`, sombras, icono, metricas de
  bloque). Lo calculado es lo pintado.
- **R-G1.2**: Cada linea i>1 se coloca a `lineHeight[i] * tamano[i-1]`
  debajo de la anterior; L1 ancla el bloque (su `lineHeight` se guarda pero
  no la mueve).
- **R-G1.3**: Con tamanos por linea distintos, las Y usan avances acumulados
  (cada linea aporta su propio avance); las lineas nunca se superponen por
  construccion.
- **R-G1.4**: El area util es canvas menos padding, con padding contra el
  **lado menor** y minimo garantizado: el texto se achica pero nunca
  desaparece (US3).

---

## 2. Encaje final

### 2.1 Requisitos

- **R-G2.1**: Tras componer la capa final (con o sin curva/rotacion), el
  conjunto se escala a la caja disponible con un margen de seguridad de
  pocos pixeles, **siempre** (no solo cuando hubo recorte).
- **R-G2.2**: El encaje solo reduce, nunca amplia: no compite con el ajuste.
- **R-G2.3**: El tamano de salida sigue siendo exactamente
  `settings.canvas.width/height` (el encaje es interno, no cambia el
  lienzo).
- **R-G2.4**: Criterio verificable: cero tinta en las filas y columnas del
  borde con cualquier combinacion de layout (SC-004).