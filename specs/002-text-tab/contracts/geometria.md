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
- **R-G1.2**: El avance entre la linea i y la i+1 es
  `(cola_i + asta_{i+1}) * (1 + lineHeight[i+1]/100)`, donde `lineHeight` es un
  porcentaje con base **0% = ajuste justo** (sin hueco y sin solape). Ver
  R-G1.5 y contracts/lineas.md R-L4.5.
- **R-G1.3**: Con tamanos por linea distintos, las Y usan avances acumulados
  (cada linea aporta su propio avance). Con `lineHeight >= 0%` las lineas **nunca
  se superponen** por construccion: el avance incluye la cola de la linea de
  arriba y el asta de la de abajo. Con valores negativos el usuario puede
  superponerlas a proposito.
- **R-G1.4**: El area util es canvas menos padding, con padding contra el
  **lado menor** y minimo garantizado: el texto se achica pero nunca
  desaparece (US3).
- **R-G1.5**: El avance lo controla la linea de **arriba de cada par** (la que
  tiene linea encima), no la de abajo: el aire *anterior* a una linea es suyo.
  L1 no tiene linea encima y por eso su `lineHeight` se guarda pero no mueve
  nada (FR-021).
- **R-G1.6**: La base `cola + asta` se mide con la tipografia **de cada linea**
  (ya resuelto). Es lo que hace que con tipografias de metricas muy distintas
  (una fuente de pincel con astas largas, por ejemplo) el "normal" sea
  proporcional a lo que la tinta pide de verdad. Con una sola tipografia esa
  base da el tamano de linea y `0%` reproduce el comportamiento historico.

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