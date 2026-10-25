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
---

## 3. Pipeline por linea (bloque D4, pendiente)

**Estado**: pendiente y **bloqueado** por la decision de §3.2. Hoy `rotate` y `distort`
son **globales de bloque** y se aplican al conjunto compuesto **al final** del render
(`contracts/lineas.md` §4). La constitucion IV ya declara la rotacion y la curva como
parte del alcance **por linea**: este bloque no cambia la gobernanza, la **cumple**.

### 3.1 Orden obligatorio (una capa por linea)

1. Cada linea se compone con su **estilo resuelto** (relleno, contorno, sombra, relieve,
   texto) en una capa PROPIA (hoy: una sola capa para todo el bloque).
2. Al pintar esa capa se aplica **su** giro y **su** curva (los de esa linea), no los del
   bloque.
3. Recien despues se **apila** el bloque con la geometria de §1 (baselines y avances
   acumulados): apilar no cambia el orden de las lineas, ni sus tamaños, ni su giro.
4. Recorte por tinta real + **encaje final** (§2) sobre el **bloque**, una sola vez.

- **R-G3.1**: el giro/curva de una linea se aplica **antes** de apilarla; ninguna etapa
  posterior (apilado, recorte, encaje) lo reaplica ni lo reinvierte.
- **R-G3.2**: la geometria del bloque (§1) **no cambia**: los avances siguen saliendo de
  los tamaños resueltos y L1 sigue anclando. Con `rotate`/`distort` en su valor base el
  resultado es **identico** al de hoy (los presets existentes no se mueven).
- **R-G3.3**: el **encaje es del bloque** (una sola escala al final): asi los ratios
  entre lineas se conservan aunque cada una tenga su propio angulo (R-G2.1 a R-G2.3).
- **R-G3.4**: el ajuste de tamaño y el tope se calculan con el **giro aplicado** de cada
  linea ("lo calculado es lo pintado", R-G1.1), igual que `autoFitText` ya hace con el
  giro del bloque.

### 3.2 Decision pendiente (bloquea la implementacion)

El **valor** que declara una linea, ¿**reemplaza** el de ALL o se **suma** a el?

- **Reemplaza** (coherente con el resto del modelo: color, fuente, tamaño, tope): para
  `ALL 90` + L1 al 100 hay que escribir `100`; el `+10` del ejemplo no existe como tal.
- **Suma** (lo que sugieren los ejemplos `ALL 90 + L1 +10 -> \/`): la linea declara un
  **delta** respecto de ALL, y ese unico eje se comporta distinto a los otros veinte.

La decision fija el paso 2 de la resolucion (`contracts/lineas.md` §1.1), el significado
del dato en el `.txm` y lo que muestra la UI. **No se implementa nada hasta cerrarla**:
sacar `rotate`/`distort` de la tabla global sin partir el pipeline haria que el control
por linea **acepte el valor y no haga nada**, que es peor que dejarlos globales. Las dos
opciones son implementables; la segunda exige declarar que esas dos rutas son
**relativas** en la resolucion por linea.