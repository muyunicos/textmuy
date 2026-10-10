/* ===== TEXTSTUDIO EDITOR - Canvas Rendering Engine ===== */

(function() {
    'use strict';

    // Default settings matching TextStudio's preset structure
    // Conceptual order: TEXT → 3D & FILLING → OUTLINES → SHADOWS → ICON → BACKGROUND → ANIMATION → DOWNLOAD
    // font.src es etiqueta generica inicial (ver FontLoader.DEFAULT_FONT_FAMILY):
    // NO implica fuente cargada; se reemplaza al elegir/cargar una real.
    const defaultSettings = {
        editable: 1,
        // ===== TEXT =====
        text: 'TEXT',
        font: {
            // FR-032: la fuente por defecto se declara por IDENTIDAD de catalogo,
            // que es la forma canonica (R-C1.3). Antes era el nombre visible
            // 'Bangers', y como el desplegable se puebla con identidades
            // numericas (option value="1"), el selector no encontraba su opcion y
            // quedaba mostrando la primera entrada de la lista: el usuario veia
            // una fuente que no era la del proyecto.
            src: 1,
            size: 76,
            weight: 'normal',
            name: '',
        },
        align: 'center',
        rotate: 0,
        // PORCENTAJE con base 0% = ajuste justo (sin hueco y sin solape).
        // -100% encima las lineas, +200% las separa el triple (R-L4.4).
        lineHeight: 0,
        letterSpacing: 0,
        distort: { arc: { angle: 0 } },
        mergeGradients: false,
        // ===== SISTEMA DE LINEAS (002-text-tab US6) =====
        // `activeTarget` es solo QUE se esta editando: no filtra lo que se
        // aplica. `inherit` es el padre de cada linea (ALL por defecto). `line`
        // guarda el estilo PROPIO de cada linea direccionable con claves
        // 1-BASED (`line["1"]` = L1) y su regla de tamano `sizing` dentro
        // ({ref, refLine, mode, pct}). Las lineas 4+ no son direccionables:
        // resuelven como All (contracts/lineas.md).
        lines: { activeTarget: 'all', inherit: {}, line: {} },

        // ===== 3D & FILLING =====
        // Filling (Relleno principal) - RGB format matching TextStudio
        fill: {
            active: true,
            alpha: 1,
            color: { r: 255, g: 255, b: 255 },
            texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'left top', size: 1, lettering: false },
            gradient: { active: false, angle: 0, colors: [] },
            palette: { active: false, lettering: { method: 'letter' }, styles: [] }
        },

        // Lettering (Comportamiento tipográfico)
        lettering: {
            editable: true,
            active: false,
            blendmode: 'over',
            // Flag v2: wave model shared by Tilt/Rise (per-letter actions) and
            // Wave width/Wave shift/Shape (wave geometry). See flagWaveAt().
            // GLOBAL (bloque completo): ver GLOBAL_ONLY_PATHS/isGlobalOnlyPath.
            flag: { active: false, tilt: 0, rise: 0, waveWidth: 100, waveShift: 0, shape: 'smooth', tiltMode: 'wave' },
            // Keys match the UI labels ("Max rotation", "Scatter height").
            // GLOBAL (bloque completo): ver GLOBAL_ONLY_PATHS/isGlobalOnlyPath.
            boggle: { active: false, maxRotation: 40, scatterHeight: 50 },
            reverseOverlap: { letters: 1, lines: 0 },
            // ESTILO por linea: lettering.shadow SI entra a lines.overrides
            // (es una sombra proyectada mas, resuelta por forEachLineSetting).
            shadow: { active: false, size: 0.04, distance: 0.02, angle: 180, fill: { alpha: 1, color: { r: 0, g: 0, b: 0 } } }
        },

        // Processing (efectos de procesamiento de imagen)
        processing: {},

        // 3D Projection #1 (Extrusión tridimensional) - RGB format
        depth: {
            active: false,
            length: 0.2,
            angle: 135,
            fill: {
                alpha: 1,
                color: { r: 255, g: 255, b: 255 },
                mergeAlpha: false,
                gradient: { active: true, type: 'depth', angle: 0, colors: [] },
                texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1 }
            }
        },

        // 3D Projection #2 (Extrusión tridimensional) - RGB format
        depth2: {
            active: false,
            length: 0.2,
            angle: 135,
            fill: {
                alpha: 1,
                color: { r: 255, g: 255, b: 255 },
                mergeAlpha: false,
                gradient: { active: true, type: 'depth', angle: 0, colors: [] },
                texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1 }
            }
        },

        // ===== OUTLINES =====
        // Outline structure matching TextStudio
        outline: {
            first: {
                active: false,
                width: 0.1,
                position: 'outside',
                dash: 0,
                join: 'round',
                fill: {
                    alpha: 1,
                    color: { r: 0, g: 0, b: 0 },
                    gradient: { active: false, angle: 0, colors: [] },
                    palette: { active: false, lettering: { method: 'letter' }, styles: [] },
                    texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1, lettering: false }
                }
            },
            second: {
                active: false,
                width: 0.1,
                position: 'outside',
                dash: 0,
                join: 'round',
                fill: {
                    alpha: 1,
                    color: { r: 0, g: 0, b: 0 },
                    gradient: { active: false, angle: 0, colors: [] },
                    palette: { active: false, lettering: { method: 'letter' }, styles: [] },
                    texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1, lettering: false }
                }
            },
            global: {
                active: false,
                width: 0.1,
                join: 'round',
                mask: false,
                projection: true,
                vector: true,
                shadow: { active: false, color: { r: 0, g: 0, b: 0, a: 1 }, size: 0.5 },
                fill: {
                    alpha: 1,
                    color: { r: 255, g: 255, b: 255 },
                    gradient: { active: false, angle: 0, colors: [] },
                    texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1 }
                }
            },
            global2: {
                active: false,
                width: 0.1,
                join: 'round',
                mask: false,
                projection: true,
                vector: true,
                shadow: { active: false, color: { r: 0, g: 0, b: 0, a: 1 }, size: 0.5 },
                fill: {
                    alpha: 1,
                    color: { r: 255, g: 255, b: 255 },
                    gradient: { active: false, angle: 0, colors: [] },
                    texture: { active: false, alpha: 1, blendmode: 'over', src: null, repeat: 'repeat', position: 'center', size: 1 }
                }
            }
        },

        // Legacy compatibility - map to outline.first
        outline2: {
            active: false,
            width: 0.1,
            color: '#000000',
            join: 'round',
            gradient: { active: false, startColor: '#000000', endColor: '#000000', angle: 0, colors: [] },
            alpha: 1
        },

        // ===== SHADOWS =====
        // Bevel structure matching TextStudio (inner + inner2 "brother")
        bevel: {
            inner: {
                active: false,
                size: 0.1,
                smoothing: 0,
                soften: 0.1,
                angle: 135,
                altitude: 0,
                highlight: { alpha: 1, blendmode: 'over', color: { r: 255, g: 255, b: 255 } },
                shadow: { alpha: 1, blendmode: 'over', color: { r: 0, g: 0, b: 0 } }
            },
            inner2: {
                active: false,
                size: 0.1,
                smoothing: 0,
                soften: 0.1,
                angle: 135,
                altitude: 0,
                highlight: { alpha: 1, blendmode: 'over', color: { r: 255, g: 255, b: 255 } },
                shadow: { alpha: 1, blendmode: 'over', color: { r: 0, g: 0, b: 0 } }
            }
        },

        // Specular inner lighting
        specular: {
            inner: {
                active: false,
                type: 'default',
                color: { r: 255, g: 255, b: 255 },
                blendmode: 'screen',
                blur: 0.5,
                constant: 0.5,
                exponent: 12,
                azimuth: 0,
                elevation: 50,
                point: { x: 0, y: 0, z: 1 },
                scale: 1
            }
        },

        // Shadow structure matching TextStudio
        shadow: {
            outer: {
                active: false,
                size: 0.2,
                strength: 0,
                mask: false,
                distance: 0.1,
                angle: 135,
                fill: {
                    alpha: 1,
                    color: { r: 0, g: 0, b: 0 },
                    gradient: { active: false, angle: 0, colors: [] }
                }
            },
            outer2: {
                active: false,
                size: 0.2,
                strength: 0,
                mask: false,
                distance: 0.1,
                angle: 135,
                fill: {
                    alpha: 1,
                    color: { r: 0, g: 0, b: 255 },
                    gradient: { active: false, angle: 0, colors: [] }
                }
            },
            inner: {
                active: false,
                size: 0.2,
                strength: 0,
                alpha: 1,
                color: { r: 0, g: 0, b: 0 },
                distance: 0.03,
                angle: -45,
                offset: 0,
                erosion: { size: 0, vector: 1 },
                blendmode: 'over'
            },
            inner2: {
                active: false,
                size: 0.2,
                strength: 0,
                alpha: 1,
                color: { r: 255, g: 255, b: 255 },
                distance: 0.03,
                angle: 135,
                offset: 0,
                erosion: { size: 0, vector: 1 },
                blendmode: 'over'
            }
        },

        // Legacy compatibility
        shadowInner: {
            active: false,
            size: 0,
            distance: 0,
            angle: 0,
            offset: 0,
            color: '#000000',
            alpha: 1,
            blendmode: 'normal'
        },
        shadowInner2: {
            active: false,
            size: 0,
            distance: 0,
            angle: 0,
            offset: 0,
            color: '#000000',
            alpha: 1,
            blendmode: 'normal'
        },
        shadowOuter: {
            active: false,
            size: 0,
            distance: 0,
            angle: 0,
            strength: 0,
            fill: { color: '#000000', alpha: 1, gradient: { active: false, startColor: '#000000', endColor: '#ffffff', angle: 0, colors: [] } },
            mask: false,
            blendmode: 'normal'
        },
        shadowOuter2: {
            active: false,
            size: 0,
            distance: 0,
            angle: 0,
            strength: 0,
            fill: { color: '#000000', alpha: 1, gradient: { active: false, startColor: '#000000', endColor: '#ffffff', angle: 0, colors: [] } },
            mask: false,
            blendmode: 'normal'
        },

        // ===== ICON =====
        icon: {
            editable: true,
            active: false,
            alpha: 1,
            src: null,
            size: 1,
            rotate: 0,
            position: 'center',
            composite: 'source-over',
            offset: { x: 0, y: 0 }
        },

        // ===== BACKGROUND =====
        background: {
            editable: true,
            active: true,
            composite: 'source-over',
            fill: {
                alpha: 1,
                color: { r: 0, g: 0, b: 0 },
                image: { active: false, alpha: 1, src: null, size: 'cover', repeat: 'repeat' },
                gradient: { active: false, angle: 0, type: 'radial', colors: [] }
            }
        },

        // ===== ANIMATION =====
        animation: {
            editable: true,
            active: true,
            id: '',
            pause: 1000,
            duration: 1000
        },

        // ===== DOWNLOAD =====
        download: {
            size: 'medium',
            format: 'png',
            ratio: 'fit',
            spacing: 0.05
        },

        // ===== CANVAS =====
        canvas: {
            width: 480,
            height: 320,
            ratio: 0.67,
            autoFit: false,
            zoom: 100,
            maxFontSize: 100,
            padding: 0
        },

        // ===== PROCESSING =====
        processing: {
            active: false,
            code: null
        }
    };
    // OPTION_REGISTRY: genera el mapa de todas las opciones configurables
    // Recorre defaultSettings y devuelve path -> {id, type, default}
    function OPTION_REGISTRY() {
        const registry = {};

        function walk(obj, prefix) {
            if (obj === null || obj === undefined) return;

            const isArray = Array.isArray(obj);
            const isPlainObject = typeof obj === 'object' && !isArray;

            if (isPlainObject || isArray) {
                const keys = isArray ? [...obj.keys()] : Object.keys(obj);
                for (const key of keys) {
                    const newPrefix = prefix ? `${prefix}.${key}` : key;
                    walk(obj[key], newPrefix);
                }
            } else {
                const path = prefix || 'root';
                const id = path.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().replace(/_+/g, '_');
                registry[path] = { id: id, type: typeof obj, default: obj };
            }
        }

        walk(defaultSettings, '');
        return registry;
    }



    // Helper function for safe property access
    function safeGet(obj, path, defaultValue) {
        if (!obj) return defaultValue;
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current === null || current === undefined) {
                return defaultValue;
            }
            current = current[key];
        }
        return current !== undefined ? current : defaultValue;
    }

    // Helper function to safely check if property is active
    function isActive(obj, path) {
        return safeGet(obj, path + '.active', false);
    }

// ---- Performance plumbing -------------------------------------------
    const TEXTURE_CACHE_MAX_IMAGES = 128;            // hard cap on cached textures
    const TEXTURE_CACHE_MAX_BYTES = 64 * 1024 * 1024; // ~64 MB estimated cache size
    const CANVAS_POOL_MAX = 4;                        // reusable offscreen layers
    const CANVAS_POOL_MAX_AREA = 4096 * 4096;         // don't park oversized layers
    // Editor state
    const state = {
        settings: JSON.parse(JSON.stringify(defaultSettings)),
        canvas: null,
        ctx: null,
        scale: 2,
        isRendering: false,
        iconImg: null,
        bgImg: null,
        transparentOutput: false,
        // 002-text-tab US1: true solo en el render a canvas de salida (PNG/PDF).
        // Alli la curva y la rotacion exigen WebGL y rechazan con causa en vez
        // de degradar (contracts/curva.md R-C2.1). El editor visible mantiene
        // el fallback 2D (R-C2.2).
        headlessRender: false,
        textureImages: {}, // loaded texture images by src
        textureOrder: [],  // LRU order (oldest first)
        textureBytes: 0,   // estimated cached bytes
        canvasPool: []     // reusable offscreen 2D canvases
    };

    // Initialize the editor
    // ===== GARANTIA DE LA FUENTE DECLARADA (RC39, 001-fix-bugs-01) =====
    // El lienzo se dibuja con la familia declarada, pero esa familia solo
    // existe en el navegador cuando su archivo se descargó. Antes se pintaba
    // de todas formas y el lienzo mostraba la tipografia del sistema ("parecida
    // a Times") hasta que el usuario tocaba algo. Ahora:
    //   1. se asegura la fuente declarada ANTES del primer pintado;
    //   2. si queda pendiente, se registra un repintado que se dispara al
    //      quedar disponible (FR-002);
    //   3. si falla, se avisa con la causa y NO se sustituye la fuente
    //      (FR-005, R-C2.1, constitucion VI).
    let avisoFuente = null;   // causa visible de la ultima fuente fallida
    let repintarPendiente = false;
    function fuenteDeclarada() {
        const s = state.settings;
        return s && s.font ? (s.font.src !== undefined ? s.font.src : s.font) : null;
    }
    // Asegura las fuentes que el render necesita: la de la base y una por linea
    // USADA (002-text-tab D3, research R7). Cada identidad se carga una sola vez
    // (cache por id de FontLoader) y NO se precarga nada que no se use
    // (constitucion VI, sin preloadAll).
    // No lanza: un fallo se informa nombrando la linea y la fuente, y el editor
    // sigue operativo con lo que ya hay (FR-005, FR-017).
    function asegurarFuenteDeclarada() {
        if (!window.FontLoader || !window.FontLoader.loadFont) return Promise.resolve(null);
        const fuentes = fuentesPorLinea(state.settings);
        if (!fuentes.length) return Promise.resolve(null);
        // Se cargan en paralelo: el tiempo es el de la mas lenta, no la suma.
        return Promise.all(fuentes.map(function (f) {
            return Promise.resolve().then(function () {
                return window.FontLoader.loadFont(f.ref);
            }).then(function (familia) {
                return { ok: true, familia: familia, f: f };
            }).catch(function (e) {
                const causa = (e && e.message) || String(e);
                const donde = f.linea ? ('linea L' + f.linea + ': ') : '';
                return { ok: false, causa: donde + causa, f: f };
            });
        })).then(function (resultados) {
            const fallo = resultados.filter(function (r) { return !r.ok; })[0];
            if (fallo) {
                // Sin sustitucion: se informa la causa y la fuente declarada
                // sigue en el estado, para que el selector diga la verdad.
                avisoFuente = fallo.causa;
                console.warn('Fuente por linea no disponible: ' + avisoFuente);
                if (window.TextEditorControls && TextEditorControls.reportFontError) {
                    TextEditorControls.reportFontError(avisoFuente);
                }
                return null;
            }
            avisoFuente = null;
            if (window.TextEditorControls && TextEditorControls.reportFontError) {
                TextEditorControls.reportFontError(null);
            }
            return resultados.map(function (r) { return r.familia; });
        });
    }
    // Repintar cuando la fuente quede disponible. Solo si la fuente que ya
    // esta es la pedida: una descarga tardia de una fuente descartada por el
    // usuario no debe tocar el lienzo (R-C5.3).
    function alQuedarFuenteLista(ref) {
        repintarPendiente = false;
        try {
            if (window.FontLoader && window.FontLoader.resolveFontFromPreset) {
                if (window.FontLoader.resolveFontFromPreset(ref) !== window.FontLoader.resolveFontFromPreset(fuenteDeclarada())) return;
            }
        } catch (_) { return; }
        render();
    }
    // Punto de entrada comun: asegura la fuente y luego pinta. Lo usan el
    // arranque y la aplicacion de un preset.
    function renderConFuente() {
        asegurarFuenteDeclarada().then(function () { render(); });
    }

    // ===== PREVISUALIZACION TEMPORAL DE FUENTE (RC39, 001-fix-bugs-01) =====
    // La galeria de fuentes aplica la fuente explorada al lienzo sin pasar por
    // el boton de confirmar. NO se toca el estado del proyecto: se guarda la
    // fuente previa y el lienzo se pinta con la explorada. Al cerrar la
    // galeria sin confirmar se vuelve a la previa (data-model §4).
    let fuentePrevia = null;   // referencia previa mientras hay preview activa
    function aplicarFuentePrevia(id) {
        if (!state.settings || !state.settings.font) return;
        if (fuentePrevia === null) {
            fuentePrevia = state.settings.font.src;
        }
        // Se sustituye SOLO la familia efectiva del dibujado, no el estado.
        state.fontPreviaId = id;
        // Cargar primero, pintar despues: si la fuente no llega, se avisa y el
        // lienzo sigue con la anterior en vez de mentirse (R-C5.6, FR-013).
        if (!window.FontLoader || !window.FontLoader.loadFont) {
            state.fontPreviaId = null;
            return;
        }
        Promise.resolve().then(function () {
            return window.FontLoader.loadFont(id);
        }).then(function () {
            // Solo se pinta si la previsualizacion sigue vigente: una descarga
            // tardia de una fuente descartada no debe tocar el lienzo (R-C5.3).
            if (state.fontPreviaId !== id) return;
            render();
        }).catch(function (e) {
            if (state.fontPreviaId !== id) return;
            state.fontPreviaId = null;
            console.warn('Previsualizacion no disponible: ' + ((e && e.message) || e));
        });
    }
    // Confirma la previsualizacion: la fuente explorada ya es la del proyecto,
    // asi que se suelta la referencia previa. IMPORTANTE: tambien se limpia
    // `fontPreviaId`, que es lo que hace que `familiaDeFuente` use la fuente
    // explorada. Sin esta limpieza el lienzo se quedaria pegado a la fuente
    // previsualizada y el selector podria decir otra cosa (R-C5.5, FR-009).
    function confirmarFuentePrevia() {
        fuentePrevia = null;
        state.fontPreviaId = null;
    }
    // Revierte a la referencia previa. Si la descarga de la fuente descartada
    // termina despues, la comparacion de identidad impide el repintado.
    function revertirFuentePrevia(anterior) {
        const previa = fuentePrevia;
        fuentePrevia = null;
        state.fontPreviaId = null;
        if (state.settings && state.settings.font) {
            state.settings.font.src = (anterior !== undefined) ? anterior : previa;
        }
        render();
    }

    function init(canvasId) {
        state.canvas = document.getElementById(canvasId);
        if (!state.canvas) {
            console.error('Canvas element not found:', canvasId);
            return;
        }
        state.ctx = state.canvas.getContext('2d');

        const textarea = document.getElementById('tt-text-textarea');
        if (textarea) {
            textarea.value = state.settings.text;
        }

        // El catalogo primero y la fuente declarada despues, que se le pasa
        // EXPLICITA. Antes la precarga consultaba un estado invisible desde
        // aqui y terminaba asegurando la fuente por defecto (R5).
        repintarPendiente = true;
        if (window.FontLoader) {
            window.FontLoader.preloadAll().then(function () {
                return asegurarFuenteDeclarada();
            }).then(function () {
                alQuedarFuenteLista(fuenteDeclarada());
            });
        }

        const canvasWrapper = document.getElementById('tt-canvas-wrapper');
        if (canvasWrapper && typeof ResizeObserver !== 'undefined') {
            state.canvasResizeObserver = new ResizeObserver(function() {
                render();
            });
            state.canvasResizeObserver.observe(canvasWrapper);
        }

        render();
    }

    // Calculate extra width/height from effects (outline, depth, shadow)
    // Updated for TextStudio structure (outline.first, outline.second, outline.global, etc.)
    function calcExtraWidth(s, fontSizePx) {
        let extra = 0;
        
        // Outline layers
        if (isActive(s, 'outline.first')) extra += safeGet(s, 'outline.first.width', 0) * fontSizePx * 2;
        if (isActive(s, 'outline.second')) extra += safeGet(s, 'outline.second.width', 0) * fontSizePx * 2;
        if (isActive(s, 'outline.global')) extra += safeGet(s, 'outline.global.width', 0) * fontSizePx * 2;
        
        // Legacy compatibility
        if (isActive(s, 'outline')) extra += safeGet(s, 'outline.width', 0) * fontSizePx * 2;
        if (isActive(s, 'outline2')) extra += safeGet(s, 'outline2.width', 0) * fontSizePx * 2;
        
        // Shadow layers
        if (isActive(s, 'shadow.outer')) extra += safeGet(s, 'shadow.outer.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadow.outer.size', 0) * fontSizePx * 2;
        if (isActive(s, 'shadow.outer2')) extra += safeGet(s, 'shadow.outer2.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadow.outer2.size', 0) * fontSizePx * 2;
        
        // Legacy compatibility
        if (isActive(s, 'shadowOuter')) extra += safeGet(s, 'shadowOuter.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadowOuter.size', 0) * fontSizePx * 2;
        if (isActive(s, 'shadowOuter2')) extra += safeGet(s, 'shadowOuter2.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadowOuter2.size', 0) * fontSizePx * 2;
        
        // Depth layers
        if (isActive(s, 'depth')) extra += safeGet(s, 'depth.length', 0) * fontSizePx * 2;
        if (isActive(s, 'depth2')) extra += safeGet(s, 'depth2.length', 0) * fontSizePx * 2;
        
        return extra;
    }

    function calcExtraHeight(s, fontSizePx) {
        return calcExtraWidth(s, fontSizePx); // Same calculation for both dimensions
    }

    // Measure text width with letter spacing
    function measureTextWidth(ctx, text, letterSpacing, fontSizePx) {
        let totalWidth = 0;
        const spacing = letterSpacing * fontSizePx * 0.1;
        for (let i = 0; i < text.length; i++) {
            totalWidth += ctx.measureText(text[i]).width;
        }
        totalWidth += spacing * Math.max(0, text.length - 1);
        return totalWidth;
    }

    // Canvas pixels always keep their configured size. Zoom affects only the
    
    // Canvas pixels always keep their configured size. Zoom affects only the

    /**
     * Apply reverse overlap effect - overlap letters in reverse order
     * This creates a stacked/overlapping effect
     */
    // Canvas pixels always keep their configured size. Zoom affects only the
    // preview CSS size so it cannot alter the output or stretch its aspect ratio.
    function calculateDynamicCanvasSize(ctx, text, s) {
        const baseCanvasWidth = s.canvas.width || 480;
        const baseCanvasHeight = s.canvas.height || 320;
        return {
            width: Math.max(1, Math.round(baseCanvasWidth)),
            height: Math.max(1, Math.round(baseCanvasHeight))
        };
    }

    function calculateCanvasDisplaySize(canvasWidth, canvasHeight, zoomValue) {
        const wrapper = document.getElementById('tt-canvas-wrapper');
        const availableWidth = wrapper && wrapper.clientWidth ? wrapper.clientWidth * 0.9 : canvasWidth;
        const availableHeight = wrapper && wrapper.clientHeight ? wrapper.clientHeight * 0.9 : canvasHeight;
        const fitScale = Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight);
        // At 0%, keep the shortest canvas edge at 50px when the wrapper has
        // room, so tall or wide canvases remain usable while preserving ratio.
        const minimumScale = 50 / Math.min(canvasWidth, canvasHeight);
        const zoom = Math.max(0, Math.min(300, Number(zoomValue) || 0));

        let requestedScale;
        if (zoom <= 100) {
            requestedScale = minimumScale + (fitScale - minimumScale) * (zoom / 100);
        } else {
            requestedScale = fitScale + (3 - fitScale) * ((zoom - 100) / 200);
        }

        // Up to 100% the preview is contained. Above it, preserve the
        // requested scale and let the centered viewer clip the overflow.
        const displayScale = zoom > 100 ? requestedScale : Math.min(requestedScale, fitScale);
        return Math.max(1, Math.round(canvasWidth * displayScale));
    }

    // ===== COMPOSICION DEL VALOR DE FUENTE (RC39, 001-fix-bugs-01) =====
    // Unica forma de fijar la fuente de un contexto (R-C3.1). Antes cada punto
    // de dibujado componia su propio valor con el nombre de familia SUELTO:
    // un nombre con espacios generaba una abreviatura CSS invalida, el
    // navegador la IGNORABA en silencio y el lienzo conservaba la composicion
    // anterior. Esa era la fuente fantasma que veia el usuario (US1).
    //
    // La familia se pide YA entrecomillada a FontLoader.getFontFamily, que es
    // un resolvedor puro. Si la fuente declarada no esta disponible, la
    // ausencia se hace perceptible en vez de dibujar con otra tipografia
    // (R-C3.3, FR-013).
    function familiaDeFuente(s) {
        // RC39: si hay una previsualizacion temporal activa (galeria de
        // fuentes), el lienzo usa la fuente explorada sin que el estado la
        // haya adoptionado todavia (R-C5.1, R-C5.5).
        const enPrevia = (typeof state !== 'undefined' && state.fontPreviaId !== null
            && state.fontPreviaId !== undefined);
        const ref = enPrevia
            ? state.fontPreviaId
            : (s && s.font ? (s.font.src !== undefined ? s.font.src : s.font) : null);
        if (window.FontLoader && window.FontLoader.getFontFamily) {
            const f = window.FontLoader.getFontFamily(ref);
            if (f) return f;
        }
        // Sin modulo de fuentes: se usa el nombre tal cual entrecomillado.
        const crudo = String(ref === null || ref === undefined ? '' : ref).replace(/"/g, "'");
        return crudo ? '"' + crudo + '"' : '"sans-serif"';
    }
    // Compone y aplica el valor de fuente. Devuelve el valor aplicado, o null
    // si el contexto lo rechazo (fallo visible, nunca un valor residual).
    function aplicarFuente(ctx, s, px) {
        ctx.font = componerFuente(s, px);
        // R-C3.4 / FR-025: avisar SOLO cuando el lienzo rechazo de verdad el
        // valor. Comparar el texto crudo daba falso positivo: el navegador
        // serializa el valor normalizado (p.ej. 'normal 187px "Bangers"' se lee
        // como 'normal 187px Bangers' porque las comillas sobran), con lo que
        // se avisaba ~15 veces por pintado sobre un valor perfectamente valido.
        // Un rechazo real solo ocurre si el valor era invalido de verdad; se
        // comprueba comparando lo normalizado y confirmando que la familia
        // pedido no quedo aplicada.
        const familia = familiaDeFuente(s);
        if (!fuenteAplicada(ctx, ctx.font, familia)) {
            console.warn('El lienzo rechazo el valor de fuente "' + ctx.font + '" (CSS invalido).');
        }
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        return ctx.font;
    }
    // Compone el valor de `ctx.font` SIN aplicarlo. UNICA forma de hacerlo
    // (R-C3.1 / RC39): la familia llega entrecomillada de familiaDeFuente, que
    // es resolvedor puro, asi que un nombre con espacios no genera una
    // abreviatura CSS invalida que el navegador ignoraria en silencio.
    // La usan aplicarFuente y las dos bisecciones de tamano (autoFitText y
    // fitSingleLine), que MIDEN con el mismo valor que se va a pintar.
    function componerFuente(s, px) {
        const peso = (s && s.font && s.font.weight) || 'normal';
        return peso + ' ' + Math.max(1, Math.round(px)) + 'px ' + familiaDeFuente(s);
    }
    // Normaliza un valor de fuente para comparar: sin comillas y con espacios
    // normalizados. Chrome devuelve el shorthand ya serializado, que puede
    // diferir del puesto solo en las comillas de la familia.
    function normalizarValorFuente(v) {
        return String(v || '').replace(/"/g, '').replace(/'/g, '').replace(/\s+/g, ' ').trim();
    }
    // El lienzo aplico el valor si, tras normalizar, lo que quedo puesto
    // corresponde al valor pedido (o al menos tiene el tamano y la familia).
    function fuenteAplicada(ctx, valor, familia) {
        const actual = normalizarValorFuente(ctx.font);
        const pedido = normalizarValorFuente(valor);
        if (actual === pedido) return true;
        // Si la familia pedida aparece en lo que quedo puesto, el navegador
        // acepto el valor aunque lo serialice distinto.
        return normalizarValorFuente(familia).length > 0 && actual.indexOf(normalizarValorFuente(familia)) !== -1;
    }

    // ===== GEOMETRIA UNICA DEL BLOQUE (002-text-tab, contracts/geometria.md) =====
    // Un UNICO calculo del area util y un UNICO modelo de bloque, compartidos por
    // el ajuste y por todos los motores de dibujo: lo calculado es lo pintado.

    // Proporcion minima del lado menor que el area util conserva SIEMPRE. Con
    // margen al maximo el texto se achica pero nunca desaparece (R-G1.4, FR-003).
    const MIN_AVAIL_RATIO = 0.12;

    /**
     * Area util = lienzo menos el margen. El margen se mide contra el LADO MENOR
     * (con un lienzo apaisado medirlo contra el ancho lo hacia desaparecer
     * antes de tiempo) y se topa para que el area util nunca llegue a cero ni
     * negativa. Es el unico sitio donde se calcula (R-G1.4, R-G1.1).
     */
    function areaUtil(s, canvasWidth, canvasHeight) {
        const w = Math.max(1, Number(canvasWidth) || 1);
        const h = Math.max(1, Number(canvasHeight) || 1);
        const raw = s && s.canvas && s.canvas.padding !== undefined ? Number(s.canvas.padding) : 0;
        // El slider llega a 50%; un margen corrupto se trata como el maximo.
        const ratio = Math.max(0, Math.min(0.5, isFinite(raw) ? raw : 0));
        const minor = Math.min(w, h);
        const padMax = minor * (1 - MIN_AVAIL_RATIO) / 2;
        const pad = Math.max(0, Math.min(minor * ratio, padMax));
        return {
            pad: pad,
            width: Math.max(1, w - pad * 2),
            height: Math.max(1, h - pad * 2)
        };
    }

    /**
     * Geometria de bloque: baselines por tinta y avances acumulados por linea.
     *
     * - L1 ANCLA el bloque (su `lineHeight` se guarda pero no la mueve: no tiene
     *   linea arriba, FR-021).
     * - la linea i>1 baja `lineHeight * tamano[i-1]` respecto de la anterior, con
     *   el tamano de SU linea: nunca se superponen (R-G1.2, R-G1.3).
     * - el anclaje se calcula con el interlineado de referencia (1), asi el
     *   bloque sale centrado igual que antes y L1 queda quieta para cualquier
     *   Line height (FR-007, FR-008).
     *
     * `sizes` es el tamano por linea (state.lineFontPx); si falta, `fontSizePx`
     * para todas.
     */
    function blockLayout(ctx, lines, s, sizes, fontSizePx) {
        const n = lines.length;
        const lh = (s && s.lineHeight !== undefined && s.lineHeight !== null) ? Number(s.lineHeight) : 1;
        const px = [];
        const ascent = [];
        const descent = [];
        const widths = [];
        let maxLineWidth = 0;
        // 002-text-tab D3 (research R7): cada linea se MIDE con SU tipografia.
        // Medirlo todo con la fuente de la base hacia que las lineas con otra
        // tipografia ajustaran mal: el ancho medido no era el que se pintaba.
        const memo = {};
        const porLinea = hayEstiloPorLinea(s);
        for (let i = 0; i < n; i++) {
            const size = (sizes && sizes[i] !== undefined && sizes[i] !== null)
                ? Number(sizes[i])
                : (fontSizePx !== undefined ? Number(fontSizePx) : 0);
            px.push(size);
            const sLinea = porLinea ? resolveLine(s, i + 1, memo) : s;
            // Se aplica el tamaño que trae `sizes` (o el global), no el que
            // resolvería setTextFont por su cuenta: aquí el tamaño ya está
            // decidido por linea y es el que hay que medir.
            aplicarFuente(ctx, sLinea, size);
            const m = ctx.measureText('Ag');
            const a = m.actualBoundingBoxAscent || size * 0.8;
            const d = m.actualBoundingBoxDescent || size * 0.2;
            ascent.push(a);
            descent.push(d);
            const ls = (sLinea && sLinea.letterSpacing !== undefined) ? sLinea.letterSpacing : (s.letterSpacing || 0);
            const w = measureTextWidth(ctx, lines[i], ls, size);
            widths.push(w);
            if (w > maxLineWidth) maxLineWidth = w;
        }
        // Altura de referencia (interlineado 0% = ajuste justo): el bloque queda
        // centrado como hasta ahora y es INDEPENDIENTE del Line height actual.
        // El "justo" es cola + asta de cada par, medido con la tipografia de CADA
        // linea: con una sola tipografia eso da el tamano de linea y 0% reproduce
        // el comportamiento historico (R-G1.2, R-G1.6).
        const justo = [];
        for (let i = 1; i < n; i++) justo.push(descent[i - 1] + ascent[i]);
        let refHeight = ascent[0] + descent[0];
        for (let i = 1; i < n; i++) refHeight += justo[i - 1];
        const firstBaseline = -refHeight / 2 + ascent[0];
        // El aire ANTERIOR a la linea i+1 lo controla ESA linea (R-G1.5): con
        // 0% avanza justo (sin hueco, sin solape), con -100% se enciman y con
        // +200% se separa el triple.
        const baselines = [firstBaseline];
        for (let i = 1; i < n; i++) {
            const factor = 1 + lineHeightDe(s, i + 1, memo) / 100;
            baselines.push(baselines[i - 1] + Math.max(0, justo[i - 1]) * Math.max(0, factor));
        }
        const top = baselines[0] - ascent[0];
        const bottom = baselines[n - 1] + descent[n - 1];
        return {
            px: px, ascent: ascent, descent: descent, widths: widths,
            baselines: baselines, firstBaseline: firstBaseline,
            lineHeight: lh, maxLineWidth: maxLineWidth,
            top: top, bottom: bottom, height: bottom - top
        };
    }

    // Auto-fit: find the largest font size that fits within the canvas
    function autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s) {
        const area = areaUtil(s, canvasWidth, canvasHeight);
        const availW = area.width;
        const availH = area.height;

        let lo = 8;
        let hi = Math.max(8, Math.ceil(Math.max(canvasWidth, canvasHeight)));
        let best = 8;

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            // La biseccion MIDE con el mismo valor que se va a pintar: se usa
            // componerFuente, la unica composicion (antes se armaba a mano y
            // quedaba fuera del punto unico de RC39).
            ctx.font = componerFuente(s, mid);

            // Find the widest line
            let maxLineWidth = 0;
            for (let i = 0; i < lines.length; i++) {
                const w = measureTextWidth(ctx, lines[i], s.letterSpacing, mid);
                if (w > maxLineWidth) maxLineWidth = w;
            }

            // Geometria unica: la altura del bloque sale del mismo modelo que
            // usa el dibujado (R-G1.1), no de una cuenta aparte.
            const metrics = ctx.measureText('Ag');
            const ascent = metrics.actualBoundingBoxAscent || mid * 0.8;
            const descent = metrics.actualBoundingBoxDescent || mid * 0.2;
            // Avance 'justo' (cola + asta): independiente del Line height, que solo
            // lo multiplica despues al componer (R-G1.2).
            const lineAdvance = mid;
            const textHeight = ascent + descent + (lines.length - 1) * lineAdvance;
            const extraW = calcExtraWidth(s, mid);
            const extraH = calcExtraHeight(s, mid);
            let renderedWidth = maxLineWidth + extraW;
            let renderedHeight = textHeight + extraH;
            const arcAngle = safeGet(s, 'distort.arc.angle', 0);
            if (Math.abs(arcAngle) >= 0.1 && typeof DistortEngine !== 'undefined') {
                const arcBounds = DistortEngine.getArcGeometry(renderedWidth, renderedHeight, arcAngle);
                renderedWidth = arcBounds.width;
                renderedHeight = arcBounds.height;
            }
            const rotation = Math.abs(s.rotate || 0) * Math.PI / 180;
            if (rotation > 0.0001) {
                const rotatedWidth = Math.abs(renderedWidth * Math.cos(rotation)) + Math.abs(renderedHeight * Math.sin(rotation));
                const rotatedHeight = Math.abs(renderedWidth * Math.sin(rotation)) + Math.abs(renderedHeight * Math.cos(rotation));
                renderedWidth = rotatedWidth;
                renderedHeight = rotatedHeight;
            }

            if (renderedWidth <= availW && renderedHeight <= availH) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        return best;
    }

    // ===== PERFORMANCE HELPERS =====
    // Reusable offscreen canvases avoid churn on the large text-composition
    // layer that is recreated on every frame.
    function acquireCanvas(width, height) {
        const pool = state.canvasPool;
        for (let i = 0; i < pool.length; i++) {
            const c = pool[i];
            if (c.width === width && c.height === height) {
                pool.splice(i, 1);
                const cctx = c.getContext('2d');
                cctx.setTransform(1, 0, 0, 1, 0, 0);
                cctx.clearRect(0, 0, c.width, c.height);
                return c;
            }
        }
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return c;
    }

    function releaseCanvas(canvas) {
        if (!canvas) return;
        if (canvas.width * canvas.height > CANVAS_POOL_MAX_AREA) return;
        if (state.canvasPool.length >= CANVAS_POOL_MAX) return;
        state.canvasPool.push(canvas);
    }

    function estimateImageBytes(img) {
        if (!img) return 0;
        if (img.width && img.height) return img.width * img.height * 4;
        return 1 * 1024 * 1024;
    }

    // Texture src referenced by the current settings, so the LRU never evicts
    // an image the very next render would have to reload.
    function activeTextureSrcs() {
        const s = state.settings;
        const srcs = new Set();
        function add(v) { if (typeof v === 'string' && v) srcs.add(v); }
        add(safeGet(s, 'fill.texture.src'));
        add(safeGet(s, 'outline.first.fill.texture.src'));
        add(safeGet(s, 'outline.second.fill.texture.src'));
        add(safeGet(s, 'outline.global.fill.texture.src'));
        add(safeGet(s, 'depth.fill.texture.src'));
        add(safeGet(s, 'depth2.fill.texture.src'));
        const layers = s.fill && s.fill.layers;
        if (Array.isArray(layers)) {
            layers.forEach(function(layer) {
                (layer && Array.isArray(layer.styles) ? layer.styles : []).forEach(function(style) {
                    if (style && style.texture) add(style.texture.src);
                });
            });
        }
        return srcs;
    }

    function cacheTexture(src, img) {
        state.textureImages[src] = img;
        state.textureBytes += estimateImageBytes(img);
        state.textureOrder.push(src);
        trimTextureCache();
    }

    function touchTexture(src) {
        const idx = state.textureOrder.indexOf(src);
        if (idx !== -1) state.textureOrder.splice(idx, 1);
        state.textureOrder.push(src);
    }

    function removeTexture(src) {
        const img = state.textureImages[src];
        state.textureBytes -= estimateImageBytes(img);
        delete state.textureImages[src];
        const idx = state.textureOrder.indexOf(src);
        if (idx !== -1) state.textureOrder.splice(idx, 1);
    }

    function trimTextureCache() {
        const active = activeTextureSrcs();
        while (
            state.textureOrder.length > TEXTURE_CACHE_MAX_IMAGES ||
            state.textureBytes > TEXTURE_CACHE_MAX_BYTES
        ) {
            if (!state.textureOrder.length) break;
            const victim = state.textureOrder[0];
            if (active.has(victim)) {
                // Oldest candidate is still in use; evict the next free entry.
                const next = state.textureOrder.find(function(src) { return !active.has(src); });
                if (!next) break;
                removeTexture(next);
                continue;
            }
            removeTexture(victim);
        }
    }

    function clearTextureCache() {
        state.textureImages = {};
        state.textureOrder = [];
        state.textureBytes = 0;
    }

    // Main render function
    function render() {
        if (state.isRendering || !state.ctx) return;
        state.isRendering = true;

        const ctx = state.ctx;
        const s = state.settings;

        const text = s.text || 'TEXT';

        // The fixed pixel canvas never grows to fit the text; autoFitText()
        // shrinks the font instead. Zoom only changes the preview size.
        const dynamicSize = calculateDynamicCanvasSize(ctx, text, s);
        const canvasWidth = dynamicSize.width;
        const canvasHeight = dynamicSize.height;

        // Only reassign when the size actually changes: writing to
        // .width/.height resets every 2D context property in most browsers.
        if (state.canvas.width !== canvasWidth) state.canvas.width = canvasWidth;
        if (state.canvas.height !== canvasHeight) state.canvas.height = canvasHeight;

        const displayWidth = calculateCanvasDisplaySize(canvasWidth, canvasHeight, s.canvas.zoom);
        state.canvas.style.width = displayWidth + 'px';
        state.canvas.style.height = 'auto';

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background
        drawBackground(ctx, canvasWidth, canvasHeight);

        const lines = text.split('\n');

        // Max Font Size is based on one character and the canvas's limiting
        // axis: height for horizontal canvases, width for vertical ones.
        // Auto-fit can still reduce that cap when the complete text needs it.
        // El area util sale del helper unico (R-G1.4).
        const util = areaUtil(s, canvasWidth, canvasHeight);
        const availableWidth = util.width;
        const availableHeight = util.height;
        const singleCharacterReference = canvasWidth >= canvasHeight ? availableHeight : availableWidth;
        const maxFontPercentage = Math.max(0, Math.min(100, s.canvas.maxFontSize !== undefined ? s.canvas.maxFontSize : 100)) / 100;
        const maxFontSizePx = singleCharacterReference * maxFontPercentage;
        const fittingFontSize = autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s);
        const fontSizePx = Math.max(8, Math.round(Math.min(fittingFontSize, maxFontSizePx)));

        // Tamano por linea: global salvo sizing en modo line u overrides de
        // font.size. state.lineFontPx[i] es la fuente de verdad del tamano de
        // cada linea para drawTextLines y los motores por-linea.
        state.lineFontPx = lineFontSizes(ctx, lines, canvasWidth, canvasHeight, s, fontSizePx);

        // Changing canvas dimensions resets every 2D context property.
        setTextFont(ctx, s, fontSizePx);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // RC32: refs numericas de imagen (number o string "47") se resuelven
        // via prepareImgRefs; hasta entonces se omiten (cero 404 de ruido).
        function esRefImgNumerica(v) {
            if (typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 1) return true;
            if (typeof v === 'string' && window.TextMuyCatalog && window.TextMuyCatalog.esIdNumerico
                && window.TextMuyCatalog.esIdNumerico(v)) return true;
            return false;
        }
        // Load icon image if needed (refs numericas se resuelven via
        // prepareImgRefs; hasta entonces se omiten, cero 404 de ruido)
        if (isActive(s, 'icon') && safeGet(s, 'icon.src') && !esRefImgNumerica(safeGet(s, 'icon.src'))) {
            loadIconImage(s.icon.src);
        }

        // Load texture images if needed
        if (isActive(s, 'fill.texture') && safeGet(s, 'fill.texture.src') && !esRefImgNumerica(safeGet(s, 'fill.texture.src'))) {
            loadTextureImage(s.fill.texture.src);
        }
        if (isActive(s, 'outline.texture') && safeGet(s, 'outline.texture.src') && !esRefImgNumerica(safeGet(s, 'outline.texture.src'))) {
            loadTextureImage(s.outline.texture.src);
        }

        // Render all text-related pixels offscreen. The arc is intentionally
        // applied only after this complete layer has been composed, so every
        // fill, outline and shadow follows exactly the same curve. A rotated
        // or fully curved text block can be wider or taller before its final
        // transform than its final bounding box, so size this source layer
        // from the untransformed content to prevent early clipping.
        const rotationValue = Math.abs(s.rotate || 0) * Math.PI / 180;
        const arcAngle = safeGet(s, 'distort.arc.angle', 0);
        const offscreenGutter = 4;
        // La capa fuente se dimensiona con la MISMA geometria que se pinta
        // (blockLayout): si el calculo del alto se hiciera aparte, el bloque
        // quedaria desalineado o recortado (R-G1.1).
        //
        // El bloque con Line height > 1 crece hacia abajo desde L1 (que queda
        // fija, FR-008), asi que la capa se dimensiona por el SEMIALTO MAYOR
        // entre arriba y abajo: el origen sigue en el centro y entra todo el
        // texto. Con Line height 1 coincide con el tamano de siempre.
        const blockGeo = blockLayout(ctx, lines, s, state.lineFontPx, fontSizePx);
        const textBlockWidth = blockGeo.maxLineWidth;
        const blockHalfAbove = Math.max(0, -blockGeo.top);
        const blockHalfBelow = Math.max(0, blockGeo.bottom);
        const extraH = calcExtraHeight(s, fontSizePx);
        const half = Math.ceil(Math.max(blockHalfAbove, blockHalfBelow) + extraH / 2 + offscreenGutter);
        const textBlockHeight = half * 2;
        const offscreenSide = Math.ceil(Math.hypot(canvasWidth, canvasHeight)) + offscreenGutter * 2;
        const sourceWidth = Math.ceil(textBlockWidth + calcExtraWidth(s, fontSizePx)) + offscreenGutter * 2;
        const sourceHeight = textBlockHeight;
        const needsExpandedTextLayer = rotationValue > 0.0001 || Math.abs(arcAngle) >= 0.1;
        const textLayerWidth = needsExpandedTextLayer
            ? Math.max(canvasWidth, sourceWidth, rotationValue > 0.0001 ? offscreenSide : 0)
            : canvasWidth;
        const textLayerHeight = needsExpandedTextLayer
            ? Math.max(canvasHeight, sourceHeight, rotationValue > 0.0001 ? offscreenSide : 0)
            : canvasHeight;
        const textLayer = acquireCanvas(textLayerWidth, textLayerHeight);
        textLayer.width = textLayerWidth;
        textLayer.height = textLayerHeight;
        const textCtx = textLayer.getContext('2d');
        textCtx.save();
        textCtx.translate(textLayerWidth / 2, textLayerHeight / 2);

        // Render order matching TextStudio pipeline
        // 1. Outer shadow 2 (TextStudio: shadow.outer2)
        if (isActive(s, 'shadow.outer2') || isActive(s, 'shadowOuter2')) {
            drawOuterShadow2(textCtx, text, lines, fontSizePx, s);
        }

        // 2. Outer shadow (TextStudio: shadow.outer)
        if (isActive(s, 'shadow.outer') || isActive(s, 'shadowOuter')) {
            drawOuterShadow(textCtx, text, lines, fontSizePx, s);
        }

        // 3. 3D depth 2
        if (isActive(s, 'depth2')) {
            drawDepth2(textCtx, text, lines, fontSizePx, s);
        }

        // 4. 3D depth
        if (isActive(s, 'depth')) {
            drawDepth(textCtx, text, lines, fontSizePx, s);
        }

        // 5. Fill
        if (isActive(s, 'fill')) {
            drawFill(textCtx, text, lines, fontSizePx, s);
        }

        // 6. Outline second (TextStudio: outline.second)
        if (isActive(s, 'outline.second') || isActive(s, 'outline2')) {
            drawOutline2(textCtx, text, lines, fontSizePx, s);
        }

        // 7. Outline first (TextStudio: outline.first)
        if (isActive(s, 'outline.first') || isActive(s, 'outline')) {
            drawOutline(textCtx, text, lines, fontSizePx, s);
        }

        // 8. Outline global (TextStudio: outline.global)
        if (isActive(s, 'outline.global')) {
            drawOutlineGlobal(textCtx, text, lines, fontSizePx, s);
        }

        // 9. Bevel inner (TextStudio: bevel.inner)
        if (isActive(s, 'bevel.inner') || isActive(s, 'bevel')) {
            drawBevel(textCtx, text, lines, fontSizePx, s);
        }

        // 10. Inner shadow 2 (TextStudio: shadow.inner2)
        if (isActive(s, 'shadow.inner2') || isActive(s, 'shadowInner2')) {
            drawInnerShadow2(textCtx, text, lines, fontSizePx, s);
        }

        // 11. Inner shadow (TextStudio: shadow.inner)
        if (isActive(s, 'shadow.inner') || isActive(s, 'shadowInner')) {
            drawInnerShadow(textCtx, text, lines, fontSizePx, s);
        }

        // 12. Icon
        if (isActive(s, 'icon') && state.iconImg) {
            drawIcon(textCtx, text, lines, fontSizePx, s);
        }

        textCtx.restore();

        let composedLayer = textLayer;
        let hasTrimmedContent = false;
        if (Math.abs(arcAngle) >= 0.1 && typeof DistortEngine !== 'undefined') {
            if (!state.distortEngine) state.distortEngine = new DistortEngine();
            const croppedLayer = state.distortEngine.trimTransparent(textLayer);
            if (croppedLayer) {
                // 002-text-tab US1 (R-C2.1): en la ruta de salida (render a
                // canvas para PNG/PDF) la curva NO degrada al fallback 2D: si
                // WebGL no puede calcularla se rechaza con causa en vez de
                // devolver el texto recto o un resultado distinto al del editor
                // (constitucion II). El editor visible mantiene el fallback
                // (R-C2.2).
                const curved = state.distortEngine.curve(croppedLayer, arcAngle, { requireWebGL: state.headlessRender });
                if (curved) {
                    composedLayer = curved;
                    hasTrimmedContent = true;
                } else if (state.headlessRender) {
                    state.isRendering = false;
                    releaseCanvas(textLayer);
                    throw new Error('curva:webgl:no_disponible (la curva del texto exige WebGL en la ruta de render)');
                }
            }
        }

        // Rotation is deliberately final, applied after the curve so the order matches
        // the reference editor. The final canvas remains fixed. To avoid clipping the
        // rotated text against the canvas edges, the empty transparent border of the
        // composed layer is trimmed before rotating, so rotation is centered on the
        // actual content instead of the full-canvas transparent box.
//
        // 002-text-tab US4 (R-G2.1): el recorte y el encaje se aplican SIEMPRE, no solo
        // cuando hubo curva o rotacion. Antes el encaje vivia en el camino con recorte,
        // por eso la rotacion enmascaraba el desborde y con el resto de combinaciones
        // el texto se salia del margen pedido (FR-005).
        let rotateLayer = composedLayer;
        if (typeof DistortEngine !== 'undefined') {
            if (!state.distortEngine) state.distortEngine = new DistortEngine();
            const trimmedLayer = state.distortEngine.trimTransparent(composedLayer, undefined, { centrar: true });
            if (trimmedLayer) {
                rotateLayer = trimmedLayer;
                hasTrimmedContent = true;
            }
        }

        // Fit the ACTUAL final layer as a last step, with or without curve/rotation, so
        // no combination of layout can push ink into the border (FR-005, SC-004). The
        // trim keeps a small antialiasing gutter that becomes the safety margin.
        const rotationCos = Math.abs(Math.cos(rotationValue));
        const rotationSin = Math.abs(Math.sin(rotationValue));
        const finalWidth = rotateLayer.width * rotationCos + rotateLayer.height * rotationSin;
        const finalHeight = rotateLayer.width * rotationSin + rotateLayer.height * rotationCos;
        // R-G2.1: el encaje apunta a un area util REDUCIDA en el margen de
        // seguridad, asi ni con Margin 0 la tinta toca el borde del lienzo. Sin
        // esto un texto que llena el ancho llegaba a la columna 0 y a la ultima.
        const SAFETY = 2;
        const fitWidth = Math.max(1, availableWidth - SAFETY * 2);
        const fitHeight = Math.max(1, availableHeight - SAFETY * 2);
        // R-G2.2: el encaje solo reduce, nunca amplia: no compite con el ajuste.
        const finalScale = hasTrimmedContent
            ? Math.min(1, fitWidth / Math.max(1, finalWidth), fitHeight / Math.max(1, finalHeight))
            : 1;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(finalScale, finalScale);
        ctx.rotate((s.rotate * Math.PI) / 180);
        ctx.drawImage(rotateLayer, -rotateLayer.width / 2, -rotateLayer.height / 2);
        ctx.restore();

        // The composed pixels have already been drawn into the target context,
        // so the source layer can be parked for reuse on the next frame.
        releaseCanvas(textLayer);

        state.isRendering = false;
    }

    // Load icon image
    function loadIconImage(src) {
        if (state.iconImg && state.iconImg.src === src) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            state.iconImg = img;
            render();
        };
        img.onerror = function() {
            state.iconImg = null;
        };
        img.src = src;
    }

    // Load texture image (LRU-cached)
    function loadTextureImage(src, callback) {
        if (!src) {
            if (callback) callback(null);
            return;
        }
        if (state.textureImages[src]) {
            touchTexture(src);
            if (callback) callback(state.textureImages[src]);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            cacheTexture(src, img);
            if (callback) callback(img);
            // Textures decode asynchronously: repaint right away so a freshly
            // uploaded pattern appears without needing another interaction
            // (icons and background images already do this).
            render();
        };
        img.onerror = function() {
            if (callback) callback(null);
        };
        img.src = src;
    }

    // Draw background
    function drawBackground(ctx, width, height) {
        const s = state.settings;

        ctx.save();
        if (safeGet(s, 'background.composite')) {
            ctx.globalCompositeOperation = s.background.composite;
        }

        // Support both legacy structure and new TextStudio structure
        const bgConfig = s.background;
        const bgFill = bgConfig.fill || bgConfig;
        const bgImage = bgFill.image || bgConfig.image;
        const bgGradient = bgFill.gradient || bgConfig.gradient;

        if (bgImage && bgImage.active && bgImage.src && typeof bgImage.src !== 'number') {
            loadBackgroundImage(bgImage.src);
            if (state.bgImg) {
                const img = state.bgImg;
                const size = bgImage.size || 'cover';
                const repeat = bgImage.repeat || 'repeat';
                const alpha = bgImage.alpha || 1;

                if (repeat === 'repeat') {
                    ctx.globalAlpha = alpha;
                    const pattern = ctx.createPattern(img, repeat);
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, width, height);
                } else {
                    ctx.globalAlpha = alpha;
                    let dw = width, dh = height;
                    if (size === 'contain') {
                        const ratio = Math.min(width / img.width, height / img.height);
                        dw = img.width * ratio;
                        dh = img.height * ratio;
                    } else if (size === 'stretch') {
                        dw = width;
                        dh = height;
                    }
                    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
                }
                ctx.restore();
                return;
            }
        }

        if (bgGradient && bgGradient.active) {
            const angle = (bgGradient.angle || 0) * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const grad = ctx.createLinearGradient(
                width / 2 - cos * width / 2, height / 2 - sin * height / 2,
                width / 2 + cos * width / 2, height / 2 + sin * height / 2
            );
            addGradientStops(grad, bgGradient);
            ctx.fillStyle = grad;
            ctx.globalAlpha = bgFill.alpha || 1;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            return;
        }

        if (isActive(s, 'background') && (bgFill.alpha || 0) > 0) {
            const color = bgFill.color || '#000000';
            ctx.fillStyle = getColorValue(color, bgFill.alpha || 1);
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            return;
        }

        ctx.restore();

        if (!state.transparentOutput) {
            // Checkered background for transparency preview only
            const size = 20;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#222';
            for (let y = 0; y < height; y += size) {
                for (let x = 0; x < width; x += size) {
                    if ((x / size + y / size) % 2 === 0) {
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        }
    }

    // Load background image
    function loadBackgroundImage(src) {
        if (state.bgImg && state.bgImg.src === src) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            state.bgImg = img;
            render();
        };
        img.onerror = function() {
            state.bgImg = null;
        };
        img.src = src;
    }

    // Blur de un canvas con el filtro nativo ctx.filter. El vendor StackBlur se
    // retiro junto con js/utils/: el blur nativo difumina TAMBIEN el canal alpha y
    // va acelerado por el navegador (GPU/Skia), mientras StackBlur.canvasRGB no
    // tocaba el alpha (daba halos en las sombras) y corria en CPU. El guard por
    // si el contexto no soporta filter: en ese caso el blur simplemente no aplica.
    function applyBlur(canvas, radius) {
        if (radius <= 0 || canvas.width === 0 || canvas.height === 0) return;
        const ctx = canvas.getContext('2d');
        if (typeof ctx.filter === 'undefined') return;
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        const tmpCtx = tmp.getContext('2d');
        tmpCtx.filter = `blur(${radius}px)`;
        tmpCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tmp, 0, 0);
    }

    // Helper por-linea: itera las lineas con su config efectiva (base + delta
    // disperso) manteniendo la geometria del bloque completo (baselines
    // globales via drawTextLines lineFilter). paint(lineText, lineSettings, li)
    // pinta SOLO la linea li en su posicion real. Si no hay overrides, llama
    // una vez con el bloque entero (via rapida, sin clonar settings).
    // Hay alguna linea con estilo propio? Si no, el render va por el camino rapido:
// el bloque entero de una vez (mismo resultado, sin resolver linea por linea).
    function hayEstiloPorLinea(s) {
        const ls = linesOf(s);
        return !!(ls && ls.line && Object.keys(ls.line).length);
    }

    function forEachLineSetting(ctx, text, lines, fontSizePx, s, paint) {
        if (!hayEstiloPorLinea(s)) {
            paint(text, lines, s, null);
            return;
        }
        for (let li = 0; li < lines.length; li++) {
            // Las lineas no direccionables (4+) resuelven como All.
            const ls = resolveLine(s, li + 1, {});
            ensureFillIds(ls.fill);
            // Se pasa el texto y el array COMPLETOS con el indice de la linea,
            // igual que la rama de bloque: los motores por-linea filtran con
            // `lineFilter = li` sobre el bloque entero. Pasar aqui un array de
            // una sola linea hacia que el filtro no coincidiera nunca y solo
            // se pintara L1 (medido: con tres lineas solo aparecia la primera).
            paint(text, lines, ls, li);
        }
    }

    // Draw outer shadow (unificado: outer + outer2 + gradient support + strength + mask + blendmode)
    function drawOuterShadowUnificado(ctx, text, lines, fontSizePx, s, configKey) {
        const shadowConfig = s.shadow[configKey];
        if (!shadowConfig || !isActive(s, 'shadow.' + configKey)) return;

        // Alcance por linea: delegar en el helper (misma geometria de bloque,
        // lineFilter pinta solo la linea en su baseline global).
        if (hayEstiloPorLinea(s)) {
            forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
                drawOuterShadowUnificadoLine(ctx, lineText, lines, fontSizePx, ls, configKey, li);
            });
            return;
        }
        drawOuterShadowUnificadoLine(ctx, text, lines, fontSizePx, s, configKey, null);
    }

    // Cuerpo real de la sombra exterior (una llamada = un estilo, N lineas o
    // una sola via lineFilter). Nunca recursa: el dispatch por-linea vive
    // solo en drawOuterShadowUnificado.
    function drawOuterShadowUnificadoLine(ctx, text, lines, fontSizePx, s, configKey, lineFilter) {
        const shadowConfig = s.shadow[configKey];
        if (!shadowConfig || !isActive(s, 'shadow.' + configKey)) return;

        const distance = (shadowConfig.distance || 0.1) * fontSizePx;
        const angle = (shadowConfig.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;

        const baseBlur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const strength = shadowConfig.strength || 0;
        const blur = Math.max(0, baseBlur * (1 + strength));

        const fillCfg = shadowConfig.fill || {};
        const fillAlpha = fillCfg.alpha !== undefined ? fillCfg.alpha : 1;
        const mask = shadowConfig.mask || false;
        const blendmode = shadowConfig.blendmode || 'normal';

        ctx.save();

        if (fillCfg.gradient && fillCfg.gradient.active && fillCfg.gradient.colors && fillCfg.gradient.colors.length >= 2) {
            // Gradient shadow
            const off = document.createElement('canvas');
            off.width = ctx.canvas.width;
            off.height = ctx.canvas.height;
            const offCtx = off.getContext('2d');
            offCtx.setTransform(ctx.getTransform());

            const box = getTextBlockBox(ctx, s, lines, fontSizePx);
            const grad = createGradientInBox(offCtx, fillCfg.gradient, box);
            offCtx.fillStyle = grad;
            offCtx.strokeStyle = 'transparent';
            drawTextLines(offCtx, text, lines, fontSizePx, s, false, lineFilter);

            applyBlur(off, blur);

            ctx.globalCompositeOperation = blendmode;
            if (offsetX !== 0 || offsetY !== 0) {
                const offsetCanvas = document.createElement('canvas');
                offsetCanvas.width = off.width;
                offsetCanvas.height = off.height;
                const offsetCtx = offsetCanvas.getContext('2d');
                offsetCtx.drawImage(off, offsetX, offsetY);
                ctx.drawImage(offsetCanvas, 0, 0);
            } else {
                ctx.drawImage(off, 0, 0);
            }
            if (mask) {
                ctx.globalCompositeOperation = 'destination-out';
                drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
            }
        } else {
            // Solid color shadow
            const color = getColorValue(fillCfg.color || '#000000', fillAlpha);

            if (blur > 0) {
                // Blur via offscreen for consistency
                const off = document.createElement('canvas');
                off.width = ctx.canvas.width;
                off.height = ctx.canvas.height;
                const offCtx = off.getContext('2d');
                offCtx.setTransform(ctx.getTransform());
                offCtx.fillStyle = color;
                offCtx.strokeStyle = 'transparent';
                drawTextLines(offCtx, text, lines, fontSizePx, s, false, lineFilter);

                applyBlur(off, blur);

                ctx.globalCompositeOperation = blendmode;
                if (offsetX !== 0 || offsetY !== 0) {
                    const offsetCanvas = document.createElement('canvas');
                    offsetCanvas.width = off.width;
                    offsetCanvas.height = off.height;
                    const offsetCtx = offsetCanvas.getContext('2d');
                    offsetCtx.drawImage(off, offsetX, offsetY);
                    ctx.drawImage(offsetCanvas, 0, 0);
                } else {
                    ctx.drawImage(off, 0, 0);
                }
                if (mask) {
                    ctx.globalCompositeOperation = 'destination-out';
                    drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
                }
            } else {
                // Sin blur - offset simple
                ctx.globalCompositeOperation = blendmode;
                ctx.fillStyle = color;
                ctx.globalAlpha = 1;
                ctx.strokeStyle = 'transparent';

                if (offsetX !== 0 || offsetY !== 0) {
                    ctx.save();
                    ctx.translate(offsetX, offsetY);
                    drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
                    ctx.restore();
                } else {
                    drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
                }
                if (mask) {
                    ctx.globalCompositeOperation = 'destination-out';
                    drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
                }
            }
        }

        ctx.restore();
    }

    // Draw outer shadow
    function drawOuterShadow(ctx, text, lines, fontSizePx, s) {
        drawOuterShadowUnificado(ctx, text, lines, fontSizePx, s, 'outer');
    }

    // Draw outer shadow 2
    function drawOuterShadow2(ctx, text, lines, fontSizePx, s) {
        drawOuterShadowUnificado(ctx, text, lines, fontSizePx, s, 'outer2');
    }

    // Draw 3D depth (extrusion)
    function drawDepth(ctx, text, lines, fontSizePx, s) {
        const length = (s.depth.length || 0.2) * fontSizePx;
        const angle = (s.depth.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * length;
        const offsetY = Math.sin(angle) * length;
        const alpha = safeGet(s, 'depth.fill.alpha', 1);
        const color = s.depth.fill?.color || { r: 255, g: 255, b: 255 };

        ctx.save();
        
        // Draw multiple layers for 3D effect
        const layers = Math.ceil(length / 2);
        for (let i = 0; i < layers; i++) {
            const layerOffsetX = (offsetX / layers) * (i + 1);
            const layerOffsetY = (offsetY / layers) * (i + 1);
            
            ctx.translate(layerOffsetX, layerOffsetY);
            
            if (isActive(s, 'depth.fill.gradient')) {
                const gradient = createGradient(ctx, text, lines, fontSizePx, s.depth.fill.gradient, s);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = getColorValue(color, alpha);
            }
            
            ctx.strokeStyle = 'transparent';
            drawTextLines(ctx, text, lines, fontSizePx, s, false, null);
            
            ctx.translate(-layerOffsetX, -layerOffsetY);
        }
        
        ctx.restore();
    }

    // Draw text fill
    // ===== FILL LAYER ENGINE =====
    // fill.layers: [{ active, alpha, blendmode, repeat, styles: [...] }]
    // style:  { type: 'color'|'gradient'|'texture', color?, gradient?{angle,colors}, texture?{src,repeat} }
    // repeat: 'none' (style spans the whole text block, styles stack in order)
    //         'letter'|'word'|'line' (styles cycle per unit, painted edge to edge)
    const MAX_FILL_LAYERS = 4;

    function normalizeFillStyle(style) {
        if (typeof style === 'string') return { type: 'color', color: style };
        if (!style || typeof style !== 'object') return { type: 'color', color: '#ffffff' };
        const keepId = (typeof style.id === 'string' && style.id) ? { id: style.id } : {};
        if (style.type === 'gradient' || (style.gradient && !style.type)) {
            const g = style.gradient || {};
            return Object.assign({ type: 'gradient', gradient: { angle: g.angle || 0, colors: Array.isArray(g.colors) ? g.colors : [] } }, keepId);
        }
        if (style.type === 'texture' || (style.texture && !style.type)) {
            const t = style.texture || {};
            return Object.assign({ type: 'texture', texture: {
                src: t.src || null,
                repeat: t.repeat || 'repeat',
                position: t.position || 'center',
                fit: t.fit || 'fill',
                scale: t.scale !== undefined ? t.scale : 1
            } }, keepId);
        }
        return Object.assign({ type: 'color', color: style.color !== undefined ? style.color : '#ffffff' }, keepId);
    }

    // Build fill layers from the legacy fields (color/gradient/texture/palette)
    function migrateLegacyFillLayers(fill) {
        const baseAlpha = fill.alpha !== undefined ? fill.alpha : 1;
        if (fill.palette && fill.palette.active && Array.isArray(fill.palette.styles) && fill.palette.styles.length) {
            const method = (fill.palette.lettering && fill.palette.lettering.method) || 'letter';
            return [{
                active: true,
                alpha: baseAlpha,
                blendmode: 'source-over',
                repeat: method,
                styles: fill.palette.styles.map(normalizeFillStyle)
            }];
        }
        if (fill.gradient && fill.gradient.active && Array.isArray(fill.gradient.colors) && fill.gradient.colors.length >= 2) {
            return [{
                active: true,
                alpha: baseAlpha,
                blendmode: 'source-over',
                repeat: 'none',
                styles: [{ type: 'gradient', gradient: { angle: fill.gradient.angle || 0, colors: fill.gradient.colors } }]
            }];
        }
        if (fill.texture && fill.texture.active && fill.texture.src) {
            return [{
                active: true,
                alpha: baseAlpha * (fill.texture.alpha !== undefined ? fill.texture.alpha : 1),
                blendmode: fill.texture.blendmode === 'over' ? 'source-over' : (fill.texture.blendmode || 'source-over'),
                repeat: 'none',
                styles: [{ type: 'texture', texture: { src: fill.texture.src, repeat: fill.texture.repeat || 'repeat', position: 'center', fit: 'fill', scale: 1 } }]
            }];
        }
        return [{
            active: true,
            alpha: baseAlpha,
            blendmode: 'source-over',
            repeat: 'none',
            styles: [{ type: 'color', color: fill.color !== undefined ? fill.color : '#ffffff' }]
        }];
    }

    function getFillLayers(s) {
        if (Array.isArray(s.fill.layers) && s.fill.layers.length) {
            ensureFillIds(s.fill);
            return s.fill.layers;
        }
        return migrateLegacyFillLayers(s.fill);
    }

    function drawFill(ctx, text, lines, fontSizePx, s) {
        // Alcance por linea: helper central (misma geometria de bloque).
        forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
            getFillLayers(ls).forEach(function(layer) {
                if (!layer || layer.active === false) return;
                drawFillLayer(ctx, lineText, lineArr, fontSizePx, ls, layer, li);
            });
        });
    }

    function drawFillLayer(ctx, text, lines, fontSizePx, s, layer, lineFilter) {
        const styles = (Array.isArray(layer.styles) ? layer.styles : []).filter(Boolean);
        if (!styles.length) return;
        const repeat = layer.repeat || 'none';
        const alpha = layer.alpha !== undefined ? layer.alpha : 1;
        if (alpha <= 0) return;
        const blendmode = layer.blendmode === 'over' ? 'source-over' : (layer.blendmode || 'source-over');

        if (repeat === 'none') {
            // Each style paints the whole text block, stacked in order
            styles.forEach(function(style) {
                drawFillStyleOnBlock(ctx, text, lines, fontSizePx, s, normalizeFillStyle(style), alpha, blendmode, lineFilter);
            });
        } else {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = blendmode;
            drawFillUnits(ctx, text, lines, fontSizePx, s, repeat, styles.map(normalizeFillStyle), lineFilter);
            ctx.restore();
        }
    }

    // Paint one style across the whole text block. Solid colors paint
    // directly; gradients/patterns with the Flag effect active are painted
    // offscreen spanning the block box and clipped to the text silhouette so
    // they are not rotated by the per-letter transforms.
    function drawFillStyleOnBlock(ctx, text, lines, fontSizePx, s, style, alpha, blendmode, lineFilter) {
        const flagActive = !isFlagNeutral(s) || isActive(s, 'lettering.boggle');
        const box = getTextBlockBox(ctx, s, lines, fontSizePx);

        if (style.type === 'color' || !flagActive) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = blendmode;
            if (style.type === 'color') {
                ctx.fillStyle = getColorValue(style.color, 1);
            } else if (style.type === 'gradient') {
                if (!style.gradient.colors || style.gradient.colors.length < 2) { ctx.restore(); return; }
                ctx.fillStyle = createGradientInBox(ctx, style.gradient, box);
            } else {
                const img = state.textureImages[style.texture.src];
                if (!img) {
                    if (style.texture.src && typeof style.texture.src !== 'number') loadTextureImage(style.texture.src);
                    ctx.restore();
                    return;
                }
                ctx.fillStyle = createPatternForBox(ctx, img, style.texture, box);
            }
            ctx.strokeStyle = 'transparent';
            drawTextLines(ctx, text, lines, fontSizePx, s, false, lineFilter);
            ctx.restore();
            return;
        }

        // Flag active + gradient/texture: mask approach so the style spans
        // the block in global space, unaffected by per-letter transforms.
        if (style.type === 'gradient' && (!style.gradient.colors || style.gradient.colors.length < 2)) return;
        if (style.type === 'texture' && !style.texture.src) return;

        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        const mask = document.createElement('canvas');
        mask.width = W; mask.height = H;
        const mctx = mask.getContext('2d');
        mctx.setTransform(ctx.getTransform());
        mctx.fillStyle = '#ffffff';
        drawTextLines(mctx, text, lines, fontSizePx, s, false, lineFilter);

        const styled = document.createElement('canvas');
        styled.width = W; styled.height = H;
        const sctx = styled.getContext('2d');
        sctx.setTransform(ctx.getTransform());
        if (style.type === 'gradient') {
            sctx.fillStyle = createGradientInBox(sctx, style.gradient, box);
        } else {
            const img = state.textureImages[style.texture.src];
            if (!img) {
                loadTextureImage(style.texture.src);
                return;
            }
            sctx.fillStyle = createPatternForBox(sctx, img, style.texture, box);
        }
        sctx.fillRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4);

        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = 'destination-in';
        sctx.drawImage(mask, 0, 0);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = blendmode;
        ctx.drawImage(styled, 0, 0);
        ctx.restore();
    }

    // Pattern stretched so it covers 'box' edge to edge
    // Compute the pattern placement (scale + origin) inside 'box' from the
    // texture options:
    //   fit:   'stretch' (non-proportional fill) | 'fit' (proportional contain)
    //          | 'fill' (proportional cover)
    //   scale: 0.1..1.0 fraction of the box the pattern targets
    //   position: 9-position origin (left top .. right bottom)
    function computePatternPlacement(img, texture, box) {
        const fit = texture.fit || 'fill';
        const scale = texture.scale !== undefined ? texture.scale : 1;
        let sx, sy;
        if (fit === 'stretch') {
            sx = (box.width * scale) / img.width;
            sy = (box.height * scale) / img.height;
        } else if (fit === 'fit') {
            const s = Math.min(box.width * scale / img.width, box.height * scale / img.height);
            sx = s; sy = s;
        } else {
            const s = Math.max(box.width * scale / img.width, box.height * scale / img.height);
            sx = s; sy = s;
        }
        const w = img.width * sx;
        const h = img.height * sy;
        const pos = texture.position || 'center';
        let tx, ty;
        if (pos.indexOf('left') !== -1) tx = box.x;
        else if (pos.indexOf('right') !== -1) tx = box.x + box.width - w;
        else tx = box.x + (box.width - w) / 2;
        if (pos.indexOf('top') !== -1) ty = box.y;
        else if (pos.indexOf('bottom') !== -1) ty = box.y + box.height - h;
        else ty = box.y + (box.height - h) / 2;
        return { sx: sx, sy: sy, tx: tx, ty: ty };
    }

    function createPatternForBox(c, img, texture, box) {
        const pattern = c.createPattern(img, texture.repeat === 'no-repeat' ? 'no-repeat' : 'repeat');
        const p = computePatternPlacement(img, texture, box);
        if (typeof pattern.setTransform === 'function') {
            pattern.setTransform(new DOMMatrix([p.sx, 0, 0, p.sy, p.tx, p.ty]));
        }
        return pattern;
    }

    // Gradient endpoints (global coordinates) for a box and angle
    function gradientEndpointsForBox(box, angleDeg) {
        const angle = angleDeg * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const half = (Math.abs(cos) * box.width + Math.abs(sin) * box.height) / 2;
        return { x1: cx - cos * half, y1: cy - sin * half, x2: cx + cos * half, y2: cy + sin * half };
    }

    // Gradient for a box; when the char is Flag-transformed the endpoints are
    // mapped through the inverse of T(cx,cy)·R(rot) so the gradient stays
    // anchored to the global layout instead of rotating with the letter.
    function gradientForBoxAtChar(ctx, gradient, box, tf) {
        const g = gradientEndpointsForBox(box, gradient.angle || 0);
        let x1 = g.x1, y1 = g.y1, x2 = g.x2, y2 = g.y2;
        if (tf) {
            const cos = Math.cos(tf.rot);
            const sin = Math.sin(tf.rot);
            const map = function(px, py) {
                const dx = px - tf.cx;
                const dy = py - tf.cy;
                return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
            };
            const p1 = map(g.x1, g.y1);
            const p2 = map(g.x2, g.y2);
            x1 = p1.x; y1 = p1.y; x2 = p2.x; y2 = p2.y;
        }
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        addGradientStops(grad, gradient);
        return grad;
    }

    // Pattern fitted to a box; 'tf' is the char Flag transform — the pattern
    // matrix is compensated with its inverse so the pattern stays anchored to
    // the global layout.
    function patternForBoxAtChar(ctx, img, texture, box, tf) {
        const pattern = ctx.createPattern(img, texture.repeat === 'no-repeat' ? 'no-repeat' : 'repeat');
        const p = computePatternPlacement(img, texture, box);
        let m = new DOMMatrix([p.sx, 0, 0, p.sy, p.tx, p.ty]);
        if (tf) {
            const inv = new DOMMatrix().rotate(-tf.rot * 180 / Math.PI).translate(-tf.cx, -tf.cy);
            m = inv.multiply(m);
        }
        if (typeof pattern.setTransform === 'function') pattern.setTransform(m);
        return pattern;
    }

    // letter/word/line units: each unit cycles through the layer styles and
    // is painted edge to edge of its own box.
    // 002-text-tab: la baseline de cada linea sale del modelo UNICO de bloque
    // (blockLayout), no de `firstBaseline + i * lineAdvance`: con tamanos por
    // linea distintos y L1 anclada, esas dos formulas ya no coinciden (R-G1.3).
    function drawFillUnits(ctx, text, lines, fontSizePx, s, repeat, styles, lineFilter) {
        const geo = blockLayout(ctx, lines, s, state.lineFontPx, fontSizePx);
        const spacing = s.letterSpacing * fontSizePx * 0.1;
        const flagActive = !isFlagNeutral(s) || isActive(s, 'lettering.boggle');
        const ascent = geo.ascent[0];
        const descent = geo.descent[0];

        const lineWidths = geo.widths;
        const maxLineWidth = geo.maxLineWidth;

        let unitIndex = 0;
        for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            const y = geo.baselines[li];
            let lineStartX = -lineWidths[li] / 2;
            if (s.align === 'left') lineStartX = -maxLineWidth / 2;
            else if (s.align === 'right') lineStartX = maxLineWidth / 2 - lineWidths[li];

            const positions = [];
            let px = lineStartX;
            for (let j = 0; j < line.length; j++) {
                const cw = ctx.measureText(line[j]).width;
                positions.push({ x: px, width: cw });
                px += cw + spacing;
            }

            const units = [];
            if (repeat === 'letter') {
                for (let j = 0; j < line.length; j++) units.push([j]);
            } else if (repeat === 'word') {
                let start = 0;
                for (let j = 0; j <= line.length; j++) {
                    if (j === line.length || line[j] === ' ') {
                        if (j > start) {
                            const idxs = [];
                            for (let k = start; k < j; k++) idxs.push(k);
                            units.push(idxs);
                        }
                        start = j + 1;
                    }
                }
            } else {
                const idxs = [];
                for (let j = 0; j < line.length; j++) idxs.push(j);
                if (idxs.length) units.push(idxs);
            }

            for (const charIdxs of units) {
                const style = styles[unitIndex % styles.length];
                unitIndex++;
                if (!style) continue;
                if (line[charIdxs[0]] === ' ') continue;

                const first = positions[charIdxs[0]];
                const last = positions[charIdxs[charIdxs.length - 1]];
                const unitBox = { x: first.x, y: y - ascent, width: last.x + last.width - first.x, height: ascent + descent };

                if (style.type === 'texture' && style.texture.src && !state.textureImages[style.texture.src]) {
                    loadTextureImage(style.texture.src);
                    continue;
                }

                for (const j of charIdxs) {
                    const ch = line[j];
                    if (ch === ' ') continue;
                    const p = positions[j];
                    const tf = getLetterTransform(s, j, fontSizePx, line.length);
                    const charY = y + (tf ? tf.offsetY : 0);
                    const glyphCenter = (ascent - descent) / 2;
                    const pivotY = charY - glyphCenter;
                    const gradTf = tf ? { rot: tf.rot, cx: p.x + p.width / 2, cy: pivotY } : null;
                    const charBox = { x: p.x, y: y - ascent, width: p.width, height: ascent + descent };

                    ctx.save();
                    if (tf) {
                        ctx.translate(p.x + p.width / 2, pivotY);
                        ctx.rotate(tf.rot);
                    }
                    if (style.type === 'color') {
                        ctx.fillStyle = getColorValue(style.color, 1);
                    } else if (style.type === 'gradient') {
                        if (repeat === 'letter') {
                            // Edge to edge of each letter, in its own space
                            const localBox = tf
                                ? { x: -p.width / 2, y: -ascent, width: p.width, height: ascent + descent }
                                : charBox;
                            ctx.fillStyle = gradientForBoxAtChar(ctx, style.gradient, localBox, null);
                        } else {
                            // Edge to edge of the unit, anchored to the layout
                            ctx.fillStyle = gradientForBoxAtChar(ctx, style.gradient, unitBox, gradTf);
                        }
                    } else if (state.textureImages[style.texture.src]) {
                        if (repeat === 'letter') {
                            const localBox = tf
                                ? { x: -p.width / 2, y: -ascent, width: p.width, height: ascent + descent }
                                : charBox;
                            ctx.fillStyle = patternForBoxAtChar(ctx, state.textureImages[style.texture.src], style.texture, localBox, null);
                        } else {
                            ctx.fillStyle = patternForBoxAtChar(ctx, state.textureImages[style.texture.src], style.texture, unitBox, gradTf);
                        }
                    }
                    if (tf) {
                        ctx.fillText(ch, -p.width / 2, glyphCenter);
                    } else {
                        ctx.fillText(ch, p.x, y);
                    }
                    ctx.restore();
                }
            }
        }
    }

        // Draw text outline
    function drawOutline(ctx, text, lines, fontSizePx, s) {
        // Alcance por linea: cada linea con su config efectiva (misma
        // geometria de bloque via forEachLineSetting + lineFilter interno).
        if (hayEstiloPorLinea(s)) {
            forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
                drawOutlineLine(ctx, lineText, lines, fontSizePx, ls, li);
            });
            return;
        }
        drawOutlineLine(ctx, text, lines, fontSizePx, s, null);
    }

    // Cuerpo real del outline first (una llamada = un estilo, N lineas o una
    // sola via lineFilter). Nunca recursa: el dispatch vive en drawOutline.
    function drawOutlineLine(ctx, text, lines, fontSizePx, s, lineFilter) {
        // Support both legacy structure and new TextStudio structure
        const outlineConfig = s.outline.first || s.outline;
        const width = (outlineConfig.width || 0.1) * fontSizePx;
        const alpha = safeGet(outlineConfig, 'fill.alpha', 1);
        const join = outlineConfig.join || 'round';

        // Check if texture is active
        if (isActive(outlineConfig, 'fill.texture') && safeGet(outlineConfig, 'fill.texture.src')) {
            const textureImg = state.textureImages[outlineConfig.fill.texture.src];
            if (textureImg) {
                ctx.save();
                if (outlineConfig.fill.texture.blendmode) {
                    ctx.globalCompositeOperation = outlineConfig.fill.texture.blendmode;
                }
                const pattern = ctx.createPattern(textureImg, outlineConfig.fill.texture.repeat || 'repeat');
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = pattern;
                ctx.lineWidth = width;
                ctx.lineJoin = join;
                ctx.lineCap = 'round';
                ctx.fillStyle = 'transparent';
                drawTextLines(ctx, text, lines, fontSizePx, s, true, lineFilter);
                ctx.restore();
                return;
            }
        }

        ctx.save();
        if (isActive(outlineConfig, 'fill.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, outlineConfig.fill.gradient, s);
            ctx.strokeStyle = gradient;
        } else {
            const color = outlineConfig.fill?.color || outlineConfig.color || '#000000';
            ctx.strokeStyle = getColorValue(color, alpha);
        }

        ctx.lineWidth = width;
        ctx.lineJoin = join;
        ctx.lineCap = 'round';
        ctx.fillStyle = 'transparent';

        const alignment = outlineConfig.position || 'outside';
        drawTextStrokeAligned(ctx, text, lines, fontSizePx, s, width, alignment, lineFilter);
        ctx.restore();
    }

    // Stroke the text honoring a stroke alignment (inside / center / outside).
    // Canvas strokeText always draws a centered stroke, so 'inside' and
    // 'outside' are achieved with an offscreen stroke masked by the glyph
    // shape (destination-in / destination-out).
    function drawTextStrokeAligned(ctx, text, lines, fontSizePx, s, width, alignment, lineFilter) {
        if (alignment !== 'inside' && alignment !== 'outside') {
            // 'center' (legacy behavior): plain centered stroke
            ctx.lineWidth = width;
            drawTextLines(ctx, text, lines, fontSizePx, s, true, lineFilter);
            return;
        }

        // 1. Render the stroke on an offscreen canvas that mirrors the current
        //    transform, using double width for 'outside' (half of it will be
        //    removed by the mask, leaving `width` fully outside the glyphs).
        const off = document.createElement('canvas');
        off.width = ctx.canvas.width;
        off.height = ctx.canvas.height;
        const offCtx = off.getContext('2d');
        offCtx.setTransform(ctx.getTransform());
        offCtx.lineJoin = 'round';
        offCtx.lineCap = 'round';
        offCtx.strokeStyle = ctx.strokeStyle;
        offCtx.lineWidth = alignment === 'outside' ? width * 2 : width;
        drawTextLines(offCtx, text, lines, fontSizePx, s, true, lineFilter);

        // 2. Build a glyph mask (solid filled text) with the same transform.
        const mask = document.createElement('canvas');
        mask.width = off.width;
        mask.height = off.height;
        const maskCtx = mask.getContext('2d');
        maskCtx.setTransform(ctx.getTransform());
        maskCtx.fillStyle = '#ffffff';
        drawTextLines(maskCtx, text, lines, fontSizePx, s, false, lineFilter);

        // 3. Mask the stroke: keep only pixels inside or outside the glyphs.
        //    The transform must be reset first, otherwise the mask is drawn
        //    offset by the text translate (it would land half a canvas away
        //    and 'inside' would erase everything / 'outside' erase nothing).
        offCtx.globalCompositeOperation = alignment === 'outside' ? 'destination-out' : 'destination-in';
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.drawImage(mask, 0, 0);

        // 4. Blit the masked stroke 1:1 onto the target context.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(off, 0, 0);
        ctx.restore();
    }

    // Draw inner shadow (unificado: inner + inner2 — mask + strength + gradient + blendmode)
    function drawInnerShadow(ctx, text, lines, fontSizePx, s, configKey) {
        configKey = configKey || 'inner';
        if (!s.shadow[configKey] || !isActive(s, 'shadow.' + configKey)) return;
        // Alcance por linea: mismo patron que outer (helper + lineFilter).
        if (hayEstiloPorLinea(s)) {
            forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
                drawInnerShadowLine(ctx, lineText, lines, fontSizePx, ls, configKey, li);
            });
            return;
        }
        drawInnerShadowLine(ctx, text, lines, fontSizePx, s, configKey, null);
    }

    // Cuerpo real de la sombra interior. Nunca recursa.
    function drawInnerShadowLine(ctx, text, lines, fontSizePx, s, configKey, lineFilter) {
        const shadowConfig = s.shadow[configKey];
        if (!shadowConfig || !isActive(s, 'shadow.' + configKey)) return;

        const distance = (shadowConfig.distance || 0.03) * fontSizePx;
        const angle = (shadowConfig.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const offset = (shadowConfig.offset || 0) * fontSizePx;
        const baseBlur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const strength = Math.max(0, shadowConfig.strength || 0);
        const steps = Math.max(1, Math.round(strength * 4) + 1);
        const mask = Boolean(shadowConfig.mask);

        const lineCanvas = ctx.canvas;
        const lineW = lineCanvas.width || 1;
        const lineH = lineCanvas.height || 1;

        const layer = document.createElement('canvas');
        layer.width = lineW;
        layer.height = lineH;
        const lctx = layer.getContext('2d');
        lctx.setTransform(1, 0, 0, 1, 0, 0);

        const colorObj = shadowConfig.fill?.color || shadowConfig.color || '#000000';
        let paintColor;
        let paintAlpha = 1;

        if (isActive(shadowConfig, 'fill.gradient') && Array.isArray(shadowConfig.fill.gradient.colors) && shadowConfig.fill.gradient.colors.length >= 2) {
            const gradBox = { x: 0, y: 0, width: lineW, height: lineH };
            const grad = createGradientInBox(lctx, shadowConfig.fill.gradient, gradBox);
            paintColor = grad;
        } else {
            paintColor = getColorValue(colorObj, 1);
            paintAlpha = Math.max(0, safeGet(shadowConfig, 'fill.alpha', 1));
        }

        if (paintAlpha <= 0) return;

        for (let i = 0; i < steps; i++) {
            const t = i / Math.max(1, steps - 1);
            const eased = t * t;
            const offX = offsetX + offset + (offsetX) * eased * (strength > 0 ? 0.4 : 0);
            const offY = offsetY + offset + (offsetY) * eased * (strength > 0 ? 0.4 : 0);
            const blur = baseBlur * (0.2 + 0.8 * (1 - t)) + (strength > 0 ? (strength * fontSizePx * 0.6) : 0);

            lctx.save();
            lctx.globalAlpha = paintAlpha * (1 - t * 0.35);
            lctx.fillStyle = paintColor;
            lctx.shadowColor = paintColor;
            lctx.shadowOffsetX = offX;
            lctx.shadowOffsetY = offY;
            lctx.shadowBlur = blur;
            lctx.font = ctx.font;
            lctx.translate(lineW / 2 + offX * 0.25, lineH / 2 + offY * 0.25);
            lctx.save();
            drawTextLines(lctx, text, lines, fontSizePx, s, false, lineFilter);
            lctx.restore();
            lctx.restore();
        }

        ctx.save();
        const blendmode = shadowConfig.blendmode || 'source-atop';
        const targetAlpha = paintAlpha;
        if (mask) {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.globalAlpha = 1;
            ctx.drawImage(layer, 0, 0);
            ctx.globalCompositeOperation = blendmode;
            ctx.globalAlpha = targetAlpha;
            ctx.drawImage(layer, 0, 0);
        } else {
            ctx.globalCompositeOperation = blendmode;
            ctx.globalAlpha = targetAlpha;
            ctx.drawImage(layer, 0, 0);
        }
        ctx.restore();
    }

    // Draw inner shadow (legacy entry points delegating to the unified function)
    function drawInnerShadowInner(ctx, text, lines, fontSizePx, s) {
        drawInnerShadow(ctx, text, lines, fontSizePx, s, 'inner');
    }
    function drawInnerShadowInner2(ctx, text, lines, fontSizePx, s) {
        drawInnerShadow(ctx, text, lines, fontSizePx, s, 'inner2');
    }

    // Draw global outline (TextStudio: outline.global) — extrusion detras del texto
    function drawOutlineGlobal(ctx, text, lines, fontSizePx, s) {
        if (!isActive(s, 'outline.global')) return;
        // Alcance por linea: mismo patron (helper + lineFilter).
        if (hayEstiloPorLinea(s)) {
            forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
                drawOutlineGlobalLine(ctx, lineText, lines, fontSizePx, ls, li);
            });
            return;
        }
        drawOutlineGlobalLine(ctx, text, lines, fontSizePx, s, null);
    }

    // Cuerpo real de la extrusion global. Nunca recursa.
    function drawOutlineGlobalLine(ctx, text, lines, fontSizePx, s, lineFilter) {
        if (!isActive(s, 'outline.global')) return;
        const globalCfg = s.outline.global;
        const width = (globalCfg.width || 0.15) * fontSizePx;
        const steps = Math.max(1, Math.ceil(width / 2));

        if (width <= 0) return;
        const join = globalCfg.join || 'round';

        // Componer extrusion en capa separada para no contaminar el pipeline
        const ext = document.createElement('canvas');
        ext.width = ctx.canvas.width;
        ext.height = ctx.canvas.height;
        const ectx = ext.getContext('2d');
        ectx.setTransform(1, 0, 0, 1, 0, 0);

        let strokeStyle;
        if (isActive(globalCfg, 'fill.gradient')) {
            const gradBox = { x: 0, y: 0, width: ext.width, height: ext.height };
            strokeStyle = createGradientInBox(ectx, globalCfg.fill.gradient, gradBox);
        } else {
            const color = globalCfg.fill?.color || globalCfg.color || '#000000';
            strokeStyle = getColorValue(color, safeGet(globalCfg, 'fill.alpha', 1));
        }

        ectx.lineJoin = join;
        ectx.lineCap = 'round';
        ectx.strokeStyle = strokeStyle;

        for (let i = steps; i >= 1; i--) {
            const offX = Math.cos(0) * (i * 1.2);
            const offY = Math.sin(0) * (i * 1.2);
            ectx.save();
            ectx.translate(offX, offY);
            ectx.lineWidth = width / steps * 1.2;
            if (globalCfg.dash > 0) {
                ectx.setLineDash([globalCfg.dash * fontSizePx, globalCfg.dash * fontSizePx * 0.5]);
            }
            ectx.fillStyle = 'transparent';
            drawTextLines(ectx, text, lines, fontSizePx, s, true, lineFilter);
            ectx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(ext, 0, 0);
        ctx.restore();
    }
    function drawIcon(ctx, text, lines, fontSizePx, s) {
        if (!state.iconImg) return;

        // Alcance por linea: el icono se pinta una vez por linea con su config
        // efectiva (tamano/posicion/rotacion/opacidad propios de cada linea).
        if (hayEstiloPorLinea(s)) {
            forEachLineSetting(ctx, text, lines, fontSizePx, s, function(lineText, lineArr, ls, li) {
                if (!isActive(ls, 'icon')) return;
                drawIconLine(ctx, lineText, lines, fontSizePx, ls, li);
            });
            return;
        }
        drawIconLine(ctx, text, lines, fontSizePx, s, null);
    }

    // Cuerpo real del icono (una linea via lineFilter o el bloque). Nunca recursa.
    function drawIconLine(ctx, text, lines, fontSizePx, s, lineFilter) {
        if (!state.iconImg) return;

        const icon = state.iconImg;
        const iconSize = fontSizePx * 0.5 * s.icon.size;
        const offsetX = s.icon.offset.x * fontSizePx;
        const offsetY = s.icon.offset.y * fontSizePx;

        // En modo por-linea el icono se ancla a SU linea (ancho y baseline
        // propios); en modo bloque conserva el comportamiento historico.
        const refText = (lineFilter !== undefined && lineFilter !== null && lines[lineFilter] !== undefined)
            ? lines[lineFilter] : text.replace(/\n/g, ' ');
        const metrics = ctx.measureText(refText);
        const textWidth = metrics.width;
        const refCount = (lineFilter !== undefined && lineFilter !== null) ? 1 : lines.length;
        const textHeight = fontSizePx * 1.3 * refCount;

        let x, y;
        if (s.icon.position === 'right') {
            x = textWidth / 2 + iconSize / 2 + fontSizePx * 0.15 + offsetX;
        } else if (s.icon.position === 'center') {
            x = offsetX;
        } else {
            x = -textWidth / 2 - iconSize / 2 - fontSizePx * 0.15 + offsetX;
        }
        // En modo por-linea el icono acompana la baseline de SU linea: sale del
        // modelo UNICO de bloque, igual que drawTextLines (R-G1.1).
        y = -iconSize * 0.2 + offsetY;
        if (lineFilter !== undefined && lineFilter !== null && lines.length > 1) {
            const geo = blockLayout(ctx, lines, s, state.lineFontPx, fontSizePx);
            y += geo.baselines[lineFilter] - geo.baselines[0];
        }

        ctx.save();
        ctx.globalAlpha = s.icon.alpha;
        if (s.icon.blendmode) {
            ctx.globalCompositeOperation = s.icon.blendmode;
        }
        if (s.icon.composite) {
            ctx.globalCompositeOperation = s.icon.composite;
        }
        ctx.drawImage(icon, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        ctx.restore();
    }

    // Draw 3D depth 2
    function drawDepth2(ctx, text, lines, fontSizePx, s) {
        const length = (s.depth2.length || 0.2) * fontSizePx;
        const angle = (s.depth2.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * length;
        const offsetY = Math.sin(angle) * length;
        const alpha = safeGet(s, 'depth2.fill.alpha', 1);
        const color = s.depth2.fill?.color || { r: 255, g: 255, b: 255 };

        const steps = Math.max(1, Math.floor(length / 2));
        const stepX = offsetX / steps;
        const stepY = offsetY / steps;

        ctx.save();
        
        // Use gradient if active, otherwise solid color
        if (isActive(s, 'depth2.fill.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.depth2.fill.gradient, s);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = getColorValue(color, alpha);
        }
        
        ctx.strokeStyle = 'transparent';

        for (let i = steps; i >= 0; i--) {
            ctx.save();
            ctx.translate(stepX * i, stepY * i);
            drawTextLines(ctx, text, lines, fontSizePx, s, false, null);
            ctx.restore();
        }

        ctx.restore();
    }

    // Draw outline 2
    function drawOutline2(ctx, text, lines, fontSizePx, s) {
        // Support both legacy structure and new TextStudio structure
        const outlineConfig = s.outline.second || s.outline2;
        const width = (outlineConfig.width || 0.1) * fontSizePx;
        const alpha = safeGet(outlineConfig, 'fill.alpha', 1);
        const join = outlineConfig.join || 'round';

        ctx.save();
        if (isActive(outlineConfig, 'fill.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, outlineConfig.fill.gradient, s);
            ctx.strokeStyle = gradient;
        } else {
            const color = outlineConfig.fill?.color || outlineConfig.color || '#000000';
            ctx.strokeStyle = getColorValue(color, alpha);
        }

        ctx.lineWidth = width;
        ctx.lineJoin = join;
        ctx.lineCap = 'round';
        ctx.fillStyle = 'transparent';

        const alignment = outlineConfig.position || 'outside';
        drawTextStrokeAligned(ctx, text, lines, fontSizePx, s, width, alignment);
        ctx.restore();
    }

    // Draw bevel effect (modern TextStudio structure: bevel.inner)
    function drawBevel(ctx, text, lines, fontSizePx, s, config) {
        // Use explicit config (for bevel.inner2) or default to bevel.inner / legacy bevel
        const bevelConfig = config || safeGet(s, 'bevel.inner', null) || safeGet(s, 'bevel', {});
        const size = (bevelConfig.size || 0.1) * fontSizePx;
        const angle = bevelConfig.angle || 135;
        const soften = bevelConfig.soften || 0.1;

        const highlightCfg = bevelConfig.highlight || { color: '#ffffff', alpha: 1 };
        const shadowCfg = bevelConfig.shadow || { color: '#000000', alpha: 1 };

        const highlightColor = getColorValue(highlightCfg.color, highlightCfg.alpha);
        const shadowColor = getColorValue(shadowCfg.color, shadowCfg.alpha);
        const highlightHex = colorToHex(highlightCfg.color);
        const shadowHex = colorToHex(shadowCfg.color);

        // Try WebGL bevel if available
        if (typeof BevelWebGLEngine !== 'undefined' && !state.bevelEngine) {
            state.bevelEngine = new BevelWebGLEngine();
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            if (!state.bevelEngine.init(tempCanvas)) {
                state.bevelEngine = null;
            }
        }

        if (state.bevelEngine && size > 0) {
            // Create temporary canvas with just the text
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.save();
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.font = ctx.font;
            tempCtx.fillStyle = '#ffffff';
            tempCtx.strokeStyle = '#ffffff';
            tempCtx.lineWidth = size;
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
            drawTextLines(tempCtx, text, lines, fontSizePx, s, true);
            tempCtx.restore();

            // Apply WebGL bevel (colors converted to normalized floats)
            const hexToFloat = function(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                return [
                    parseInt(hex.substring(0, 2), 16) / 255,
                    parseInt(hex.substring(2, 4), 16) / 255,
                    parseInt(hex.substring(4, 6), 16) / 255
                ];
            };

            const bevelCanvas = state.bevelEngine.apply(tempCanvas, {
                bevelSize: size / fontSizePx,
                bevelAngle: angle,
                lightColor: hexToFloat(highlightHex),
                shadowColor: hexToFloat(shadowHex),
                highlightIntensity: highlightCfg.alpha,
                shadowIntensity: shadowCfg.alpha,
                softness: soften
            });

            if (!bevelCanvas) {
                // apply() devolvio null (canvas 0x0 o framebuffer incompleto):
                // invalidar el engine para no spamear WebGL cada frame; el
                // fallback 2D de abajo pinta el bevel aproximado.
                state.bevelEngine = null;
            }

            if (bevelCanvas) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(bevelCanvas, 0, 0);
                ctx.restore();
                return;
            }
        }

        // Fallback: Simple bevel simulation using offset strokes
        if (!size) return;
        const angleRad = (angle * Math.PI) / 180;
        const highlightOffset = size * 0.5;
        const shadowOffset = size * 0.5;

        const highlightX = Math.cos(angleRad) * highlightOffset;
        const highlightY = Math.sin(angleRad) * highlightOffset;
        const shadowX = -Math.cos(angleRad) * shadowOffset;
        const shadowY = -Math.sin(angleRad) * shadowOffset;

        // Draw highlight
        ctx.save();
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = size * 0.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.translate(highlightX, highlightY);
        drawTextLines(ctx, text, lines, fontSizePx, s, true);
        ctx.restore();

        // Draw shadow
        ctx.save();
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = size * 0.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.translate(shadowX, shadowY);
        drawTextLines(ctx, text, lines, fontSizePx, s, true);
        ctx.restore();
    }

    // Draw specular lighting effect
    function drawSpecular(ctx, text, lines, fontSizePx, s) {
        // Try WebGL specular if available
        if (typeof SpecularWebGLEngine !== 'undefined' && !state.specularEngine) {
            state.specularEngine = new SpecularWebGLEngine();
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            if (!state.specularEngine.init(tempCanvas)) {
                state.specularEngine = null;
            }
        }

        if (state.specularEngine) {
            // Create temporary canvas with current state
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvas.width;
            tempCanvas.height = state.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(state.canvas, 0, 0);

            // Apply WebGL specular
            const specularCanvas = state.specularEngine.apply(tempCanvas, {
                surfaceScale: 1.0,
                specularConstant: 0.5,
                specularExponent: 32.0,
                lightColor: [1.0, 1.0, 1.0],
                lightDirection: [0.5, 0.5, 1.0],
                ambientIntensity: 0.3,
                diffuseIntensity: 0.5
            });

            if (!specularCanvas) {
                // apply() devolvio null (canvas 0x0 o framebuffer incompleto):
                // invalidar el engine para no spamear WebGL cada frame.
                state.specularEngine = null;
            }
            if (specularCanvas) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(specularCanvas, 0, 0);
                ctx.restore();
            }
        }
    }

    function setTextFont(ctx, s, fontSizePx, lineIdx) {
        let px = fontSizePx;
        if (lineIdx !== undefined && lineIdx !== null && state.lineFontPx && state.lineFontPx[lineIdx] !== undefined) {
            px = state.lineFontPx[lineIdx];
        } else if (lineIdx !== undefined && lineIdx !== null) {
            // Sin state.lineFontPx (ajuste previo al render): se usa el tamano
            // que RESUELVE la linea, que ya incluye px propio y reglas.
            const r = resolveLine(s, lineIdx + 1, {});
            const ovSize = r && r.font ? Number(r.font.size) : NaN;
            if (Number.isFinite(ovSize) && ovSize > 0) px = ovSize;
        }
        aplicarFuente(ctx, s, px);
        return px;
    }

    // Draw text lines helper.
    // 002-text-tab (R-G1.1, R-G1.2, R-G1.3): las lineas se colocan con el modelo de
// bloque UNICO. L1 ancla el bloque (su lineHeight no la mueve) y cada linea
// i>1 baja `lineHeight * tamano[i-1]` de la anterior, con el tamano de SU linea:
// nunca se superponen y una sola linea no se mueve al cambiar el interlineado.
// lineFilter: indice de linea (0-based) o null para pintar todas. Los motores
// por-linea (drawFill, drawOutline, ...) pintan cada linea con su config
// efectiva en SU baseline global, asi el interlineado y la base se conservan.
    function drawTextLines(ctx, text, lines, fontSizePx, s, isStroke, lineFilter) {
    const geo = blockLayout(ctx, lines, s, state.lineFontPx, fontSizePx);
    const maxLineWidth = geo.maxLineWidth;
    // 002-text-tab D3: cada linea se PINTA con su tipografia resuelta (la fuente,
    // el espaciado y la alineacion que le tocan), no con los de la base.
    const memo = {};
    const porLinea = hayEstiloPorLinea(s);
    for (let i = 0; i < lines.length; i++) {
        if (lineFilter !== undefined && lineFilter !== null && lineFilter !== i) continue;
        const line = lines[i];
        const px = geo.px[i];
        const sLinea = porLinea ? resolveLine(s, i + 1, memo) : s;
        setTextFont(ctx, sLinea, px, i);
        const baseline = geo.baselines[i];
        const lsBase = (sLinea && sLinea.letterSpacing !== undefined) ? sLinea.letterSpacing : s.letterSpacing;
        const letterSpacing = lsBase * px * 0.1;
        const align = (sLinea && sLinea.align) ? sLinea.align : s.align;
        let xOffset = 0;
        if (align === 'left') {
            xOffset = -maxLineWidth / 2;
        } else if (align === 'right') {
            xOffset = maxLineWidth / 2;
        }
        drawTextWithSpacing(ctx, line, xOffset, baseline, letterSpacing, isStroke, sLinea, px);
    }
}


    // ===== Flag (bandera) — wave model =====
    // Every letter i of a line of n characters samples the same wave w in
    // [-1, 1].  Tilt (degrees) rotates each letter and Rise (% of font size)
    // shifts it vertically — both scale w, so tilt and rise always move
    // together like a waving banner.
    //
    //   waveWidth: % of the text that one swing (up -> down) takes.
    //     100% -> the whole line is a single sweep from +tilt to -tilt
    //     1%   -> neighbouring letters alternate (+10, -10, +10, ...)
    //   waveShift: % of the wave width the pattern slides along the text
    //     (50% puts the valley in the middle of the line).
    //   shape: 'smooth' (cosine) or 'linear' (straight ramp; 6 letters at
    //     100% width sample +1, .6, .2, -.2, -.6, -1 -> 5, 3, 1, -1, -3, -5
    //     with a 5 degree tilt).
    //
    // The wave resolves per line, so multi-line texts wave line by line.
    // Pure function (no settings access) and exposed on window.TextEditor
    // for unit tests, like DistortEngine.getArcGeometry.
    function flagWaveAt(charIndex, lineLength, waveWidth, waveShift, shape) {
        const n = Math.max(1, lineLength || 1);
        const width = clampValue(Number(waveWidth), 1, 100, 100);
        const shift = clampValue(Number(waveShift), 0, 100, 0);
        const half = Math.max(1, (width / 100) * (n - 1));
        const x = (charIndex + (shift / 100) * half) / half;
        if (shape === 'linear') {
            const m = x % 2;
            return m <= 1 ? 1 - 2 * m : 2 * m - 3;
        }
        return Math.cos(Math.PI * x);
    }

    // Per-letter rotation source for Tilt mode "follow wave": the wave slope —
    // how much and toward which direction the height changes from this letter
    // to the next. Letters lean into the movement (downhill when descending,
    // uphill when rising) and stay nearly vertical at the crest/trough, where
    // the wave flattens. At minimum wave width the travel between adjacent
    // letters is maximal and alternates even/odd, so letters keep the classic
    // alternating flag zigzag tilt.
    //
    // Raw slopes are normalized by the steepest letter of the line, so the
    // Tilt slider always means "maximum real degrees" regardless of wave
    // width. The wave is sampled one step past the last letter (the wave
    // continues beyond the text) to keep the even/odd alternation unbroken.
    // Pure function, exposed on window.TextEditor for unit tests.
    function flagWaveSlopes(lineLength, waveWidth, waveShift, shape) {
        const n = Math.max(1, lineLength || 1);
        const raw = [];
        for (let i = 0; i < n; i++) {
            raw.push((flagWaveAt(i, n, waveWidth, waveShift, shape) -
                      flagWaveAt(i + 1, n, waveWidth, waveShift, shape)) / 2);
        }
        let maxAbs = 0;
        for (let i = 0; i < n; i++) maxAbs = Math.max(maxAbs, Math.abs(raw[i]));
        if (maxAbs < 1e-9) {
            for (let i = 0; i < n; i++) raw[i] = 0;
        } else {
            for (let i = 0; i < n; i++) raw[i] = raw[i] / maxAbs;
        }
        return raw;
    }

    // Flag is "neutral" when Tilt and Rise are both 0: every transform it
    // could produce is the identity, so the text renders exactly as if the
    // effect were off. Used to bypass per-letter transforms and the
    // gradient/texture mask path when the effect is enabled but untouched.
    function isFlagNeutral(s) {
        if (!isActive(s, 'lettering.flag')) return true;
        const tilt = clampValue(safeGet(s, 'lettering.flag.tilt', 0), -360, 360, 0);
        const rise = clampValue(safeGet(s, 'lettering.flag.rise', 0), -100, 100, 0);
        return tilt === 0 && rise === 0;
    }

    // Applies Tilt/Rise on top of the shared wave for a single letter.
    // tiltMode 'wave' rotates each letter by the wave slope (natural flag);
    // 'position' rotates by the wave value (progressive arc/cascade look).
    function getFlagTransform(s, charIndex, fontSizePx, lineLength) {
        if (isFlagNeutral(s)) return null;
        const tilt = clampValue(safeGet(s, 'lettering.flag.tilt', 0), -360, 360, 0);
        const rise = clampValue(safeGet(s, 'lettering.flag.rise', 0), -100, 100, 0);
        const tiltMode = safeGet(s, 'lettering.flag.tiltMode', 'wave') === 'position' ? 'position' : 'wave';
        const w = flagWaveAt(
            charIndex,
            lineLength,
            safeGet(s, 'lettering.flag.waveWidth', 100),
            safeGet(s, 'lettering.flag.waveShift', 0),
            safeGet(s, 'lettering.flag.shape', 'smooth')
        );
        let rotationSource = w;
        if (tiltMode === 'wave') {
            const slopes = flagWaveSlopes(
                lineLength,
                safeGet(s, 'lettering.flag.waveWidth', 100),
                safeGet(s, 'lettering.flag.waveShift', 0),
                safeGet(s, 'lettering.flag.shape', 'smooth')
            );
            rotationSource = slopes[Math.min(charIndex, slopes.length - 1)] || 0;
        }
        return {
            rot: tilt * Math.PI / 180 * rotationSource,
            offsetY: (rise / 100) * fontSizePx * w
        };
    }

    // Boggle: random-looking scattered letters. Deterministic per character
    // index so the layout does not flicker between renders.
    // maxRotation: 0..360 (max rotation); scatterHeight: 0..100 (% of font size).
    function hash01(seed) {
        const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function getBoggleTransform(s, charIndex, fontSizePx) {
        if (!isActive(s, 'lettering.boggle')) return null;
        const angle = clampValue(safeGet(s, 'lettering.boggle.maxRotation', 40), 0, 360, 40);
        const amplitude = clampValue(safeGet(s, 'lettering.boggle.scatterHeight', 50), 0, 100, 50);
        const rot = (hash01(charIndex * 37 + 1) - 0.5) * 2 * (angle * Math.PI / 180);
        const offY = (hash01(charIndex * 37 + 2) - 0.5) * 2 * (amplitude / 100) * fontSizePx;
        return { rot: rot, offsetY: offY };
    }

    // Combined transform (Flag and/or Boggle can be active at once).
    function getLetterTransform(s, charIndex, fontSizePx, lineLength) {
        const flag = getFlagTransform(s, charIndex, fontSizePx, lineLength);
        const boggle = getBoggleTransform(s, charIndex, fontSizePx);
        if (!flag && !boggle) return null;
        return {
            rot: (flag ? flag.rot : 0) + (boggle ? boggle.rot : 0),
            offsetY: (flag ? flag.offsetY : 0) + (boggle ? boggle.offsetY : 0)
        };
    }

    // Draw text with manual letter spacing plus the Flag/Boggle effects.
    // Transforms rotate each glyph around its visual center (not baseline).
    function drawTextWithSpacing(ctx, text, x, y, spacing, isStroke, s, fontSizePx) {
        const align = safeGet(s, 'align', 'center');

        let startX = x;
        const chars = [];
        let totalWidth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = ctx.measureText(char).width;
            chars.push({ char: char, width: charWidth });
            totalWidth += charWidth;
        }
        totalWidth += spacing * (text.length - 1);

        if (align === 'center') {
            startX = x - totalWidth / 2;
        } else if (align === 'left') {
            startX = x;
        } else if (align === 'right') {
            startX = x - totalWidth;
        }

        const measure = ctx.measureText('Ag');
        const ascent = measure.actualBoundingBoxAscent || fontSizePx * 0.8;
        const descent = measure.actualBoundingBoxDescent || fontSizePx * 0.2;
        const glyphCenter = (ascent - descent) / 2;

        let currentX = startX;
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const tf = getLetterTransform(s, i, fontSizePx, chars.length);
            const charY = y + (tf ? tf.offsetY : 0);

            if (tf) {
                ctx.save();
                ctx.translate(currentX + char.width / 2, charY - glyphCenter);
                ctx.rotate(tf.rot);
                if (isStroke) {
                    ctx.strokeText(char.char, -char.width / 2, glyphCenter);
                } else {
                    ctx.fillText(char.char, -char.width / 2, glyphCenter);
                }
                ctx.restore();
            } else {
                if (isStroke) {
                    ctx.strokeText(char.char, currentX, charY);
                } else {
                    ctx.fillText(char.char, currentX, charY);
                }
            }

            currentX += char.width + spacing;
        }
    }

    // format: "#rrggbb alpha pos%, ..." — used to mirror settings into the
    // hidden gradient inputs so the visual pickers can rebuild from them.
    function formatGradientColorsString(gradient) {
        const colors = gradient && gradient.colors;
        if (!Array.isArray(colors)) return '';
        return colors.map(function(stop) {
            let hex;
            if (typeof stop === 'string') {
                hex = stop.replace('#', '');
            } else if (stop && stop.color) {
                hex = String(stop.color).replace('#', '');
            } else if (stop && stop.r !== undefined) {
                hex = [stop.r, stop.g, stop.b].map(function(v) {
                    return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
                }).join('');
            } else {
                return null;
            }
            if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
            hex = hex.slice(0, 6);
            if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
            const pos = Math.round(Math.max(0, Math.min(1, stop.pos !== undefined ? Number(stop.pos) : 0)) * 100);
            return '#' + hex + 'ff ' + pos + '%';
        }).filter(Boolean).join(', ');
    }

    // Add color stops to a canvas gradient from settings
    function addGradientStops(gradientObj, gradient) {
        let stops;
        
        // Handle different gradient formats
        if (gradient.colors && gradient.colors.length >= 2) {
            stops = gradient.colors;
        } else if (gradient.startColor && gradient.endColor) {
            // Legacy 2-color format
            stops = [
                { color: gradient.startColor, pos: 0 },
                { color: gradient.endColor, pos: 1 }
            ];
        } else if (Array.isArray(gradient)) {
            // Simple array of colors
            stops = gradient.map((color, index) => ({
                color: color,
                pos: index / (gradient.length - 1)
            }));
        } else {
            // Fallback to default
            stops = [
                { color: '#ffffff', pos: 0 },
                { color: '#000000', pos: 1 }
            ];
        }

        // Process stops and add to gradient
        stops.forEach(function(stop, index) {
            let color;
            let pos;
            
            // Determine color
            if (stop.color) {
                color = stop.color;
            } else if (stop.r !== undefined) {
                const a = stop.a !== undefined ? stop.a : 1;
                color = 'rgba(' + Math.round(stop.r) + ',' + Math.round(stop.g) + ',' + Math.round(stop.b) + ',' + a + ')';
            } else if (typeof stop === 'string') {
                color = stop;
            } else {
                color = '#ffffff';
            }

            // Determine position
            if (stop.pos !== undefined) {
                pos = stop.pos;
            } else {
                // Auto-distribute positions if not defined
                pos = index / (stops.length - 1);
            }

            // Convert hex to rgba if needed
            if (typeof color === 'string' && color.startsWith('#')) {
                color = hexToRgba(color, 1);
            }

            // Clamp position to [0, 1]
            pos = Math.max(0, Math.min(1, pos));
            
            gradientObj.addColorStop(pos, color);
        });
    }

    // Compute the real bounding box of the text block. La caja sale del MISMO
// modelo de bloque que usa el dibujado (blockLayout): lo calculado es lo
// pintado y una caja no puede divergir de las lineas que se dibujan (R-G1.1).
// setTextFont() garantiza que el bloque se mida con la fuente real incluso
// cuando esto corre antes de cualquier pasada de dibujado (el relleno es la
// primera pasada en un canvas de export/miniatura nuevo, cuyo contexto arranca
// en 10px sans-serif). Sin eso, los rellenos "no repeat" se anclaban a una
// caja diminuta y equivocada.
    function getTextBlockBox(ctx, s, lines, fontSizePx) {
        const sizes = (state.lineFontPx && state.lineFontPx.length === lines.length)
            ? state.lineFontPx : null;
        const geo = blockLayout(ctx, lines, s, sizes, fontSizePx);
        return { x: -geo.maxLineWidth / 2, y: geo.top, width: geo.maxLineWidth, height: geo.height };
    }

    // Create a gradient spanning the box along the angle (degrees), edge to edge.
    function createGradientInBox(ctx, gradient, box) {
        const angle = ((gradient.angle || 0) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const halfLength = (Math.abs(cos) * box.width + Math.abs(sin) * box.height) / 2;
        const gradientObj = ctx.createLinearGradient(
            cx - cos * halfLength, cy - sin * halfLength,
            cx + cos * halfLength, cy + sin * halfLength
        );
        addGradientStops(gradientObj, gradient);
        return gradientObj;
    }

    // Create gradient across the whole text block (real bounds)
    function createGradient(ctx, text, lines, fontSizePx, gradient, s) {
        const box = getTextBlockBox(ctx, s, lines, fontSizePx);
        return createGradientInBox(ctx, gradient, box);
    }

    // Convert hex color to rgba
    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Convert RGB object to rgba string (TextStudio format)
    function rgbToRgba(rgb, alpha = 1) {
        if (!rgb || typeof rgb !== 'object') {
            return `rgba(255, 255, 255, ${alpha})`;
        }
        const r = Math.max(0, Math.min(255, Math.round(rgb.r || 0)));
        const g = Math.max(0, Math.min(255, Math.round(rgb.g || 0)));
        const b = Math.max(0, Math.min(255, Math.round(rgb.b || 0)));
        const a = rgb.a !== undefined ? rgb.a : alpha;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    // Get color from either hex string or RGB object
    function getColorValue(color, alpha = 1) {
        if (typeof color === 'string') {
            return hexToRgba(color, alpha);
        } else if (typeof color === 'object' && color !== null) {
            return rgbToRgba(color, alpha);
        }
        return `rgba(255, 255, 255, ${alpha})`;
    }

    // Set a nested property on an object by dot path (creates intermediate objects)
    function setNested(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    function getNested(obj, path) {
        if (!obj) return undefined;
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length; i++) {
            if (current === null || current === undefined) return undefined;
            current = current[keys[i]];
        }
        return current;
    }

    // ===== IDs ESTABLES + ALCANCE POR LINEA (delta disperso) =====
    // Colores siempre en hex tal cual (#ff0000): sin normalizar rgb<->hex.
    let layerSeq = 1;
    let styleSeq = 1;
    function nextLayerId() { layerSeq += 1; return 'L' + layerSeq; }
    function nextStyleId() { styleSeq += 1; return 'S' + styleSeq; }
    function ensureFillIds(fill) {
        if (!fill || typeof fill !== 'object') return fill;
        (Array.isArray(fill.layers) ? fill.layers : []).forEach(function(layer) {
            if (layer && !layer.id) layer.id = nextLayerId();
            ((layer && Array.isArray(layer.styles)) ? layer.styles : []).forEach(function(style) {
                if (style && typeof style === 'object' && !style.id) style.id = nextStyleId();
            });
        });
        return fill;
    }

    // ===== MODELO DE LINEAS (002-text-tab US6, contracts/lineas.md) =====
    // `lines` es el sistema de lineas del preset: el target que se esta editando
    // (que NO filtra lo que aplica), la herencia y el estilo propio de cada
    // linea direccionable (L1-L3), con claves 1-BASED (`line["1"]` = L1).
    //
    // Rutas GLOBALES de bloque (nunca entran al delta de una linea): el texto,
    // Canvas Size, el contenedor `lines`, descarga/procesado, `rotate` y
    // `distort` (bloque D4: hoy se aplican al bloque entero al final del render)
    // y los letterings que actuan sobre todo el bloque. Todo lo demas es por
    // linea (FR-016), incluido `lineHeight`.
    const GLOBAL_PATHS = [
        'text', 'canvas', 'lines', 'download', 'processing',
        'rotate', 'distort',
        'lettering.flag', 'lettering.boggle', 'lettering.reverseOverlap', 'lettering.blendmode'
    ];

    // Unica EXCEPCION dentro de `canvas` (2026-10-04, decision del usuario):
    // "Max Font Size" es global en All pero con una linea activa manda sobre ESA
    // linea. Sigue siendo un PORCENTAJE relativo al lienzo, nunca px fijos: el
    // canvas es dinamico (500 px o 5000 px) y el texto debe seguir al tamano que
    // necesite el cliente.
    const CANVAS_POR_LINEA = ['canvas.maxFontSize'];

    // Lineas direccionables: solo L1..L3. Las demas filas del texto resuelven
    // como All (R-L1.4).
    const MAX_LINE = 3;

    function isGlobalPath(path) {
        if (!path) return false;
        if (CANVAS_POR_LINEA.indexOf(path) !== -1) return false;
        if (CANVAS_POR_LINEA.some(function (p) { return path.indexOf(p + '.') === 0; })) return false;
        return GLOBAL_PATHS.some(function (g) {
            return path === g || path.indexOf(g + '.') === 0;
        });
    }

    // Acepta el numero (2) y el nombre de linea ('L2'): el padre se expresa
    // como 'L2' (data-model §3) y las claves de `line` son 1-based numericas.
    function normalizeLineNo(n) {
        let v = n;
        if (typeof v === 'string') {
            const m = /^\s*[Ll]?(\d+)\s*$/.exec(v);
            v = m ? parseInt(m[1], 10) : NaN;
        }
        v = typeof v === 'number' ? v : parseInt(v, 10);
        return (isFinite(v) && v >= 1 && v <= MAX_LINE) ? v : 0;
    }

    function linesOf(s) {
        return (s && s.lines && typeof s.lines === 'object') ? s.lines : null;
    }

    function lineEntry(s, lineNo) {
        const ls = linesOf(s);
        const n = normalizeLineNo(lineNo);
        if (!ls || !ls.line || !n) return null;
        const e = ls.line[String(n)];
        return (e && typeof e === 'object') ? e : null;
    }

    // Padre de una linea: `inherit` es metadato del sistema, no estilo. Ausente
    // = ALL (R-L1.2).
    function parentLine(s, lineNo) {
        const ls = linesOf(s);
        const n = normalizeLineNo(lineNo);
        if (!ls || !ls.inherit) return 0;
        return normalizeLineNo(ls.inherit[String(n)]);
    }

    // Referencia de dimensionamiento de una linea: `sizing` vive DENTRO de la
    // linea ({ref, mode, pct}); el `sizing` global anterior desaparece (R-L2.1).
    function sizingOf(s, lineNo) {
        const e = lineEntry(s, lineNo);
        const sz = e && e.sizing;
        if (!sz || typeof sz !== 'object') return null;
        const ref = (sz.ref === 'linea' || sz.ref === 'line') ? 'linea' : 'canvas';
        return {
            ref: ref,
            // La linea de referencia viaja en la propia regla (1-based).
            refLine: normalizeLineNo(sz.refLine),
            mode: sz.mode === 'width' ? 'width' : 'fontsize',
            pct: Math.max(1, Number(sz.pct) || 100)
        };
    }

    /**
     * Detecta ciclos de herencia y de dimensionamiento, por ambas aristas y de
     * cualquier longitud (R-L3.1, R-L3.3). Devuelve null si no hay ciclo, o la
     * causa (`lines:<detalle>:ciclo`).
     */
    function detectarCiclos(s) {
        function aristasDe(n) {
            const out = [];
            const padre = parentLine(s, n);
            // El autociclo (L2 hereda de L2) es un ciclo de longitud 1: se
            // reporta, no se ignora en silencio.
            if (padre) out.push(padre);
            const sz = sizingOf(s, n);
            // Referenciarse a si misma en el dimensionamiento no es ciclo (no
            // avanza la resolucion), asi que no cuenta como arista.
            if (sz && sz.ref === 'linea' && sz.refLine && sz.refLine !== n) out.push(sz.refLine);
            return out;
        }
        const nodos = [1, 2, 3].filter(function (n) { return !!lineEntry(s, n) || parentLine(s, n); });
        const estado = {};   // 1 = en la pila, 2 = resuelto
        const pila = [];
        let ciclo = null;
        function visitar(n) {
            if (ciclo || !n) return;
            if (estado[n] === 2) return;
            if (estado[n] === 1) {
                const desde = pila.indexOf(n);
                const vuelta = pila.slice(desde >= 0 ? desde : 0).concat(n);
                ciclo = vuelta.map(function (x) { return 'L' + x; }).join('>');
                return;
            }
            estado[n] = 1;
            pila.push(n);
            aristasDe(n).forEach(visitar);
            pila.pop();
            estado[n] = 2;
        }
        nodos.forEach(visitar);
        return ciclo ? ('lines:' + ciclo + ':ciclo') : null;
    }

        /**
     * Opciones que la UI puede ofrecer SIN cerrar un ciclo (FR-013, R-L3.1).
     *
     * `kind:'inherit'` lista las lineas que la linea `lineNo` puede tomar como
     * padre; `kind:'refLine'` las que puede usar como referencia de tamano. El
     * filtro es transitivo y cubre las DOS aristas: se prueba la asignacion
     * sobre una copia y se descarta si `detectarCiclos` la rechaza.
     */
    function opcionesValidas(s, lineNo, kind) {
        const out = [];
        const n = normalizeLineNo(lineNo);
        const base = linesOf(s);
        if (!n || !base) return out;
        for (let c = 1; c <= MAX_LINE; c++) {
            // Ni como padre ni como referencia se ofrece a si misma: no aporta
            // nada y en herencia seria un autociclo (que si se rechaza cuando
            // llega por archivo editado a mano).
            if (c === n) continue;
            // `detectarCiclos` recibe el SETTINGS: la prueba se arma sobre una copia con
            // las lineas sustituidas, sin tocar el estado real.
            const prueba = {
                lines: {
                    activeTarget: base.activeTarget,
                    inherit: Object.assign({}, base.inherit || {}),
                    line: Object.assign({}, base.line || {})
                }
            };
            if (kind === 'inherit') {
                // La propia linea `n` tomaria a la candidata `c` como padre.
                prueba.lines.inherit[String(n)] = 'L' + c;
            } else {
                const entrada = Object.assign({}, prueba.lines.line[String(n)] || {});
                entrada.sizing = Object.assign({}, entrada.sizing, {
                    ref: 'linea', refLine: c,
                    pct: (entrada.sizing && entrada.sizing.pct) || 100
                });
                prueba.lines.line[String(n)] = entrada;
            }
            if (!detectarCiclos(prueba)) out.push(c);
        }
        return out;
    }

    // Fuentes que el render necesita, una por linea USADA (research R7). Cada
    // entrada nombra su linea para que un fallo pueda decir cual fue (FR-017).
    // Solo se LISTAN las lineas que existen: nada de precargar todo (constitucion
    // VI, sin preloadAll). Una linea que hereda no aporta fuente propia: usa la
    // de la linea de la que hereda.
    function fuentesPorLinea(s) {
        const salida = [];
        const vistos = {};
        function anotar(ref, linea) {
            const clave = String(ref);
            if (ref === undefined || ref === null || ref === '' || vistos[clave]) return;
            vistos[clave] = true;
            salida.push({ ref: ref, linea: linea });
        }
        const nLineas = String((s && s.text) || '').split('\n').length;
        const base = (s && s.font) ? s.font.src : undefined;
        // La fuente de la base siempre se usa (es la de ALL).
        anotar(base, 0);
        const limite = Math.min(nLineas, MAX_LINE);
        for (let li = 1; li <= limite; li++) {
            const r = resolveLine(s, li, {});
            anotar(r && r.font ? r.font.src : undefined, li);
        }
        return salida;
    }

    // Line height de la linea `n` en PORCENTAJE: base 0% = ajuste justo (R-L4.4).
// Si la linea no define valor propio, hereda el de la base (All).
function lineHeightDe(s, n, memo) {
    const r = resolveLine(s, n, memo || {});
    const v = r && Number(r.lineHeight);
    if (isFinite(v)) return v;
    const b = Number((s && s.lineHeight) !== undefined ? s.lineHeight : 100);
    return isFinite(b) ? b : 100;
}

function clone(obj) {
        return obj ? JSON.parse(JSON.stringify(obj)) : obj;
    }

    function cloneWithoutLines(s) {
        const c = clone(s) || {};
        delete c.lines;
        return c;
    }

    // Delta disperso: solo las rutas presentes cambian (R-L1.3). Las rutas
    // globales de bloque se IGNORAN aunque alguien las haya escrito a mano en el
    // delta de la linea (R-L4.1): el alcance por linea no las cubre.
    function mergeDelta(base, delta) {
        const out = clone(base) || {};
        (function apply(node, d, prefix) {
            Object.keys(d).forEach(function (k) {
                if (k === 'sizing' || k === 'inherit') return;  // metadatos del sistema
                const v = d[k];
                const full = prefix ? prefix + '.' + k : k;
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    // Se BAJA al subarbol: la decision es por HOJA, porque un
                    // grupo puede ser global y contener una excepcion (canvas es
                    // global, canvas.maxFontSize no lo es).
                    if (!node[k] || typeof node[k] !== 'object' || Array.isArray(node[k])) node[k] = {};
                    apply(node[k], v, full);
                    return;
                }
                if (isGlobalPath(full)) return;
                node[k] = clone(v);
            });
        })(out, delta, '');
        return out;
    }

    /**
     * Resolucion de una linea en tres pasos: heredar -> mezclar lo propio ->
     * dejar la REGLA de tamano puesta (R-L1.1).
     *
     * `memo` cachea por render para no repetir el recorrido por linea y motor.
     * Con un ciclo (archivo editado a mano) NO se cuelga: cae a la base (R-L3.2).
     *
     * El paso 3 NO calcula un `font.size` absoluto: `sizing` es METADATO del
     * sistema y lo consume `lineFontSizes`, que es donde estan los tamanos ya
     * calculados. Calcularlo aqui metia un absoluto (el `font.size` guardado, 100
     * por defecto) y al activar un "L1 · %" AGRANDABA las tres lineas en vez de
     * encogerlas.
     */
    function resolveLine(s, lineNo, memo) {
        const n = normalizeLineNo(lineNo);
        if (!n) return cloneWithoutLines(s);
        const cache = memo || null;
        if (cache && cache[n]) return cache[n];
        // Guardia de ciclos: la resolucion es recursiva por la herencia.
        if (!memo) memo = {};
        if (memo['__viendo' + n]) return cloneWithoutLines(s);
        memo['__viendo' + n] = true;

        const padre = parentLine(s, n);
        // 1. Heredar: de ALL (base tal cual) o del estilo RESUELTO del padre.
        const puntoDePartida = padre ? resolveLine(s, padre, memo) : cloneWithoutLines(s);
        // 2. Mezclar lo propio (delta disperso).
        const propia = lineEntry(s, n);
        const resuelta = propia ? mergeDelta(puntoDePartida, propia) : clone(puntoDePartida);
        // 3. La regla de tamano queda en `sizing` (no se aplica aqui).

        delete memo['__viendo' + n];
        if (cache) cache[n] = resuelta;
        return resuelta;
    }

    // El px propio se reconoce por EXISTIR en la linea (no por coincidir con la
    // base): si L2 tiene font.size guardado, gana sobre el porcentaje (R-L2.3).
    function tienePxPropio(s, lineNo) {
        const e = lineEntry(s, lineNo);
        return !!(e && e.font && Number(e.font.size) > 0);
    }

    function getLineTarget() {
        const s = state.settings || {};
        const t = s.lines && s.lines.activeTarget;
        return (t === 'all' || /^L\d+$/.test(t || '')) ? (t || 'all') : 'all';
    }

    function setLineTarget(target) {
        if (!state.settings.lines || typeof state.settings.lines !== 'object') {
            state.settings.lines = { activeTarget: 'all', overrides: {} };
        }
        state.settings.lines.activeTarget = target;
        render();
        updateUIFromLineTarget();
        if (typeof document !== 'undefined' && document.dispatchEvent) {
            document.dispatchEvent(new CustomEvent('textmuy:line-target-updated'));
        }
    }

    function pruneEmpty(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        Object.keys(obj).forEach(function(k) {
            const v = obj[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                pruneEmpty(v);
                if (!Object.keys(v).length) delete obj[k];
            }
        });
        return obj;
    }

    // Escribe un ajuste en la linea del target activo, o en la base si la ruta
    // es global de bloque (R-L4.1). Las claves de linea son 1-BASED.
    function setTargetedSetting(path, value) {
        const target = getLineTarget();
        const lineNo = normalizeLineNo(target);
        if (!lineNo || isGlobalPath(path)) {
            setNested(state.settings, path, value);
            render();
            return;
        }
        const ls = linesOf(state.settings) || {};
        ls.line = ls.line || {};
        const key = String(lineNo);
        const previa = (ls.line[key] && typeof ls.line[key] === 'object') ? ls.line[key] : {};
        const propia = mergeDelta({}, previa);
        setNested(propia, path, value);
        // Si el valor coincide con lo que la linea RESUELVE, no hace falta
        // override: solo viaja la diferencia (delta estricto, constitucion IV).
        const resuelta = resolveLine(state.settings, lineNo, {});
        if (JSON.stringify(getNested(propia, path)) === JSON.stringify(getNested(resuelta, path))) {
            const keys = path.split('.');
            let node = propia;
            for (let i = 0; i < keys.length - 1; i++) { node = node && node[keys[i]]; }
            if (node) delete node[keys[keys.length - 1]];
        }
        pruneEmpty(propia);
        if (Object.keys(propia).length) ls.line[key] = propia;
        else delete ls.line[key];
        render();
    }

    // Valor efectivo de una ruta en una linea: lo que RESUELVE, no solo lo
    // propio (herencia incluida).
    function getEffectiveSetting(lineIdx, path) {
        const n = normalizeLineNo(lineIdx !== undefined && lineIdx !== null && !isNaN(lineIdx) ? lineIdx : lineIdx);
        const resuelta = n ? resolveLine(state.settings, n, {}) : cloneWithoutLines(state.settings);
        return getNested(resuelta, path);
    }

    // Fija de quien hereda la linea del target activo. 'ALL' = sin padre (defecto).
    function setLineInherit(valor) {
        const lineNo = normalizeLineNo(getLineTarget());
        if (!lineNo) return;
        const ls = linesOf(state.settings) || {};
        ls.inherit = Object.assign({}, ls.inherit || {});
        if (!valor || valor === 'ALL') delete ls.inherit[String(lineNo)];
        else {
            // No se admite un padre que cerraria un ciclo (FR-013): la UI ya no
            // lo ofrece, y aqui se evita que llegue por otra via.
            const padre = normalizeLineNo(valor);
            const prueba = {
                lines: {
                    inherit: Object.assign({}, ls.inherit, { [String(lineNo)]: 'L' + padre }),
                    line: ls.line || {}
                }
            };
            if (padre && padre !== lineNo && !detectarCiclos(prueba)) {
                ls.inherit[String(lineNo)] = 'L' + padre;
            }
        }
        render();
        updateUIFromLineTarget();
    }

    // Regla de tamano de la linea del target activo (null si no tiene).
    function getLineSizing() {
        return sizingOf(state.settings, getLineTarget());
    }

    // Fija la regla de tamano de la linea del target activo. Con referencia al
    // canvas el control escribe px absolutos (FR-012); con referencia a linea
    // escribe el porcentaje, para que la cadena siga viva.
    function setLineSizing(patch) {
        const lineNo = normalizeLineNo(getLineTarget());
        if (!lineNo) { render(); return; }
        const ls = linesOf(state.settings) || {};
        ls.line = ls.line || {};
        const key = String(lineNo);
        const entrada = (ls.line[key] && typeof ls.line[key] === 'object') ? ls.line[key] : {};
        const actual = sizingOf(state.settings, lineNo) || { ref: 'canvas', mode: 'fontsize', pct: 100 };
        const ref = patch.ref !== undefined ? patch.ref : actual.ref;
        const nueva = {
            ref: ref,
            mode: patch.mode !== undefined ? patch.mode : actual.mode,
            pct: Math.max(1, Number(patch.pct !== undefined ? patch.pct : actual.pct) || 100)
        };
        if (nueva.ref === 'linea') nueva.refLine = normalizeLineNo(patch.refLine !== undefined ? patch.refLine : actual.refLine);
        if (ref === 'canvas' && patch.fontSizePx) {
            // Con referencia al canvas el tamano es absoluto (FR-012).
            delete nueva.pct;
            setNested(entrada, 'font.size', Math.max(1, Math.round(patch.fontSizePx)));
        }
        if (Object.keys(nueva).length) entrada.sizing = nueva;
        ls.line[key] = entrada;
        render();
    }
    // Sync simple controls from the effective settings of the active line target.
    // Delegates to window.TextEditorControls bindings when available (registrations
    // land there via bindRange/bindCheckbox/etc.). Falls back to a minimal
    // id<-settingPath mapping so headless renders keep working without controls.js.
    var FALLBACK_LINE_SYNC_TABLE = [
        ['tt-font-size-input', 'font.size'],
        ['tt-font-weight-input', 'font.weight'],
        ['tt-fill-active-input', 'fill.active'],
        ['tt-depth-length-input', 'depth.length'],
        ['tt-depth-angle-input', 'depth.angle'],
        ['tt-outline-first-width-input', 'outline.first.width'],
        ['tt-outline-second-width-input', 'outline.second.width'],
        ['tt-shadow-outer-distance-input', 'shadow.outer.distance'],
        ['tt-shadow-inner-size-input', 'shadow.inner.size']
    ];

    // 002-text-tab US6: el alcance por linea ya no se filtra por una lista de
    // "estilizables". Lo que decide es `isGlobalPath`: si la ruta es global de
    // bloque se muestra la base; si no, el valor RESUELTO de la linea.
    function updateUIFromLineTarget() {
        const target = getLineTarget();
        const lineIdx = target === 'all' ? null : (parseInt(target.slice(1), 10) - 1);
        const bindings = (typeof window !== 'undefined' && window.TextEditorControls &&
            Array.isArray(window.TextEditorControls.bindings))
            ? window.TextEditorControls.bindings : null;
        const table = (bindings && bindings.length ? bindings : FALLBACK_LINE_SYNC_TABLE)
            .filter(function (entry) {
                const p = String(entry && (entry.settingPath || entry[1]) || '');
                return lineIdx === null || !isGlobalPath(p);
            });
        table.forEach(function(entry) {
            const id = entry.id || entry[0];
            const path = entry.settingPath || entry[1];
            if (typeof document === 'undefined' || !document.getElementById) return;
            const el = document.getElementById(id);
            if (!el) return;
            const value = lineIdx === null ? getNested(state.settings, path)
                : getEffectiveSetting(lineIdx, path);
            var isCheckbox = el.type === 'checkbox' ||
                el.getAttribute('type') === 'checkbox';
            if (isCheckbox) {
                el.checked = Boolean(value);
            } else if ((el.value !== undefined) &&
                (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
                // RC32: el sync por linea entregaba objetos {r,g,b} crudos a los
                // <input type=color> (-> warning "[object Object]" del log).
                // colorToHex vive en este modulo; si no es input de color y el
                // valor no es primitivo, no se escribe (era '' que limpiaba selects).
                var esColor = (el.type === 'color') || (el.getAttribute && el.getAttribute('type') === 'color');
                if (esColor && value !== undefined && value !== null && typeof value === 'object') {
                    try { el.value = (typeof colorToHex === 'function') ? colorToHex(value) : ''; }
                    catch (_) { el.value = ''; }
                } else if (value !== undefined && value !== null && typeof value === 'object') {
                    /* objeto en input no-color: se deja el valor actual del control */
                } else {
                    el.value = (value !== undefined && value !== null) ? value : '';
                }
            }
            // Marcar override propio vs heredado (syncControlsFromTarget, paso 4):
            try {
                const propia = lineIdx !== null ? lineEntry(state.settings, lineIdx + 1) : null;
                const own = !!propia && getNested(propia, path) !== undefined;
                el.setAttribute('data-line-override', own ? '1' : '0');
            } catch (e) { /* decoracion best-effort, nunca rompe el sync */ }
            if (bindings && window.TextEditorControls && typeof window.TextEditorControls.refreshInputDecorations === 'function') {
                window.TextEditorControls.refreshInputDecorations(el);
            }
        });
    }

    // Tamano base (canvas) de UNA linea aislada: biseccion como autoFitText
    // pero con una sola linea y caja disponible explicita. Devuelve px.
    function fitSingleLine(ctx, lineText, availW, availH, s) {
        let lo = 8;
        let hi = Math.max(8, Math.ceil(Math.max(availW, availH)));
        let best = 8;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            ctx.font = componerFuente(s, mid);
            const w = measureTextWidth(ctx, lineText, s.letterSpacing, mid);
            const m = ctx.measureText('Ag');
            const h = (m.actualBoundingBoxAscent || mid * 0.8) + (m.actualBoundingBoxDescent || mid * 0.2);
            if (w + calcExtraWidth(s, mid) <= availW && h + calcExtraHeight(s, mid) <= availH) { best = mid; lo = mid + 1; }
            else { hi = mid - 1; }
        }
        return best;
    }

    // Resuelve el fontSizePx de cada linea segun lines.sizing. Sin sizing en
    // Tamano por linea (R-L2). Dos pasadas:
    //   1. cada linea resuelve su tamano base (px propio, o porcentaje sobre el
    //      tamano del ajuste si su regla referencia al canvas);
    //   2. las reglas que referencian a OTRA LINEA se aplican en cascada sobre
    //      el tamano ya resuelto de la referencia (si L1 crece, L2 la sigue).
    // Sin reglas de tamano devuelve el global repetido (caso normal, via rapida).
    function lineFontSizes(ctx, lines, canvasWidth, canvasHeight, s, fontSizePx) {
        const n = lines.length;
        const out = new Array(n).fill(fontSizePx);
        const direccionables = Math.min(n, MAX_LINE);
        if (!linesOf(s) || direccionables === 0) return out;
        let hayReglas = false;
        for (let li = 1; li <= direccionables; li++) {
            const e = lineEntry(s, li);
            if (!e) continue;
            // Un tope de tamano por linea tambien es una regla del sistema de
            // lineas: sin esto se saldia por la via rapida y el tope se ignoraba.
            const conTope = e.canvas && e.canvas.maxFontSize !== undefined;
            if (e.sizing || conTope || (e.font && Number(e.font.size) > 0)) { hayReglas = true; break; }
        }
        if (!hayReglas) return out;

        const area = areaUtil(s, canvasWidth, canvasHeight);
        const availW = area.width;
        const availH = area.height;
        const maxPctBase = Math.max(0, Math.min(100, s.canvas.maxFontSize !== undefined ? s.canvas.maxFontSize : 100)) / 100;
        const singleRef = canvasWidth >= canvasHeight ? area.height : area.width;
        // Fase 2 (R-L2.4): el avance justo es aproximadamente el tamano de linea.
        const lh = 1;

        // Pasada 1: tamano propio o porcentaje sobre el tamano del ajuste.
        // `px` parte SIEMPRE de `fontSizePx` (el tamaño que el ajuste le dio a
        // esta linea), NUNCA del `font.size` guardado: ese valor es un default
        // (100) que no significa nada hasta que el ajuste lo recalcula, y usarlo
        // como punto de partida descuadraba todo.
        for (let li = 1; li <= direccionables; li++) {
            const resuelta = resolveLine(s, li, {});
            const sz = sizingOf(s, li);
            // Tope de ESA linea: con una linea activa, "Max Font Size" deja de
            // ser global y manda sobre ella. Se mide sobre el tamaño base de la
            // linea (relativo, nunca px fijos: el lienzo es dinamico).
            const pctLinea = (resuelta && resuelta.canvas && resuelta.canvas.maxFontSize !== undefined)
                ? Math.max(0, Math.min(100, Number(resuelta.canvas.maxFontSize) || 100)) / 100
                : maxPctBase;
            let px = fontSizePx;
            if (tienePxPropio(s, li)) {
                px = Number((lineEntry(s, li) || {}).font.size);
            } else if (sz && sz.ref === 'canvas') {
                px = fontSizePx * sz.pct / 100;
            } else if (sz && sz.ref === 'linea') {
                px = fontSizePx;   // la cascada se resuelve en la pasada 2
            }
            // El tope limita ESA linea a una fraccion de su propio tamaño base.
            const tope = fontSizePx * pctLinea;
            if (Number.isFinite(px) && px > 0) {
                out[li - 1] = Math.max(8, Math.round(Math.min(px, tope)));
            }
        }

        // Pasada 2: cascada. Se repite hasta que ninguna regla cambie un tamano
        // (como maximo MAX_LINE vueltas: hay tres lineas).
        for (let vuelta = 0; vuelta < MAX_LINE; vuelta++) {
            let cambio = false;
            for (let li = 1; li <= direccionables; li++) {
                const sz = sizingOf(s, li);
                if (!sz || sz.ref !== 'linea' || !sz.refLine) continue;
                if (tienePxPropio(s, li)) continue;   // el px gana sobre la regla
                const base = out[sz.refLine - 1];
                if (!base) continue;
                const nuevo = Math.max(8, Math.round(base * sz.pct / 100));
                if (out[li - 1] !== nuevo) { out[li - 1] = nuevo; cambio = true; }
            }
            if (!cambio) break;
        }

        // mode 'width': la linea se ajusta al ancho de su referencia con el
        // alto restante del lienzo (R-L2.2).
        for (let li = 1; li <= direccionables; li++) {
            const sz = sizingOf(s, li);
            if (!sz || sz.mode !== 'width' || sz.ref !== 'linea' || !sz.refLine) continue;
            if (tienePxPropio(s, li)) continue;
            const refPx = out[sz.refLine - 1] || fontSizePx;
            const refW = Math.max(1, measureTextWidth(ctx, lines[li - 1], s.letterSpacing, refPx));
            let otherH = 0;
            for (let j = 0; j < n; j++) {
                if (j === li - 1) continue;
                otherH += out[j] * lh;
            }
            out[li - 1] = Math.max(8, fitSingleLine(ctx, lines[li - 1], Math.min(refW, availW), Math.max(1, availH - otherH), s));
        }

        // Fase 2 (R-L2.4): si la pila no cabe en vertical, TODAS se escalan por
        // el mismo factor: las proporciones quedan intactas.
        let totalH = 0;
        for (let j = 0; j < n; j++) totalH += out[j] * lh;
        if (totalH > availH && totalH > 0) {
            const k = availH / totalH;
            for (let j = 0; j < n; j++) out[j] = Math.max(8, Math.round(out[j] * k));
        }
        return out;
    }

    function localApplyDelta(target, delta) {
        if (window.PresetManager && window.PresetManager.applyDelta) {
            window.PresetManager.applyDelta(target, delta);
            return target;
        }
        if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return target;
        Object.keys(delta).forEach(function(k) {
            const v = delta[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                if (!target[k] || typeof target[k] !== 'object') target[k] = {};
                localApplyDelta(target[k], v);
            } else { target[k] = v; }
        });
        return target;
    }

    function resolveLineSettings(lineIdx) {
        const base = JSON.parse(JSON.stringify(state.settings));
        delete base.lines;
        const ov = state.settings.lines && state.settings.lines.overrides
            ? state.settings.lines.overrides[String(lineIdx)] : null;
        if (ov) localApplyDelta(base, JSON.parse(JSON.stringify(ov)));
        ensureFillIds(base.fill);
        return base;
    }

    // Convert a TextStudio color (hex string or {r,g,b[,a]}) to a plain hex string
    function colorToHex(color) {
        if (typeof color === 'string') return color;
        if (color && typeof color === 'object') {
            const r = Math.max(0, Math.min(255, Math.round(color.r || 0)));
            const g = Math.max(0, Math.min(255, Math.round(color.g || 0)));
            const b = Math.max(0, Math.min(255, Math.round(color.b || 0)));
            return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }
        return '#ffffff';
    }

    // Update settings
    function updateSettings(newSettings) {
        Object.assign(state.settings, newSettings);
        render();
    }

    // Helper: Convert RGB object to hex with validation
    function rgbToHex(rgb) {
        if (typeof rgb === 'string') return rgb; // already hex — pass through
        if (!rgb || typeof rgb !== 'object') return '#ffffff';
        const r = Math.max(0, Math.min(255, Math.round(rgb.r || 0)));
        const g = Math.max(0, Math.min(255, Math.round(rgb.g || 0)));
        const b = Math.max(0, Math.min(255, Math.round(rgb.b || 0)));
        return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
    }

    // Helper: Validate and clamp numeric value
    function clampValue(value, min, max, defaultValue) {
        if (value === undefined || value === null || isNaN(value)) return defaultValue;
        return Math.max(min, Math.min(max, value));
    }

    // Load preset with enhanced TextStudio compatibility
    function loadPreset(preset, targetSettings) {
        // RC39 (001-fix-bugs-01): la carga aplica el preset sobre defaults
        // limpios, no sobre el estado vivo. Antes escribia campo por campo y
        // TODO campo que el preset no declaraba conservaba el valor de la
        // vista: de ahi que al cargar un preset el color fuera el que estaba
        // puesto y no el guardado (FR-016, R-P1.1, R-P1.2).
        //
        // Con target (ruta API/export) el objeto es del llamador y se respeta
        // tal cual: ahi no hay "vista" que contaminar.
        let s;
        if (targetSettings) {
            s = targetSettings;
        } else {
            // Estado nuevo desde defaults: nada de la vista sobrevive.
            state.settings = createDefaultSettings();
            s = state.settings;
        }

        // Basic text properties with validation
        if (preset.text !== undefined) s.text = String(preset.text || 'TEXT');
        if (preset.font) {
            if (!s.font || typeof s.font === 'string') {
                s.font = { src: preset.font.src || preset.font.name || preset.font, size: 64, weight: 'normal' };
            }
            if (preset.font.src) s.font.src = preset.font.src;
            if (preset.font.name) s.font.src = preset.font.name;
            if (preset.font.size) s.font.size = clampValue(preset.font.size, 12, 140, 64);
            if (preset.font.weight) s.font.weight = preset.font.weight;
        }
        if (preset.align) s.align = preset.align;
        if (preset.rotate !== undefined) s.rotate = clampValue(preset.rotate, -180, 180, 0);
        if (preset.lineHeight !== undefined) s.lineHeight = clampValue(preset.lineHeight, -100, 200, 0);
        if (preset.letterSpacing !== undefined) s.letterSpacing = clampValue(preset.letterSpacing, -0.5, 1.5, 0);
        if (preset.mergeGradients !== undefined) s.mergeGradients = Boolean(preset.mergeGradients);

        // RC39: el lienzo (tamano y opciones) es parte del preset y NO se
        // aplicaba. Sin esto, cargar un preset con otro tamano de lienzo
        // mostraba el de la vista (FR-015).
        if (preset.canvas && typeof preset.canvas === 'object') {
            s.canvas = s.canvas && typeof s.canvas === 'object' ? s.canvas : {};
            if (preset.canvas.width !== undefined) s.canvas.width = clampValue(preset.canvas.width, 1, 10000, 480);
            if (preset.canvas.height !== undefined) s.canvas.height = clampValue(preset.canvas.height, 1, 10000, 320);
            if (preset.canvas.maxFontSize !== undefined) s.canvas.maxFontSize = clampValue(preset.canvas.maxFontSize, 1, 100, 100);
            if (preset.canvas.padding !== undefined) s.canvas.padding = clampValue(preset.canvas.padding, 0, 0.5, 0);
            if (preset.canvas.zoom !== undefined) s.canvas.zoom = clampValue(preset.canvas.zoom, 0, 300, 100);
            if (preset.canvas.background !== undefined) s.canvas.background = preset.canvas.background;
        }

        // Fill with enhanced validation
        if (preset.fill) {
            if (preset.fill.active !== undefined) s.fill.active = Boolean(preset.fill.active);
            if (preset.fill.color) s.fill.color = rgbToHex(preset.fill.color);
            if (preset.fill.alpha !== undefined) s.fill.alpha = clampValue(preset.fill.alpha, 0, 1, 1);
            if (preset.fill.gradient) {
                s.fill.gradient.active = Boolean(preset.fill.gradient.active);
                if (preset.fill.gradient.angle !== undefined) s.fill.gradient.angle = clampValue(preset.fill.gradient.angle, 0, 360, 0);
                if (preset.fill.gradient.colors && preset.fill.gradient.colors.length >= 2) {
                    s.fill.gradient.startColor = rgbToHex(preset.fill.gradient.colors[0]);
                    s.fill.gradient.endColor = rgbToHex(preset.fill.gradient.colors[1]);
                }
            }
            if (preset.fill.texture) {
                if (preset.fill.texture.active !== undefined) s.fill.texture.active = Boolean(preset.fill.texture.active);
                if (preset.fill.texture.src) s.fill.texture.src = preset.fill.texture.src;
                if (preset.fill.texture.alpha !== undefined) s.fill.texture.alpha = clampValue(preset.fill.texture.alpha, 0, 1, 1);
                if (preset.fill.texture.size !== undefined) s.fill.texture.size = preset.fill.texture.size;
                if (preset.fill.texture.blendmode) s.fill.texture.blendmode = preset.fill.texture.blendmode;
            }
            if (preset.fill.palette) {
                if (preset.fill.palette.active !== undefined) s.fill.palette.active = Boolean(preset.fill.palette.active);
                if (preset.fill.palette.styles && Array.isArray(preset.fill.palette.styles)) {
                    s.fill.palette.styles = preset.fill.palette.styles;
                }
            }
            // RC39: las CAPAS DE RELLENO son el grupo que el lienzo usa de
            // verdad (getFillLayers las prioriza sobre los campos legacy). No
            // se aplicaban al cargar, asi que un preset con color de capa
            // seguia mostrando el color de la vista (FR-015).
            if (Array.isArray(preset.fill.layers)) {
                s.fill.layers = JSON.parse(JSON.stringify(preset.fill.layers));
                ensureFillIds(s.fill);
            } else {
                // El preset no declara capas: el relleno vuelve al default, sin
                // conservar las que hubiera en la vista.
                delete s.fill.layers;
            }
        }

        // RC39: estilos por linea y destino de estilo activo. Este grupo NUNCA
        // se aplicaba al cargar, asi que un preset con overrides por linea
        // perdia todo el trabajo de estilos (FR-015).
        if (preset.lines && typeof preset.lines === 'object') {
            s.lines = { activeTarget: 'all', inherit: {}, line: {} };
            if (preset.lines.activeTarget !== undefined) s.lines.activeTarget = preset.lines.activeTarget;
            // Herencia y estilo propio con claves 1-BASED. Lo que el preset no
            // declara NO se poda: las lineas configuradas se conservan aunque el
            // texto actual tenga menos lineas (FR-015).
            if (preset.lines.inherit && typeof preset.lines.inherit === 'object') {
                s.lines.inherit = JSON.parse(JSON.stringify(preset.lines.inherit));
            }
            if (preset.lines.line && typeof preset.lines.line === 'object') {
                s.lines.line = JSON.parse(JSON.stringify(preset.lines.line));
            }
            ensureFillIds(s.fill);
        } else if (!targetSettings) {
            // El preset no declara estilos por linea: vuelven al default en vez
            // de sobrevivir de la vista.
            s.lines = createDefaultSettings().lines;
        }

        // Outline with enhanced validation (modern TextStudio structure)
        if (preset.outline) {
            // Outline #1 (outline.first)
            if (preset.outline.first) {
                if (preset.outline.first.active !== undefined) s.outline.first.active = Boolean(preset.outline.first.active);
                if (preset.outline.first.width !== undefined) s.outline.first.width = clampValue(preset.outline.first.width, 0, 1, 0.1);
                if (preset.outline.first.join) s.outline.first.join = preset.outline.first.join;
                if (preset.outline.first.dash !== undefined) s.outline.first.dash = preset.outline.first.dash;
                if (preset.outline.first.fill) {
                    if (preset.outline.first.fill.color) s.outline.first.fill.color = colorToHex(preset.outline.first.fill.color);
                    if (preset.outline.first.fill.alpha !== undefined) s.outline.first.fill.alpha = clampValue(preset.outline.first.fill.alpha, 0, 1, 1);
                    if (preset.outline.first.fill.gradient) {
                        s.outline.first.fill.gradient.active = Boolean(preset.outline.first.fill.gradient.active);
                        if (preset.outline.first.fill.gradient.angle !== undefined) s.outline.first.fill.gradient.angle = clampValue(preset.outline.first.fill.gradient.angle, 0, 360, 0);
                        if (preset.outline.first.fill.gradient.colors && preset.outline.first.fill.gradient.colors.length >= 2) {
                            s.outline.first.fill.gradient.colors = preset.outline.first.fill.gradient.colors;
                        }
                    }
                    if (preset.outline.first.fill.texture) {
                        if (preset.outline.first.fill.texture.active !== undefined) s.outline.first.fill.texture.active = Boolean(preset.outline.first.fill.texture.active);
                        if (preset.outline.first.fill.texture.src) s.outline.first.fill.texture.src = preset.outline.first.fill.texture.src;
                        if (preset.outline.first.fill.texture.size !== undefined) s.outline.first.fill.texture.size = clampValue(preset.outline.first.fill.texture.size, 0.1, 5, 1);
                        if (preset.outline.first.fill.texture.blendmode) s.outline.first.fill.texture.blendmode = preset.outline.first.fill.texture.blendmode;
                        if (preset.outline.first.fill.texture.repeat) s.outline.first.fill.texture.repeat = preset.outline.first.fill.texture.repeat;
                        if (preset.outline.first.fill.texture.position) s.outline.first.fill.texture.position = preset.outline.first.fill.texture.position;
                        if (preset.outline.first.fill.texture.alpha !== undefined) s.outline.first.fill.texture.alpha = clampValue(preset.outline.first.fill.texture.alpha, 0, 1, 1);
                        if (preset.outline.first.fill.texture.lettering !== undefined) s.outline.first.fill.texture.lettering = Boolean(preset.outline.first.fill.texture.lettering);
                    }
                    if (preset.outline.first.fill.palette) {
                        if (preset.outline.first.fill.palette.active !== undefined) s.outline.first.fill.palette.active = Boolean(preset.outline.first.fill.palette.active);
                        if (preset.outline.first.fill.palette.lettering && preset.outline.first.fill.palette.lettering.method) s.outline.first.fill.palette.lettering.method = preset.outline.first.fill.palette.lettering.method;
                        if (preset.outline.first.fill.palette.styles && Array.isArray(preset.outline.first.fill.palette.styles)) s.outline.first.fill.palette.styles = preset.outline.first.fill.palette.styles;
                    }
                }
                if (preset.outline.first.specular) {
                    s.outline.first.specular = preset.outline.first.specular;
                }
            }

            // Outline #2 (outline.second)
            if (preset.outline.second) {
                if (preset.outline.second.active !== undefined) s.outline.second.active = Boolean(preset.outline.second.active);
                if (preset.outline.second.width !== undefined) s.outline.second.width = clampValue(preset.outline.second.width, 0, 1, 0.1);
                if (preset.outline.second.join) s.outline.second.join = preset.outline.second.join;
                if (preset.outline.second.dash !== undefined) s.outline.second.dash = preset.outline.second.dash;
                if (preset.outline.second.fill) {
                    if (preset.outline.second.fill.color) s.outline.second.fill.color = colorToHex(preset.outline.second.fill.color);
                    if (preset.outline.second.fill.alpha !== undefined) s.outline.second.fill.alpha = clampValue(preset.outline.second.fill.alpha, 0, 1, 1);
                    if (preset.outline.second.fill.gradient) {
                        s.outline.second.fill.gradient.active = Boolean(preset.outline.second.fill.gradient.active);
                        if (preset.outline.second.fill.gradient.angle !== undefined) s.outline.second.fill.gradient.angle = clampValue(preset.outline.second.fill.gradient.angle, 0, 360, 0);
                        if (preset.outline.second.fill.gradient.colors && preset.outline.second.fill.gradient.colors.length >= 2) {
                            s.outline.second.fill.gradient.colors = preset.outline.second.fill.gradient.colors;
                        }
                    }
                    if (preset.outline.second.fill.texture) {
                        if (preset.outline.second.fill.texture.active !== undefined) s.outline.second.fill.texture.active = Boolean(preset.outline.second.fill.texture.active);
                        if (preset.outline.second.fill.texture.src) s.outline.second.fill.texture.src = preset.outline.second.fill.texture.src;
                        if (preset.outline.second.fill.texture.size !== undefined) s.outline.second.fill.texture.size = clampValue(preset.outline.second.fill.texture.size, 0.1, 5, 1);
                        if (preset.outline.second.fill.texture.blendmode) s.outline.second.fill.texture.blendmode = preset.outline.second.fill.texture.blendmode;
                        if (preset.outline.second.fill.texture.repeat) s.outline.second.fill.texture.repeat = preset.outline.second.fill.texture.repeat;
                        if (preset.outline.second.fill.texture.position) s.outline.second.fill.texture.position = preset.outline.second.fill.texture.position;
                        if (preset.outline.second.fill.texture.alpha !== undefined) s.outline.second.fill.texture.alpha = clampValue(preset.outline.second.fill.texture.alpha, 0, 1, 1);
                        if (preset.outline.second.fill.texture.lettering !== undefined) s.outline.second.fill.texture.lettering = Boolean(preset.outline.second.fill.texture.lettering);
                    }
                    if (preset.outline.second.fill.palette) {
                        if (preset.outline.second.fill.palette.active !== undefined) s.outline.second.fill.palette.active = Boolean(preset.outline.second.fill.palette.active);
                        if (preset.outline.second.fill.palette.lettering && preset.outline.second.fill.palette.lettering.method) s.outline.second.fill.palette.lettering.method = preset.outline.second.fill.palette.lettering.method;
                        if (preset.outline.second.fill.palette.styles && Array.isArray(preset.outline.second.fill.palette.styles)) s.outline.second.fill.palette.styles = preset.outline.second.fill.palette.styles;
                    }
                }
                if (preset.outline.second.specular) {
                    s.outline.second.specular = preset.outline.second.specular;
                }
            }

            // Contour 3D #1 (outline.global)
            if (preset.outline.global) {
                if (preset.outline.global.active !== undefined) s.outline.global.active = Boolean(preset.outline.global.active);
                if (preset.outline.global.width !== undefined) s.outline.global.width = clampValue(preset.outline.global.width, 0, 1, 0.1);
                if (preset.outline.global.join) s.outline.global.join = preset.outline.global.join;
                if (preset.outline.global.mask !== undefined) s.outline.global.mask = Boolean(preset.outline.global.mask);
                if (preset.outline.global.projection !== undefined) s.outline.global.projection = Boolean(preset.outline.global.projection);
                if (preset.outline.global.shadow) {
                    s.outline.global.shadow.active = Boolean(preset.outline.global.shadow.active);
                    if (preset.outline.global.shadow.color) s.outline.global.shadow.color = colorToHex(preset.outline.global.shadow.color);
                    if (preset.outline.global.shadow.size !== undefined) s.outline.global.shadow.size = preset.outline.global.shadow.size;
                }
                if (preset.outline.global.fill) {
                    if (preset.outline.global.fill.color) s.outline.global.fill.color = colorToHex(preset.outline.global.fill.color);
                    if (preset.outline.global.fill.alpha !== undefined) s.outline.global.fill.alpha = clampValue(preset.outline.global.fill.alpha, 0, 1, 1);
                    if (preset.outline.global.fill.gradient) {
                        s.outline.global.fill.gradient.active = Boolean(preset.outline.global.fill.gradient.active);
                        if (preset.outline.global.fill.gradient.angle !== undefined) s.outline.global.fill.gradient.angle = clampValue(preset.outline.global.fill.gradient.angle, 0, 360, 0);
                        if (preset.outline.global.fill.gradient.colors && preset.outline.global.fill.gradient.colors.length >= 2) {
                            s.outline.global.fill.gradient.colors = preset.outline.global.fill.gradient.colors;
                        }
                    }
                    if (preset.outline.global.fill.texture) {
                        if (preset.outline.global.fill.texture.active !== undefined) s.outline.global.fill.texture.active = Boolean(preset.outline.global.fill.texture.active);
                        if (preset.outline.global.fill.texture.src) s.outline.global.fill.texture.src = preset.outline.global.fill.texture.src;
                        if (preset.outline.global.fill.texture.size !== undefined) s.outline.global.fill.texture.size = clampValue(preset.outline.global.fill.texture.size, 0.1, 5, 1);
                        if (preset.outline.global.fill.texture.blendmode) s.outline.global.fill.texture.blendmode = preset.outline.global.fill.texture.blendmode;
                        if (preset.outline.global.fill.texture.repeat) s.outline.global.fill.texture.repeat = preset.outline.global.fill.texture.repeat;
                        if (preset.outline.global.fill.texture.position) s.outline.global.fill.texture.position = preset.outline.global.fill.texture.position;
                        if (preset.outline.global.fill.texture.alpha !== undefined) s.outline.global.fill.texture.alpha = clampValue(preset.outline.global.fill.texture.alpha, 0, 1, 1);
                    }
                }
            }

            // Contour 3D #2 (outline.global2)
            if (preset.outline.global2) {
                if (preset.outline.global2.active !== undefined) s.outline.global2.active = Boolean(preset.outline.global2.active);
                if (preset.outline.global2.width !== undefined) s.outline.global2.width = clampValue(preset.outline.global2.width, 0, 1, 0.1);
                if (preset.outline.global2.join) s.outline.global2.join = preset.outline.global2.join;
                if (preset.outline.global2.mask !== undefined) s.outline.global2.mask = Boolean(preset.outline.global2.mask);
                if (preset.outline.global2.projection !== undefined) s.outline.global2.projection = Boolean(preset.outline.global2.projection);
                if (preset.outline.global2.shadow) {
                    s.outline.global2.shadow.active = Boolean(preset.outline.global2.shadow.active);
                    if (preset.outline.global2.shadow.color) s.outline.global2.shadow.color = colorToHex(preset.outline.global2.shadow.color);
                    if (preset.outline.global2.shadow.size !== undefined) s.outline.global2.shadow.size = preset.outline.global2.shadow.size;
                }
                if (preset.outline.global2.fill) {
                    if (preset.outline.global2.fill.color) s.outline.global2.fill.color = colorToHex(preset.outline.global2.fill.color);
                    if (preset.outline.global2.fill.alpha !== undefined) s.outline.global2.fill.alpha = clampValue(preset.outline.global2.fill.alpha, 0, 1, 1);
                    if (preset.outline.global2.fill.gradient) {
                        s.outline.global2.fill.gradient.active = Boolean(preset.outline.global2.fill.gradient.active);
                        if (preset.outline.global2.fill.gradient.angle !== undefined) s.outline.global2.fill.gradient.angle = clampValue(preset.outline.global2.fill.gradient.angle, 0, 360, 0);
                        if (preset.outline.global2.fill.gradient.colors && preset.outline.global2.fill.gradient.colors.length >= 2) {
                            s.outline.global2.fill.gradient.colors = preset.outline.global2.fill.gradient.colors;
                        }
                    }
                    if (preset.outline.global2.fill.texture) {
                        if (preset.outline.global2.fill.texture.active !== undefined) s.outline.global2.fill.texture.active = Boolean(preset.outline.global2.fill.texture.active);
                        if (preset.outline.global2.fill.texture.src) s.outline.global2.fill.texture.src = preset.outline.global2.fill.texture.src;
                        if (preset.outline.global2.fill.texture.size !== undefined) s.outline.global2.fill.texture.size = clampValue(preset.outline.global2.fill.texture.size, 0.1, 5, 1);
                        if (preset.outline.global2.fill.texture.blendmode) s.outline.global2.fill.texture.blendmode = preset.outline.global2.fill.texture.blendmode;
                        if (preset.outline.global2.fill.texture.repeat) s.outline.global2.fill.texture.repeat = preset.outline.global2.fill.texture.repeat;
                        if (preset.outline.global2.fill.texture.position) s.outline.global2.fill.texture.position = preset.outline.global2.fill.texture.position;
                        if (preset.outline.global2.fill.texture.alpha !== undefined) s.outline.global2.fill.texture.alpha = clampValue(preset.outline.global2.fill.texture.alpha, 0, 1, 1);
                    }
                }
            }
        }

        // Shadow Inner #1 (shadow.inner)
        if (preset.shadow && preset.shadow.inner) {
            if (preset.shadow.inner.active !== undefined) s.shadow.inner.active = Boolean(preset.shadow.inner.active);
            if (preset.shadow.inner.size !== undefined) s.shadow.inner.size = clampValue(preset.shadow.inner.size, 0, 1, 0.2);
            if (preset.shadow.inner.strength !== undefined) s.shadow.inner.strength = clampValue(preset.shadow.inner.strength, 0, 1, 0);
            if (preset.shadow.inner.distance !== undefined) s.shadow.inner.distance = clampValue(preset.shadow.inner.distance, 0, 1, 0.1);
            if (preset.shadow.inner.angle !== undefined) s.shadow.inner.angle = clampValue(preset.shadow.inner.angle, -180, 180, -45);
            if (preset.shadow.inner.offset !== undefined) s.shadow.inner.offset = clampValue(preset.shadow.inner.offset, 0, 1, 0);
            if (preset.shadow.inner.color) s.shadow.inner.color = colorToHex(preset.shadow.inner.color);
            if (preset.shadow.inner.alpha !== undefined) s.shadow.inner.alpha = clampValue(preset.shadow.inner.alpha, 0, 1, 1);
            if (preset.shadow.inner.blendmode) s.shadow.inner.blendmode = preset.shadow.inner.blendmode;
            if (preset.shadow.inner.erosion) s.shadow.inner.erosion = preset.shadow.inner.erosion;
        }

        // Shadow Inner #2 (shadow.inner2)
        if (preset.shadow && preset.shadow.inner2) {
            if (preset.shadow.inner2.active !== undefined) s.shadow.inner2.active = Boolean(preset.shadow.inner2.active);
            if (preset.shadow.inner2.size !== undefined) s.shadow.inner2.size = clampValue(preset.shadow.inner2.size, 0, 1, 0.2);
            if (preset.shadow.inner2.strength !== undefined) s.shadow.inner2.strength = clampValue(preset.shadow.inner2.strength, 0, 1, 0);
            if (preset.shadow.inner2.distance !== undefined) s.shadow.inner2.distance = clampValue(preset.shadow.inner2.distance, 0, 1, 0.1);
            if (preset.shadow.inner2.angle !== undefined) s.shadow.inner2.angle = clampValue(preset.shadow.inner2.angle, -180, 180, 135);
            if (preset.shadow.inner2.offset !== undefined) s.shadow.inner2.offset = clampValue(preset.shadow.inner2.offset, 0, 1, 0);
            if (preset.shadow.inner2.color) s.shadow.inner2.color = colorToHex(preset.shadow.inner2.color);
            if (preset.shadow.inner2.alpha !== undefined) s.shadow.inner2.alpha = clampValue(preset.shadow.inner2.alpha, 0, 1, 1);
            if (preset.shadow.inner2.blendmode) s.shadow.inner2.blendmode = preset.shadow.inner2.blendmode;
            if (preset.shadow.inner2.erosion) s.shadow.inner2.erosion = preset.shadow.inner2.erosion;
        }

        // Shadow Outer #1 (shadow.outer)
        if (preset.shadow && preset.shadow.outer) {
            if (preset.shadow.outer.active !== undefined) s.shadow.outer.active = Boolean(preset.shadow.outer.active);
            if (preset.shadow.outer.size !== undefined) s.shadow.outer.size = clampValue(preset.shadow.outer.size, 0, 1, 0.2);
            if (preset.shadow.outer.strength !== undefined) s.shadow.outer.strength = clampValue(preset.shadow.outer.strength, 0, 1, 0);
            if (preset.shadow.outer.distance !== undefined) s.shadow.outer.distance = clampValue(preset.shadow.outer.distance, 0, 1, 0.1);
            if (preset.shadow.outer.angle !== undefined) s.shadow.outer.angle = clampValue(preset.shadow.outer.angle, -180, 180, 135);
            if (preset.shadow.outer.mask !== undefined) s.shadow.outer.mask = Boolean(preset.shadow.outer.mask);
            if (preset.shadow.outer.fill) {
                if (preset.shadow.outer.fill.color) s.shadow.outer.fill.color = colorToHex(preset.shadow.outer.fill.color);
                if (preset.shadow.outer.fill.alpha !== undefined) s.shadow.outer.fill.alpha = clampValue(preset.shadow.outer.fill.alpha, 0, 1, 1);
                if (preset.shadow.outer.fill.gradient) {
                    s.shadow.outer.fill.gradient.active = Boolean(preset.shadow.outer.fill.gradient.active);
                    if (preset.shadow.outer.fill.gradient.angle !== undefined) s.shadow.outer.fill.gradient.angle = clampValue(preset.shadow.outer.fill.gradient.angle, 0, 360, 0);
                    if (preset.shadow.outer.fill.gradient.colors && preset.shadow.outer.fill.gradient.colors.length >= 2) {
                        s.shadow.outer.fill.gradient.colors = preset.shadow.outer.fill.gradient.colors;
                    }
                }
            }
        }

        // Shadow Outer #2 (shadow.outer2)
        if (preset.shadow && preset.shadow.outer2) {
            if (preset.shadow.outer2.active !== undefined) s.shadow.outer2.active = Boolean(preset.shadow.outer2.active);
            if (preset.shadow.outer2.size !== undefined) s.shadow.outer2.size = clampValue(preset.shadow.outer2.size, 0, 1, 0.2);
            if (preset.shadow.outer2.strength !== undefined) s.shadow.outer2.strength = clampValue(preset.shadow.outer2.strength, 0, 1, 0);
            if (preset.shadow.outer2.distance !== undefined) s.shadow.outer2.distance = clampValue(preset.shadow.outer2.distance, 0, 1, 0.1);
            if (preset.shadow.outer2.angle !== undefined) s.shadow.outer2.angle = clampValue(preset.shadow.outer2.angle, -180, 180, 135);
            if (preset.shadow.outer2.mask !== undefined) s.shadow.outer2.mask = Boolean(preset.shadow.outer2.mask);
            if (preset.shadow.outer2.fill) {
                if (preset.shadow.outer2.fill.color) s.shadow.outer2.fill.color = colorToHex(preset.shadow.outer2.fill.color);
                if (preset.shadow.outer2.fill.alpha !== undefined) s.shadow.outer2.fill.alpha = clampValue(preset.shadow.outer2.fill.alpha, 0, 1, 1);
                if (preset.shadow.outer2.fill.gradient) {
                    s.shadow.outer2.fill.gradient.active = Boolean(preset.shadow.outer2.fill.gradient.active);
                    if (preset.shadow.outer2.fill.gradient.angle !== undefined) s.shadow.outer2.fill.gradient.angle = clampValue(preset.shadow.outer2.fill.gradient.angle, 0, 360, 0);
                    if (preset.shadow.outer2.fill.gradient.colors && preset.shadow.outer2.fill.gradient.colors.length >= 2) {
                        s.shadow.outer2.fill.gradient.colors = preset.shadow.outer2.fill.gradient.colors;
                    }
                }
            }
        }

        // Depth with enhanced validation
        if (preset.depth) {
            if (preset.depth.active !== undefined) s.depth.active = Boolean(preset.depth.active);
            if (preset.depth.length !== undefined) s.depth.length = clampValue(preset.depth.length, 0, 1, 0.2);
            if (preset.depth.angle !== undefined) s.depth.angle = clampValue(preset.depth.angle, 0, 360, 135);
            if (preset.depth.fill && preset.depth.fill.color) s.depth.fill.color = rgbToHex(preset.depth.fill.color);
            if (preset.depth.fill && preset.depth.fill.alpha !== undefined) s.depth.fill.alpha = clampValue(preset.depth.fill.alpha, 0, 1, 1);
            if (preset.depth.fill && preset.depth.fill.gradient) {
                s.depth.fill.gradient.active = Boolean(preset.depth.fill.gradient.active);
                if (preset.depth.fill.gradient.angle !== undefined) s.depth.fill.gradient.angle = clampValue(preset.depth.fill.gradient.angle, 0, 360, 0);
                if (preset.depth.fill.gradient.colors && preset.depth.fill.gradient.colors.length >= 2) {
                    s.depth.fill.gradient.colors = preset.depth.fill.gradient.colors;
                }
            }
            if (preset.depth.fill && preset.depth.fill.texture) {
                if (preset.depth.fill.texture.blendmode) s.depth.fill.texture.blendmode = preset.depth.fill.texture.blendmode;
            }
        } else {
            s.depth.active = false;
        }

        // Depth 2 with enhanced validation
        if (preset.depth2) {
            if (preset.depth2.active !== undefined) s.depth2.active = Boolean(preset.depth2.active);
            if (preset.depth2.length !== undefined) s.depth2.length = clampValue(preset.depth2.length, 0, 1, 0.2);
            if (preset.depth2.angle !== undefined) s.depth2.angle = clampValue(preset.depth2.angle, 0, 360, 135);
            if (preset.depth2.fill && preset.depth2.fill.color) s.depth2.fill.color = rgbToHex(preset.depth2.fill.color);
            if (preset.depth2.fill && preset.depth2.fill.alpha !== undefined) s.depth2.fill.alpha = clampValue(preset.depth2.fill.alpha, 0, 1, 1);
            if (preset.depth2.fill && preset.depth2.fill.gradient) {
                s.depth2.fill.gradient.active = Boolean(preset.depth2.fill.gradient.active);
                if (preset.depth2.fill.gradient.angle !== undefined) s.depth2.fill.gradient.angle = clampValue(preset.depth2.fill.gradient.angle, 0, 360, 0);
                if (preset.depth2.fill.gradient.colors && preset.depth2.fill.gradient.colors.length >= 2) {
                    s.depth2.fill.gradient.colors = preset.depth2.fill.gradient.colors;
                }
            }
        } else {
            s.depth2.active = false;
        }

        // Bevel Inner #1 (bevel.inner)
        if (preset.bevel && preset.bevel.inner) {
            if (preset.bevel.inner.active !== undefined) s.bevel.inner.active = Boolean(preset.bevel.inner.active);
            if (preset.bevel.inner.size !== undefined) s.bevel.inner.size = clampValue(preset.bevel.inner.size, 0, 1, 0.1);
            if (preset.bevel.inner.smoothing !== undefined) s.bevel.inner.smoothing = clampValue(preset.bevel.inner.smoothing, 0, 1, 0);
            if (preset.bevel.inner.soften !== undefined) s.bevel.inner.soften = clampValue(preset.bevel.inner.soften, 0, 1, 0.1);
            if (preset.bevel.inner.angle !== undefined) s.bevel.inner.angle = clampValue(preset.bevel.inner.angle, 0, 360, 135);
            if (preset.bevel.inner.altitude !== undefined) s.bevel.inner.altitude = clampValue(preset.bevel.inner.altitude, 0, 90, 0);
            if (preset.bevel.inner.highlight) {
                if (preset.bevel.inner.highlight.color) s.bevel.inner.highlight.color = colorToHex(preset.bevel.inner.highlight.color);
                if (preset.bevel.inner.highlight.alpha !== undefined) s.bevel.inner.highlight.alpha = clampValue(preset.bevel.inner.highlight.alpha, 0, 1, 1);
                if (preset.bevel.inner.highlight.blendmode) s.bevel.inner.highlight.blendmode = preset.bevel.inner.highlight.blendmode;
            }
            if (preset.bevel.inner.shadow) {
                if (preset.bevel.inner.shadow.color) s.bevel.inner.shadow.color = colorToHex(preset.bevel.inner.shadow.color);
                if (preset.bevel.inner.shadow.alpha !== undefined) s.bevel.inner.shadow.alpha = clampValue(preset.bevel.inner.shadow.alpha, 0, 1, 1);
                if (preset.bevel.inner.shadow.blendmode) s.bevel.inner.shadow.blendmode = preset.bevel.inner.shadow.blendmode;
            }
        }

        // Bevel Inner #2 (bevel.inner2)
        if (preset.bevel && preset.bevel.inner2) {
            if (preset.bevel.inner2.active !== undefined) s.bevel.inner2.active = Boolean(preset.bevel.inner2.active);
            if (preset.bevel.inner2.size !== undefined) s.bevel.inner2.size = clampValue(preset.bevel.inner2.size, 0, 1, 0.1);
            if (preset.bevel.inner2.smoothing !== undefined) s.bevel.inner2.smoothing = clampValue(preset.bevel.inner2.smoothing, 0, 1, 0);
            if (preset.bevel.inner2.soften !== undefined) s.bevel.inner2.soften = clampValue(preset.bevel.inner2.soften, 0, 1, 0.1);
            if (preset.bevel.inner2.angle !== undefined) s.bevel.inner2.angle = clampValue(preset.bevel.inner2.angle, 0, 360, 135);
            if (preset.bevel.inner2.altitude !== undefined) s.bevel.inner2.altitude = clampValue(preset.bevel.inner2.altitude, 0, 90, 0);
            if (preset.bevel.inner2.highlight) {
                if (preset.bevel.inner2.highlight.color) s.bevel.inner2.highlight.color = colorToHex(preset.bevel.inner2.highlight.color);
                if (preset.bevel.inner2.highlight.alpha !== undefined) s.bevel.inner2.highlight.alpha = clampValue(preset.bevel.inner2.highlight.alpha, 0, 1, 1);
                if (preset.bevel.inner2.highlight.blendmode) s.bevel.inner2.highlight.blendmode = preset.bevel.inner2.highlight.blendmode;
            }
            if (preset.bevel.inner2.shadow) {
                if (preset.bevel.inner2.shadow.color) s.bevel.inner2.shadow.color = colorToHex(preset.bevel.inner2.shadow.color);
                if (preset.bevel.inner2.shadow.alpha !== undefined) s.bevel.inner2.shadow.alpha = clampValue(preset.bevel.inner2.shadow.alpha, 0, 1, 1);
                if (preset.bevel.inner2.shadow.blendmode) s.bevel.inner2.shadow.blendmode = preset.bevel.inner2.shadow.blendmode;
            }
        }

        // Specular Inner (specular.inner)
        if (preset.specular && preset.specular.inner) {
            s.specular.inner = preset.specular.inner;
        }

        // Lettering with enhanced validation
        if (preset.lettering) {
            if (preset.lettering.active !== undefined) s.lettering.active = Boolean(preset.lettering.active);
            if (preset.lettering.blendmode) s.lettering.blendmode = preset.lettering.blendmode;
            if (preset.lettering.flag) {
                // Flag v2 keys (tilt/rise/waveWidth/waveShift/shape). Legacy
                // flag.angle/amplitude map onto tilt/rise with the same values.
                const pf = preset.lettering.flag;
                s.lettering.flag.active = Boolean(pf.active);
                if (pf.tilt !== undefined) s.lettering.flag.tilt = clampValue(Number(pf.tilt), -360, 360, 0);
                else if (pf.angle !== undefined) s.lettering.flag.tilt = clampValue(Number(pf.angle), -360, 360, 0);
                if (pf.rise !== undefined) s.lettering.flag.rise = clampValue(Number(pf.rise), -100, 100, 0);
                else if (pf.amplitude !== undefined) {
                    let flagRise = Number(pf.amplitude) || 0;
                    if (flagRise > -1 && flagRise < 1) flagRise = flagRise * 100; // legacy ratio -> percent
                    s.lettering.flag.rise = clampValue(flagRise, -100, 100, 0);
                }
                if (pf.waveWidth !== undefined) s.lettering.flag.waveWidth = clampValue(Number(pf.waveWidth), 1, 100, 100);
                if (pf.waveShift !== undefined) s.lettering.flag.waveShift = clampValue(Number(pf.waveShift), 0, 100, 0);
                if (pf.shape !== undefined) s.lettering.flag.shape = (pf.shape === 'linear') ? 'linear' : 'smooth';
                if (pf.tiltMode !== undefined) s.lettering.flag.tiltMode = (pf.tiltMode === 'position') ? 'position' : 'wave';
            }
            if (preset.lettering.boggle && !preset.lettering.flag) {
                // Legacy: old "boggle" field actually held the flag effect.
                s.lettering.flag.active = Boolean(preset.lettering.boggle.active);
                if (preset.lettering.boggle.angle !== undefined) s.lettering.flag.tilt = clampValue(Number(preset.lettering.boggle.angle), -360, 360, 0);
                if (preset.lettering.boggle.amplitude !== undefined) {
                    let flagAmp = Number(preset.lettering.boggle.amplitude) || 0;
                    if (flagAmp > -1 && flagAmp < 1) flagAmp = flagAmp * 100; // legacy ratio -> percent
                    s.lettering.flag.rise = clampValue(flagAmp, -100, 100, 0);
                }
            }
            if (preset.lettering.boggle && preset.lettering.flag) {
                // New format: boggle is the random scattered-letter effect.
                // Keys match its UI labels; legacy angle/amplitude are accepted.
                const pb = preset.lettering.boggle;
                s.lettering.boggle.active = Boolean(pb.active);
                if (pb.maxRotation !== undefined) s.lettering.boggle.maxRotation = clampValue(Number(pb.maxRotation), 0, 360, 40);
                else if (pb.angle !== undefined) s.lettering.boggle.maxRotation = clampValue(Number(pb.angle), 0, 360, 40);
                if (pb.scatterHeight !== undefined) s.lettering.boggle.scatterHeight = clampValue(Number(pb.scatterHeight), 0, 100, 50);
                else if (pb.amplitude !== undefined) s.lettering.boggle.scatterHeight = clampValue(Number(pb.amplitude), 0, 100, 50);
            }
            if (preset.lettering.reverseOverlap) {
                s.lettering.reverseOverlap.active = (preset.lettering.reverseOverlap.letters > 0 || preset.lettering.reverseOverlap.lines > 0);
                s.lettering.reverseOverlap.letters = clampValue(preset.lettering.reverseOverlap.letters || 0, 0, 1, 0);
                s.lettering.reverseOverlap.lines = clampValue(preset.lettering.reverseOverlap.lines || 0, 0, 1, 0);
            }
            if (preset.lettering.shadow) {
                s.lettering.shadow.active = Boolean(preset.lettering.shadow.active);
                if (preset.lettering.shadow.size !== undefined) s.lettering.shadow.size = clampValue(preset.lettering.shadow.size, 0, 1, 0.04);
                if (preset.lettering.shadow.distance !== undefined) s.lettering.shadow.distance = clampValue(preset.lettering.shadow.distance, 0, 1, 0.02);
                if (preset.lettering.shadow.angle !== undefined) s.lettering.shadow.angle = clampValue(preset.lettering.shadow.angle, 0, 360, 180);
                if (preset.lettering.shadow.fill && preset.lettering.shadow.fill.color) s.lettering.shadow.fill.color = rgbToHex(preset.lettering.shadow.fill.color);
                if (preset.lettering.shadow.fill && preset.lettering.shadow.fill.alpha !== undefined) s.lettering.shadow.fill.alpha = clampValue(preset.lettering.shadow.fill.alpha, 0, 1, 1);
            }
        }

        // Distort with enhanced validation
        if (preset.distort && preset.distort.arc) {
            if (preset.distort.arc.angle !== undefined) {
                s.distort.active = preset.distort.arc.angle !== 0;
                s.distort.arc.angle = clampValue(preset.distort.arc.angle, -360, 360, 0);
            }
        }

        // Processing (placeholder for custom effects)
        if (preset.processing && preset.processing.code) {
            s.processing.code = preset.processing.code;
            s.processing.active = Boolean(preset.processing.active);
        }

        // Icon with enhanced validation
        if (preset.icon) {
            if (preset.icon.active !== undefined) s.icon.active = Boolean(preset.icon.active);
            if (preset.icon.src) s.icon.src = preset.icon.src;
            if (preset.icon.position) s.icon.position = preset.icon.position;
            if (preset.icon.size !== undefined) s.icon.size = clampValue(preset.icon.size, 0.1, 5, 1);
            if (preset.icon.rotate !== undefined) s.icon.rotate = clampValue(preset.icon.rotate, -180, 180, 0);
            if (preset.icon.alpha !== undefined) s.icon.alpha = clampValue(preset.icon.alpha, 0, 1, 1);
            if (preset.icon.composite) s.icon.composite = preset.icon.composite;
            if (preset.icon.blendmode) s.icon.blendmode = preset.icon.blendmode;
            if (preset.icon.offset) {
                s.icon.offset.x = clampValue(preset.icon.offset.x || 0, -2, 2, 0);
                s.icon.offset.y = clampValue(preset.icon.offset.y || 0, -2, 2, 0);
            }
        }

        // Background with enhanced validation
        if (preset.background) {
            if (preset.background.active !== undefined) s.background.active = Boolean(preset.background.active);
            if (preset.background.composite) s.background.composite = preset.background.composite;
            if (preset.background.fill && preset.background.fill.color) s.background.fill.color = rgbToHex(preset.background.fill.color);
            if (preset.background.fill && preset.background.fill.alpha !== undefined) s.background.fill.alpha = clampValue(preset.background.fill.alpha, 0, 1, 1);
            if (preset.background.fill && preset.background.fill.image) {
                s.background.fill.image.active = Boolean(preset.background.fill.image.active);
                if (preset.background.fill.image.src) s.background.fill.image.src = preset.background.fill.image.src;
                if (preset.background.fill.image.size) s.background.fill.image.size = preset.background.fill.image.size;
                if (preset.background.fill.image.repeat) s.background.fill.image.repeat = preset.background.fill.image.repeat;
                if (preset.background.fill.image.alpha !== undefined) s.background.fill.image.alpha = clampValue(preset.background.fill.image.alpha, 0, 1, 1);
            }
            if (preset.background.fill && preset.background.fill.gradient) {
                s.background.fill.gradient.active = Boolean(preset.background.fill.gradient.active);
                if (preset.background.fill.gradient.angle !== undefined) s.background.fill.gradient.angle = clampValue(preset.background.fill.gradient.angle, 0, 360, 0);
                if (preset.background.fill.gradient.type) s.background.fill.gradient.type = preset.background.fill.gradient.type;
                if (preset.background.fill.gradient.colors && preset.background.fill.gradient.colors.length >= 2) {
                    s.background.fill.gradient.colors = preset.background.fill.gradient.colors;
                }
            }
        }

        // Animation (placeholder for future implementation)
        if (preset.animation) {
            s.animation.active = Boolean(preset.animation.active);
            if (preset.animation.id) s.animation.id = preset.animation.id;
            if (preset.animation.pause !== undefined) s.animation.pause = clampValue(preset.animation.pause, 0, 10000, 1000);
            if (preset.animation.duration !== undefined) s.animation.duration = clampValue(preset.animation.duration, 0, 10000, 1000);
        }

        if (!targetSettings) {
            // Al cargar preset en el editor visible: el target vuelve a All. Lo que el
            // preset declaro por linea se conserva intacto (FR-015).
            if (state.settings.lines && typeof state.settings.lines === 'object') {
                state.settings.lines.activeTarget = 'all';
            }

            // Update UI elements
            updateUIFromSettings();

            // RC39: la fuente declarada se asegura por su identidad y el
            // pintado espera a que quede lista. El fallo se informa con causa
            // y NO se sustituye la fuente (FR-005).
            repintarPendiente = true;
            renderConFuente();
        }

        // Formato unico (T015): resolver refs de imagen por id numerico
        // (img.json) in-place. En la ruta API renderTextToPNG lo hace de
        // forma autoritativa (await + fail-fast); aqui es best-effort para
        // la UI: al llegar el catalogo, muta los src y re-renderiza.
        if (window.TextMuyAPI && window.TextMuyAPI.prepareImgRefs) {
            window.TextMuyAPI.prepareImgRefs(s).then(function () {
                if (!targetSettings && typeof render === 'function') render();
            }).catch(function (e) {
                console.warn(e && e.message || e);
            });
        }
        return s;
    }

    // Update UI elements from settings
    function updateUIFromSettings() {
        const s = state.settings;

        function setInputValue(id, value) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') el.checked = Boolean(value);
                else el.value = value !== undefined && value !== null ? value : '';
            }
        }

        // TEXT section
        setInputValue('tt-text-textarea', s.text);
        setInputValue('tt-font-picker-input', s.font.src || s.font);
        setInputValue('tt-font-size-input', s.font.size || 64);
        setInputValue('tt-letter-spacing-input', s.letterSpacing || 0);
        setInputValue('tt-line-height-input', s.lineHeight !== undefined ? s.lineHeight : 0);
        setInputValue('tt-distort-arc-angle-input', s.distort && s.distort.arc ? s.distort.arc.angle : 0);
        setInputValue('tt-rotate-input', s.rotate || 0);
        setInputValue('tt-merge-gradients-input', s.mergeGradients || false);

        // Canvas controls
        if (s.canvas) {
            setInputValue('tt-canvas-zoom-input', s.canvas.zoom !== undefined ? s.canvas.zoom : 100);
            setInputValue('tt-canvas-width-input', s.canvas.width || 480);
            setInputValue('tt-canvas-height-input', s.canvas.height || 320);
            setInputValue('tt-canvas-ratio-input', s.canvas.ratio || 0.67);
            setInputValue('tt-canvas-max-font-size-input', s.canvas.maxFontSize || 100);
            setInputValue('tt-canvas-margin-input', Math.round((s.canvas.padding !== undefined ? s.canvas.padding : 0) * 100));
        }

        if (window.Controls && window.Controls.refreshUndoControls) {
            window.Controls.refreshUndoControls();
        }

        // Font weight
        const fontWeightInput = document.getElementById('tt-font-weight-input');
        const fontOptionsList = document.querySelector('.tt-font-options-list');
        if (fontWeightInput && fontOptionsList) {
            fontWeightInput.value = s.font.weight || 'normal';
            fontOptionsList.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
                if ((s.font.weight || 'normal') === 'bold') li.classList.add('selected');
            });
        }

        // Align
        const alignInput = document.getElementById('tt-align-input');
        const alignList = document.querySelector('.tt-align-list');
        if (alignInput && alignList) {
            alignInput.value = s.align || 'center';
            alignList.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
                if (li.dataset.id === (s.align || 'center')) li.classList.add('selected');
            });
        }

        // FILL
        setInputValue('tt-fill-active-input', s.fill.active);

        // LETTERING
        setInputValue('tt-lettering-active-input', s.lettering && s.lettering.active);
        setInputValue('tt-lettering-flag-active-input', s.lettering && s.lettering.flag && s.lettering.flag.active);
        setInputValue('tt-lettering-flag-tilt-input', s.lettering && s.lettering.flag && s.lettering.flag.tilt);
        setInputValue('tt-lettering-flag-tilt-mode-input', s.lettering && s.lettering.flag && s.lettering.flag.tiltMode);
        setInputValue('tt-lettering-flag-rise-input', s.lettering && s.lettering.flag && s.lettering.flag.rise);
        setInputValue('tt-lettering-flag-wave-width-input', s.lettering && s.lettering.flag && s.lettering.flag.waveWidth);
        setInputValue('tt-lettering-flag-wave-shift-input', s.lettering && s.lettering.flag && s.lettering.flag.waveShift);
        setInputValue('tt-lettering-flag-shape-input', s.lettering && s.lettering.flag && s.lettering.flag.shape);
        setInputValue('tt-lettering-boggle-active-input', s.lettering && s.lettering.boggle && s.lettering.boggle.active);
        setInputValue('tt-lettering-boggle-max-rotation-input', s.lettering && s.lettering.boggle && s.lettering.boggle.maxRotation);
        setInputValue('tt-lettering-boggle-scatter-height-input', s.lettering && s.lettering.boggle && s.lettering.boggle.scatterHeight);
        setInputValue('tt-lettering-shadow-active-input', s.lettering && s.lettering.shadow && s.lettering.shadow.active);
        setInputValue('tt-lettering-shadow-size-input', s.lettering && s.lettering.shadow && s.lettering.shadow.size);
        setInputValue('tt-lettering-shadow-fill-alpha-input', s.lettering && s.lettering.shadow && s.lettering.shadow.fill && s.lettering.shadow.fill.alpha);
        setInputValue('tt-lettering-shadow-distance-input', s.lettering && s.lettering.shadow && s.lettering.shadow.distance);
        setInputValue('tt-lettering-shadow-angle-input', s.lettering && s.lettering.shadow && s.lettering.shadow.angle);
        setInputValue('tt-lettering-shadow-fill-color-input', s.lettering && s.lettering.shadow && s.lettering.shadow.fill && s.lettering.shadow.fill.color);
        setInputValue('tt-lettering-reverse-overlap-letters-input', s.lettering && s.lettering.reverseOverlap && s.lettering.reverseOverlap.letters);
        setInputValue('tt-lettering-reverse-overlap-lines-input', s.lettering && s.lettering.reverseOverlap && s.lettering.reverseOverlap.lines);
        setInputValue('tt-lettering-blendmode-input', s.lettering && s.lettering.blendmode);

        // DEPTH
        setInputValue('tt-depth-active-input', s.depth.active);
        setInputValue('tt-depth-length-input', s.depth.length);
        setInputValue('tt-depth-angle-input', s.depth.angle);
        setInputValue('tt-depth-fill-color-input', s.depth.fill && s.depth.fill.color);
        setInputValue('tt-depth-fill-gradient-active-input', s.depth.fill && s.depth.fill.gradient && s.depth.fill.gradient.active);
        setInputValue('tt-depth-fill-merge-alpha-input', s.depth.fill && s.depth.fill.mergeAlpha);
        setInputValue('tt-depth-fill-alpha-input', s.depth.fill && s.depth.fill.alpha);
        setInputValue('tt-depth-fill-texture-active-input', s.depth.fill && s.depth.fill.texture && s.depth.fill.texture.active);
        setInputValue('tt-depth-fill-texture-alpha-input', s.depth.fill && s.depth.fill.texture && s.depth.fill.texture.alpha);

        // DEPTH 2
        setInputValue('tt-depth2-active-input', s.depth2.active);
        setInputValue('tt-depth2-length-input', s.depth2.length);
        setInputValue('tt-depth2-angle-input', s.depth2.angle);
        setInputValue('tt-depth2-fill-color-input', s.depth2.fill && s.depth2.fill.color);
        setInputValue('tt-depth2-fill-gradient-active-input', s.depth2.fill && s.depth2.fill.gradient && s.depth2.fill.gradient.active);
        setInputValue('tt-depth2-fill-merge-alpha-input', s.depth2.fill && s.depth2.fill.mergeAlpha);
        setInputValue('tt-depth2-fill-alpha-input', s.depth2.fill && s.depth2.fill.alpha);

        // OUTLINE #1
        setInputValue('tt-outline-first-active-input', s.outline && s.outline.first && s.outline.first.active);
        setInputValue('tt-outline-first-width-input', s.outline && s.outline.first && s.outline.first.width);
        setInputValue('tt-outline-first-position-input', s.outline && s.outline.first && s.outline.first.position || 'outside');
        setInputValue('tt-outline-first-fill-color-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.color);
        setInputValue('tt-outline-first-fill-gradient-active-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.gradient && s.outline.first.fill.gradient.active);
        setInputValue('tt-outline-first-fill-gradient-angle-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.gradient && s.outline.first.fill.gradient.angle);
        setInputValue('tt-outline-first-fill-palette-active-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.palette && s.outline.first.fill.palette.active);
        setInputValue('tt-outline-first-dash-input', s.outline && s.outline.first && s.outline.first.dash);
        setInputValue('tt-outline-first-fill-alpha-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.alpha);
        setInputValue('tt-outline-first-fill-texture-active-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.texture && s.outline.first.fill.texture.active);
        setInputValue('tt-outline-first-fill-texture-alpha-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.texture && s.outline.first.fill.texture.alpha);
        setInputValue('tt-outline-first-fill-texture-lettering-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.texture && s.outline.first.fill.texture.lettering);
        setInputValue('tt-outline-first-specular-active-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.active);
        setInputValue('tt-outline-first-specular-blur-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.blur);
        setInputValue('tt-outline-first-specular-scale-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.scale);
        setInputValue('tt-outline-first-specular-constant-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.constant);
        setInputValue('tt-outline-first-specular-exponent-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.exponent);
        setInputValue('tt-outline-first-specular-azimuth-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.azimuth);
        setInputValue('tt-outline-first-specular-elevation-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.elevation);
        setInputValue('tt-outline-first-specular-color-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.color);
        setInputValue('tt-outline-first-specular-blendmode-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.blendmode);
        setInputValue('tt-outline-first-specular-type-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.type);
        setInputValue('tt-outline-first-specular-point-x-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.point && s.outline.first.specular.point.x);
        setInputValue('tt-outline-first-specular-point-y-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.point && s.outline.first.specular.point.y);
        setInputValue('tt-outline-first-specular-point-z-input', s.outline && s.outline.first && s.outline.first.specular && s.outline.first.specular.point && s.outline.first.specular.point.z);

        // Outline #1 join
        const outlineFirstJoinInput = document.getElementById('tt-outline-first-join-input');
        const outlineFirstJoinList = document.querySelector('[data-input="tt-outline-first-join-input"]');
        if (outlineFirstJoinInput && outlineFirstJoinList) {
            const joinVal = s.outline && s.outline.first && s.outline.first.join || 'round';
            outlineFirstJoinInput.value = joinVal;
            outlineFirstJoinList.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
                if (li.dataset.id === joinVal) li.classList.add('selected');
            });
        }

        // OUTLINE #2
        setInputValue('tt-outline-second-active-input', s.outline && s.outline.second && s.outline.second.active);
        setInputValue('tt-outline-second-width-input', s.outline && s.outline.second && s.outline.second.width);
        setInputValue('tt-outline-second-position-input', s.outline && s.outline.second && s.outline.second.position || 'outside');
        setInputValue('tt-outline-second-fill-color-input', s.outline && s.outline.second && s.outline.second.fill && s.outline.second.fill.color);
        setInputValue('tt-outline-second-fill-gradient-active-input', s.outline && s.outline.second && s.outline.second.fill && s.outline.second.fill.gradient && s.outline.second.fill.gradient.active);
        setInputValue('tt-outline-second-dash-input', s.outline && s.outline.second && s.outline.second.dash);
        setInputValue('tt-outline-second-fill-alpha-input', s.outline && s.outline.second && s.outline.second.fill && s.outline.second.fill.alpha);
        setInputValue('tt-outline-second-fill-texture-active-input', s.outline && s.outline.second && s.outline.second.fill && s.outline.second.fill.texture && s.outline.second.fill.texture.active);
        setInputValue('tt-outline-second-specular-active-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.active);
        setInputValue('tt-outline-second-specular-blur-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.blur);
        setInputValue('tt-outline-second-specular-scale-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.scale);
        setInputValue('tt-outline-second-specular-constant-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.constant);
        setInputValue('tt-outline-second-specular-exponent-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.exponent);
        setInputValue('tt-outline-second-specular-azimuth-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.azimuth);
        setInputValue('tt-outline-second-specular-elevation-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.elevation);
        setInputValue('tt-outline-second-specular-color-input', s.outline && s.outline.second && s.outline.second.specular && s.outline.second.specular.color);

        // Outline #2 join
        const outlineSecondJoinInput = document.getElementById('tt-outline-second-join-input');
        const outlineSecondJoinList = document.querySelector('[data-input="tt-outline-second-join-input"]');
        if (outlineSecondJoinInput && outlineSecondJoinList) {
            const joinVal2 = s.outline && s.outline.second && s.outline.second.join || 'round';
            outlineSecondJoinInput.value = joinVal2;
            outlineSecondJoinList.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
                if (li.dataset.id === joinVal2) li.classList.add('selected');
            });
        }

        // OUTLINE GLOBAL
        setInputValue('tt-outline-global-active-input', s.outline && s.outline.global && s.outline.global.active);
        setInputValue('tt-outline-global-width-input', s.outline && s.outline.global && s.outline.global.width);
        setInputValue('tt-outline-global-fill-color-input', s.outline && s.outline.global && s.outline.global.fill && s.outline.global.fill.color);
        setInputValue('tt-outline-global-fill-gradient-active-input', s.outline && s.outline.global && s.outline.global.fill && s.outline.global.fill.gradient && s.outline.global.fill.gradient.active);
        setInputValue('tt-outline-global-fill-alpha-input', s.outline && s.outline.global && s.outline.global.fill && s.outline.global.fill.alpha);
        setInputValue('tt-outline-global-shadow-active-input', s.outline && s.outline.global && s.outline.global.shadow && s.outline.global.shadow.active);
        setInputValue('tt-outline-global-mask-input', s.outline && s.outline.global && s.outline.global.mask);
        setInputValue('tt-outline-global-projection-input', s.outline && s.outline.global && s.outline.global.projection);

        setInputValue('tt-outline-global2-active-input', s.outline && s.outline.global2 && s.outline.global2.active);
        setInputValue('tt-outline-global2-width-input', s.outline && s.outline.global2 && s.outline.global2.width);
        setInputValue('tt-outline-global2-fill-color-input', s.outline && s.outline.global2 && s.outline.global2.fill && s.outline.global2.fill.color);
        setInputValue('tt-outline-global2-fill-alpha-input', s.outline && s.outline.global2 && s.outline.global2.fill && s.outline.global2.fill.alpha);
        setInputValue('tt-outline-global2-shadow-active-input', s.outline && s.outline.global2 && s.outline.global2.shadow && s.outline.global2.shadow.active);
        setInputValue('tt-outline-global2-mask-input', s.outline && s.outline.global2 && s.outline.global2.mask);

        // BEVEL INNER
        setInputValue('tt-bevel-inner-active-input', s.bevel && s.bevel.inner && s.bevel.inner.active);
        setInputValue('tt-bevel-inner-size-input', s.bevel && s.bevel.inner && s.bevel.inner.size);
        setInputValue('tt-bevel-inner-soften-input', s.bevel && s.bevel.inner && s.bevel.inner.soften);
        setInputValue('tt-bevel-inner-angle-input', s.bevel && s.bevel.inner && s.bevel.inner.angle);
        setInputValue('tt-bevel-inner-altitude-input', s.bevel && s.bevel.inner && s.bevel.inner.altitude);
        setInputValue('tt-bevel-inner-highlight-color-input', s.bevel && s.bevel.inner && s.bevel.inner.highlight && s.bevel.inner.highlight.color);
        setInputValue('tt-bevel-inner-highlight-blendmode-input', s.bevel && s.bevel.inner && s.bevel.inner.highlight && s.bevel.inner.highlight.blendmode);
        setInputValue('tt-bevel-inner-highlight-alpha-input', s.bevel && s.bevel.inner && s.bevel.inner.highlight && s.bevel.inner.highlight.alpha);
        setInputValue('tt-bevel-inner-shadow-color-input', s.bevel && s.bevel.inner && s.bevel.inner.shadow && s.bevel.inner.shadow.color);
        setInputValue('tt-bevel-inner-shadow-blendmode-input', s.bevel && s.bevel.inner && s.bevel.inner.shadow && s.bevel.inner.shadow.blendmode);
        setInputValue('tt-bevel-inner-shadow-alpha-input', s.bevel && s.bevel.inner && s.bevel.inner.shadow && s.bevel.inner.shadow.alpha);

        // SPECULAR INNER
        setInputValue('tt-specular-inner-active-input', s.specular && s.specular.inner && s.specular.inner.active);
        setInputValue('tt-specular-inner-blur-input', s.specular && s.specular.inner && s.specular.inner.blur);
        setInputValue('tt-specular-inner-scale-input', s.specular && s.specular.inner && s.specular.inner.scale);
        setInputValue('tt-specular-inner-constant-input', s.specular && s.specular.inner && s.specular.inner.constant);
        setInputValue('tt-specular-inner-exponent-input', s.specular && s.specular.inner && s.specular.inner.exponent);
        setInputValue('tt-specular-inner-azimuth-input', s.specular && s.specular.inner && s.specular.inner.azimuth);
        setInputValue('tt-specular-inner-elevation-input', s.specular && s.specular.inner && s.specular.inner.elevation);
        setInputValue('tt-specular-inner-color-input', s.specular && s.specular.inner && s.specular.inner.color);

        // INNER SHADOW
        setInputValue('tt-shadow-inner-active-input', s.shadow && s.shadow.inner && s.shadow.inner.active);
        setInputValue('tt-shadow-inner-size-input', s.shadow && s.shadow.inner && s.shadow.inner.size);
        setInputValue('tt-shadow-inner-strength-input', s.shadow && s.shadow.inner && s.shadow.inner.strength);
        setInputValue('tt-shadow-inner-alpha-input', s.shadow && s.shadow.inner && s.shadow.inner.alpha);
        setInputValue('tt-shadow-inner-distance-input', s.shadow && s.shadow.inner && s.shadow.inner.distance);
        setInputValue('tt-shadow-inner-angle-input', s.shadow && s.shadow.inner && s.shadow.inner.angle);
        setInputValue('tt-shadow-inner-offset-input', s.shadow && s.shadow.inner && s.shadow.inner.offset);
        setInputValue('tt-shadow-inner-color-input', s.shadow && s.shadow.inner && s.shadow.inner.color);
        setInputValue('tt-shadow-inner-blendmode-input', s.shadow && s.shadow.inner && s.shadow.inner.blendmode);

        setInputValue('tt-shadow-inner2-active-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.active);
        setInputValue('tt-shadow-inner2-size-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.size);
        setInputValue('tt-shadow-inner2-strength-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.strength);
        setInputValue('tt-shadow-inner2-alpha-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.alpha);
        setInputValue('tt-shadow-inner2-distance-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.distance);
        setInputValue('tt-shadow-inner2-angle-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.angle);
        setInputValue('tt-shadow-inner2-offset-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.offset);
        setInputValue('tt-shadow-inner2-color-input', s.shadow && s.shadow.inner2 && s.shadow.inner2.color);

        // OUTER SHADOW
        setInputValue('tt-shadow-outer-active-input', s.shadow && s.shadow.outer && s.shadow.outer.active);
        setInputValue('tt-shadow-outer-size-input', s.shadow && s.shadow.outer && s.shadow.outer.size);
        setInputValue('tt-shadow-outer-strength-input', s.shadow && s.shadow.outer && s.shadow.outer.strength);
        setInputValue('tt-shadow-outer-fill-alpha-input', s.shadow && s.shadow.outer && s.shadow.outer.fill && s.shadow.outer.fill.alpha);
        setInputValue('tt-shadow-outer-distance-input', s.shadow && s.shadow.outer && s.shadow.outer.distance);
        setInputValue('tt-shadow-outer-angle-input', s.shadow && s.shadow.outer && s.shadow.outer.angle);
        setInputValue('tt-shadow-outer-mask-input', s.shadow && s.shadow.outer && s.shadow.outer.mask);
        setInputValue('tt-shadow-outer-fill-color-input', s.shadow && s.shadow.outer && s.shadow.outer.fill && s.shadow.outer.fill.color);
        setInputValue('tt-shadow-outer-fill-gradient-active-input', s.shadow && s.shadow.outer && s.shadow.outer.fill && s.shadow.outer.fill.gradient && s.shadow.outer.fill.gradient.active);

        setInputValue('tt-shadow-outer2-active-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.active);
        setInputValue('tt-shadow-outer2-size-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.size);
        setInputValue('tt-shadow-outer2-strength-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.strength);
        setInputValue('tt-shadow-outer2-fill-alpha-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.fill && s.shadow.outer2.fill.alpha);
        setInputValue('tt-shadow-outer2-distance-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.distance);
        setInputValue('tt-shadow-outer2-angle-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.angle);
        setInputValue('tt-shadow-outer2-mask-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.mask);
        setInputValue('tt-shadow-outer2-fill-color-input', s.shadow && s.shadow.outer2 && s.shadow.outer2.fill && s.shadow.outer2.fill.color);

        // ICON
        setInputValue('tt-icon-active-input', s.icon && s.icon.active);
        setInputValue('tt-icon-size-input', s.icon && s.icon.size);
        setInputValue('tt-icon-position-input', s.icon && s.icon.position);
        setInputValue('tt-icon-offset-x-input', s.icon && s.icon.offset && s.icon.offset.x);
        setInputValue('tt-icon-offset-y-input', s.icon && s.icon.offset && s.icon.offset.y);
        setInputValue('tt-icon-rotate-input', s.icon && s.icon.rotate);
        setInputValue('tt-icon-alpha-input', s.icon && s.icon.alpha);
        setInputValue('tt-icon-composite-input', s.icon && s.icon.composite);

        // BACKGROUND
        setInputValue('tt-background-active-input', s.background && s.background.active);
        setInputValue('tt-background-fill-color-input', s.background && s.background.fill && s.background.fill.color);
        setInputValue('tt-background-fill-gradient-active-input', s.background && s.background.fill && s.background.fill.gradient && s.background.fill.gradient.active);
        setInputValue('tt-background-fill-gradient-type-input', s.background && s.background.fill && s.background.fill.gradient && s.background.fill.gradient.type);
        setInputValue('tt-background-fill-gradient-angle-input', s.background && s.background.fill && s.background.fill.gradient && s.background.fill.gradient.angle);
        setInputValue('tt-background-fill-alpha-input', s.background && s.background.fill && s.background.fill.alpha);
        setInputValue('tt-background-fill-image-active-input', s.background && s.background.fill && s.background.fill.image && s.background.fill.image.active);
        setInputValue('tt-background-fill-image-repeat-input', s.background && s.background.fill && s.background.fill.image && s.background.fill.image.repeat);
        setInputValue('tt-background-fill-image-alpha-input', s.background && s.background.fill && s.background.fill.image && s.background.fill.image.alpha);
        setInputValue('tt-background-fill-image-size-custom-input', s.background && s.background.fill && s.background.fill.image && s.background.fill.image.size && s.background.fill.image.size.custom);
        setInputValue('tt-background-composite-input', s.background && s.background.composite);

        // Update range slider fills
        document.querySelectorAll('input[type="range"]').forEach(function(range) {
            updateRangeFill(range);
        });

        // Gradient pickers: mirror the settings colors into the hidden inputs
        // (string format) so the pickers rebuild with the loaded colors.
        const gradientColorTargets = [
            ['tt-depth-fill-gradient-colors-input', s.depth && s.depth.fill && s.depth.fill.gradient],
            ['tt-depth2-fill-gradient-colors-input', s.depth2 && s.depth2.fill && s.depth2.fill.gradient],
            ['tt-outline-first-fill-gradient-colors-input', s.outline && s.outline.first && s.outline.first.fill && s.outline.first.fill.gradient],
            ['tt-outline-second-fill-gradient-colors-input', s.outline && s.outline.second && s.outline.second.fill && s.outline.second.fill.gradient],
            ['tt-outline-global-fill-gradient-colors-input', s.outline && s.outline.global && s.outline.global.fill && s.outline.global.fill.gradient],
            ['tt-shadow-outer-fill-gradient-colors-input', s.shadow && s.shadow.outer && s.shadow.outer.fill && s.shadow.outer.fill.gradient],
            ['tt-background-fill-gradient-colors-input', s.background && s.background.fill && s.background.fill.gradient]
        ];
        gradientColorTargets.forEach(function(entry) {
            const el = document.getElementById(entry[0]);
            if (el) el.value = formatGradientColorsString(entry[1]);
        });

        // Notify other modules (e.g. palette styles editor) that the settings
        // were reloaded from a preset or undo/redo operation.
        document.dispatchEvent(new CustomEvent('textmuy:settings-updated'));
    }

    function updateRangeFill(el) {
        var min = parseFloat(el.min) || 0;
        var max = parseFloat(el.max) || 1;
        var val = parseFloat(el.value) || 0;
        var percent = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(90deg, #4a90d9 ' + percent + '%, #ddd ' + percent + '%)';
    }

    function getSettings() {
        return state.settings;
    }

    function getCanvas() {
        return state.canvas;
    }

    function getCtx() {
        return state.ctx;
    }

    function createDefaultSettings() {
        return JSON.parse(JSON.stringify(defaultSettings));
    }

    // RC39 (001-fix-bugs-01): render a un canvas CON la fuente declarada
    // disponible. Sin esto, exportar el PNG o regenerar una miniatura antes de
    // que la fuente terminara de bajar producia una imagen con la tipografia
    // del sistema: el mismo defecto de US1, pero en el camino de salida.
    //
    // Se mantiene `renderToCanvas` sincrona para los llamantes que ya
    // aseguran la fuente por su cuenta (la ruta de la API espera en
    // ensureFontReady antes de llamar). Quien no lo haga debe usar esta.
    function renderToCanvasConFuente(canvas, settings, options) {
        const ref = (settings && settings.font) ? settings.font.src : null;
        if (!window.FontLoader || !window.FontLoader.loadFont || ref === undefined || ref === null) {
            renderToCanvas(canvas, settings, options);
            return Promise.resolve(canvas);
        }
        return Promise.resolve().then(function () {
            return window.FontLoader.loadFont(ref);
        }).then(function () {
            renderToCanvas(canvas, settings, options);
            return canvas;
        }).catch(function (e) {
            // Sin sustitucion: la imagen no se produce con otra tipografia. Se
            // lanza con la causa para que el llamador la muestre (FR-005).
            const err = new Error('export:fuente no disponible: ' + ((e && e.message) || e));
            err.cause = e;
            throw err;
        });
    }

    // Render to any canvas without mutating the editor UI.  This is shared by
    // PNG download and the public API, so both outputs have the requested size
    // and a genuinely transparent background.
    function renderToCanvas(canvas, settings, options) {
        const previous = {
            canvas: state.canvas, ctx: state.ctx, settings: state.settings,
            isRendering: state.isRendering,
            transparentOutput: state.transparentOutput,
            headlessRender: state.headlessRender
        };
        try {
            state.canvas = canvas;
            state.ctx = canvas.getContext('2d');
            state.settings = settings;
            state.isRendering = false;
            state.transparentOutput = Boolean(options && options.transparent);
            // 002-text-tab US1: este es el render de salida. La curva no puede
            // degradar al fallback 2D aqui (R-C2.1).
            state.headlessRender = true;
            
            // For export, use 100% zoom (1x) — independent of the visual zoom
            // so the exported PNG always has the base resolution.
            const originalZoom = state.settings.canvas.zoom;
            state.settings.canvas.zoom = 100;
            
            render();
            
            // Restore original zoom
            state.settings.canvas.zoom = originalZoom;
        } finally {
            state.canvas = previous.canvas;
            state.ctx = previous.ctx;
            state.settings = previous.settings;
            state.isRendering = previous.isRendering;
            state.transparentOutput = previous.transparentOutput;
            state.headlessRender = previous.headlessRender;
        }
        return canvas;
    }

    // Export the module
    window.TextEditor = {
        init: init,
        render: render,
        updateSettings: updateSettings,
        loadPreset: loadPreset,
        // RC39: la garantia de la fuente declarada. La usa el editor, la
        // galeria y el motor para pintar solo cuando la fuente esta lista.
        asegurarFuenteDeclarada: asegurarFuenteDeclarada,
        fuenteDeclarada: fuenteDeclarada,
        renderConFuente: renderConFuente,
        // Previsualizacion temporal de la galeria de fuentes (US2).
        aplicarFuentePrevia: aplicarFuentePrevia,
        revertirFuentePrevia: revertirFuentePrevia,
        confirmarFuentePrevia: confirmarFuentePrevia,
        familiaDeFuente: familiaDeFuente,
        aplicarFuente: aplicarFuente,
        avisoFuente: function () { return avisoFuente; },
        createDefaultSettings: createDefaultSettings,
        renderToCanvas: renderToCanvas,
        renderToCanvasConFuente: renderToCanvasConFuente,
        getSettings: getSettings,
        getLineTarget: getLineTarget,
        setLineTarget: setLineTarget,
        setTargetedSetting: setTargetedSetting,
        getEffectiveSetting: getEffectiveSetting,
        resolveLineSettings: resolveLineSettings,
        OPTION_REGISTRY: OPTION_REGISTRY,
        updateUIFromLineTarget: updateUIFromLineTarget,
        getLineSizing: getLineSizing,
        setLineInherit: setLineInherit,
        setLineSizing: setLineSizing,

        ensureFillIds: ensureFillIds,
        getCanvas: getCanvas,
        getCtx: getCtx,
        getFillLayers: getFillLayers,
        clearTextureCache: clearTextureCache,
        getTextBlockBox: getTextBlockBox,
    // 002-text-tab: geometria unica expuesta para las suites (area util y
    // modelo de bloque). El ajuste y el dibujado usan estos mismos helpers.
    areaUtil: areaUtil,
    blockLayout: blockLayout,
    // 002-text-tab US6: modelo de lineas (resolucion, ciclos, alcance).
    resolveLine: resolveLine,
    detectarCiclos: detectarCiclos,
    opcionesValidas: opcionesValidas,
    fuentesPorLinea: fuentesPorLinea,
    getLineFontPx: function () { return state.lineFontPx; },
    getCanvas: getCanvas,
    isGlobalPath: isGlobalPath,
    MAX_LINE: MAX_LINE,
    lineFontSizes: lineFontSizes,
        flagWaveAt: flagWaveAt,
        flagWaveSlopes: flagWaveSlopes
    };

})();
