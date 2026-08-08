/* ===== TEXTSTUDIO EDITOR - Canvas Rendering Engine ===== */

(function() {
    'use strict';

    // Default settings matching TextStudio's preset structure
    // Conceptual order: TEXT → 3D & FILLING → OUTLINES → SHADOWS → ICON → BACKGROUND → ANIMATION → DOWNLOAD
    const defaultSettings = {
        editable: 1,
        // ===== TEXT =====
        text: 'TEXT',
        font: {
            src: 'Bangers',
            size: 76,
            weight: 'normal',
            name: '',
        },
        align: 'right',
        rotate: 0,
        lineHeight: 1,
        letterSpacing: 0,
        distort: { arc: { angle: 0 } },
        mergeGradients: false,

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
            boggle: { active: false, angle: 12, amplitude: 0.1 },
            reverseOverlap: { letters: 1, lines: 0 },
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
        // Bevel structure matching TextStudio
        bevel: {
            inner: {
                active: false,
                size: 0.1,
                smoothing: 0,
                soften: 0.1,
                angle: 135,
                highlight: { alpha: 1, blendmode: 'over', color: { r: 255, g: 255, b: 255 } },
                shadow: { alpha: 1, blendmode: 'over', color: { r: 0, g: 0, b: 0 } }
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
            width: 240,
            height: 600,
            ratio: 2.5,
            autoFit: false,
            zoom: 64,
            padding: 0.05
        },

        // ===== PROCESSING =====
        processing: {
            active: false,
            code: null
        }
    };

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
        textureImages: {} // Store loaded texture images by src
    };

    // Initialize the editor
    function init(canvasId) {
        state.canvas = document.getElementById(canvasId);
        if (!state.canvas) {
            console.error('Canvas element not found:', canvasId);
            return;
        }
        state.ctx = state.canvas.getContext('2d');
        state.ctx.textBaseline = 'middle';
        state.ctx.textAlign = 'center';

        const textarea = document.getElementById('tt-text-textarea');
        if (textarea) {
            textarea.value = state.settings.text;
        }

        // Preload custom fonts
        if (window.FontLoader) {
            FontLoader.preloadAll();
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

    // ===== PER-CHARACTER METRICS SYSTEM =====
    
    /**
     * CharacterMetrics - Stores detailed metrics for a single character
     * This enables per-character effects and transformations
     */
    class CharacterMetrics {
        constructor(char, index, lineIndex) {
            this.char = char;
            this.index = index;
            this.lineIndex = lineIndex;
            
            // Position (relative to line origin)
            this.x = 0;
            this.y = 0;
            
            // Dimensions
            this.width = 0;
            this.height = 0;
            
            // Canvas text metrics (actualBoundingBox)
            this.actualBoundingBoxLeft = 0;
            this.actualBoundingBoxRight = 0;
            this.actualBoundingBoxAscent = 0;
            this.actualBoundingBoxDescent = 0;
            
            // Transformations
            this.transform = {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1
            };
        }
    }

    /**
     * TextLayout - Stores layout information for all text
     * Organized by lines, with per-character metrics
     */
    class TextLayout {
        constructor() {
            this.lines = []; // Array of CharacterMetrics[][]
            this.totalWidth = 0;
            this.totalHeight = 0;
            this.baseline = 0;
            this.fontSize = 0;
        }
    }

    /**
     * Calculate detailed text layout with per-character metrics
     * This is the foundation for per-character effects
     */
    function calculateTextLayout(ctx, text, settings) {
        const layout = new TextLayout();
        const s = settings;
        
        // Split text into lines
        const lines = text.split('\n');
        const fontSizePx = s.font.size;
        layout.fontSize = fontSizePx;
        
        // Set font for measurements
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font.src || s.font) : (s.font.src || s.font);
        const fontWeight = s.font.weight || 'normal';
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;
        
        // Calculate metrics for each character in each line
        const letterSpacing = s.letterSpacing || 0;
        const spacingPx = letterSpacing * fontSizePx * 0.1;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const charMetrics = [];
            let currentX = 0;
            
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const metrics = new CharacterMetrics(char, charIndex, lineIndex);
                
                // Measure character
                const measure = ctx.measureText(char);
                metrics.width = measure.width;
                metrics.actualBoundingBoxLeft = measure.actualBoundingBoxLeft || 0;
                metrics.actualBoundingBoxRight = measure.actualBoundingBoxRight || 0;
                metrics.actualBoundingBoxAscent = measure.actualBoundingBoxAscent || fontSizePx * 0.8;
                metrics.actualBoundingBoxDescent = measure.actualBoundingBoxDescent || fontSizePx * 0.2;
                metrics.height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                
                // Position character
                metrics.x = currentX;
                metrics.y = 0; // Will be adjusted for line alignment
                
                currentX += metrics.width + spacingPx;
                
                charMetrics.push(metrics);
            }
            
            layout.lines.push(charMetrics);
        }
        
        // Calculate total dimensions
        let maxWidth = 0;
        for (const line of layout.lines) {
            if (line.length > 0) {
                const lastChar = line[line.length - 1];
                const lineWidth = lastChar.x + lastChar.width;
                maxWidth = Math.max(maxWidth, lineWidth);
            }
        }
        layout.totalWidth = maxWidth;
        
        const lineHeightPx = fontSizePx * (s.lineHeight || 1);
        layout.totalHeight = lines.length * lineHeightPx;
        layout.baseline = fontSizePx * 0.5; // Middle baseline
        
        return layout;
    }

    // ===== PALETTE PER-LETTER SYSTEM =====
    
    /**
     * Apply palette styles to characters based on method
     * Methods: 'letter' (cycle per character), 'word' (cycle per word), 'line' (cycle per line)
     */
    function applyPaletteToLayout(layout, paletteConfig) {
        if (!paletteConfig || !paletteConfig.active || !paletteConfig.styles || paletteConfig.styles.length === 0) {
            return layout;
        }
        
        const method = paletteConfig.lettering?.method || 'letter';
        const styles = paletteConfig.styles;
        
        for (let lineIndex = 0; lineIndex < layout.lines.length; lineIndex++) {
            const line = layout.lines[lineIndex];
            
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const charMetrics = line[charIndex];
                
                // Determine style index based on method
                let styleIndex;
                if (method === 'letter') {
                    styleIndex = charIndex % styles.length;
                } else if (method === 'word') {
                    // Simple word detection (space-separated)
                    const charBefore = charIndex > 0 ? line[charIndex - 1].char : '';
                    const isWordStart = charBefore === ' ' || charBefore === '';
                    const wordIndex = line.slice(0, charIndex).filter(c => c.char === ' ').length;
                    styleIndex = wordIndex % styles.length;
                } else if (method === 'line') {
                    styleIndex = lineIndex % styles.length;
                } else {
                    styleIndex = charIndex % styles.length;
                }
                
                // Apply style to character
                const style = styles[styleIndex];
                if (style) {
                    charMetrics.paletteStyle = style;
                }
            }
        }
        
        return layout;
    }

    /**
     * Get color for a character considering palette
     * Returns RGB object {r, g, b}
     */
    function getCharacterColor(charMetrics, baseColor, paletteConfig) {
        if (!paletteConfig || !paletteConfig.active || !charMetrics.paletteStyle) {
            return baseColor;
        }
        
        const style = charMetrics.paletteStyle;
        if (style.color) {
            return style.color;
        }
        
        return baseColor;
    }

    /**
     * Get gradient for a character considering palette
     */
    function getCharacterGradient(charMetrics, baseGradient, paletteConfig) {
        if (!paletteConfig || !paletteConfig.active || !charMetrics.paletteStyle) {
            return baseGradient;
        }
        
        const style = charMetrics.paletteStyle;
        if (style.gradient) {
            return style.gradient;
        }
        
        return baseGradient;
    }

    // ===== LETTERING EFFECTS SYSTEM =====
    
    /**
     * Apply boggle effect - random rotation and offset per character
     */
    function applyBoggleEffect(layout, boggleConfig) {
        if (!boggleConfig || !boggleConfig.active) {
            return layout;
        }
        
        const angle = boggleConfig.angle || 12;
        const amplitude = boggleConfig.amplitude || 0.1;
        const angleRad = angle * Math.PI / 180;
        
        for (const line of layout.lines) {
            for (const charMetrics of line) {
                // Random rotation within angle range
                const randomAngle = (Math.random() - 0.5) * 2 * angleRad;
                charMetrics.transform.rotation = randomAngle;
                
                // Random offset within amplitude
                const offsetX = (Math.random() - 0.5) * 2 * amplitude * layout.fontSize;
                const offsetY = (Math.random() - 0.5) * 2 * amplitude * layout.fontSize;
                charMetrics.transform.x = offsetX;
                charMetrics.transform.y = offsetY;
            }
        }
        
        return layout;
    }

    /**
     * Apply reverse overlap effect - overlap letters in reverse order
     * This creates a stacked/overlapping effect
     */
    function applyReverseOverlapEffect(layout, reverseOverlapConfig) {
        if (!reverseOverlapConfig) {
            return layout;
        }
        
        const overlapLetters = reverseOverlapConfig.letters || 0;
        const overlapLines = reverseOverlapConfig.lines || 0;
        
        if (overlapLetters > 0) {
            for (const line of layout.lines) {
                // Reverse order for overlap effect
                for (let i = line.length - 1; i > 0; i--) {
                    const charMetrics = line[i];
                    const prevChar = line[i - 1];
                    
                    // Overlap with previous character
                    const overlapAmount = charMetrics.width * 0.3; // 30% overlap
                    charMetrics.transform.x = -overlapAmount * (line.length - i) * 0.1;
                }
            }
        }
        
        if (overlapLines > 0) {
            // Overlap lines vertically
            for (let i = 1; i < layout.lines.length; i++) {
                const line = layout.lines[i];
                const lineHeightPx = layout.fontSize * 1.2; // Approximate line height
                
                for (const charMetrics of line) {
                    charMetrics.transform.y = -lineHeightPx * 0.2 * i; // 20% overlap per line
                }
            }
        }
        
        return layout;
    }

    /**
     * Apply lettering shadow effect - individual shadow per character
     */
    function applyLetteringShadowEffect(layout, letteringShadowConfig) {
        if (!letteringShadowConfig || !letteringShadowConfig.active) {
            return layout;
        }
        
        const size = letteringShadowConfig.size || 0.04;
        const distance = letteringShadowConfig.distance || 0.02;
        const angle = (letteringShadowConfig.angle || 180) * Math.PI / 180;
        
        const shadowOffsetX = Math.cos(angle) * distance * layout.fontSize;
        const shadowOffsetY = Math.sin(angle) * distance * layout.fontSize;
        
        for (const line of layout.lines) {
            for (const charMetrics of line) {
                charMetrics.letteringShadow = {
                    offsetX: shadowOffsetX,
                    offsetY: shadowOffsetY,
                    size: size * layout.fontSize,
                    fill: letteringShadowConfig.fill
                };
            }
        }
        
        return layout;
    }

    /**
     * Apply all lettering effects to layout
     */
    function applyLetteringEffects(layout, letteringConfig) {
        if (!letteringConfig || !letteringConfig.active) {
            return layout;
        }
        
        // Apply boggle effect
        if (letteringConfig.boggle && letteringConfig.boggle.active) {
            applyBoggleEffect(layout, letteringConfig.boggle);
        }
        
        // Apply reverse overlap effect
        if (letteringConfig.reverseOverlap) {
            applyReverseOverlapEffect(layout, letteringConfig.reverseOverlap);
        }
        
        // Apply lettering shadow effect
        if (letteringConfig.shadow && letteringConfig.shadow.active) {
            applyLetteringShadowEffect(layout, letteringConfig.shadow);
        }
        
        return layout;
    }

    // Calculate dynamic canvas size based on zoom and canvas settings
    function calculateDynamicCanvasSize(ctx, text, s) {
        const lines = text.split('\n');
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font.src || s.font) : (s.font.src || s.font);
        const fontWeight = s.font.weight || 'normal';
        
        // Get viewport width (wrapper width)
        const wrapper = document.getElementById('tt-canvas-wrapper');
        const viewportWidth = wrapper ? wrapper.clientWidth : 900;
        const viewportHeight = wrapper ? wrapper.clientHeight : 600;
        
        // Ensure minimum viewport dimensions
        const safeViewportWidth = Math.max(viewportWidth, 300);
        const safeViewportHeight = Math.max(viewportHeight, 200);
        
        // Get base canvas size from settings
        const baseCanvasWidth = s.canvas.width || 240;
        const baseCanvasHeight = s.canvas.height || 600;
        
        // Calculate zoom factor from canvas.zoom (12-140 range)
        const zoomValue = s.canvas.zoom || 64;
        
        // Calculate canvas dimensions based on zoom
        let canvasWidth, canvasHeight;
        
        if (zoomValue === 64) {
            // Zoom 64 = 100% of base canvas size
            canvasWidth = baseCanvasWidth;
            canvasHeight = baseCanvasHeight;
        } else if (zoomValue >= 64) {
            // Zoom 64-140: Scale from base size to 100% of wrapper
            const zoomProgress = (zoomValue - 64) / (140 - 64); // 0 to 1
            const targetWidth = safeViewportWidth;
            const targetHeight = safeViewportHeight * (baseCanvasHeight / baseCanvasWidth);
            
            canvasWidth = baseCanvasWidth + (targetWidth - baseCanvasWidth) * zoomProgress;
            canvasHeight = baseCanvasHeight + (targetHeight - baseCanvasHeight) * zoomProgress;
        } else {
            // Zoom 12-64: Scale from minimum to base size
            const zoomProgress = (zoomValue - 12) / (64 - 12); // 0 to 1
            
            // Calculate minimum size (10% of wrapper or 50% of base canvas)
            const minFromWrapper = safeViewportWidth * 0.1;
            const minFromCanvas = baseCanvasWidth * 0.5;
            const minWidth = Math.min(minFromWrapper, minFromCanvas);
            const minHeight = minWidth * (baseCanvasHeight / baseCanvasWidth);
            
            canvasWidth = minWidth + (baseCanvasWidth - minWidth) * zoomProgress;
            canvasHeight = minHeight + (baseCanvasHeight - minHeight) * zoomProgress;
        }
        
        // Ensure minimum dimensions
        canvasWidth = Math.max(canvasWidth, 100);
        canvasHeight = Math.max(canvasHeight, 50);
        
        // Calculate font size (default 24px, scales proportionally with zoom)
        const baseFontSize = 24;
        const fontSizeScale = canvasWidth / baseCanvasWidth;
        let fontSizePx = baseFontSize * fontSizeScale;
        
        // Ensure minimum font size for legibility
        fontSizePx = Math.max(fontSizePx, 12);
        
        // Refine font size to ensure text fills canvas (with padding)
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;
        
        let maxLineWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            const w = measureTextWidth(ctx, lines[i], s.letterSpacing, fontSizePx);
            if (w > maxLineWidth) maxLineWidth = w;
        }
        
        const textHeight = fontSizePx * s.lineHeight * lines.length;
        const extraW = calcExtraWidth(s, fontSizePx);
        const extraH = calcExtraHeight(s, fontSizePx);
        
        // Calculate total content dimensions
        const contentWidth = maxLineWidth + extraW;
        const contentHeight = textHeight + extraH;
        
        // Adjust font size to fill canvas width (with padding)
        const padding = canvasWidth * (s.canvas.padding || 0.05);
        const availableWidth = canvasWidth - padding * 2;
        
        if (contentWidth > availableWidth && contentWidth > 0) {
            fontSizePx = fontSizePx * (availableWidth / contentWidth);
            fontSizePx = Math.max(fontSizePx, 12);
        }
        
        // Recalculate with adjusted font size
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;
        maxLineWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            const w = measureTextWidth(ctx, lines[i], s.letterSpacing, fontSizePx);
            if (w > maxLineWidth) maxLineWidth = w;
        }
        
        const adjustedTextHeight = fontSizePx * s.lineHeight * lines.length;
        const adjustedExtraW = calcExtraWidth(s, fontSizePx);
        const adjustedExtraH = calcExtraHeight(s, fontSizePx);
        
        const finalContentWidth = maxLineWidth + adjustedExtraW;
        const finalContentHeight = adjustedTextHeight + adjustedExtraH;
        
        // Calculate final canvas dimensions
        const finalCanvasWidth = Math.max(finalContentWidth + padding * 2, canvasWidth);
        const finalCanvasHeight = Math.max(finalContentHeight + padding * 2, canvasHeight);
        
        return { width: finalCanvasWidth, height: finalCanvasHeight, fontSize: fontSizePx };
    }

    // Auto-fit: find the largest font size that fits within the canvas
    function autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s) {
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font.src || s.font) : (s.font.src || s.font);
        const fontWeight = s.font.weight || 'normal';
        const padding = canvasWidth * (s.canvas.padding || 0.05);
        const availW = canvasWidth - padding * 2;
        const availH = canvasHeight - padding * 2;

        let lo = 8;
        let hi = 400;
        let best = 8;

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            ctx.font = `${fontWeight} ${mid}px ${fontName}`;

            // Find the widest line
            let maxLineWidth = 0;
            for (let i = 0; i < lines.length; i++) {
                const w = measureTextWidth(ctx, lines[i], s.letterSpacing, mid);
                if (w > maxLineWidth) maxLineWidth = w;
            }

            const textHeight = mid * s.lineHeight * lines.length;
            const extraW = calcExtraWidth(s, mid);
            const extraH = calcExtraHeight(s, mid);

            if (maxLineWidth + extraW <= availW && textHeight + extraH <= availH) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        return best;
    }

    // Main render function
    function render() {
        if (state.isRendering || !state.ctx) return;
        state.isRendering = true;

        const ctx = state.ctx;
        const s = state.settings;

        const text = s.text || 'TEXT';

        // Calculate dynamic canvas size based on content and viewport
        const dynamicSize = calculateDynamicCanvasSize(ctx, text, s);
        const canvasWidth = dynamicSize.width;
        const canvasHeight = dynamicSize.height;
        const calculatedFontSize = dynamicSize.fontSize;

        state.canvas.width = canvasWidth;
        state.canvas.height = canvasHeight;

        // Set canvas display size (no scaling, actual size)
        state.canvas.style.width = canvasWidth + 'px';
        state.canvas.style.height = canvasHeight + 'px';

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background
        drawBackground(ctx, canvasWidth, canvasHeight);

        const lines = text.split('\n');

        // Use the dynamically calculated font size
        let fontSizePx = calculatedFontSize;

        // Load custom font if needed
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font.src || s.font) : (s.font.src || s.font);
        const fontWeight = s.font.weight || 'normal';
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;

        // ===== PER-CHARACTER LAYOUT SYSTEM =====
        // Calculate detailed text layout with per-character metrics
        const layout = calculateTextLayout(ctx, text, s);
        
        // Apply palette effects if active
        if (s.fill.palette && s.fill.palette.active) {
            applyPaletteToLayout(layout, s.fill.palette);
        }
        if (s.outline.first.fill.palette && s.outline.first.fill.palette.active) {
            applyPaletteToLayout(layout, s.outline.first.fill.palette);
        }
        if (s.outline.second.fill.palette && s.outline.second.fill.palette.active) {
            applyPaletteToLayout(layout, s.outline.second.fill.palette);
        }
        
        // Apply lettering effects if active
        if (s.lettering && s.lettering.active) {
            applyLetteringEffects(layout, s.lettering);
        }
        
        // Store layout in state for use in render functions
        state.layout = layout;
        
        // Calculate dimensions from layout
        const maxLineWidth = layout.totalWidth;
        const lineSpacing = fontSizePx * Math.max(0, s.lineHeight - 1);
        const totalHeight = layout.totalHeight;
        
        // Centro del texto total (bounding box completo)
        const textCenterX = maxLineWidth / 2;
        const textCenterY = totalHeight / 2;

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Load icon image if needed
        if (isActive(s, 'icon') && safeGet(s, 'icon.src')) {
            loadIconImage(s.icon.src);
        }

        // Load texture images if needed
        if (isActive(s, 'fill.texture') && safeGet(s, 'fill.texture.src')) {
            loadTextureImage(s.fill.texture.src);
        }
        if (isActive(s, 'outline.texture') && safeGet(s, 'outline.texture.src')) {
            loadTextureImage(s.outline.texture.src);
        }

        // Draw text effects in order
        ctx.save();
        
        // Rotación siguiendo el patrón de TextStudio:
        // 1. Translate al centro del canvas
        // 2. Rotar
        // 3. No translate de vuelta (el texto se dibuja en coordenadas relativas al centro)
        ctx.translate(centerX, centerY);
        ctx.rotate((s.rotate * Math.PI) / 180);

        // Render order matching TextStudio pipeline
        // 1. Outer shadow 2 (TextStudio: shadow.outer2)
        if (isActive(s, 'shadow.outer2') || isActive(s, 'shadowOuter2')) {
            drawOuterShadow2(ctx, text, lines, fontSizePx, s);
        }

        // 2. Outer shadow (TextStudio: shadow.outer)
        if (isActive(s, 'shadow.outer') || isActive(s, 'shadowOuter')) {
            drawOuterShadow(ctx, text, lines, fontSizePx, s);
        }

        // 3. 3D depth 2
        if (isActive(s, 'depth2')) {
            drawDepth2(ctx, text, lines, fontSizePx, s);
        }

        // 4. 3D depth
        if (isActive(s, 'depth')) {
            drawDepth(ctx, text, lines, fontSizePx, s);
        }

        // 5. Fill
        if (isActive(s, 'fill')) {
            drawFill(ctx, text, lines, fontSizePx, s);
        }

        // 6. Outline second (TextStudio: outline.second)
        if (isActive(s, 'outline.second') || isActive(s, 'outline2')) {
            drawOutline2(ctx, text, lines, fontSizePx, s);
        }

        // 7. Outline first (TextStudio: outline.first)
        if (isActive(s, 'outline.first') || isActive(s, 'outline')) {
            drawOutline(ctx, text, lines, fontSizePx, s);
        }

        // 8. Outline global (TextStudio: outline.global)
        if (isActive(s, 'outline.global')) {
            drawOutlineGlobal(ctx, text, lines, fontSizePx, s);
        }

        // 9. Bevel inner (TextStudio: bevel.inner)
        if (isActive(s, 'bevel.inner') || isActive(s, 'bevel')) {
            drawBevel(ctx, text, lines, fontSizePx, s);
        }

        // 10. Inner shadow 2 (TextStudio: shadow.inner2)
        if (isActive(s, 'shadow.inner2') || isActive(s, 'shadowInner2')) {
            drawInnerShadow2(ctx, text, lines, fontSizePx, s);
        }

        // 11. Inner shadow (TextStudio: shadow.inner)
        if (isActive(s, 'shadow.inner') || isActive(s, 'shadowInner')) {
            drawInnerShadow(ctx, text, lines, fontSizePx, s);
        }

        // 12. Icon
        if (isActive(s, 'icon') && state.iconImg) {
            drawIcon(ctx, text, lines, fontSizePx, s);
        }

        ctx.restore();

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

    // Load texture image
    function loadTextureImage(src, callback) {
        if (!src) {
            if (callback) callback(null);
            return;
        }
        if (state.textureImages[src]) {
            if (callback) callback(state.textureImages[src]);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            state.textureImages[src] = img;
            if (callback) callback(img);
        };
        img.onerror = function() {
            state.textureImages[src] = null;
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

        if (bgImage && bgImage.active && bgImage.src) {
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

    // Draw outer shadow
    function drawOuterShadow(ctx, text, lines, fontSizePx, s) {
        // Support both legacy structure and new TextStudio structure
        const shadowConfig = s.shadow.outer || s.shadowOuter;
        const distance = (shadowConfig.distance || 0.1) * fontSizePx;
        const angle = (shadowConfig.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const blur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const alpha = safeGet(shadowConfig, 'fill.alpha', 1);
        const color = shadowConfig.fill?.color || shadowConfig.color || '#000000';

        ctx.save();
        ctx.shadowColor = getColorValue(color, alpha);
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.shadowBlur = blur;

        ctx.fillStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);

        ctx.restore();
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
            drawTextLines(ctx, text, lines, fontSizePx, s);
            
            ctx.translate(-layerOffsetX, -layerOffsetY);
        }
        
        ctx.restore();
    }

    // Draw text fill
    function drawFill(ctx, text, lines, fontSizePx, s) {
        const alpha = safeGet(s, 'fill.alpha', 1);

        // Check if palette is active (per-letter coloring)
        if (isActive(s, 'fill.palette') && safeGet(s, 'fill.palette.styles') && s.fill.palette.styles.length > 0) {
            drawTextWithPalette(ctx, text, lines, fontSizePx, s, alpha);
            return;
        }

        // Check if texture is active
        if (isActive(s, 'fill.texture') && safeGet(s, 'fill.texture.src')) {
            const textureImg = state.textureImages[s.fill.texture.src];
            if (textureImg) {
                ctx.save();
                if (s.fill.texture.blendmode) {
                    ctx.globalCompositeOperation = s.fill.texture.blendmode;
                }
                const pattern = ctx.createPattern(textureImg, s.fill.texture.repeat || 'repeat');
                ctx.globalAlpha = alpha * s.fill.texture.alpha;
                ctx.fillStyle = pattern;
                ctx.strokeStyle = 'transparent';
                drawTextLines(ctx, text, lines, fontSizePx, s);
                ctx.restore();
                return;
            }
        }

        ctx.save();
        if (isActive(s, 'fill.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.fill.gradient, s);
            ctx.fillStyle = gradient;
        } else {
            const color = s.fill.color || { r: 255, g: 255, b: 255 };
            ctx.fillStyle = getColorValue(color, alpha);
        }

        ctx.strokeStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);
        ctx.restore();
    }

    // Draw text outline
    function drawOutline(ctx, text, lines, fontSizePx, s) {
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
                drawTextLines(ctx, text, lines, fontSizePx, s, true);
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

        drawTextLines(ctx, text, lines, fontSizePx, s, true);
        ctx.restore();
    }

    // Draw global outline (TextStudio: outline.global)
    // This renders an outline around the entire text block, not per-character
    function drawOutlineGlobal(ctx, text, lines, fontSizePx, s) {
        // Placeholder for global outline implementation
        // This requires rendering the entire text as a single path
        // For now, skip to avoid errors
        console.log('drawOutlineGlobal called - not yet implemented');
    }

    // Draw inner shadow
    function drawInnerShadow(ctx, text, lines, fontSizePx, s) {
        // Support both legacy structure and new TextStudio structure
        const shadowConfig = s.shadow.inner || s.shadowInner;
        const distance = (shadowConfig.distance || 0.03) * fontSizePx;
        const angle = (shadowConfig.angle || -45) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const offset = (shadowConfig.offset || 0) * fontSizePx;
        const blur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const alpha = shadowConfig.alpha || 1;
        const color = shadowConfig.color || '#000000';

        const canvas = state.canvas;
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        offCtx.font = ctx.font;
        offCtx.textBaseline = 'middle';
        offCtx.textAlign = 'center';
        offCtx.translate(offscreen.width / 2, offscreen.height / 2);
        offCtx.fillStyle = getColorValue(color, alpha);
        offCtx.shadowColor = getColorValue(color, alpha);
        offCtx.shadowOffsetX = offsetX + offset;
        offCtx.shadowOffsetY = offsetY + offset;
        offCtx.shadowBlur = blur;

        offCtx.save();
        drawTextLines(offCtx, text, lines, fontSizePx, s);
        offCtx.restore();

        ctx.save();
        const blendmode = shadowConfig.blendmode || 'source-atop';
        ctx.globalCompositeOperation = blendmode;
        ctx.drawImage(offscreen, -canvas.width / 2, -canvas.height / 2);
        ctx.restore();
    }

    // Draw icon
    function drawIcon(ctx, text, lines, fontSizePx, s) {
        if (!state.iconImg) return;

        const icon = state.iconImg;
        const iconSize = fontSizePx * 0.5 * s.icon.size;
        const offsetX = s.icon.offset.x * fontSizePx;
        const offsetY = s.icon.offset.y * fontSizePx;

        const metrics = ctx.measureText(text.replace(/\n/g, ' '));
        const textWidth = metrics.width;
        const textHeight = fontSizePx * 1.3 * lines.length;

        let x, y;
        if (s.icon.position === 'right') {
            x = textWidth / 2 + iconSize / 2 + fontSizePx * 0.15 + offsetX;
        } else if (s.icon.position === 'center') {
            x = offsetX;
        } else {
            x = -textWidth / 2 - iconSize / 2 - fontSizePx * 0.15 + offsetX;
        }
        y = -iconSize * 0.2 + offsetY;

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
            drawTextLines(ctx, text, lines, fontSizePx, s);
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

        drawTextLines(ctx, text, lines, fontSizePx, s, true);
        ctx.restore();
    }

    // Draw outer shadow 2
    function drawOuterShadow2(ctx, text, lines, fontSizePx, s) {
        // Support both legacy structure and new TextStudio structure
        const shadowConfig = s.shadow.outer2 || s.shadowOuter2;
        const distance = (shadowConfig.distance || 0.1) * fontSizePx;
        const angle = (shadowConfig.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const blur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const alpha = safeGet(shadowConfig, 'fill.alpha', 1);
        const color = shadowConfig.fill?.color || shadowConfig.color || '#000000';

        ctx.save();
        ctx.shadowColor = getColorValue(color, alpha);
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.shadowBlur = blur;

        ctx.fillStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);

        ctx.restore();
    }

    // Draw inner shadow 2
    function drawInnerShadow2(ctx, text, lines, fontSizePx, s) {
        // Support both legacy structure and new TextStudio structure
        const shadowConfig = s.shadow.inner2 || s.shadowInner2;
        const distance = (shadowConfig.distance || 0.03) * fontSizePx;
        const angle = (shadowConfig.angle || 135) * Math.PI / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const offset = (shadowConfig.offset || 0) * fontSizePx;
        const blur = (shadowConfig.size || 0.2) * fontSizePx * 2;
        const alpha = shadowConfig.alpha || 1;
        const color = shadowConfig.color || '#000000';

        const canvas = state.canvas;
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        offCtx.font = ctx.font;
        offCtx.textBaseline = 'middle';
        offCtx.textAlign = 'center';
        offCtx.translate(offscreen.width / 2, offscreen.height / 2);
        offCtx.fillStyle = getColorValue(color, alpha);
        offCtx.shadowColor = getColorValue(color, alpha);
        offCtx.shadowOffsetX = offsetX + offset;
        offCtx.shadowOffsetY = offsetY + offset;
        offCtx.shadowBlur = blur;

        offCtx.save();
        drawTextLines(offCtx, text, lines, fontSizePx, s);
        offCtx.restore();

        ctx.save();
        const blendmode = shadowConfig.blendmode || 'source-atop';
        ctx.globalCompositeOperation = blendmode;
        ctx.drawImage(offscreen, -canvas.width / 2, -canvas.height / 2);
        ctx.restore();
    }

    // Draw bevel effect
    function drawBevel(ctx, text, lines, fontSizePx, s) {
        const size = s.bevel.size * fontSizePx;
        const angle = s.bevel.angle;
        const smoothing = s.bevel.smoothing || s.bevel.soften || 0.1;
        const soften = s.bevel.soften || 0.1;

        const highlightColor = hexToRgba(s.bevel.highlight.color, s.bevel.highlight.alpha);
        const shadowColor = hexToRgba(s.bevel.shadow.color, s.bevel.shadow.alpha);

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
            tempCtx.textBaseline = 'middle';
            tempCtx.textAlign = 'center';
            tempCtx.fillStyle = '#ffffff';
            tempCtx.strokeStyle = '#ffffff';
            tempCtx.lineWidth = size;
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
            drawTextLines(tempCtx, text, lines, fontSizePx, s, true);
            tempCtx.restore();

            // Apply WebGL bevel
            const bevelCanvas = state.bevelEngine.apply(tempCanvas, {
                bevelSize: size / fontSizePx,
                bevelAngle: angle,
                lightColor: [
                    parseInt(s.bevel.highlight.color.slice(1,3), 16) / 255,
                    parseInt(s.bevel.highlight.color.slice(3,5), 16) / 255,
                    parseInt(s.bevel.highlight.color.slice(5,7), 16) / 255
                ],
                shadowColor: [
                    parseInt(s.bevel.shadow.color.slice(1,3), 16) / 255,
                    parseInt(s.bevel.shadow.color.slice(3,5), 16) / 255,
                    parseInt(s.bevel.shadow.color.slice(5,7), 16) / 255
                ],
                highlightIntensity: s.bevel.highlight.alpha,
                shadowIntensity: s.bevel.shadow.alpha,
                softness: soften
            });

            if (bevelCanvas) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(bevelCanvas, 0, 0);
                ctx.restore();
                return;
            }
        }

        // Fallback: Simple bevel simulation using offset strokes
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

            if (specularCanvas) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(specularCanvas, 0, 0);
                ctx.restore();
            }
        }
    }

    // Apply distort/arc effect (TextStudio-style curve with per-character positioning)
    function applyDistort(ctx, text, fontSizePx, settings) {
        // Initialize distort engine if available
        if (typeof DistortEngine !== 'undefined' && !state.distortEngine) {
            state.distortEngine = new DistortEngine();
        }

        const distortSettings = settings.distort || {};
        const arcAngle = distortSettings.arc ? distortSettings.arc.angle : 0;
        const amplitude = distortSettings.arc ? distortSettings.arc.amplitude : 0;
        const type = distortSettings.arc ? distortSettings.arc.type : 'arc';

        // Try DistortEngine if available and distortion is active
        if (state.distortEngine && (Math.abs(arcAngle) > 0 || Math.abs(amplitude) > 0.01)) {
            const applied = state.distortEngine.applyDistort(ctx, text, fontSizePx, {
                angle: arcAngle,
                amplitude: amplitude,
                type: type
            });
            if (applied) return;
        }

        // Fallback: Simple transformation matrix for arc effect
        const angleRad = (arcAngle * Math.PI) / 180;
        
        if (Math.abs(arcAngle) > 0) {
            // Calculate radius based on text width and arc angle
            const radius = fontSizePx * 3 / Math.abs(angleRad);
            
            // Apply transformation matrix for arc effect
            ctx.translate(0, radius);
            ctx.scale(1, 1 - Math.abs(angleRad) / 8);
            ctx.translate(0, -radius);
        }
    }

    // Draw text lines helper
    function drawTextLines(ctx, text, lines, fontSizePx, s, isStroke) {
        const lineHeight = s.lineHeight || 1.2;
        const letterSpacing = s.letterSpacing * fontSizePx * 0.1;
        
        // Calculate total height based on line height (separación entre líneas)
        // lineHeight: 1 = líneas juntas (sin espacio extra), >1 = más espacio, <1 = menos espacio
        const lineSpacing = fontSizePx * Math.max(0, lineHeight - 1);
        const totalHeight = fontSizePx + (lines.length - 1) * lineSpacing;
        
        // Centrar el texto verticalmente alrededor de (0,0)
        // startY es la posición de la primera línea para que el centro del bounding box esté en (0,0)
        const startY = -totalHeight / 2 + fontSizePx / 2;

        // Check if curve text is active
        const isCurved = s.distort && s.distort.arc && s.distort.arc.angle !== 0;

        // Calculate widths for alignment (TextStudio style: align lines relative to each other)
        const lineWidths = [];
        let maxLineWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineWidth = measureTextWidth(ctx, lines[i], s.letterSpacing, fontSizePx);
            lineWidths.push(lineWidth);
            if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Calcular posición Y para que el centro del bounding box esté en (0,0)
            // i=0 es la primera línea, i=lines.length-1 es la última
            const y = -totalHeight / 2 + fontSizePx / 2 + i * lineSpacing;
            
            // Calculate X offset based on alignment (TextStudio style)
            let xOffset = 0;
            if (s.align === 'left') {
                xOffset = -maxLineWidth / 2; // Left align: borde izquierdo del contenedor más ancho
            } else if (s.align === 'right') {
                xOffset = maxLineWidth / 2; // Right align: borde derecho del contenedor más ancho
            }
            // Center is default (xOffset = 0): el texto se dibuja centrado en drawTextWithSpacing
            
            if (isCurved) {
                drawTextCurved(ctx, line, xOffset, y, letterSpacing, isStroke, s, fontSizePx);
            } else {
                drawTextWithSpacing(ctx, line, xOffset, y, letterSpacing, isStroke, s, fontSizePx);
            }
        }
    }

    // Draw text with palette (per-letter coloring)
    function drawTextWithPalette(ctx, text, lines, fontSizePx, s, alpha) {
        const lineHeight = s.lineHeight || 1;
        const letterSpacing = s.letterSpacing * fontSizePx * 0.1;
        const totalHeight = fontSizePx * lineHeight * lines.length;
        const startY = -totalHeight / 2 + fontSizePx / 2;
        const styles = s.fill.palette.styles;
        const method = s.fill.palette.method || 'letter';

        // Calculate widths for alignment
        const lineWidths = [];
        let maxLineWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineWidth = measureTextWidth(ctx, lines[i], s.letterSpacing, fontSizePx);
            lineWidths.push(lineWidth);
            if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
        }

        let charIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const y = startY + i * fontSizePx * lineHeight;
            
            // Calculate X offset based on alignment
            let xOffset = 0;
            if (s.align === 'left') {
                xOffset = -maxLineWidth / 2;
            } else if (s.align === 'right') {
                xOffset = maxLineWidth / 2 - lineWidths[i];
            }

            let currentX = xOffset;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const charWidth = ctx.measureText(char).width;
                
                // Get color from palette based on method
                let color;
                if (method === 'letter') {
                    // Color per letter
                    color = styles[charIndex % styles.length];
                } else if (method === 'word') {
                    // Color per word (space resets index)
                    if (char === ' ') charIndex = 0;
                    color = styles[charIndex % styles.length];
                    if (char !== ' ') charIndex++;
                } else {
                    // Default to letter method
                    color = styles[charIndex % styles.length];
                    charIndex++;
                }

                // Convert color to rgba
                let fillColor;
                if (typeof color === 'string' && color.startsWith('#')) {
                    fillColor = hexToRgba(color, alpha);
                } else if (color && color.r !== undefined) {
                    fillColor = `rgba(${color.r},${color.g},${color.b},${alpha})`;
                } else {
                    fillColor = hexToRgba(s.fill.color, alpha);
                }

                ctx.fillStyle = fillColor;
                ctx.strokeStyle = 'transparent';
                ctx.fillText(char, currentX, y);
                
                currentX += charWidth + spacing;
            }

            if (method === 'letter') {
                charIndex += line.length;
            }
        }
    }

    // Draw text with curve effect (per-character positioning)
    function drawTextCurved(ctx, text, x, y, spacing, isStroke, s, fontSizePx) {
        // Try DistortEngine if available
        if (typeof DistortEngine !== 'undefined' && !state.distortEngine) {
            state.distortEngine = new DistortEngine();
        }

        if (state.distortEngine) {
            const applied = state.distortEngine.applyDistort(ctx, text, fontSizePx, {
                angle: s.distort.arc.angle,
                amplitude: s.distort.arc.amplitude || 0,
                type: s.distort.arc.type || 'arc'
            });
            if (applied) return;
        }

        // Fallback: Original curve implementation
        const arcAngle = s.distort.arc.angle;
        const angleRad = (arcAngle * Math.PI) / 180;
        
        // Calculate curve parameters - TextStudio style: full circle at max angle
        // For 360 degrees, we want the text to complete a full circle
        const maxAngle = 360;
        const circumference = 2 * Math.PI; // Full circle in radians
        
        // Calculate radius so that at max angle, text completes full circle
        // Measure total text width
        let totalWidth = 0;
        const chars = [];
        for (let i = 0; i < text.length; i++) {
            const charWidth = ctx.measureText(text[i]).width;
            chars.push({ char: text[i], width: charWidth });
            totalWidth += charWidth;
        }
        totalWidth += spacing * (text.length - 1);
        
        // Calculate radius based on angle to achieve TextStudio-style effect
        // At 360 degrees, we want circumference = totalWidth
        // So radius = totalWidth / (2 * PI)
        // But we scale this by the angle ratio to get intermediate values
        const angleRatio = Math.abs(arcAngle) / maxAngle;
        const radius = (totalWidth / circumference) / Math.max(0.1, angleRatio);
        
        // Center the text on the curve
        const startAngle = -totalWidth / (2 * radius);
        
        // Draw each character along the curve
        let currentAngle = startAngle;
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            
            // Calculate position on the curve
            const charAngle = currentAngle + char.width / (2 * radius);
            const charX = Math.sin(charAngle) * radius;
            const charY = y - (radius - Math.cos(charAngle) * radius);
            
            // Calculate rotation for the character (tangent to the curve)
            const rotation = charAngle;
            
            ctx.save();
            ctx.translate(charX, charY);
            ctx.rotate(rotation);
            
            if (isStroke) {
                ctx.strokeText(char.char, -char.width / 2, 0);
            } else {
                ctx.fillText(char.char, -char.width / 2, 0);
            }
            
            ctx.restore();
            
            currentAngle += (char.width + spacing) / radius;
        }
    }

    // Draw text with manual letter spacing and boggle
    function drawTextWithSpacing(ctx, text, x, y, spacing, isStroke, s, fontSizePx) {
        const align = safeGet(s, 'align', 'center');
        const boggle = isActive(s, 'lettering.boggle');
        const boggleAngle = boggle ? safeGet(s, 'lettering.boggle.angle', 0) : 0;
        const boggleAmp = boggle ? safeGet(s, 'lettering.boggle.amplitude', 0) : 0;

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

        // Ajustar posición X según alineación
        if (align === 'center') {
            startX = x - totalWidth / 2; // Centrar el texto en x
        } else if (align === 'left') {
            startX = x; // x es el borde izquierdo del contenedor
        } else if (align === 'right') {
            startX = x - totalWidth; // x es el borde derecho del contenedor
        }

        let currentX = startX;
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            let charY = y;

            if (boggle) {
                const wave = Math.sin(i * 0.5 + boggleAngle * 0.1) * boggleAmp * fontSizePx * 0.5;
                charY = y + wave;
            }

            ctx.save();
            if (boggle) {
                const rotation = Math.sin(i * 0.5 + boggleAngle * 0.1) * boggleAmp * 0.3;
                ctx.translate(currentX + char.width / 2, charY);
                ctx.rotate(rotation);
                if (isStroke) {
                    ctx.strokeText(char.char, -char.width / 2, 0);
                } else {
                    ctx.fillText(char.char, -char.width / 2, 0);
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

    // Create gradient
    function createGradient(ctx, text, lines, fontSizePx, gradient, s) {
        const metrics = ctx.measureText(text.replace(/\n/g, ' '));
        const textWidth = metrics.width;
        const textHeight = fontSizePx * 1.3 * lines.length;

        const angle = (gradient.angle * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x1 = -textWidth / 2 + cos * textWidth / 2 - sin * textHeight / 2;
        const y1 = -textHeight / 2 + sin * textWidth / 2 + cos * textHeight / 2;
        const x2 = -textWidth / 2 - cos * textWidth / 2 + sin * textHeight / 2;
        const y2 = -textHeight / 2 - sin * textWidth / 2 - cos * textHeight / 2;

        const gradientObj = ctx.createLinearGradient(x1, y1, x2, y2);
        addGradientStops(gradientObj, gradient);

        return gradientObj;
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

    // Update settings
    function updateSettings(newSettings) {
        Object.assign(state.settings, newSettings);
        render();
    }

    // Helper: Convert RGB object to hex with validation
    function rgbToHex(rgb) {
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
        // Passing a target is used by the API/export path.  It keeps preset
        // conversion independent from the visible editor and its DOM controls.
        const s = targetSettings || state.settings;

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
        if (preset.lineHeight !== undefined) s.lineHeight = clampValue(preset.lineHeight, 0.1, 3, 1);
        if (preset.letterSpacing !== undefined) s.letterSpacing = clampValue(preset.letterSpacing, -0.5, 1.5, 0);

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
        }

        // Outline with enhanced validation
        if (preset.outline) {
            if (preset.outline.global) {
                s.outline.global.active = Boolean(preset.outline.global.active);
            }
            if (preset.outline.dash) {
                s.outline.dash.active = Boolean(preset.outline.dash.active);
                if (preset.outline.dash.pattern) s.outline.dash.pattern = preset.outline.dash.pattern;
            }
            if (preset.outline.first) {
                if (preset.outline.first.active !== undefined) s.outline.active = Boolean(preset.outline.first.active);
                if (preset.outline.first.width !== undefined) s.outline.width = clampValue(preset.outline.first.width, 0, 1, 0.1);
                if (preset.outline.first.join) s.outline.join = preset.outline.first.join;
                if (preset.outline.first.fill && preset.outline.first.fill.color) s.outline.color = rgbToHex(preset.outline.first.fill.color);
                if (preset.outline.first.fill && preset.outline.first.fill.alpha !== undefined) s.outline.alpha = clampValue(preset.outline.first.fill.alpha, 0, 1, 1);
                if (preset.outline.first.fill && preset.outline.first.fill.gradient) {
                    s.outline.gradient.active = Boolean(preset.outline.first.fill.gradient.active);
                    if (preset.outline.first.fill.gradient.angle !== undefined) s.outline.gradient.angle = clampValue(preset.outline.first.fill.gradient.angle, 0, 360, 0);
                    if (preset.outline.first.fill.gradient.colors && preset.outline.first.fill.gradient.colors.length >= 2) {
                        s.outline.gradient.startColor = rgbToHex(preset.outline.first.fill.gradient.colors[0]);
                        s.outline.gradient.endColor = rgbToHex(preset.outline.first.fill.gradient.colors[1]);
                    }
                }
            }
            if (preset.outline.second) {
                if (preset.outline.second.active !== undefined) s.outline2.active = Boolean(preset.outline.second.active);
                if (preset.outline.second.width !== undefined) s.outline2.width = clampValue(preset.outline.second.width, 0, 1, 0.1);
                if (preset.outline.second.join) s.outline2.join = preset.outline.second.join;
                if (preset.outline.second.fill && preset.outline.second.fill.color) s.outline2.color = rgbToHex(preset.outline.second.fill.color);
                if (preset.outline.second.fill && preset.outline.second.fill.alpha !== undefined) s.outline2.alpha = clampValue(preset.outline.second.fill.alpha, 0, 1, 1);
                if (preset.outline.second.fill && preset.outline.second.fill.gradient) {
                    s.outline2.gradient.active = Boolean(preset.outline.second.fill.gradient.active);
                    if (preset.outline.second.fill.gradient.angle !== undefined) s.outline2.gradient.angle = clampValue(preset.outline.second.fill.gradient.angle, 0, 360, 0);
                    if (preset.outline.second.fill.gradient.colors && preset.outline.second.fill.gradient.colors.length >= 2) {
                        s.outline2.gradient.startColor = rgbToHex(preset.outline.second.fill.gradient.colors[0]);
                        s.outline2.gradient.endColor = rgbToHex(preset.outline.second.fill.gradient.colors[1]);
                    }
                }
            } else {
                s.outline2.active = false;
            }
            if (preset.outline.first && preset.outline.first.fill && preset.outline.first.fill.texture) {
                if (preset.outline.first.fill.texture.active !== undefined) s.outline.texture.active = Boolean(preset.outline.first.fill.texture.active);
                if (preset.outline.first.fill.texture.src) s.outline.texture.src = preset.outline.first.fill.texture.src;
                if (preset.outline.first.fill.texture.size !== undefined) s.outline.texture.size = clampValue(preset.outline.first.fill.texture.size, 0.1, 5, 1);
            }
            if (preset.outline.first && preset.outline.first.fill && preset.outline.first.fill.palette) {
                if (preset.outline.first.fill.palette.active !== undefined) s.outline.palette.active = Boolean(preset.outline.first.fill.palette.active);
                if (preset.outline.first.fill.palette.lettering && preset.outline.first.fill.palette.lettering.method) s.outline.palette.method = preset.outline.first.fill.palette.lettering.method;
            }
        }

        // Shadow Inner with enhanced validation
        if (preset.shadow && preset.shadow.inner) {
            if (preset.shadow.inner.active !== undefined) s.shadowInner.active = Boolean(preset.shadow.inner.active);
            if (preset.shadow.inner.size !== undefined) s.shadowInner.size = clampValue(preset.shadow.inner.size, 0, 1, 0.2);
            if (preset.shadow.inner.distance !== undefined) s.shadowInner.distance = clampValue(preset.shadow.inner.distance, 0, 1, 0.1);
            if (preset.shadow.inner.angle !== undefined) s.shadowInner.angle = clampValue(preset.shadow.inner.angle, -180, 180, -45);
            if (preset.shadow.inner.offset !== undefined) s.shadowInner.offset = clampValue(preset.shadow.inner.offset, 0, 1, 0);
            if (preset.shadow.inner.color) s.shadowInner.color = rgbToHex(preset.shadow.inner.color);
            if (preset.shadow.inner.alpha !== undefined) s.shadowInner.alpha = clampValue(preset.shadow.inner.alpha, 0, 1, 1);
            if (preset.shadow.inner.blendmode) s.shadowInner.blendmode = preset.shadow.inner.blendmode;
        }

        // Shadow Outer with enhanced validation
        if (preset.shadow && preset.shadow.outer) {
            if (preset.shadow.outer.active !== undefined) s.shadowOuter.active = Boolean(preset.shadow.outer.active);
            if (preset.shadow.outer.size !== undefined) s.shadowOuter.size = clampValue(preset.shadow.outer.size, 0, 1, 0.2);
            if (preset.shadow.outer.distance !== undefined) s.shadowOuter.distance = clampValue(preset.shadow.outer.distance, 0, 1, 0.1);
            if (preset.shadow.outer.angle !== undefined) s.shadowOuter.angle = clampValue(preset.shadow.outer.angle, -180, 180, 135);
            if (preset.shadow.outer.strength !== undefined) s.shadowOuter.strength = clampValue(preset.shadow.outer.strength, 0, 1, 0);
            if (preset.shadow.outer.fill && preset.shadow.outer.fill.color) s.shadowOuter.color = rgbToHex(preset.shadow.outer.fill.color);
            if (preset.shadow.outer.fill && preset.shadow.outer.fill.alpha !== undefined) s.shadowOuter.alpha = clampValue(preset.shadow.outer.fill.alpha, 0, 1, 1);
            if (preset.shadow.outer.blendmode) s.shadowOuter.blendmode = preset.shadow.outer.blendmode;
        }

        // Shadow Outer 2 with enhanced validation
        if (preset.shadow && preset.shadow.outer2) {
            if (preset.shadow.outer2.active !== undefined) s.shadowOuter2.active = Boolean(preset.shadow.outer2.active);
            if (preset.shadow.outer2.size !== undefined) s.shadowOuter2.size = clampValue(preset.shadow.outer2.size, 0, 1, 0.2);
            if (preset.shadow.outer2.distance !== undefined) s.shadowOuter2.distance = clampValue(preset.shadow.outer2.distance, 0, 1, 0.1);
            if (preset.shadow.outer2.angle !== undefined) s.shadowOuter2.angle = clampValue(preset.shadow.outer2.angle, -180, 180, 135);
            if (preset.shadow.outer2.fill && preset.shadow.outer2.fill.color) s.shadowOuter2.color = rgbToHex(preset.shadow.outer2.fill.color);
            if (preset.shadow.outer2.fill && preset.shadow.outer2.fill.alpha !== undefined) s.shadowOuter2.alpha = clampValue(preset.shadow.outer2.fill.alpha, 0, 1, 1);
            if (preset.shadow.outer2.blendmode) s.shadowOuter2.blendmode = preset.shadow.outer2.blendmode;
        } else {
            s.shadowOuter2.active = false;
        }

        // Shadow Inner 2 with enhanced validation
        if (preset.shadow && preset.shadow.inner2) {
            if (preset.shadow.inner2.active !== undefined) s.shadowInner2.active = Boolean(preset.shadow.inner2.active);
            if (preset.shadow.inner2.size !== undefined) s.shadowInner2.size = clampValue(preset.shadow.inner2.size, 0, 1, 0.2);
            if (preset.shadow.inner2.distance !== undefined) s.shadowInner2.distance = clampValue(preset.shadow.inner2.distance, 0, 1, 0.1);
            if (preset.shadow.inner2.angle !== undefined) s.shadowInner2.angle = clampValue(preset.shadow.inner2.angle, -180, 180, 135);
            if (preset.shadow.inner2.offset !== undefined) s.shadowInner2.offset = clampValue(preset.shadow.inner2.offset, 0, 1, 0);
            if (preset.shadow.inner2.color) s.shadowInner2.color = rgbToHex(preset.shadow.inner2.color);
            if (preset.shadow.inner2.alpha !== undefined) s.shadowInner2.alpha = clampValue(preset.shadow.inner2.alpha, 0, 1, 1);
            if (preset.shadow.inner2.blendmode) s.shadowInner2.blendmode = preset.shadow.inner2.blendmode;
        } else {
            s.shadowInner2.active = false;
        }

        // Depth with enhanced validation
        if (preset.depth) {
            if (preset.depth.active !== undefined) s.depth.active = Boolean(preset.depth.active);
            if (preset.depth.length !== undefined) s.depth.length = clampValue(preset.depth.length, 0, 1, 0.2);
            if (preset.depth.angle !== undefined) s.depth.angle = clampValue(preset.depth.angle, 0, 360, 135);
            if (preset.depth.fill && preset.depth.fill.color) s.depth.color = rgbToHex(preset.depth.fill.color);
            if (preset.depth.fill && preset.depth.fill.alpha !== undefined) s.depth.alpha = clampValue(preset.depth.fill.alpha, 0, 1, 1);
            if (preset.depth.fill && preset.depth.fill.gradient) {
                s.depth.gradient.active = Boolean(preset.depth.fill.gradient.active);
                if (preset.depth.fill.gradient.angle !== undefined) s.depth.gradient.angle = clampValue(preset.depth.fill.gradient.angle, 0, 360, 0);
                if (preset.depth.fill.gradient.colors && preset.depth.fill.gradient.colors.length >= 2) {
                    s.depth.gradient.startColor = rgbToHex(preset.depth.fill.gradient.colors[0]);
                    s.depth.gradient.endColor = rgbToHex(preset.depth.fill.gradient.colors[1]);
                }
            }
            if (preset.depth.fill && preset.depth.fill.texture) {
                if (preset.depth.fill.texture.blendmode) s.depth.texture.blendmode = preset.depth.fill.texture.blendmode;
            }
        } else {
            s.depth.active = false;
        }

        // Depth 2 with enhanced validation
        if (preset.depth2) {
            if (preset.depth2.active !== undefined) s.depth2.active = Boolean(preset.depth2.active);
            if (preset.depth2.length !== undefined) s.depth2.length = clampValue(preset.depth2.length, 0, 1, 0.2);
            if (preset.depth2.angle !== undefined) s.depth2.angle = clampValue(preset.depth2.angle, 0, 360, 135);
            if (preset.depth2.fill && preset.depth2.fill.color) s.depth2.color = rgbToHex(preset.depth2.fill.color);
            if (preset.depth2.fill && preset.depth2.fill.alpha !== undefined) s.depth2.alpha = clampValue(preset.depth2.fill.alpha, 0, 1, 1);
            if (preset.depth2.fill && preset.depth2.fill.gradient) {
                s.depth2.gradient.active = Boolean(preset.depth2.fill.gradient.active);
                if (preset.depth2.fill.gradient.angle !== undefined) s.depth2.gradient.angle = clampValue(preset.depth2.fill.gradient.angle, 0, 360, 0);
                if (preset.depth2.fill.gradient.colors && preset.depth2.fill.gradient.colors.length >= 2) {
                    s.depth2.gradient.startColor = rgbToHex(preset.depth2.fill.gradient.colors[0]);
                    s.depth2.gradient.endColor = rgbToHex(preset.depth2.fill.gradient.colors[1]);
                }
            }
        } else {
            s.depth2.active = false;
        }

        // Bevel with enhanced validation
        if (preset.bevel && preset.bevel.inner) {
            if (preset.bevel.inner.active !== undefined) s.bevel.active = Boolean(preset.bevel.inner.active);
            if (preset.bevel.inner.size !== undefined) s.bevel.size = clampValue(preset.bevel.inner.size, 0, 1, 0.1);
            if (preset.bevel.inner.smoothing !== undefined) s.bevel.smoothing = clampValue(preset.bevel.inner.smoothing, 0, 1, 0);
            if (preset.bevel.inner.soften !== undefined) s.bevel.soften = clampValue(preset.bevel.inner.soften, 0, 1, 0.1);
            if (preset.bevel.inner.angle !== undefined) s.bevel.angle = clampValue(preset.bevel.inner.angle, 0, 360, 135);
            if (preset.bevel.inner.highlight && preset.bevel.inner.highlight.color) s.bevel.highlight.color = rgbToHex(preset.bevel.inner.highlight.color);
            if (preset.bevel.inner.highlight && preset.bevel.inner.highlight.alpha !== undefined) s.bevel.highlight.alpha = clampValue(preset.bevel.inner.highlight.alpha, 0, 1, 1);
            if (preset.bevel.inner.shadow && preset.bevel.inner.shadow.color) s.bevel.shadow.color = rgbToHex(preset.bevel.inner.shadow.color);
            if (preset.bevel.inner.shadow && preset.bevel.inner.shadow.alpha !== undefined) s.bevel.shadow.alpha = clampValue(preset.bevel.inner.shadow.alpha, 0, 1, 1);
        } else {
            s.bevel.active = false;
        }

        // Lettering with enhanced validation
        if (preset.lettering) {
            if (preset.lettering.active !== undefined) s.lettering.active = Boolean(preset.lettering.active);
            if (preset.lettering.blendmode) s.lettering.blendmode = preset.lettering.blendmode;
            if (preset.lettering.boggle) {
                s.lettering.boggle.active = Boolean(preset.lettering.boggle.active);
                if (preset.lettering.boggle.angle !== undefined) s.lettering.boggle.angle = clampValue(preset.lettering.boggle.angle, 0, 360, 5);
                if (preset.lettering.boggle.amplitude !== undefined) s.lettering.boggle.amplitude = clampValue(preset.lettering.boggle.amplitude, 0, 1, 0.1);
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
                if (preset.lettering.shadow.fill && preset.lettering.shadow.fill.color) s.lettering.shadow.color = rgbToHex(preset.lettering.shadow.fill.color);
                if (preset.lettering.shadow.fill && preset.lettering.shadow.fill.alpha !== undefined) s.lettering.shadow.alpha = clampValue(preset.lettering.shadow.fill.alpha, 0, 1, 1);
            }
        }

        // Distort with enhanced validation
        if (preset.distort && preset.distort.arc) {
            if (preset.distort.arc.angle !== undefined) {
                s.distort.active = preset.distort.arc.angle !== 0;
                s.distort.arc.angle = clampValue(preset.distort.arc.angle, -180, 180, 0);
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
            if (preset.background.fill && preset.background.fill.color) s.background.color = rgbToHex(preset.background.fill.color);
            if (preset.background.fill && preset.background.fill.alpha !== undefined) s.background.alpha = clampValue(preset.background.fill.alpha, 0, 1, 1);
            if (preset.background.fill && preset.background.fill.image) {
                s.background.image.active = Boolean(preset.background.fill.image.active);
                if (preset.background.fill.image.src) s.background.image.src = preset.background.fill.image.src;
                if (preset.background.fill.image.size) s.background.image.size = preset.background.fill.image.size;
                if (preset.background.fill.image.repeat) s.background.image.repeat = preset.background.fill.image.repeat;
                if (preset.background.fill.image.alpha !== undefined) s.background.image.alpha = clampValue(preset.background.fill.image.alpha, 0, 1, 1);
            }
            if (preset.background.fill && preset.background.fill.gradient) {
                s.background.gradient.active = Boolean(preset.background.fill.gradient.active);
                if (preset.background.fill.gradient.angle !== undefined) s.background.gradient.angle = clampValue(preset.background.fill.gradient.angle, 0, 360, 0);
                if (preset.background.fill.gradient.type) s.background.gradient.type = preset.background.fill.gradient.type;
                if (preset.background.fill.gradient.colors && preset.background.fill.gradient.colors.length >= 2) {
                    s.background.gradient.startColor = rgbToHex(preset.background.fill.gradient.colors[0]);
                    s.background.gradient.endColor = rgbToHex(preset.background.fill.gradient.colors[1]);
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
            // Update UI elements
            updateUIFromSettings();

            // Trigger font load and render
            if (window.FontLoader && FontLoader.isCustomFont(s.font)) {
                FontLoader.loadFont(s.font).then(function() {
                    render();
                });
            } else {
                render();
            }
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
        setInputValue('tt-line-height-input', s.lineHeight || 1);
        setInputValue('tt-distort-arc-angle-input', s.distort && s.distort.arc ? s.distort.arc.angle : 0);
        setInputValue('tt-rotate-input', s.rotate || 0);
        setInputValue('tt-merge-gradients-input', s.mergeGradients || false);

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
        setInputValue('tt-fill-color-input', s.fill.color);
        setInputValue('tt-fill-gradient-active-input', s.fill.gradient && s.fill.gradient.active);
        setInputValue('tt-fill-gradient-angle-input', s.fill.gradient && s.fill.gradient.angle);
        setInputValue('tt-fill-alpha-input', s.fill.alpha);
        setInputValue('tt-fill-texture-active-input', s.fill.texture && s.fill.texture.active);
        setInputValue('tt-fill-texture-alpha-input', s.fill.texture && s.fill.texture.alpha);
        setInputValue('tt-fill-texture-lettering-input', s.fill.texture && s.fill.texture.lettering);
        setInputValue('tt-fill-palette-active-input', s.fill.palette && s.fill.palette.active);
        setInputValue('tt-fill-palette-lettering-method-input', s.fill.palette && s.fill.palette.lettering && s.fill.palette.lettering.method);

        // LETTERING
        setInputValue('tt-lettering-active-input', s.lettering && s.lettering.active);
        setInputValue('tt-lettering-boggle-active-input', s.lettering && s.lettering.boggle && s.lettering.boggle.active);
        setInputValue('tt-lettering-boggle-angle-input', s.lettering && s.lettering.boggle && s.lettering.boggle.angle);
        setInputValue('tt-lettering-boggle-amplitude-input', s.lettering && s.lettering.boggle && s.lettering.boggle.amplitude);
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

    // Render to any canvas without mutating the editor UI.  This is shared by
    // PNG download and the public API, so both outputs have the requested size
    // and a genuinely transparent background.
    function renderToCanvas(canvas, settings, options) {
        const previous = {
            canvas: state.canvas, ctx: state.ctx, settings: state.settings,
            isRendering: state.isRendering,
            transparentOutput: state.transparentOutput
        };
        try {
            state.canvas = canvas;
            state.ctx = canvas.getContext('2d');
            state.settings = settings;
            state.isRendering = false;
            state.transparentOutput = Boolean(options && options.transparent);
            
            // For export, use fixed resolution independent of visual zoom
            // Temporarily override canvas.zoom to ensure consistent export size
            const originalZoom = state.settings.canvas.zoom;
            state.settings.canvas.zoom = 1.0; // Use 1.0 for export (no visual zoom)
            
            render();
            
            // Restore original zoom
            state.settings.canvas.zoom = originalZoom;
        } finally {
            state.canvas = previous.canvas;
            state.ctx = previous.ctx;
            state.settings = previous.settings;
            state.isRendering = previous.isRendering;
            state.transparentOutput = previous.transparentOutput;
        }
        return canvas;
    }

    // Export the module
    window.TextEditor = {
        init: init,
        render: render,
        updateSettings: updateSettings,
        loadPreset: loadPreset,
        createDefaultSettings: createDefaultSettings,
        renderToCanvas: renderToCanvas,
        getSettings: getSettings,
        getCanvas: getCanvas,
        getCtx: getCtx
    };

})();
