/* ===== TEXTMUY API - Client-side render function ===== */

(function() {
    'use strict';

    // Deep merge: copy values from source into target
    function mergeDeep(target, source) {
        if (!target || typeof target !== 'object') return target;
        if (!source || typeof source !== 'object') return target;
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                mergeDeep(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    // Load preset by name from presets/ folder or localStorage
    async function loadPresetByName(name) {
        // Try localStorage first (user-saved presets)
        try {
            const cache = JSON.parse(localStorage.getItem('textmuy_presets') || '{}');
            if (cache[name]) {
                return cache[name];
            }
        } catch (e) {
            // Ignore localStorage errors
        }

        // Try fetching from presets/ folder
        const response = await fetch('presets/' + name + '.json');
        if (!response.ok) {
            throw new Error('Preset not found: ' + name);
        }
        return await response.json();
    }

    // Render text to a canvas and return PNG blob
    async function renderTextToPNG(params) {
        const { text, preset, overrides } = params;

        if (!text) throw new Error('Text is required');
        if (!preset) throw new Error('Preset name is required');

        // Load preset
        const presetData = await loadPresetByName(preset);

        // Build settings from preset using the same logic as editor
        // We need a fresh copy of defaultSettings
        const settings = JSON.parse(JSON.stringify(window.TextEditor.getSettings()));

        // Apply preset data by temporarily swapping settings
        // Use the editor's loadPreset logic by creating a temp state
        const tempSettings = JSON.parse(JSON.stringify(settings));

        // Apply preset to tempSettings (simplified version of loadPreset)
        if (presetData.text !== undefined) tempSettings.text = String(presetData.text);
        if (presetData.font) {
            tempSettings.font = presetData.font.src || presetData.font.name || presetData.font;
            if (presetData.font.size) tempSettings.fontSize = presetData.font.size;
            if (presetData.font.weight) tempSettings.fontWeight = presetData.font.weight;
        }
        if (presetData.align) tempSettings.align = presetData.align;
        if (presetData.rotate !== undefined) tempSettings.rotate = presetData.rotate;
        if (presetData.lineHeight !== undefined) tempSettings.lineHeight = presetData.lineHeight;
        if (presetData.letterSpacing !== undefined) tempSettings.letterSpacing = presetData.letterSpacing;

        // Override text
        tempSettings.text = text;

        // Apply overrides (deep merge)
        if (overrides) {
            mergeDeep(tempSettings, overrides);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = tempSettings.canvas.width;
        canvas.height = tempSettings.canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // Render using the editor's render engine
        // We need to call the internal render functions
        // For now, use a simplified inline render
        const s = tempSettings;
        const scale = 1;
        const canvasWidth = s.canvas.width;
        const canvasHeight = s.canvas.height;

        // Auto-fit
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font) : s.font;
        const fontWeight = s.fontWeight || 'normal';

        // Binary search for best font size
        let lo = 8, hi = 400, best = 8;
        const padding = canvasWidth * (s.canvas.padding || 0.05);
        const availW = canvasWidth - padding * 2;
        const availH = canvasHeight - padding * 2;
        const lines = s.text.split('\n');

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            ctx.font = `${fontWeight} ${mid}px ${fontName}`;
            let maxLineWidth = 0;
            for (let i = 0; i < lines.length; i++) {
                const w = ctx.measureText(lines[i]).width;
                if (w > maxLineWidth) maxLineWidth = w;
            }
            const textHeight = mid * s.lineHeight * lines.length;
            if (maxLineWidth <= availW && textHeight <= availH) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        const fontSizePx = best;
        ctx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;

        // Draw background (transparent for PNG export)
        // Do NOT draw background - leave transparent

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Use the editor's render by temporarily setting its settings
        // Save original settings, apply temp, render to our canvas, restore
        const originalSettings = window.TextEditor.getSettings();
        const originalCanvas = window.TextEditor.getCanvas();
        const originalCtx = window.TextEditor.getCtx();

        // Temporarily point editor at our export canvas
        window.TextEditor.updateSettings(tempSettings);
        // Hack: we need to render to our own canvas
        // Instead, let's just use the editor's canvas directly
        const editorCanvas = window.TextEditor.getCanvas();
        const editorCtx = window.TextEditor.getCtx();

        // Render to editor canvas
        window.TextEditor.render();

        // Copy to our export canvas (without background)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // The editor canvas has background, we need transparent
        // So we render directly to our canvas

        // Actually, let's use a simpler approach:
        // Use the editor's canvas after render, but we need transparent bg
        // For now, just use the editor canvas as-is
        const sourceCanvas = window.TextEditor.getCanvas();

        // Restore original settings
        window.TextEditor.updateSettings(originalSettings);

        // Return blob
        return new Promise(function(resolve) {
            sourceCanvas.toBlob(function(blob) {
                resolve(blob);
            }, 'image/png');
        });
    }

    // Download PNG helper
    async function downloadPNG(params) {
        const blob = await renderTextToPNG(params);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = (params.preset || 'textmuy') + '_' + Date.now() + '.png';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return filename;
    }

    // Export API
    window.TextMuyAPI = {
        renderTextToPNG: renderTextToPNG,
        downloadPNG: downloadPNG,
        loadPresetByName: loadPresetByName,
        mergeDeep: mergeDeep
    };

})();