# Quickstart: Validacion de la correccion de la pestana TEXT

**Feature**: `002-text-tab` | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-04

Guia de validacion ejecutable del feature. Cubre US1 a US6 (FR-001 a FR-021). Cada
escenario enlaza con el requisito y el invariante que demuestra.

La validacion tiene tres capas y **las tres son obligatorias** antes de cerrar el
feature: logica en Node, pixeles en Chrome con puente simulado, y el recorrido
integrado en la pestana del plugin (unico modo de probar el editor y la paridad
con el motor del PDF).

---

## Prerrequisitos

- **Windows + PowerShell 7 (`pwsh`)**: shell soportado para todos los comandos de esta
  guia (ver `docs/entorno-desarrollo.md`). No se asume Bash, WSL, `cmd` ni Windows
  PowerShell 5.1. **Nunca** invocar `bash`, `sh`, `wsl` ni `curl` en esta maquina
  (AGENTS.md 8.1: `bash` resuelve a un cygwin ajeno y roto).
- Node disponible **solo para pruebas unitarias**. No corre en el servidor WordPress.
- Chrome + Playwright instalados externamente para la prueba de pixeles, siguiendo el
  patron de `tests/galerias.browser.js` (variable `TEXTMUY_CHROME` para el ejecutable).
- Una instalacion de WordPress con el plugin y el modulo desplegados
  (`C:/wp-lab/wordpress` en el laboratorio) para la validacion integrada.
- Ctrl+F5 en la pestana "Estilos de Texto" tras cada despliegue: el navegador cachea
  los scripts del modulo.

---

## 1. Puertas automaticas (Node)

Ejecutar antes de considerar cualquier tarea terminada. **Las 26 suites existentes
deben seguir en verde**: el feature es correctivo y no puede romper lo que ya
funciona (el numero sube con las suites nuevas de este feature).

```powershell
# Desde la raiz del modulo.
Get-ChildItem tests -Filter *.test.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Sintaxis de todos los scripts tocados (node --check acepta un archivo por vez).
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
Get-ChildItem js\effects -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Version de recarga coherente en los dos HTML (debe ser la misma en ambos).
Select-String -Path index.html, render-core.html -Pattern '\?v=RC\d+' -AllMatches |
    ForEach-Object { $_.Matches.Value } | Sort-Object -Unique

# Texto del repo: UTF-8 sin BOM y LF (incluye este doc).
node tests\entorno.test.js
node tests\integridad-archivos.test.js
node tests\rc-bump.test.js
```

**Salida esperada**: todas las suites en `OK`, ningun error de sintaxis, una unica
version coincidente en los dos documentos y `entorno.test.js` en OK.

---

## 2. Comprobaciones de logica (Node, sin navegador)

Son la red de seguridad del feature. Cada tabla fija el contrato de los tres
documentos de `contracts/`.

### 2.1 US1 - la curva no borra el texto (R-C1, R-C2)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Snapshot antes de perder el contexto | Inspeccionar `js/effects/distort-engine.js`: el `loseContext()` ocurre **despues** del `drawImage` al canvas 2D | Orden dibujar -> copiar a 2D -> perder contexto -> devolver la copia |
| Canvas devuelto 2D | Tipo del canvas que devuelve `curveWebGL` | `HTMLCanvasElement` de contexto 2D, autocontenido (R-C1.2) |
| Angulo 0 | Curvar con angulo 0 | Devuelve la capa sin tocar, sin crear contexto WebGL (via rapida) |
| Signo espeja | Curvar con +120 y con -120 | Curvas espejadas, misma magnitud de tinta |
| Headless sin WebGL | Renderizar por la API con WebGL no disponible | **Rechaza con causa**, no usa el fallback 2D (constitucion II) |
| Editor sin WebGL | Curvar en el editor visible sin WebGL | Usa el fallback 2D (R-C2.2) |

**Tinta > 0 para todo angulo distinto de cero** sobre texto no vacio: es el criterio
que hoy falla (0 pixeles de tinta con angulo 120).

### 2.2 US2 - el selector de linea se ve al abrir (research R2)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Registro no anidado | Buscar `applyLineTargetGating` en `js/controls.js` | Registrado y llamado al nivel de `bindControls()`, **fuera** del listener de `textmuy:line-target-updated` de `GradientPicker` |
| Gating por pestana | Con target activo `All` y pestana TEXT/STYLES/ICON | `[data-line-target-bar].hidden === false` |
| Gating negativo | Con pestana BACKGROUND o DOWNLOAD | `[data-line-target-bar].hidden === true` |
| Canvas Size solo en All | Cambiar a L1/L2/L3 | Todo `[data-global-only]` queda `hidden` |
### 2.3 US3 - el margen achica sin matar el texto (R-G1.4)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Padding contra el lado menor | Canvas apaisado (800x200) con margen alto | No colapsa antes de tiempo (hoy muere con ~13%) |
| Area util minima | Margen al maximo (50%) | El texto queda reducido pero **presente**; el area util nunca llega a cero ni negativa |
| Un solo calculo | Contar los sitios que calculan `padding` | **Uno solo** (helper compartido por `autoFitText`, `render` y `lineFontSizes`) |
| Vuelta a cero | Margen 50% -> 0 | Recupera exactamente el tamano anterior |

### 2.4 US4 + US5 - geometria unica y encaje final (R-G1, R-G2)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Ajuste = dibujo | Origen, avances y baselines | **Una sola** definicion, usada por el ajuste y por todos los motores |
| Avance por linea | 3 lineas con tamanos distintos | Cada linea aporta su propio avance; nunca se superponen |
| L1 ancla el bloque | Una sola linea, Line height de 0 a 150% | Posicion y tamano **no cambian** (FR-007) |
| Avance hacia abajo | 2 lineas, Line height sube | L1 queda fija y solo L2 se desplaza hacia abajo (FR-008) |
| Sin solapes | 2 lineas, Line height al minimo | Se juntan sin superponerse ni invertirse |
| Encaje siempre | Sin rotacion y sin recorte | El encaje final corre igual (hoy solo corre en el camino con recorte) |
| Encaje solo reduce | Medir la escala aplicada | `<= 1` siempre; no compite con el ajuste |
| Tamano de salida | `settings.canvas.width/height` | Intactos: el encaje es interno (R-G2.3) |

### 2.5 US6 - resolucion por linea (R-L1, R-L2, R-L3)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Orden de resolucion | Heredar -> mezclar lo propio -> dimensionar | Fijo; la dimension va ultima (el % se calcula sobre lo ya mezclado) |
| Heredar de ALL | Linea sin `inherit` | Parte de la base tal cual |
| Heredar de linea | L3 hereda de L2 | Parte del estilo **resuelto** de L2, ya con su tamano aplicado |
| Delta disperso | Linea con un override | Solo cambia la ruta presente; lo ausente conserva lo heredado |
| Target no filtra | Cambiar de tab All/L1/L2/L3 | **No cambia lo pintado**: solo que muestran los controles (FR-009) |
| Cascada por porcentaje | L2 al 80% de L1; agrandar L1 | L2 mantiene el 80% exacto y L3 sigue a L2 (SC-007) |
| Slider reescribe | Referencia a linea, mover el tamano | Escribe el **porcentaje** (la cadena sigue viva) |
| Slider escribe px | Referencia al canvas, mover el tamano | Escribe **pixeles absolutos** (FR-012) |
| Fase 2 | La pila supera el alto util | Todas las lineas escalan por el mismo factor, proporciones intactas |
| 1-based | Claves de linea en el formato guardado | `line["1"]` = L1 (FR-019) |
| Anti-ciclo directo | L2->L3 y L3->L2 | La opcion que cerraria el ciclo esta **oculta** en el selector |
| Anti-ciclo mixto | L3 hereda de L1 mientras L1 dimensiona contra L3 | Idem, por ambas aristas y transitivo |
| Ciclo por archivo | Cargar un `.txm` editado a mano con un ciclo | **Rechaza con causa**, vista intacta, sin cuelgue ni pintado parcial |
| Linea inexistente | Texto de 3 lineas reducido a 1 | L2/L3 conservan lo guardado y se reactivan al recuperar las lineas (FR-015) |
| Referencia inexistente | `sizing.ref` a una linea que no esta | Usa lo guardado o lo de All; nunca falla el pintado |
| Fuente por linea | 3 lineas con 3 tipografias | Cada linea se mide con la suya; el desplegable muestra la del target activo (FR-018) |
| Fallo nombrado | Fuente de L2 que no carga | El fallo nombra linea y fuente; L1 y L3 se pintan igual (FR-017) |
| L1.lineHeight | Guardar `lineHeight` en L1 | Se guarda y **no mueve nada** (FR-021) |

### 2.6 Paridad editor / motor del PDF (FR-020, puerta obligatoria)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Preset con 3 lineas | Renderizar por `renderBatch` y comparar con el editor | Las tres lineas con sus estilos propios, identicos (SC-006) |
| Curva | Mismo angulo en editor y en PDF | La misma curva (US1, escenario 4) |
| Encadenado | L2 al 80% de L1 en ambos caminos | El 80% exacto en ambos (SC-007) |

---

## 3. Comprobaciones de pixeles (Chrome + Playwright, puente simulado)

Medir la tinta del lienzo, no la consola. Patron de `tests/galerias.browser.js`:
puente `postMessage` simulado (motor y miniaturas), iframe real del plugin.
La fila y la columna del borde deben quedar **a cero pixeles de tinta**: el encaje
final garantiza unos pixeles de margen de seguridad (R-G2.1).

### 3.1 US1 - curva visible

1. Texto corto visible, curva en 0.
2. Llevar "Curve the text" a +120. **La tinta del lienzo debe ser > 0 y con forma de
   arco**; el texto no desaparece ni se recorta.
3. Llevarlo a -120. **La curva se espeja** respecto del caso anterior.
4. Devolverlo a 0. **El texto queda identico** al paso 1 (mismo hash de pixeles).
5. Repetir en la ruta del motor (PDF): misma curva que el editor.

**Fallar si**: la tinta cae a 0, o el signo del angulo no espeja la curva.

### 3.2 US2 - barra visible al abrir

1. Abrir la pestana "Estilos de Texto" y **no tocar nada**.
   `[data-line-target-bar].hidden` debe ser `false` desde el primer frame.
2. Ir a STYLES y a ICON: sigue visible con el mismo target activo.
3. Ir a BACKGROUND y a DOWNLOAD: se oculta.
4. Cambiar a L1: el grupo Canvas Size (`[data-global-only]`) desaparece; en All vuelve.

**Fallar si**: nace oculta, o hace falta cambiar de pestana para que aparezca.

### 3.3 US3 - margen al maximo

1. Texto corto, margen en 0. Anotar el tamano de la caja de texto.
2. Llevar "Margin" a 50%. **El texto sigue visible y reconocible**; la caja no cae a
   un punto (hoy ~34 px).
3. Con el canvas apaisado (800x200), repetir. No debe colapsar antes de tiempo.
4. Volver el margen a 0. El tamano **vuelve exactamente** al anotado.

**Fallar si**: el lienzo queda vacio, o el tamano no se restaura.

### 3.4 US4 - cero tinta en los bordes

1. Texto de varias lineas que llene el lienzo. Medir las filas 0 y `h-1`.
   **Cero pixeles de tinta** del texto.
2. Palabra larga con espaciado amplio. Medir las columnas 0 y `w-1`. Cero.
3. Activar y desactivar Rotation. Repetir 1 y 2: **la rotacion no es necesaria para
   que quepa**, solo orienta.
4. Combinar margen alto + curva + texto largo. Sigue entrando completo.

**Fallar si**: hay tinta en el borde (medido hoy: columna 479 y 50+ px en la fila 0).

### 3.5 US5 - line height con una sola linea

1. Texto de **una sola linea**. Anotar la caja del texto.
2. Mover "Line height" de 0 a 150%. **La caja no se mueve ni cambia de tamano**.
3. Texto de **dos lineas**. Subir el interlineado: **L1 queda fija**, solo L2 se mueve.
4. Bajarlo al minimo: las lineas se juntan sin superponerse ni invertirse.

**Fallar si**: una sola linea se desplaza, o las lineas se superponen.

### 3.6 US6 - tres lineas con tres estilos

1. Escribir tres lineas. Elegir **L2** y cambiar fuente, color y tamano.
   **Solo L2 cambia**; L1 y L3 quedan intactas y en su posicion.
2. Poner L2 al 80% de L1 y agrandar L1. **L2 mantiene el 80% exacto**; L3 sigue a L2.
3. Poner L3 heredando de L2 sin cambios propios y cambiar el color de L2:
   **L3 cambia automaticamente**.
4. Cambiar de tab a All y a L1: **lo pintado no cambia** en ningun momento.
5. Reducir el texto a una sola linea: L1 normal; lo de L2/L3 **conservado**.
   Recuperar las tres lineas: sus estilos **reaparecen**.
6. Guardar como preset, cargar y generar el PDF. **Editor y PDF identicos**, linea
   por linea.

**Fallar si**: un tab filtra lo que se aplica, la cascada se deforma, o el preset
no vuelve identico.

---

## 4. Recorrido integrado (pestana del plugin)

1. Importar el modulo en el plugin y abrir "Estilos de Texto" con **Ctrl+F5**.
2. Ejecutar §3 en la pestana real: es la unica forma de validar el editor con su
   puente y el gating de pestanas real.
3. Crear un grupo de PDF con **texto estilizado** usando un preset con 3 lineas.
4. Procesar el PDF y comparar con el editor: **identicos**.
5. Repetir con curva, margen alto y rotacion combinados (escenario 4 de §3.4).

**Fallar si**: el editor y el PDF divergen en cualquier escenario, o algo funciona
solo en el editor y no en el motor (o al reves).

---

## 5. Trazabilidad

| Escenario | Requisito | Contrato | Historia |
|---|---|---|---|
| 2.1 curva snapshot / 3.1 curva visible | FR-001 | R-C1.1 a R-C1.5 | US1 |
| 2.1 headless sin WebGL | FR-001, constitucion II | R-C2.1 a R-C2.3 | US1 |
| 2.2 gating / 3.2 barra visible | FR-002 | research R2 | US2 |
| 2.3 margen / 3.3 margen al maximo | FR-003, FR-004 | R-G1.4 | US3 |
| 2.4 ajuste = dibujo | FR-006 | R-G1.1, R-G1.3 | US4 |
| 2.4 avance por linea / 3.5 line height | FR-007, FR-008, FR-021 | R-G1.2 | US5 |
| 2.4 encaje siempre / 3.4 cero tinta en bordes | FR-005 | R-G2.1 a R-G2.4 | US4 |
| 2.5 orden de resolucion | FR-010 | R-L1.1 a R-L1.5 | US6 |
| 2.5 cascada y slider | FR-011, FR-012 | R-L2.1 a R-L2.4 | US6 |
| 2.5 anti-ciclos | FR-013, FR-014 | R-L3.1 a R-L3.3 | US6 |
| 2.5 target no filtra | FR-009 | R-L1.5 | US6 |
| 2.5 1-based | FR-019 | data-model 7 | US6 |
| 2.5 linea inexistente | FR-015 | R-L2.5 | US6 |
| 2.5 fuente por linea | FR-017, FR-018 | research R7 | US6 |
| 2.5 alcance por linea | FR-016 | data-model 5 | US6 |
| 2.6 paridad editor/PDF | FR-020 | R-C2.3 | US1, US6 |
| 4 recorrido integrado | FR-020 | constitucion II, III | todas |

Criterios de exito del spec: SC-001 (2.1, 3.1) · SC-002 (3.2) · SC-003 (3.3) ·
SC-004 (3.4) · SC-005 (3.5) · SC-006 (2.6, 3.6) · SC-007 (2.5, 3.6).
