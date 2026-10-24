# Contrato: Puerta de pixeles del editor visible (harness de navegador)

**Feature**: `002-text-tab` | **Plan**: [plan.md](../plan.md)

Contrato de la suite `tests/text-tab.browser.js`, que convierte SC-001 a SC-007 en
mediciones de pixeles sobre el DOM REAL del editor (`index.html`) con el puente y los
assets simulados. Cubre lo que Node no puede ver: la tinta del lienzo visible y el
gating de pestanas con DOM real. NO sustituye el recorrido en WordPress (quickstart §4):
la paridad editor/PDF sigue siendo puerta manual.

---

## 1. Harness (R-P1)

- **R-P1.1**: Chrome via Playwright (`TEXTMUY_CHROME`), `headless: true`, patron de
  `tests/galerias.browser.js`. Si la spec 009 extrae un harness compartido, se REUSA:
  prohibido duplicar el bootstrap (jscpd).
- **R-P1.2**: se carga el `index.html` real del modulo (DOM de las pestanas, lienzo,
  `#tt-line-target-bar`, inputs), no un div sintetico: SC-002 mide visibilidad real.
- **R-P1.3**: puente simulado (`textmuy-bridge` + `textmuy-bridge-ready`) con
  `urls.{motor,miniaturas,presetsBase,fuentesBase,imagenesBase}` y un catalogo `fonts`
  de al menos 3 identidades (1 Google + 2 fisicas) para poder encadenar `font.src` por
  linea y el proxy de recursos sin puente real.
- **R-P1.4**: cero red real. Fuera de `textmuy.test` responde el stub; Google devuelve
  un `@font-face` con `src: local("Arial")`. `fetch` simulado + espia de `FontFace`.
- **R-P1.5**: la tinta se mide sobre el lienzo VISIBLE (el editor pinta el damero
  `#1a1a1a`/`#222`): tinta = pixel distinto de esos dos tonos. Con rotacion o curva se
  mide el lienzo completo, nunca por filas (AGENTS §7.14).
- **R-P1.6**: determinismo: lienzo fijo `800x400`, **muestra uniforme en tinta** (`I`) y
  fondo apagado; la tipografia se resuelve antes de medir y la hoja simulada mapea la
  familia del catalogo a `local("Arial")`. `render()` es idempotente (dos renders seguidos
  dan 0 px distintos, medido): la comparacion de pixeles es una senal valida.

## 2. SC-001 - la curva muestra texto curvado (US1, FR-001, R-C1.1/R-C1.5)

- **R-P2.1**: curva al maximo positivo => tinta > 0 y el BORDE SUPERIOR de la tinta deja
  de ser plano: con la muestra uniforme el recto mide rango 0 px y +120 grados 53 px
  (+-360: 90 px). Umbral: recto <= 15 px, curvado >= 30 px.
- **R-P2.5**: esa metrica exige muestra uniforme en tinta (R-P1.6): con glifos de formas
  distintas (el traversano del `H`, la horquilla de la `Y`) NO es invariante y el recto ya
  daria decenas de px (medido 81 px con `HHHH`).
- **R-P2.2**: el signo opuesto tambien dobla (rango >= 30 px, medido 144) y NO es el mismo
  render: la barra se comprime o se estira (+120 = 25.884 px de tinta, -120 = 79.829, x3,09;
  umbral x1,5). El espejo fino del signo (matriz y geometria del motor) lo fija la capa Node
  (`curva-snapshot.test.js`): en la proyeccion de pixeles lo observable es el escorzo, no una
  inversion del perfil.
- **R-P2.3**: volver a 0 restituye la geometria recta dentro de la tolerancia sub-pixel
  del redondeo entero del arco (medido): |tinta(0) - tinta(recto)| <= 5 px (1 px), <= 1% de px
  distintos del lienzo (39 de 320.000, delta max 45) y el borde superior vuelve a ser plano
  (rango <= 15 px). La igualdad byte a byte NO es el invariante: el render es idempotente,
  pero el ida y vuelta por el arco deja ese residuo de antialiasing.
- **R-P2.4**: NO se repite aca el rechazo headless sin WebGL (`curva-sin-webgl.test.js`
  lo fija en Node): la puerta de pixeles solo cubre el editor visible.

## 3. SC-002 - la barra de lineas se ve al abrir (US2, FR-002)

- **R-P3.1**: al terminar el arranque, con TEXT activa y sin ninguna interaccion,
  `#tt-line-target-bar` no tiene `hidden` ni `display:none` computado.
- **R-P3.2**: STYLES e ICON la mantienen visible; BACKGROUND y DOWNLOAD la ocultan
  (medido sobre visibilidad computada, no sobre el atributo).
- **R-P3.3**: `[data-global-only]` (grupo Canvas Size) visible en All y oculto con
  L1/L2/L3 activo, en la misma apertura.

## 4. SC-003 - el margen achica sin matar el texto (US3, FR-003/FR-004, R-G1.4)

- **R-P4.1**: Margin al MAXIMO => tinta > 0 (cero lienzos vacios).
- **R-P4.2**: la caja de tinta cabe en el area util calculada con el lado MENOR del
  lienzo (margen topado, R-G1.4).

## 5. SC-004 - cero tinta en el borde (US4, FR-005, R-G2.1 a R-G2.4)

- **R-P5.1**: texto largo multilinea, con y sin rotacion => 0 px de tinta en la fila 0,
  la fila `h-1`, la columna 0 y la columna `w-1`.
- **R-P5.2**: con Margin 0 (peor caso) tambien: el margen de seguridad de 2 px por lado
  (R-G2.1) sostiene el invariante.
- **R-P5.3**: margen alto + curva + texto largo combinados => el texto sigue entrando.

## 6. SC-005 - una sola linea es invariante al line height (US5, FR-007/FR-008/FR-021, R-G1.2)

- **R-P6.1**: con una linea, barrer Line height de 0% a +200% => la caja de tinta no se
  mueve ni cambia de tamano (+-1 px).
- **R-P6.2**: con dos lineas, L1 no se mueve y solo L2 se desplaza (L1 ancla el bloque).

## 7. SC-006 / SC-007 - tres lineas con estilo propio (US6, FR-009 a FR-019)

- **R-P7.1**: cambiar fuente, color y tamano en L2 => solo L2 cambia; L1 y L3 conservan
  tinta dominante y posicion.
- **R-P7.2**: L2 al 80% de L1 y agrandar L1 => L2 mantiene 80% EXACTO: con la MISMA
  identidad, alto de tinta L2/L1 = 0.8 +-3%; con identidades distintas, el RATIO L2/L1 se
  mantiene constante +-3% (lo que se conserva es la proporcion, no el alto en px).
- **R-P7.3**: L3 heredando de L2 sin delta propio => cambiar el color de L2 cambia la
  tinta dominante de L3.
- **R-P7.4**: alternar All/L1/L2/L3 => el lienzo NO cambia (`hash` identico).
- **R-P7.5**: reducir el texto a una linea y recuperar las tres => los estilos de L2/L3
  reaparecen (nada se poda).
- **R-P7.6**: round-trip real sin motor: `diffSettings` -> `settingsFromDelta` del estado
  con tres lineas => estado equivalente y mismo `hash` al repintar.

## 8. Cierre y evidencia (R-P8)

- **R-P8.1**: exito imprime `OK: text-tab.browser.js (...)`; un fallo sale con codigo != 0
  y el assert NOMBRA el requisito (p.ej. R-P7.2) y los valores medidos.
- **R-P8.2**: el acumulado de `page.on("pageerror")` MUST quedar vacio al final.
- **R-P8.3**: vive en `tests/*.browser.js`: NO entra en el glob de `node tests/*.test.js`
  ni exige Playwright en el repo. Su corrida se documenta en `quickstart.md` §1 y la
  evidencia (capturas y fechas) en §2 y §5.

## 9. Fuera de alcance

- Paridad editor/PDF (FR-020): puerta manual en WordPress (quickstart §4).
- Catalogos, hojas y galerias (spec 009 y `tests/galerias.browser.js`).
- Ruta headless sin WebGL (Node: `curva-sin-webgl.test.js`).
- Rendimiento de repintado: se mide el estado resultante, no el tiempo de tecleo.