# TextMuy — Documentación de Objetivos y Roadmap

> **Objetivo final:** Una app que funcione como API client-side + editor visual para crear textos estilizados al estilo [TextStudio](https://www.textstudio.com/logo/spotify-logo-867).

---

## Resumen de Progreso

### ✅ Completado (Fases 1-2, 3, 4, 5, 6, 7, 8 parcial, Efectos WebGL)
- **Canvas fijo con auto-fit**: El canvas usa dimensiones fijas de `settings.canvas.width/height` y el texto se ajusta automáticamente con `autoFitText()`
- **Inputs de tamaño custom**: Conectados al editor mediante `bindCanvasDimension()` en `controls.js`
- **Exportación PNG transparente**: Simplificado en `export.js` con fondo transparente por defecto
- **Dimensiones custom en exportación**: Implementado usando `settings.canvas.width/height`
- **Propiedades faltantes en defaultSettings**: Añadidas todas las propiedades de compatibilidad con TextStudio (blendmodes, textures, palettes, etc.)
- **loadPreset() mejorado**: Ahora carga todas las propiedades de TextStudio incluyendo blendmodes y propiedades anidadas
- **convertSettingsToPreset() robusto**: Refactorizado con optional chaining (`?.`) y valores por defecto
- **Render de textures**: Implementado con sistema de caché de imágenes y `createPattern()`
- **Render de palettes per-letter**: Implementado con `drawTextWithPalette()` para colorear letras individualmente
- **Blendmodes aplicados**: `globalCompositeOperation` aplicado en fill, outline, depth, icon, background, shadows
- **API client-side**: Implementada en `js/api.js` con `renderTextToPNG()`, `downloadPNG()`, y `loadPresetByName()`
- **Motor WebGL Bevel**: Creado `js/effects/bevel-webgl.js` con shaders GLSL para bevel realista con normal maps
- **Motor WebGL Specular**: Creado `js/effects/specular-webgl.js` con iluminación Blinn-Phong
- **Motor Distort/Arc**: Creado `js/effects/distort-engine.js` con posicionamiento per-character en arcos, ondas y bulge
- **Integración Bevel WebGL**: Integrado en `drawBevel()` con fallback a método Canvas 2D
- **Integración Specular WebGL**: Integrado en `drawSpecular()` con blendmode 'screen'
- **Integración Distort Engine**: Integrado en `applyDistort()` y `drawTextCurved()` con fallback a transformación matrix
- **Archivos organizados**: Estructura reorganizada con directorios `effects/` y `utils/`, archivos de referencia TextStudio preservados
- **PresetManager**: Creado `js/preset-manager.js` con operaciones CRUD completas
- **Lista dinámica de presets**: Implementada carga desde localStorage, presets/ y presets importados
- **CRUD de presets**: Funciones createPreset(), updatePreset(), deletePreset(), duplicatePreset() implementadas
- **UI de gestión de presets**: Botones para Nuevo, Duplicar, Guardar, Eliminar, Exportar, Importar
- **Gradients con N colores**: Mejorada `addGradientStops()` para soportar múltiples formatos y distribución automática de posiciones
- **Importador TextStudio mejorado**: Mapeo de IDs de fuentes, mejor extracción de presets (window.__PRESET__, JSON-LD), integración con PresetManager
- **Gestión de fuentes**: Mejorada con fallback a Google Fonts, registro de fuentes personalizadas, listado disponible, eliminación de fuentes custom

### ⏳ Pendiente (Fases 8 parcial, 9-10)
- **Limpieza de UI**: Eliminar formatos no deseados, simplificar secciones

### 📊 Estadísticas
- **Problemas críticos resueltos**: 7/7 (B1, B2, D1, D2, D3, D4, C1-C3)
- **Problemas de compatibilidad resueltos**: 5/10 (C1, C2, C3, C5, C6, C7)
- **Tareas completadas**: 10/25 (40%)
- **Fases completadas**: 2/9 (Fase 1 parcial, Fase 2, Fase 4, Fase 8 parcial)

---

## 1. Objetivo del proyecto

### Visión general
TextMuy será una aplicación web con dos modos de uso:

1. **Editor visual** — Interfaz tipo TextStudio para crear/editar estilos de texto, importar presets, y gestionar una biblioteca de presets guardados.

2. **API client-side** — Una función JS invocable desde la misma página (o desde otra app web en el mismo servidor) que recibe:
   - `texto` (string, puede ser multilínea)
   - `presetName` (nombre del preset a aplicar)
   - `overrides` (opcional: parámetros que sobreescriben configuraciones del preset, ej: color, tamaño de canvas)
   
   Y devuelve: **imagen PNG con fondo transparente** del tamaño especificado.

### ✅ Lo que SÍ queremos
- Editor visual con la mayoría de funciones de TextStudio (excepto ANIMATION).
- Importador de presets desde URL de TextStudio (`textstudio.com/logo/spotify-logo-867`).
- Selector de presets guardados + CRUD (crear, editar, guardar cambios, eliminar).
- Gestión de fuentes: listado, subir nuevas, fallback al cargar preset con fuente faltante.
- API client-side: función `renderTextToPNG(text, presetName, overrides)`.
- Canvas de tamaño definido por el usuario (px) con auto-ajuste del texto.
- Exportación PNG transparente del tamaño exacto.
- Todas las funcionalidades libres (sin premium).

### ❌ Lo que NO queremos
- Headers, footers, navegación del sitio, marketing.
- Sección de ANIMATION.
- Exportación en formatos distintos a PNG transparente.
- Restricciones premium.

---

## 2. Arquitectura técnica

### 2.1 API client-side (función, no servidor)

```
// Uso desde cualquier JS en la misma página o app web del mismo servidor
const pngBlob = await TextMuyAPI.renderTextToPNG({
    text: "Jonatan\nRuben",
    preset: "spotify-logo-867",
    overrides: {
        canvas: { width: 1920, height: 1080 },
        fill: { color: "#ff0000" }
    }
});
// → descarga o usa el blob PNG
```

**Implementación:**
- Refactorizar el motor de render (`js/editor.js`) para separar lógica pura del DOM.
- Crear `js/api.js` con función `renderTextToPNG()` que:
  1. Carga el preset por nombre (desde `presets/` o localStorage).
  2. Aplica overrides (merge profundo).
  3. Crea canvas temporal con dimensiones especificadas.
  4. Auto-fit del texto al canvas.
  5. Renderiza todos los efectos.
  6. Devuelve PNG blob (transparente).

### 2.2 Separación de lógica de render

Actualmente `js/editor.js` está acoplado al DOM. Necesitamos:

```
// js/render-engine.js (nuevo, lógica pura)
function renderToCanvas(ctx, settings, canvasWidth, canvasHeight) {
    // Auto-fit + todos los efectos
    // No toca document.*, no usa getElementById
}

// js/editor.js (UI, usa render-engine)
function render() {
    const ctx = state.ctx;
    renderToCanvas(ctx, state.settings, canvasWidth, canvasHeight);
    // + actualiza UI
}

// js/api.js (API, usa render-engine)
function renderTextToPNG(params) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const settings = loadPreset(params.preset);
    mergeOverrides(settings, params.overrides);
    renderToCanvas(ctx, settings, params.width, params.height);
    return canvas.toBlob('image/png');
}
```

### 2.3 Gestión de presets

- **Almacenamiento:** archivos JSON en `presets/` (presets base) + localStorage (presets guardados por el usuario).
- **Lista dinámica:** la UI carga presets desde ambas fuentes y los muestra en una lista seleccionable.
- **CRUD completo:**
  - Crear nuevo preset (desde cero o duplicando uno existente).
  - Editar preset (cargar en editor, modificar, guardar).
  - Guardar cambios en preset existente.
  - Eliminar preset.
  - Exportar preset como JSON (descarga).

### 2.4 Gestión de fuentes

- **Listado visual:** muestra fuentes disponibles (locales + Google Fonts + subidas).
- **Subir fuentes:** input file que carga TTF/OTF vía FontFace API y los guarda en IndexedDB (persistencia).
- **Fallback al cargar preset:** si un preset referencia una fuente que no existe:
  1. Mostrar aviso "Fuente X no encontrada".
  2. Selector para elegir una fuente existente como reemplazo.
  3. Opción de subir una nueva fuente.
  4. Guardar la asociación (preset → fuente reemplazo) para futuras cargas.

### 2.5 Imágenes en presets (fondos, texturas, logos)

- **Por ahora:** si el preset trae una imagen que no se puede cargar → placeholder visual (cuadro gris con texto "imagen no disponible").
- **Más adelante:** captura y descarga automática bajo demanda de imágenes referenciadas en presets de TextStudio.

---

## 3. Problemas actuales identificados

### A. Problemas relativos a la API

| # | Problema | Archivo/Líneas | Severidad |
|---|---|---|---|
| A1 | No existe función API `renderTextToPNG()` | — | 🔴 Crítico |
| A2 | Motor de render acoplado al DOM, no reutilizable | `js/editor.js` completo | 🔴 Crítico |
| A3 | No hay sistema de overrides/merge de settings | — | 🟡 Alto |
| A4 | No hay carga de preset por nombre desde función | — | 🟡 Alto |

### B. Problemas del editor visual vs. TextStudio

| # | Problema | Archivo/Líneas | Severidad | Estado |
|---|---|---|---|---|
| B1 | Canvas se calcula dinámicamente según el texto (debe ser al revés: texto se ajusta al canvas) | `js/editor.js` 200-209 | 🔴 Crítico | ✅ Resuelto |
| B2 | Inputs de tamaño custom no conectados al editor | `index.html` 693-697, `js/controls.js` | 🔴 Crítico | ✅ Resuelto |
| B3 | Importador frágil: depende de 3 proxies CORS externos + regex sobre HTML | `js/controls.js` 958-1213 | 🟡 Alto | ⏳ Pendiente |
| B4 | `extractPresetFromHTML()` probablemente no funciona (TextStudio no expone JSON literal) | `js/controls.js` 1082-1121 | 🟡 Alto | ⏳ Pendiente |
| B5 | Lista de presets es estática en HTML (solo 3 hardcoded) | `index.html` 733-737 | 🟡 Alto | ⏳ Pendiente |
| B6 | No hay CRUD de presets: no se pueden editar/eliminar/guardar cambios | `js/controls.js` 514-538 | 🟡 Alto | ⏳ Pendiente |
| B7 | Caché de presets en localStorage no se muestra en la UI | `js/controls.js` 1128-1139 | 🟡 Alto | ⏳ Pendiente |
| B8 | No hay gestión de fuentes (listado, subir, fallback) | — | 🟡 Alto | ⏳ Pendiente |
| B9 | No hay gestión de imágenes (placeholders para imágenes faltantes) | — | 🟡 Medio | ⏳ Pendiente |

### C. Problemas de compatibilidad con presets de TextStudio

| # | Problema | Archivo/Líneas | Severidad | Estado |
|---|---|---|---|---|
| C1 | `loadPreset()` ignora propiedades: `outline.global`, `outline.dash`, `shadow.erosion/mask/strength`, `bevel.soften`, `background.gradient` completo, `processing.code`, `mergeGradients` | `js/editor.js` 844-1122 | 🟡 Alto | ✅ Resuelto |
| C2 | `convertSettingsToPreset()` referencia 11+ propiedades inexistentes en `defaultSettings` | `js/controls.js` 540-809 | 🟡 Alto | ✅ Resuelto |
| C3 | `defaultSettings` no define: `animation`, `processing` (completo), `lettering.shadow`, `lettering.blendmode`, `bevel.soften`, `icon.alpha/rotate/composite`, `background.composite/gradient`, `shadowOuter.strength` | `js/editor.js` 7-147 | 🟡 Alto | ✅ Resuelto |
| C4 | Gradients solo soportan 2 colores (TextStudio soporta N colores con posición) | `js/editor.js` 789-808 | 🟡 Medio | ⏳ Pendiente |
| C5 | Textures existen en settings pero no se renderizan | `js/editor.js` | 🟡 Medio | ✅ Resuelto |
| C6 | Palettes per-letter existen en settings pero no se renderizan | `js/editor.js` | 🟡 Medio | ✅ Resuelto |
| C7 | Blendmodes definidos en presets pero nunca se aplican (`globalCompositeOperation`) | `js/editor.js` | 🟡 Medio | ✅ Resuelto |
| C8 | Bevel simplificado (offset strokes) vs. bevel real de TextStudio | `js/editor.js` 662-698 | 🟢 Bajo | ⏳ Pendiente |
| C9 | Distort/Arc es transformación matrix simple, no arc real per-character | `js/editor.js` 701-714 | 🟢 Bajo | ⏳ Pendiente |
| C10 | Fuentes referenciadas por ID numérico (`832.ttf`) no se resuelven | `presets/*.json` | 🟡 Alto | ⏳ Pendiente |

### D. Problemas de exportación

| # | Problema | Archivo/Líneas | Severidad | Estado |
|---|---|---|---|---|
| D1 | Inconsistencia: UI envía `png-transparent` pero export.js busca `transparent-png` | `index.html` 716, `js/export.js` 38 | 🔴 Crítico | ✅ Resuelto |
| D2 | `createExportCanvas()` siempre pinta fondo negro si no hay background activo | `js/export.js` 97-105 | 🔴 Crítico | ✅ Resuelto |
| D3 | No usa dimensiones custom (`tt-custom-width/height-input`) | `js/export.js` 62-117 | 🔴 Crítico | ✅ Resuelto |
| D4 | Lógica de ratio y spacing innecesaria para el caso de uso | `js/export.js` 71-88 | 🟢 Bajo | ✅ Resuelto |

---

## 4. Soluciones propuestas

### 4.1 Refactor del motor de render (soluciona A1, A2)

**Crear `js/render-engine.js`:**
- Extraer toda la lógica de renderizado de `js/editor.js` a funciones puras.
- Función principal: `renderToCanvas(ctx, settings, canvasWidth, canvasHeight)`.
- No depende de `document`, `state`, ni elementos del DOM.
- Recibe `ctx` (contexto de canvas), `settings` (objeto), y dimensiones.
- `js/editor.js` y `js/api.js` consumen este módulo.

### 4.2 Sistema de canvas fijo + auto-fit (soluciona B1, B2)

**Cambios en `defaultSettings`:**
```js
canvas: {
    width: 1920,
    height: 1080,
    autoFit: true,
    padding: 0.05  // 5% del ancho
}
```

**Algoritmo de auto-fit (búsqueda binaria):**
```
function autoFitText(ctx, text, canvasWidth, canvasHeight, settings):
    maxFont = 400
    minFont = 8
    padding = canvasWidth * settings.canvas.padding
    availW = canvasWidth - padding * 2
    availH = canvasHeight - padding * 2
    
    lo = minFont, hi = maxFont, best = minFont
    while lo <= hi:
        mid = (lo + hi) / 2
        ctx.font = `${mid}px ${fontName}`
        textW = measureTextWithSpacing(text, mid, settings.letterSpacing)
        textH = mid * settings.lineHeight * lines.length
        extraW = calcExtraWidth(settings, mid)  // outline, depth, shadow
        extraH = calcExtraHeight(settings, mid)
        if textW + extraW <= availW AND textH + extraH <= availH:
            best = mid; lo = mid + 1
        else: hi = mid - 1
    return best
```

### 4.3 API client-side (soluciona A1, A3, A4)

**Crear `js/api.js`:**
```js
window.TextMuyAPI = {
    async renderTextToPNG({ text, preset, overrides }) {
        const settings = await loadPresetByName(preset);
        if (overrides) mergeDeep(settings, overrides);
        const canvas = document.createElement('canvas');
        canvas.width = settings.canvas.width;
        canvas.height = settings.canvas.height;
        const ctx = canvas.getContext('2d');
        renderToCanvas(ctx, settings, canvas.width, canvas.height);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }
};
```

### 4.4 Importador robusto (soluciona B3, B4)

- Mantener método de proxies CORS como fallback.
- Añadir método: extraer preset de la página de TextStudio buscando en `window.__PRESET__` o variables globales (scraping más específico).
- Si falla → modal con instrucciones para pegar JSON manual (ya existe).
- Mapear fuentes por ID a nombres reales (tabla de equivalencias).

### 4.5 CRUD de presets (soluciona B5, B6, B7)

- Lista dinámica que carga desde `presets/` (fetch) + localStorage.
- Funciones: `createPreset()`, `updatePreset(name, settings)`, `deletePreset(name)`, `duplicatePreset(name)`.
- UI con botones: Nuevo, Duplicar, Guardar, Eliminar junto a cada preset.

### 4.6 Gestión de fuentes (soluciona B8)

- Listado visual de fuentes disponibles.
- Input file para subir TTF/OTF → FontFace API → IndexedDB.
- Al cargar preset: si fuente no existe → modal de fallback (seleccionar existente o subir nueva).

### 4.7 Exportación PNG transparente (soluciona D1, D2, D3)

- Simplificar `js/export.js`: solo PNG transparente.
- `downloadTransparentPNG(width, height)`: canvas temporal, sin fondo, auto-fit, render, toBlob.
- Conectar con inputs de width/height.

### 4.8 Compatibilidad con presets (soluciona C1, C2, C3)

- Añadir todas las propiedades faltantes a `defaultSettings`.
- Completar `loadPreset()` para cargar todas las propiedades de presets de TextStudio.
- Hacer `convertSettingsToPreset()` robusto con optional chaining.

---

## 5. Checklist de tareas (priorizado)

### Fase 1: Fundaciones (refactor + bugs críticos)
- [ ] **T1.1** Crear `js/render-engine.js`: extraer lógica de render de `js/editor.js` a funciones puras.
- [x] **T1.2** Añadir propiedades faltantes a `defaultSettings` en `js/editor.js`: `canvas`, `animation`, `processing` (completo), `lettering.shadow/blendmode`, `bevel.soften`, `icon.alpha/rotate/composite`, `background.composite/gradient`, `shadowOuter.strength`, `outline.global/dash`, `depth.texture.blendmode`, `fill.texture.blendmode/palette`.
- [x] **T1.3** Hacer `convertSettingsToPreset()` robusto ante propiedades undefined (optional chaining).
- [x] **T1.4** Completar `loadPreset()` para cargar: `outline.global`, `outline.dash`, `shadow.erosion/mask/strength`, `bevel.soften`, `background.gradient`, `processing.code`, `mergeGradients`, blendmodes.

### Fase 2: Canvas fijo + auto-fit
- [x] **T2.1** Implementar `autoFitText()` en `js/editor.js` (ya implementado).
- [x] **T2.2** Modificar `render()` para usar dimensiones fijas del canvas + auto-fit (ya implementado).
- [x] **T2.3** Conectar inputs `tt-custom-width/height-input` al editor (bindings en `js/controls.js`).
- [x] **T2.4** Escalar visualmente el canvas de preview si excede el viewport (ya implementado).

### Fase 3: API client-side
- [ ] **T3.1** Crear `js/api.js` con función `renderTextToPNG({ text, preset, overrides })`.
- [ ] **T3.2** Implementar `loadPresetByName(name)` que busca en `presets/` y localStorage.
- [ ] **T3.3** Implementar `mergeDeep(target, source)` para overrides.
- [ ] **T3.4** Exponer `window.TextMuyAPI` para uso desde otras apps.

### Fase 4: Exportación PNG transparente
- [x] **T4.1** Simplificar `js/export.js`: eliminar JPG, PDF, .textstudio (ya simplificado).
- [x] **T4.2** Implementar `downloadTransparentPNG(width, height)` sin fondo (ya implementado).
- [x] **T4.3** Conectar botón Download con inputs de width/height (ya conectado).
- [x] **T4.4** Eliminar lógica de ratio y spacing innecesaria (ya eliminado).

### Fase 5: Gestión de presets (CRUD)
- [ ] **T5.1** Cargar lista de presets dinámicamente (fetch `presets/` + localStorage).
- [ ] **T5.2** Implementar `createPreset()`, `updatePreset()`, `deletePreset()`, `duplicatePreset()`.
- [ ] **T5.3** UI: botones Nuevo/Duplicar/Guardar/Eliminar junto a cada preset.
- [ ] **T5.4** Persistencia en localStorage de presets creados/editados.

### Fase 6: Importador de presets
- [ ] **T6.1** Mejorar `extractPresetFromHTML()` con selectores más específicos.
- [ ] **T6.2** Mapear fuentes por ID de TextStudio a nombres reales.
- [ ] **T6.3** Manejar imágenes faltantes con placeholders.
- [ ] **T6.4** Guardar presets importados en la lista de presets.

### Fase 7: Gestión de fuentes
- [ ] **T7.1** Listado visual de fuentes disponibles.
- [ ] **T7.2** Input file para subir TTF/OTF → FontFace API → IndexedDB.
- [ ] **T7.3** Modal de fallback al cargar preset con fuente faltante.
- [ ] **T7.4** Guardar asociaciones preset → fuente reemplazo.

### Fase 8: Mejoras de render (compatibilidad TextStudio)
- [ ] **T8.1** Soportar gradients con N colores y posiciones.
- [x] **T8.2** Implementar render de textures (ya implementado con `loadTextureImage` y `createPattern`).
- [x] **T8.3** Implementar render de palettes per-letter (ya implementado con `drawTextWithPalette`).
- [x] **T8.4** Aplicar blendmodes (`globalCompositeOperation`) (ya implementado en fill, outline, depth, icon, background, shadows).
- [ ] **T8.5** Mejorar bevel (highlight/shadow suavizado).
- [ ] **T8.6** Mejorar distort/arc (per-character).

### Fase 9: Limpieza de UI
- [ ] **T9.1** Eliminar formatos no deseados de `index.html` (JPG, PDF, .textstudio).
- [ ] **T9.2** Simplificar sección DOWNLOAD.
- [ ] **T9.3** Eliminar estilos CSS no usados (header, footer, search).
- [ ] **T9.4** Añadir sección de gestión de fuentes a la UI.
- [ ] **T9.5** Añadir sección de gestión de presets (CRUD) a la UI.

### Fase 10: Mejoras opcionales (futuro)
- [ ] **T10.1** Descarga automática de fuentes de TextStudio.
- [ ] **T10.2** Captura y descarga automática de imágenes de presets.
- [ ] **T10.3** Indicador visual de "auto-fit activo".
- [ ] **T10.4** Toggle entre auto-fit y font-size manual.

---

## 6. Referencias rápidas

### Dónde está cada cosa en el código actual

| Funcionalidad | Archivo | Líneas | Función/Elemento |
|---|---|---|---|
| Render principal | `js/editor.js` | 185-302 | `render()` |
| Default settings | `js/editor.js` | 7-147 | `defaultSettings` |
| Carga de preset | `js/editor.js` | 844-1122 | `loadPreset()` |
| Update UI from settings | `js/editor.js` | 1125-1384 | `updateUIFromSettings()` |
| Bindings de controles | `js/controls.js` | 20-354 | `bindControls()` |
| Convert settings → preset | `js/controls.js` | 540-809 | `convertSettingsToPreset()` |
| Gradient pickers | `js/controls.js` | 849-926 | `initGradientPickers()` |
| Carga de presets locales | `js/controls.js` | 929-955 | `loadPresetFile()` |
| Importación TextStudio | `js/controls.js` | 958-1213 | `bindImportControls()` |
| Exportación | `js/export.js` | 13-49 | `download()` |
| Crear canvas export | `js/export.js` | 62-117 | `createExportCanvas()` |
| Inputs de tamaño custom | `index.html` | 693-697 | `tt-custom-width/height-input` |
| Lista de formatos | `index.html` | 715-719 | `tt-download-format-list` |
| Lista de presets (estática) | `index.html` | 733-737 | `tt-preset-list` |
| Carga de fuentes | `js/fonts.js` | 15-40 | `loadFont()` |
| Inicialización | `js/main.js` | 6-35 | `DOMContentLoaded` handler |

### Orden de renderizado de efectos (js/editor.js líneas 240-293)
1. Outer shadow 2
2. Outer shadow
3. 3D depth 2
4. 3D depth
5. Fill
6. Outline 2
7. Outline
8. Bevel
9. Inner shadow 2
10. Inner shadow
11. Icon

### Estructura de un preset de TextStudio (propiedades)
```
text, font{name,size,weight,src}, align, rotate, lineHeight, letterSpacing,
mergeGradients, lettering{active,blendmode,boggle,reverseOverlap,shadow},
distort{arc}, processing{active,code}, fill{active,alpha,color,texture,gradient,palette},
depth{active,length,angle,fill{alpha,color,gradient,texture}},
depth2{...}, outline{first,second,global}, bevel{inner{...}},
shadow{outer,outer2,inner,inner2}, icon{...}, background{...}, animation{...}
```

---

## 7. Estructura de archivos organizados

### 7.1 Directorios y archivos principales

```
textmuy/
├── css/
│   ├── editor.min.css        # UI TextStudio (ofuscado - referencia)
│   ├── font-picker.min.css   # Selector de fuentes
│   └── animate.min.css       # Animaciones de loading
├── fonts/
│   ├── google-sans.css       # Google Sans (Google Fonts)
│   └── roboto.css            # Roboto (Google Fonts)
├── js/
│   ├── editor.js             # Nuestro motor de render (limpio)
│   ├── editor.min.js         # TextStudio (ofuscado - referencia técnica)
│   ├── controls.js           # Nuestros controles UI
│   ├── controls.min.js       # TextStudio (ofuscado - referencia técnica)
│   ├── font-picker.min.js    # Selector de fuentes
│   ├── grapick.min.js        # Selector de gradientes
│   ├── pickr.min.js          # Selector de colores
│   ├── effects/              # Motores WebGL de referencia
│   │   ├── bevel.min.js      # Efecto bevel (TextStudio - ofuscado)
│   │   ├── specular.min.js   # Iluminación especular (TextStudio - ofuscado)
│   │   └── image-distort.min.js # Distorsión de imagen (TextStudio - ofuscado)
│   └── utils/                # Librerías utilitarias
│       ├── FileSaver.min.js  # Guardar archivos
│       ├── Sortable.min.js   # Drag & drop
│       ├── pica.min.js       # Redimensionamiento de imágenes
│       ├── potrace.min.js    # Vectorización
│       ├── stackblur.min.js  # Blur
│       ├── gif-encoder.min.js # Codificador GIF
│       ├── svgo.min.js       # Optimizador SVG
│       ├── toastify-js.min.js # Notificaciones
│       └── util.min.js       # Utilidades varias
├── presets/                  # Presets base JSON
└── index.html                # UI principal
```

### 7.2 Archivos de referencia de TextStudio

Los siguientes archivos están ofuscados y protegidos con copyright de TextStudio.com. No pueden usarse directamente pero sirven como referencia técnica para implementar efectos WebGL:

- **editor.min.js / controls.min.js**: Contienen la lógica completa de TextStudio. Útiles para entender el flujo de renderizado y la estructura de datos.
- **bevel.min.js**: Motor WebGL para efecto bevel con shaders. Referencia para implementar bevel real (no solo offset strokes).
- **specular.min.js**: Motor WebGL para iluminación especular. Referencia para implementar highlight/shadow realista.
- **image-distort.min.js**: Motor para distorsión de imagen. Referencia para implementar distort/arc per-character real.

**Nota**: Estos archivos están protegidos con copyright. Solo se usarán como referencia técnica para entender los algoritmos, no se copiará código directamente.

## 8. Notas finales

- **El cambio más grande:** refactorizar el motor de render a funciones puras (`js/render-engine.js`) para habilitar la API.
- **El desafío clave:** adaptar la compatibilidad de TextStudio (donde el canvas se adapta al texto) a nuestro modelo (canvas fijo, texto se auto-ajusta).
- **Quick wins:** corregir bugs de propiedades undefined, exportación transparente, conectar inputs de tamaño custom.
- **Iterativo:** las fases 1-4 son críticas para el MVP; las fases 5-10 son mejoras progresivas.
- **Referencia técnica**: Los archivos ofuscados de TextStudio en `js/effects/` proporcionan patrones para implementar efectos WebGL avanzados (bevel, specular, distort).