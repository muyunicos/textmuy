# Quickstart: Validacion de la correccion

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](./plan.md)

Guia de validacion ejecutable del feature. Cubre US1, US2, US3 y US4. Cada escenario
enlaza con el requisito o el invariante que demuestra.

---

## Prerrequisitos

- **Windows + PowerShell 7 (`pwsh`)**: shell soportado para todos los comandos de esta
  guía (ver `docs/entorno-desarrollo.md`). No se asume Bash, WSL, `cmd` ni Windows
  PowerShell 5.1.
- Node disponible **solo para pruebas unitarias**. No corre en el servidor WordPress.
- Una instalación de WordPress con el plugin y el módulo desplegados, para la
  validación integrada (única forma de probar la ruta del motor de render).
- Ctrl+F5 en la pestaña "Estilos de Texto" tras cada despliegue: el navegador cachea
  los scripts del módulo.

---

## 1. Puertas automaticas (Node)

Ejecutar antes de considerar cualquier tarea terminada. Las 21 suites existentes
deben seguir en verde: el feature es correctivo y no puede romper lo que ya funciona.

```powershell
# Si estas en la raiz del plugin, entra al modulo; si ya estas en este repo, omitilo.
Set-Location modules\textmuy

# Suite completa. Las 21 deben imprimir su propio "OK: <archivo>".
Get-ChildItem tests -Filter *.test.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Sintaxis de todos los scripts tocados (node --check acepta un archivo por vez).
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
Get-ChildItem js\effects -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Version de recarga coherente en los dos HTML (debe ser la misma en ambos).
Select-String -Path index.html, render-core.html -Pattern '\?v=RC\d+' -AllMatches |
    ForEach-Object { $_.Matches.Value } | Sort-Object -Unique
```

**Salida esperada**: 21 suites en OK, ningún error de sintaxis, y una única versión
coincidente en los dos documentos (`?v=RC40` al 2026-10-03).

---

## 2. Comprobaciones de logica (Node, sin navegador)

Estas comprobaciones fijan el comportamiento de la resolución de fuentes y del
round-trip de presets. Son la red de seguridad de US3 y US4.

### 2.1 Identidad unica de fuente (US3, R-C1, R-C4.1)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Duplicados | Enumerar el selector con un catálogo de ejemplo y contar cuántas veces aparece cada título | Exactamente 1 por fuente |
| Título con tilde | Resolver la referencia de una fuente cuyo título contiene tilde y eñe | Resuelve a su identidad numérica, sin error |
| Título ambiguo | Resolver un título que existe dos veces | Error con causa de ambigüedad |
| Identidad inexistente | Resolver una identidad numérica que no existe | Error `fonts:<id>:<motivo>`, sin sustituto |
| Selección rota | Para cada entrada del selector, comprobar que elegirla cambia la familia efectiva | Todas la cambian |

### 2.2 Composición de la familia (US1, R-C3)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Nombre con espacios | Componer el valor de fuente de un contexto con una familia que tiene espacios | Valor válido y aceptado; la familia es la pedida |
| Nombre acentuado | Igual con tilde y eñe | Igual |
| Sin familia de reserva | Inspeccionar el valor compuesto | No contiene ninguna familia genérica de reserva |

### 2.3 Ciclo de carga (US1, R-C2)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Fallo de red | Forzar un fallo al cargar una fuente física | Estado Fallida con causa; **no** Available |
| Reintento | Reintentar la misma fuente tras el fallo | Segunda descarga; si el fallo fue transitorio, queda Available |
| Dedup | Pedir la misma fuente dos veces a la vez | Una sola descarga |
| Sustitución | Revisar el camino de fallo | Ninguna otra fuente se carga ni se declara |

### 2.4 Round-trip de preset (US4, R-P1, R-P3.2)

| Caso | Comprobacion | Resultado esperado |
|---|---|---|
| Guardar y recargar | Guardar un preset, cargarlo y comparar campo por campo con el estado de guardado | Idénticos |
| Color de capa de relleno | Guardar con color de capa, cambiar el color de la vista, recargar | Vuelve al color guardado (regresión del defecto reportado) |
| Campo ausente | Cargar sobre una vista modificada | Los campos no declarados vuelven a sus defaults |
| Idempotencia | Cargar el mismo preset dos veces | Segundo resultado igual al primero, sin duplicar capas |
| Capas de relleno | Guardar con 2 capas y 2 estilos, recargar | Ambas capas y estilos restaurados |
| Estilos por línea | Guardar con overrides por línea y destino L2, recargar | Overrides y destino restaurados |
---

## 3. Recorrido integrado (WordPress, manual)

**Unico modo de prueba valido del editor** (AGENTS.md §9). Es tambien la unica forma
de cubrir FR-020, porque el motor de render headless corre en un iframe real con el
puente del plugin y el motor PHP detras, fuera del alcance de Node.

Abrir: `admin.php?page=personalizador-pdf&tab=textos`. Tras cada cambio de codigo,
Ctrl+F5.

### 3.1 US1 — el lienzo coincide con el selector (P1)

1. Abrir la pestana. Sin tocar nada, comparar la familia del texto del lienzo con el
   nombre que muestra el selector. **Deben coincidir.**
2. Mover el zoom, el tamaño de fuente y la rotacion, uno por uno. La familia **no debe
   cambiar** en ningun momento.
3. Elegir una fuente cuyo nombre tenga espacios y confirmar que el texto cambia a esa
   fuente.
4. Elegir una fuente propia con tilde. Confirmar que el texto cambia a esa fuente y no
   a la del sistema.
5. Deshacer y rehacer. La familia debe permanecer coherente.

**Fallar si**: aparece una tipografia distinta de la declarada en cualquier momento, o
el texto queda en la fuente del sistema tras esperar la descarga.

### 3.2 US2 — previsualizacion en la galeria (P2)

1. Anotar la fuente actual. Abrir la galeria de fuentes.
2. Tocar tres fuentes distintas, una de ellas con descarga pendiente. **El lienzo debe
   cambiar en cada toque, sin pulsar Select.**
3. Cerrar la galeria con la X sin confirmar. **El lienzo debe volver a la fuente
   anotada.**
4. Repetir el paso 2 y confirmar con Select. El selector y el lienzo quedan
   sincronizados y el texto no cambia al confirmar.
5. Cerrar la galeria mientras una fuente se sigue descargando. Al terminar la descarga,
   el lienzo no debe repintarse con la fuente descartada.

**Fallar si**: hace falta un segundo clic para ver la fuente, o cerrar sin confirmar
deja la fuente explorada.

### 3.3 US3 — selector sin duplicados y entradas funcionales (P3)

1. Abrir el desplegable de fuentes. **Cada fuente debe aparecer una vez.** Contar las
   fuentes propias MUY: deben aparecer exactamente 15, no mas.
2. Elegir **cada una** de las primeras diez entradas. Todas deben cambiar el texto del
   lienzo.
3. Comprobar que no hay entradas repetidas por titulo ni por archivo.
4. Guardar un preset con una fuente concreta, abrirlo y comprobar que el selector
   muestra esa fuente y el lienzo la usa.

**Fallar si**: hay titulos repetidos, o alguna entrada no cambia el texto.

### 3.4 US4 — fidelidad de preset (P1)

1. Configurar un estilo reconocible: color de capa de relleno propio, tipografia propia,
   contorno y sombra. Guardar como preset.
2. Cambiar **todo** lo anterior a valores distintos.
3. Cargar el preset. **Todo debe volver exactamente a lo guardado.**
   - El color de capa debe ser el guardado, no el que estaba puesto en el paso 2.
   - La tipografia debe ser la guardada.
4. Crear un preset que solo cambie el texto (delta minimo), cargarlo sobre la vista
   muy modificada del paso 2. Los ajustes no declarados deben volver a sus defaults,
   no conservar los del paso 2.
5. Cargar un preset ya existente en el servidor antes de esta correccion. Debe cargar
   sin error.
6. Cargar el mismo preset dos veces seguidas. El resultado no debe acumular capas.
7. Guardar un preset con estilos por linea y destino L2. Cargarlo y comprobar que el
   destino y los overrides vuelven.

**Fallar si**: cualquier ajuste conserva el valor del paso 2, o el preset existente no
carga.

### 3.5 Paridad con el motor de render (FR-020, puerta obligatoria)

Este recorrido es el unico que cubre el cambio de mayor riesgo del lote, por eso es
puerta obligatoria antes de cerrar el feature (ver R9).

1. En un PDF de prueba, crear un grupo con texto **estilizado**, usando un preset con
   color de capa y una fuente propia.
2. Procesar el PDF y abrir el resultado.
3. Comparar el texto del PDF con la vista del editor del mismo preset: deben coincidir
   en color, tipografia, contorno y sombra.
4. Repetir con un preset que tenga estilos por linea.

**Fallar si**: el PDF se ve distinto de la vista del editor para los mismos ajustes.

---

## 4. Trazabilidad

| Escenario de quickstart | Requisito | Historia |
|---|---|---|
| §2.1 identidades | FR-003, FR-004 | US3 |
| §2.2 composicion | FR-001 | US1 |
| §2.3 ciclo de carga | FR-005, FR-006, FR-012 | US1 |
| §2.4 round-trip | FR-015 a FR-019 | US4 |
| §3.1 lienzo vs selector | FR-001, FR-002, FR-010, FR-013 | US1 |
| §3.2 galeria | FR-007, FR-008, FR-009 | US2 |
| §3.3 selector | FR-003, FR-010 | US3 |
| §3.4 preset | FR-015 a FR-020 | US4 |
| §3.5 paridad | FR-014, FR-020 | US1, US4 |