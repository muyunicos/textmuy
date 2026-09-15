# Quickstart: plugin-compat-review

**Feature**: 003-plugin-compat-review | **Fecha**: 2026-09-14

Guía para ejecutar la revisión de compatibilidad y funcionalidad. Formato del entregable: [contracts/matriz.md](./contracts/matriz.md). Puntos de contrato: [research.md](./research.md).

## Prerrequisitos

- WordPress con el plugin activo y el módulo importado en `modules/textmuy/`.
- Acceso de administrador: pestañas "PDFs" y "Estilos de Texto"; consola del navegador abierta.
- Navegador principal de desarrollo en escritorio (única cobertura acordada, Q4).

## 1. Verificaciones automáticas (abren la revisión y la cierran)

```bash
# Sintaxis PHP del plugin
php -l personalizador-pdf.php && php -l admin/*.php && php -l engine/*.php && php -l inc/*.php

# Motor de PDF
php tests/motor_smoke.php      # SMOKE OK (condicionado a uploads/pmu/pdfs/muestra.pdf)
php tests/parity.php           # PARIDAD OK (mismo condicionado)

# Módulo: sintaxis y 10 suites Node
cd modules/textmuy
node --check js/*.js
node tests/catalog-unified.test.js && node tests/fonts-catalog.test.js && node tests/img-refs.test.js
node tests/preset-cache.test.js && node tests/preset-delta.test.js && node tests/preset-load.test.js
node tests/distort-engine.test.js && node tests/flag-wave.test.js && node tests/pattern-block-box.test.js
node tests/controls-init.test.js
```

## 2. Circuito completo (US1, PC de B1–B3)

1. Abrir la pestaña "Estilos de Texto": el editor carga sin estado de error; en consola verificar que el puente llega en los 3 momentos.
2. Galerías: tipografías, imágenes y estilos listan exactamente lo existente, con miniaturas (verificar también que un hueco/tombstone se salta con aviso).
3. Subir una imagen y una tipografía; guardar un estilo; recargar: todo persiste (verifica `op=alta` por el motor).
4. Asignar el estilo a un grupo de texto y procesar el PDF: el grupo sale con el estilo, del tamaño definido por el estilo.
5. Borrar/reanexar: el inventario queda coherente con los archivos (sin duplicados).

## 3. Paridad editor ↔ render (US2, B6–B7)

Para cada estilo del conjunto representativo (relleno simple, relleno con imagen, contorno, sombras, relieve, distorsión, icono, fondo, líneas L1/L2/L3):

1. Renderizar en el editor y anotar dimensiones.
2. Renderizar el mismo texto vía el motor sin interfaz (procesar grupo o lote de la API).
3. Comparar dimensiones y apariencia visible (lado a lado a 100% y 200% de zoom, sin diferencias perceptibles) + captura → tabla §3 de la matriz.

Fail-fast: con un lote que incluya un recurso inválido (borrar físicamente un archivo referenciado), el lote completo se rechaza con causa `ambito:id:motivo` y no hay resultados parciales.

## 4. Escenarios degradados (US4, B8)

1. Abrir `index.html` como `file://`: estado de error claro; consola sin fetches a rutas relativas del módulo.
2. Desactivar aceleración gráfica y renderizar vía API: fallo con causa explícita (sin degradación silenciosa).
3. Sin internet: comportamiento documentado de tipografías remotas (fallback), sin errores no controlados.
4. Preset con referencia legacy (string en vez de id): rechazo "re-guardar el preset".

## 5. Versionado y documentación (US3, B9–B11)

1. `grep -n "v=RC" modules/textmuy/index.html modules/textmuy/render-core.html`: número idéntico en ambos.
2. Con JS viejo en caché: el plugin avisa desactualización y sugiere Ctrl+F5.
3. Contrastar AGENTS.md (módulo y plugin), `modules/LEEME.md` y constitución contra lo observado: cada contradicción = hallazgo DOCUMENTAL.

## 6. Cierre

1. Completar `matriz.md` (formato en contracts/): ningún PC sin evaluar; todo BLOQUEANTE corregido.
2. Correcciones contenidas (un archivo, sin contrato/interfaz) aplicadas + re-verificación del punto.
3. Correr de nuevo la sección 1: todo en verde (condicionados anotados, no como fallos).
