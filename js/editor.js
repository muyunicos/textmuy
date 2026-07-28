/* ===== TEXTSTUDIO EDITOR - Canvas Rendering Engine ===== */

(function() {
    'use strict';

    // Default settings matching TextStudio's preset structure
    // Conceptual order: TEXT → 3D & FILLING → OUTLINES → SHADOWS → ICON → BACKGROUND → ANIMATION → DOWNLOAD
    const defaultSettings = {
        // ===== TEXT =====
        text: 'TEXT',
        font: 'Bangers',
        fontWeight: 'normal',
        fontSize: 64,
        letterSpacing: 0,
        lineHeight: 1,
        align: 'center',
        rotate: 0,
        distort: { active: false, arc: { angle: 0 } },
        mergeGradients: 0,

        // ===== 3D & FILLING =====
        // Filling (Relleno principal)
        fill: {
            active: true,
            color: '#ffffff',
            gradient: { active: false, startColor: '#ffffff', endColor: '#000000', angle: 0, colors: [] },
            alpha: 1,
            texture: { active: false, src: null, size: 1, alpha: 1, repeat: 'repeat', position: 'center', blendmode: 'source-over', lettering: false },
            palette: { active: false, lettering: { method: 'letter' }, styles: [] }
        },

        // Lettering (Comportamiento tipográfico)
        lettering: {
            active: false,
            blendmode: 'over',
            boggle: { active: false, angle: 0, amplitude: 0.1 },
            reverseOverlap: { active: false, letters: 0, lines: 0 },
            shadow: { active: false, size: 0, distance: 0, angle: 0, fill: { color: '#000000', alpha: 1 } }
        },

        // 3D Projection #1 (Extrusión tridimensional)
        depth: {
            active: false,
            length: 0.1,
            angle: 135,
            fill: { color: '#000000', alpha: 1, mergeAlpha: 0, gradient: { active: false, type: 'depth', startColor: '#000000', endColor: '#ffffff', angle: 0, colors: [] }, texture: { active: false, src: null, size: 1, alpha: 1, blendmode: 'source-over', repeat: 'repeat', position: 'center' } }
        },

        // 3D Projection #2 (Extrusión tridimensional)
        depth2: {
            active: false,
            length: 0.1,
            angle: 135,
            fill: { color: '#000000', alpha: 1, mergeAlpha: 0, gradient: { active: false, type: 'depth', startColor: '#000000', endColor: '#ffffff', angle: 0, colors: [] }, texture: { active: false, src: null, size: 1, alpha: 1, blendmode: 'source-over', repeat: 'repeat', position: 'center' } }
        },

        // ===== OUTLINES =====
        // Outline #1 (Trazado plano)
        outline: {
            active: false,
            width: 0.1,
            color: '#000000',
            join: 'round',
            gradient: { active: false, startColor: '#000000', endColor: '#000000', angle: 0, colors: [] },
            alpha: 1,
            texture: { active: false, src: null, size: 1, blendmode: 'source-over' },
            palette: { active: false, method: 'letter', styles: [] },
            global: { active: false },
            dash: { active: false, pattern: [] }
        },

        // Outline #2 (Trazado plano)
        outline2: {
            active: false,
            width: 0.1,
            color: '#000000',
            join: 'round',
            gradient: { active: false, startColor: '#000000', endColor: '#000000', angle: 0, colors: [] },
            alpha: 1
        },

        // ===== SHADOWS =====
        // Inner Bevel (Biselado interno)
        bevel: {
            active: false,
            size: 0.1,
            smoothing: 0,
            soften: 0.1,
            angle: 135,
            highlight: { color: '#ffffff', alpha: 1 },
            shadow: { color: '#000000', alpha: 1 },
            inner: { active: false }
        },

        // Inner Shadow #1 (Sombra interior)
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

        // Inner Shadow #2 (Sombra interior)
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

        // Outer Shadow #1 (Sombra exterior / Caída)
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

        // Outer Shadow #2 (Sombra exterior / Caída)
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
            active: false,
            src: null,
            position: 'left',
            size: 1,
            alpha: 1,
            rotate: 0,
            composite: 'source-over',
            offset: { x: 0, y: 0 },
            blendmode: 'source-over'
        },

        // ===== BACKGROUND =====
        background: {
            active: true,
            fill: { color: '#000000', alpha: 1, gradient: { active: false, type: 'linear', startColor: '#000000', endColor: '#ffffff', angle: 0, colors: [] }, image: { active: false, src: null, size: 'cover', sizeCustom: 1, repeat: 'repeat', alpha: 1 } },
            composite: 'source-over'
        },

        // ===== ANIMATION =====
        animation: {
            active: false,
            id: null,
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
            width: 1920,
            height: 1080,
            autoFit: false,
            zoom: 0.64,
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
    function calcExtraWidth(s, fontSizePx) {
        let extra = 0;
        if (isActive(s, 'outline')) extra += safeGet(s, 'outline.width', 0) * fontSizePx * 2;
        if (isActive(s, 'outline2')) extra += safeGet(s, 'outline2.width', 0) * fontSizePx * 2;
        if (isActive(s, 'shadowOuter')) extra += safeGet(s, 'shadowOuter.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadowOuter.size', 0) * fontSizePx * 2;
        if (isActive(s, 'shadowOuter2')) extra += safeGet(s, 'shadowOuter2.distance', 0) * fontSizePx * 2 + safeGet(s, 'shadowOuter2.size', 0) * fontSizePx * 2;
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

    // Auto-fit: find the largest font size that fits within the canvas
    function autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s) {
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font) : s.font;
        const fontWeight = s.fontWeight || 'normal';
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

        // Use canvas dimensions from settings (fixed size)
        const canvasWidth = s.canvas.width * state.scale;
        const canvasHeight = s.canvas.height * state.scale;

        state.canvas.width = canvasWidth;
        state.canvas.height = canvasHeight;
        // Scale down for display if too large
        const maxDisplayWidth = 900;
        const displayScale = Math.min(1, maxDisplayWidth / canvasWidth);
        state.canvas.style.width = (canvasWidth / state.scale * displayScale) + 'px';
        state.canvas.style.height = (canvasHeight / state.scale * displayScale) + 'px';

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background
        drawBackground(ctx, canvasWidth, canvasHeight);

        const text = s.text || 'TEXT';
        const lines = text.split('\n');

        // Auto-fit or use zoom-based font size
        let fontSizePx;
        if (s.canvas.autoFit) {
            fontSizePx = autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s) * state.scale;
        } else {
            // Use zoom system: text always fits canvas, zoom controls margins
            // Zoom affects padding: higher zoom = less padding (larger text)
            const zoom = s.canvas.zoom || 0.64;
            const originalPadding = s.canvas.padding || 0.05;
            // Adjust padding based on zoom: higher zoom = less padding
            // Clamp zoom to prevent issues
            const clampedZoom = Math.max(0.1, Math.min(2.0, zoom));
            const adjustedPadding = originalPadding / clampedZoom;
            
            // Temporarily adjust padding for autoFit calculation
            const originalPaddingSetting = s.canvas.padding;
            s.canvas.padding = adjustedPadding;
            fontSizePx = autoFitText(ctx, text, lines, canvasWidth, canvasHeight, s) * state.scale;
            s.canvas.padding = originalPaddingSetting; // Restore original padding
        }

        // Load custom font if needed
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font) : s.font;
        const fontWeight = s.fontWeight || 'normal';
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;

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
        ctx.translate(centerX, centerY);
        ctx.rotate((s.rotate * Math.PI) / 180);

        // 1. Outer shadow 2
        if (isActive(s, 'shadowOuter2')) {
            drawOuterShadow2(ctx, text, lines, fontSizePx, s);
        }

        // 2. Outer shadow
        if (isActive(s, 'shadowOuter')) {
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

        // 6. Outline 2
        if (isActive(s, 'outline2')) {
            drawOutline2(ctx, text, lines, fontSizePx, s);
        }

        // 7. Outline
        if (isActive(s, 'outline')) {
            drawOutline(ctx, text, lines, fontSizePx, s);
        }

        // 8. Bevel
        if (isActive(s, 'bevel')) {
            drawBevel(ctx, text, lines, fontSizePx, s);
        }

        // 8.5 Specular lighting
        if (isActive(s, 'bevel') && safeGet(s, 'bevel.specular', false)) {
            drawSpecular(ctx, text, lines, fontSizePx, s);
        }

        // 9. Inner shadow 2
        if (isActive(s, 'shadowInner2')) {
            drawInnerShadow2(ctx, text, lines, fontSizePx, s);
        }

        // 10. Inner shadow
        if (isActive(s, 'shadowInner')) {
            drawInnerShadow(ctx, text, lines, fontSizePx, s);
        }

        // 11. Icon
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

        if (isActive(s, 'background.image') && safeGet(s, 'background.image.src')) {
            loadBackgroundImage(s.background.image.src);
            if (state.bgImg) {
                const img = state.bgImg;
                const size = s.background.image.size;
                const repeat = s.background.image.repeat || 'repeat';

                if (repeat === 'repeat') {
                    ctx.globalAlpha = s.background.alpha;
                    ctx.createPattern(img, repeat);
                    // For repeat, draw pattern
                    const pattern = ctx.createPattern(img, repeat);
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, width, height);
                } else {
                    ctx.globalAlpha = s.background.alpha;
                    let dw = width, dh = height;
                    if (size === 'contain') {
                        const ratio = Math.min(width / img.width, height / img.height);
                        dw = img.width * ratio;
                        dh = img.height * ratio;
                    } else if (size === 'stretch') {
                        dw = width;
                        dh = height;
                    }
                    // cover is default
                    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
                }
                ctx.restore();
                return;
            }
        }

        if (safeGet(s, 'background.gradient') && isActive(s, 'background.gradient')) {
            const angle = (s.background.gradient.angle * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const grad = ctx.createLinearGradient(
                width / 2 - cos * width / 2, height / 2 - sin * height / 2,
                width / 2 + cos * width / 2, height / 2 + sin * height / 2
            );
            addGradientStops(grad, s.background.gradient);
            ctx.fillStyle = grad;
            ctx.globalAlpha = s.background.alpha;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            return;
        }

        if (isActive(s, 'background') && safeGet(s, 'background.alpha', 0) > 0) {
            ctx.fillStyle = s.background.color;
            ctx.globalAlpha = s.background.alpha;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            return;
        }

        ctx.restore();

        if (!state.transparentOutput) {
            // Checkered background for transparency preview only
            const size = 20 * state.scale;
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
        const distance = s.shadowOuter.distance * fontSizePx;
        const angle = (s.shadowOuter.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const blur = s.shadowOuter.size * fontSizePx * 2;
        const alpha = s.shadowOuter.alpha;
        const color = hexToRgba(s.shadowOuter.color, alpha);

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.shadowBlur = blur;

        ctx.fillStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);

        ctx.restore();
    }

    // Draw 3D depth (extrusion)
    function drawDepth(ctx, text, lines, fontSizePx, s) {
        const length = s.depth.length * fontSizePx;
        const angle = (s.depth.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * length;
        const offsetY = Math.sin(angle) * length;

        const alpha = s.depth.alpha;

        const steps = Math.max(1, Math.floor(length / 2));
        const stepX = offsetX / steps;
        const stepY = offsetY / steps;

        ctx.save();
        
        // Apply blendmode if set
        if (s.depth.texture.blendmode) {
            ctx.globalCompositeOperation = s.depth.texture.blendmode;
        }
        
        // Use gradient if active, otherwise solid color
        if (isActive(s, 'depth.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.depth.gradient, s);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = hexToRgba(s.depth.color, alpha);
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
            ctx.fillStyle = hexToRgba(s.fill.color, alpha);
        }

        ctx.strokeStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);
        ctx.restore();
    }

    // Draw text outline
    function drawOutline(ctx, text, lines, fontSizePx, s) {
        const width = s.outline.width * fontSizePx;
        const alpha = safeGet(s, 'outline.alpha', 1);

        // Check if texture is active
        if (isActive(s, 'outline.texture') && safeGet(s, 'outline.texture.src')) {
            const textureImg = state.textureImages[s.outline.texture.src];
            if (textureImg) {
                ctx.save();
                if (s.outline.texture.blendmode) {
                    ctx.globalCompositeOperation = s.outline.texture.blendmode;
                }
                const pattern = ctx.createPattern(textureImg, s.outline.texture.repeat || 'repeat');
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = pattern;
                ctx.lineWidth = width;
                ctx.lineJoin = s.outline.join || 'round';
                ctx.lineCap = 'round';
                ctx.fillStyle = 'transparent';
                drawTextLines(ctx, text, lines, fontSizePx, s, true);
                ctx.restore();
                return;
            }
        }

        ctx.save();
        if (isActive(s, 'outline.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.outline.gradient, s);
            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = hexToRgba(s.outline.color, alpha);
        }

        ctx.lineWidth = width;
        ctx.lineJoin = s.outline.join || 'round';
        ctx.lineCap = 'round';
        ctx.fillStyle = 'transparent';

        drawTextLines(ctx, text, lines, fontSizePx, s, true);
        ctx.restore();
    }

    // Draw inner shadow
    function drawInnerShadow(ctx, text, lines, fontSizePx, s) {
        const distance = s.shadowInner.distance * fontSizePx;
        const angle = (s.shadowInner.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const offset = (s.shadowInner.offset || 0) * fontSizePx;
        const blur = s.shadowInner.size * fontSizePx * 2;
        const alpha = s.shadowInner.alpha;
        const color = hexToRgba(s.shadowInner.color, alpha);

        const canvas = state.canvas;
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        offCtx.font = ctx.font;
        offCtx.textBaseline = 'middle';
        offCtx.textAlign = 'center';
        offCtx.translate(offscreen.width / 2, offscreen.height / 2);
        offCtx.fillStyle = color;
        offCtx.shadowColor = color;
        offCtx.shadowOffsetX = offsetX + offset;
        offCtx.shadowOffsetY = offsetY + offset;
        offCtx.shadowBlur = blur;

        offCtx.save();
        drawTextLines(offCtx, text, lines, fontSizePx, s);
        offCtx.restore();

        ctx.save();
        const blendmode = s.shadowInner.blendmode || 'source-atop';
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
        const length = s.depth2.length * fontSizePx;
        const angle = (s.depth2.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * length;
        const offsetY = Math.sin(angle) * length;

        const alpha = s.depth2.alpha;

        const steps = Math.max(1, Math.floor(length / 2));
        const stepX = offsetX / steps;
        const stepY = offsetY / steps;

        ctx.save();
        
        // Use gradient if active, otherwise solid color
        if (isActive(s, 'depth2.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.depth2.gradient, s);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = hexToRgba(s.depth2.color, alpha);
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
        const width = safeGet(s, 'outline2.width', 0) * fontSizePx;
        const alpha = safeGet(s, 'outline2.alpha', 1);

        if (isActive(s, 'outline2.gradient')) {
            const gradient = createGradient(ctx, text, lines, fontSizePx, s.outline2.gradient, s);
            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = hexToRgba(s.outline2.color, alpha);
        }

        ctx.lineWidth = width;
        ctx.lineJoin = s.outline2.join || 'round';
        ctx.lineCap = 'round';
        ctx.fillStyle = 'transparent';

        drawTextLines(ctx, text, lines, fontSizePx, s, true);
    }

    // Draw outer shadow 2
    function drawOuterShadow2(ctx, text, lines, fontSizePx, s) {
        const distance = s.shadowOuter2.distance * fontSizePx;
        const angle = (s.shadowOuter2.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const blur = s.shadowOuter2.size * fontSizePx * 2;
        const alpha = s.shadowOuter2.alpha;
        const color = hexToRgba(s.shadowOuter2.color, alpha);

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.shadowBlur = blur;

        ctx.fillStyle = 'transparent';
        drawTextLines(ctx, text, lines, fontSizePx, s);

        ctx.restore();
    }

    // Draw inner shadow 2
    function drawInnerShadow2(ctx, text, lines, fontSizePx, s) {
        const distance = s.shadowInner2.distance * fontSizePx;
        const angle = (s.shadowInner2.angle * Math.PI) / 180;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        const offset = (s.shadowInner2.offset || 0) * fontSizePx;
        const blur = s.shadowInner2.size * fontSizePx * 2;
        const alpha = s.shadowInner2.alpha;
        const color = hexToRgba(s.shadowInner2.color, alpha);

        const canvas = state.canvas;
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        offCtx.font = ctx.font;
        offCtx.textBaseline = 'middle';
        offCtx.textAlign = 'center';
        offCtx.translate(offscreen.width / 2, offscreen.height / 2);
        offCtx.fillStyle = color;
        offCtx.shadowColor = color;
        offCtx.shadowOffsetX = offsetX + offset;
        offCtx.shadowOffsetY = offsetY + offset;
        offCtx.shadowBlur = blur;

        offCtx.save();
        drawTextLines(offCtx, text, lines, fontSizePx, s);
        offCtx.restore();

        ctx.save();
        const blendmode = s.shadowInner2.blendmode || 'source-atop';
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
        const lineHeight = s.lineHeight;
        const letterSpacing = s.letterSpacing * fontSizePx * 0.1;
        const totalHeight = fontSizePx * lineHeight * lines.length;
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
            const y = startY + i * fontSizePx * lineHeight;
            
            // Calculate X offset based on alignment (TextStudio style)
            let xOffset = 0;
            if (s.align === 'left') {
                xOffset = -maxLineWidth / 2; // Left align relative to center
            } else if (s.align === 'right') {
                xOffset = maxLineWidth / 2 - lineWidths[i]; // Right align relative to center
            }
            // Center is default (xOffset = 0)
            
            if (isCurved) {
                drawTextCurved(ctx, line, xOffset, y, letterSpacing, isStroke, s, fontSizePx);
            } else {
                drawTextWithSpacing(ctx, line, xOffset, y, letterSpacing, isStroke, s, fontSizePx);
            }
        }
    }

    // Draw text with palette (per-letter coloring)
    function drawTextWithPalette(ctx, text, lines, fontSizePx, s, alpha) {
        const lineHeight = s.lineHeight;
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

        if (align === 'center') {
            startX = x - totalWidth / 2;
        } else if (align === 'right') {
            startX = x - totalWidth;
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
            s.font = preset.font.src || preset.font.name || preset.font;
            if (preset.font.size) s.fontSize = clampValue(preset.font.size, 8, 400, 64);
            if (preset.font.weight) s.fontWeight = preset.font.weight;
        }
        if (preset.align) s.align = preset.align;
        if (preset.rotate !== undefined) s.rotate = clampValue(preset.rotate, -180, 180, 0);
        if (preset.lineHeight !== undefined) s.lineHeight = clampValue(preset.lineHeight, 0.5, 3, 1);
        if (preset.letterSpacing !== undefined) s.letterSpacing = clampValue(preset.letterSpacing, -0.5, 2, 0);

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

        const textarea = document.getElementById('tt-text-textarea');
        if (textarea) textarea.value = s.text;

        const fontSelect = document.getElementById('tt-font-picker-input');
        if (fontSelect) fontSelect.value = s.font;

        const fontSizeInput = document.getElementById('tt-font-size-input');
        if (fontSizeInput) {
            // Convert zoom back to slider value (0.1-2.0 -> 10-200)
            const zoomValue = (s.canvas.zoom || 0.64) * 100;
            fontSizeInput.value = Math.round(zoomValue);
            // Update range fill visual
            updateRangeFill(fontSizeInput);
        }

        const letterSpacingInput = document.getElementById('tt-letter-spacing-input');
        if (letterSpacingInput) {
            // Convert back from internal value (-0.5 to 1.5) to slider value (-50 to 150)
            letterSpacingInput.value = s.letterSpacing * 100;
            updateRangeFill(letterSpacingInput);
        }

        const lineHeightInput = document.getElementById('tt-line-height-input');
        if (lineHeightInput) {
            lineHeightInput.value = s.lineHeight;
            updateRangeFill(lineHeightInput);
        }

        const rotateInput = document.getElementById('tt-rotate-input');
        if (rotateInput) rotateInput.value = s.rotate;

        const curveInput = document.getElementById('tt-distort-arc-angle-input');
        if (curveInput) {
            curveInput.value = s.distort.arc.angle || 0;
            updateRangeFill(curveInput);
        }

        const fillActive = document.getElementById('tt-fill-active-input');
        if (fillActive) fillActive.checked = s.fill.active;

        const fillColor = document.getElementById('tt-fill-color-input');
        if (fillColor) fillColor.value = s.fill.color;

        const fillAlpha = document.getElementById('tt-fill-alpha-input');
        if (fillAlpha) fillAlpha.value = s.fill.alpha;

        const outlineActive = document.getElementById('tt-outline-active-input');
        if (outlineActive) outlineActive.checked = s.outline.active;

        const outlineWidth = document.getElementById('tt-outline-width-input');
        if (outlineWidth) outlineWidth.value = s.outline.width;

        const outlineJoin = document.getElementById('tt-outline-join-input');
        if (outlineJoin) outlineJoin.value = s.outline.join;

        const outlineColor = document.getElementById('tt-outline-fill-color-input');
        if (outlineColor) outlineColor.value = s.outline.color;

        const outlineAlpha = document.getElementById('tt-outline-fill-alpha-input');
        if (outlineAlpha) outlineAlpha.value = s.outline.alpha;

        const innerShadowActive = document.getElementById('tt-shadow-inner-active-input');
        if (innerShadowActive) innerShadowActive.checked = s.shadowInner.active;

        const innerShadowSize = document.getElementById('tt-shadow-inner-size-input');
        if (innerShadowSize) innerShadowSize.value = s.shadowInner.size;

        const innerShadowDistance = document.getElementById('tt-shadow-inner-distance-input');
        if (innerShadowDistance) innerShadowDistance.value = s.shadowInner.distance;

        const innerShadowAngle = document.getElementById('tt-shadow-inner-angle-input');
        if (innerShadowAngle) innerShadowAngle.value = s.shadowInner.angle;

        const innerShadowOffset = document.getElementById('tt-shadow-inner-offset-input');
        if (innerShadowOffset) innerShadowOffset.value = s.shadowInner.offset || 0;

        const innerShadowColor = document.getElementById('tt-shadow-inner-color-input');
        if (innerShadowColor) innerShadowColor.value = s.shadowInner.color;

        const innerShadowAlpha = document.getElementById('tt-shadow-inner-alpha-input');
        if (innerShadowAlpha) innerShadowAlpha.value = s.shadowInner.alpha;

        const outerShadowActive = document.getElementById('tt-shadow-outer-active-input');
        if (outerShadowActive) outerShadowActive.checked = s.shadowOuter.active;

        const outerShadowSize = document.getElementById('tt-shadow-outer-size-input');
        if (outerShadowSize) outerShadowSize.value = s.shadowOuter.size;

        const outerShadowDistance = document.getElementById('tt-shadow-outer-distance-input');
        if (outerShadowDistance) outerShadowDistance.value = s.shadowOuter.distance;

        const outerShadowAngle = document.getElementById('tt-shadow-outer-angle-input');
        if (outerShadowAngle) outerShadowAngle.value = s.shadowOuter.angle;

        const outerShadowColor = document.getElementById('tt-shadow-outer-fill-color-input');
        if (outerShadowColor) outerShadowColor.value = s.shadowOuter.color;

        const outerShadowAlpha = document.getElementById('tt-shadow-outer-fill-alpha-input');
        if (outerShadowAlpha) outerShadowAlpha.value = s.shadowOuter.alpha;

        // Depth controls
        const depthActive = document.getElementById('tt-depth-active-input');
        if (depthActive) depthActive.checked = s.depth.active;
        const depthLength = document.getElementById('tt-depth-length-input');
        if (depthLength) depthLength.value = s.depth.length;
        const depthAngle = document.getElementById('tt-depth-angle-input');
        if (depthAngle) depthAngle.value = s.depth.angle;
        const depthColor = document.getElementById('tt-depth-color-input');
        if (depthColor) depthColor.value = s.depth.color;
        const depthAlpha = document.getElementById('tt-depth-alpha-input');
        if (depthAlpha) depthAlpha.value = s.depth.alpha;
        const depthGradientActive = document.getElementById('tt-depth-gradient-active-input');
        if (depthGradientActive) depthGradientActive.checked = s.depth.gradient.active;
        const depthGradientAngle = document.getElementById('tt-depth-gradient-angle-input');
        if (depthGradientAngle) depthGradientAngle.value = s.depth.gradient.angle;

        // Outline 2 controls
        const outline2Active = document.getElementById('tt-outline2-active-input');
        if (outline2Active) outline2Active.checked = s.outline2.active;
        const outline2Width = document.getElementById('tt-outline2-width-input');
        if (outline2Width) outline2Width.value = s.outline2.width;
        const outline2Join = document.getElementById('tt-outline2-join-input');
        if (outline2Join) outline2Join.value = s.outline2.join;
        const outline2Color = document.getElementById('tt-outline2-fill-color-input');
        if (outline2Color) outline2Color.value = s.outline2.color;
        const outline2Alpha = document.getElementById('tt-outline2-fill-alpha-input');
        if (outline2Alpha) outline2Alpha.value = s.outline2.alpha;
        const outline2GradientActive = document.getElementById('tt-outline2-fill-gradient-active-input');
        if (outline2GradientActive) outline2GradientActive.checked = s.outline2.gradient.active;
        const outline2GradientAngle = document.getElementById('tt-outline2-fill-gradient-angle-input');
        if (outline2GradientAngle) outline2GradientAngle.value = s.outline2.gradient.angle;

        // Shadow 2 controls
        const outerShadow2Active = document.getElementById('tt-shadow-outer2-active-input');
        if (outerShadow2Active) outerShadow2Active.checked = s.shadowOuter2.active;
        const outerShadow2Size = document.getElementById('tt-shadow-outer2-size-input');
        if (outerShadow2Size) outerShadow2Size.value = s.shadowOuter2.size;
        const outerShadow2Distance = document.getElementById('tt-shadow-outer2-distance-input');
        if (outerShadow2Distance) outerShadow2Distance.value = s.shadowOuter2.distance;
        const outerShadow2Angle = document.getElementById('tt-shadow-outer2-angle-input');
        if (outerShadow2Angle) outerShadow2Angle.value = s.shadowOuter2.angle;
        const outerShadow2Color = document.getElementById('tt-shadow-outer2-fill-color-input');
        if (outerShadow2Color) outerShadow2Color.value = s.shadowOuter2.color;
        const outerShadow2Alpha = document.getElementById('tt-shadow-outer2-fill-alpha-input');
        if (outerShadow2Alpha) outerShadow2Alpha.value = s.shadowOuter2.alpha;

        const innerShadow2Active = document.getElementById('tt-shadow-inner2-active-input');
        if (innerShadow2Active) innerShadow2Active.checked = s.shadowInner2.active;
        const innerShadow2Size = document.getElementById('tt-shadow-inner2-size-input');
        if (innerShadow2Size) innerShadow2Size.value = s.shadowInner2.size;
        const innerShadow2Distance = document.getElementById('tt-shadow-inner2-distance-input');
        if (innerShadow2Distance) innerShadow2Distance.value = s.shadowInner2.distance;
        const innerShadow2Angle = document.getElementById('tt-shadow-inner2-angle-input');
        if (innerShadow2Angle) innerShadow2Angle.value = s.shadowInner2.angle;
        const innerShadow2Offset = document.getElementById('tt-shadow-inner2-offset-input');
        if (innerShadow2Offset) innerShadow2Offset.value = s.shadowInner2.offset || 0;
        const innerShadow2Color = document.getElementById('tt-shadow-inner2-color-input');
        if (innerShadow2Color) innerShadow2Color.value = s.shadowInner2.color;
        const innerShadow2Alpha = document.getElementById('tt-shadow-inner2-alpha-input');
        if (innerShadow2Alpha) innerShadow2Alpha.value = s.shadowInner2.alpha;

        // Bevel controls
        const bevelActive = document.getElementById('tt-bevel-active-input');
        if (bevelActive) bevelActive.checked = s.bevel.active;
        const bevelSize = document.getElementById('tt-bevel-size-input');
        if (bevelSize) bevelSize.value = s.bevel.size;
        const bevelSmoothing = document.getElementById('tt-bevel-smoothing-input');
        if (bevelSmoothing) bevelSmoothing.value = s.bevel.smoothing;
        const bevelAngle = document.getElementById('tt-bevel-angle-input');
        if (bevelAngle) bevelAngle.value = s.bevel.angle;
        const bevelHighlightColor = document.getElementById('tt-bevel-highlight-color-input');
        if (bevelHighlightColor) bevelHighlightColor.value = s.bevel.highlight.color;
        const bevelHighlightAlpha = document.getElementById('tt-bevel-highlight-alpha-input');
        if (bevelHighlightAlpha) bevelHighlightAlpha.value = s.bevel.highlight.alpha;
        const bevelShadowColor = document.getElementById('tt-bevel-shadow-color-input');
        if (bevelShadowColor) bevelShadowColor.value = s.bevel.shadow.color;
        const bevelShadowAlpha = document.getElementById('tt-bevel-shadow-alpha-input');
        if (bevelShadowAlpha) bevelShadowAlpha.value = s.bevel.shadow.alpha;

        // Lettering controls
        const letteringActive = document.getElementById('tt-lettering-active-input');
        if (letteringActive) letteringActive.checked = s.lettering.active;
        const letteringBoggleActive = document.getElementById('tt-lettering-boggle-active-input');
        if (letteringBoggleActive) letteringBoggleActive.checked = s.lettering.boggle.active;
        const letteringBoggleAngle = document.getElementById('tt-lettering-boggle-angle-input');
        if (letteringBoggleAngle) letteringBoggleAngle.value = s.lettering.boggle.angle;
        const letteringBoggleAmplitude = document.getElementById('tt-lettering-boggle-amplitude-input');
        if (letteringBoggleAmplitude) letteringBoggleAmplitude.value = s.lettering.boggle.amplitude;
        const letteringReverseActive = document.getElementById('tt-lettering-reverse-active-input');
        if (letteringReverseActive) letteringReverseActive.checked = s.lettering.reverseOverlap.active;
        const letteringReverseLetters = document.getElementById('tt-lettering-reverse-letters-input');
        if (letteringReverseLetters) letteringReverseLetters.value = s.lettering.reverseOverlap.letters;
        const letteringReverseLines = document.getElementById('tt-lettering-reverse-lines-input');
        if (letteringReverseLines) letteringReverseLines.value = s.lettering.reverseOverlap.lines;

        // Distort controls
        const distortActive = document.getElementById('tt-distort-active-input');
        if (distortActive) distortActive.checked = s.distort.active;
        const distortArc = document.getElementById('tt-distort-arc-input');
        if (distortArc) distortArc.value = s.distort.arc.angle;

        // Texture controls
        const fillTextureActive = document.getElementById('tt-fill-texture-active-input');
        if (fillTextureActive) fillTextureActive.checked = s.fill.texture.active;
        const fillTextureSrc = document.getElementById('tt-fill-texture-src-input');
        if (fillTextureSrc) fillTextureSrc.value = s.fill.texture.src || '';
        const fillTextureSize = document.getElementById('tt-fill-texture-size-input');
        if (fillTextureSize) fillTextureSize.value = s.fill.texture.size;
        const fillTextureAlpha = document.getElementById('tt-fill-texture-alpha-input');
        if (fillTextureAlpha) fillTextureAlpha.value = s.fill.texture.alpha;

        const outlineTextureActive = document.getElementById('tt-outline-texture-active-input');
        if (outlineTextureActive) outlineTextureActive.checked = s.outline.texture.active;
        const outlineTextureSrc = document.getElementById('tt-outline-texture-src-input');
        if (outlineTextureSrc) outlineTextureSrc.value = s.outline.texture.src || '';
        const outlineTextureSize = document.getElementById('tt-outline-texture-size-input');
        if (outlineTextureSize) outlineTextureSize.value = s.outline.texture.size;

        // Palette controls
        const outlinePaletteActive = document.getElementById('tt-outline-palette-active-input');
        if (outlinePaletteActive) outlinePaletteActive.checked = s.outline.palette.active;
        const outlinePaletteMethod = document.getElementById('tt-outline-palette-method-input');
        if (outlinePaletteMethod) outlinePaletteMethod.value = s.outline.palette.method;

        const bgActive = document.getElementById('tt-background-active-input');
        if (bgActive) bgActive.checked = s.background.active;

        const bgColor = document.getElementById('tt-background-fill-color-input');
        if (bgColor) bgColor.value = s.background.color;

        const bgAlpha = document.getElementById('tt-background-fill-alpha-input');
        if (bgAlpha) bgAlpha.value = s.background.alpha;

        const bgImageActive = document.getElementById('tt-background-image-active-input');
        if (bgImageActive) bgImageActive.checked = s.background.image.active;

        const bgImageSrc = document.getElementById('tt-background-image-input');
        if (bgImageSrc) bgImageSrc.value = s.background.image.src || '';

        const bgImageSize = document.getElementById('tt-background-image-size-input');
        if (bgImageSize) bgImageSize.value = s.background.image.size;

        const iconActive = document.getElementById('tt-icon-active-input');
        if (iconActive) iconActive.checked = s.icon.active;

        const iconSrc = document.getElementById('tt-icon-src-input');
        if (iconSrc) iconSrc.value = s.icon.src || '';

        const iconPosition = document.getElementById('tt-icon-position-input');
        if (iconPosition) iconPosition.value = s.icon.position;

        const iconSize = document.getElementById('tt-icon-size-input');
        if (iconSize) iconSize.value = s.icon.size;

        const iconOffsetX = document.getElementById('tt-icon-offset-x-input');
        if (iconOffsetX) iconOffsetX.value = s.icon.offset.x;

        const iconOffsetY = document.getElementById('tt-icon-offset-y-input');
        if (iconOffsetY) iconOffsetY.value = s.icon.offset.y;

        // Update range slider fills
        var ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(function(range) {
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
            scale: state.scale, isRendering: state.isRendering,
            transparentOutput: state.transparentOutput
        };
        try {
            state.canvas = canvas;
            state.ctx = canvas.getContext('2d');
            state.settings = settings;
            state.scale = 1;
            state.isRendering = false;
            state.transparentOutput = Boolean(options && options.transparent);
            render();
        } finally {
            state.canvas = previous.canvas;
            state.ctx = previous.ctx;
            state.settings = previous.settings;
            state.scale = previous.scale;
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
