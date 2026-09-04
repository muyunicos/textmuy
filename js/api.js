/* ===== TEXTMUY API - client-side PNG rendering ===== */
(function() {
    'use strict';

    function mergeDeep(target, source) {
        if (!source || typeof source !== 'object') return target;
        Object.keys(source).forEach(function(key) {
            const value = source[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                mergeDeep(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    async function loadPresetByName(name) {
        try {
            const saved = JSON.parse(localStorage.getItem('textmuy_presets') || '{}');
            if (saved[name]) return saved[name];
            // Imports made by the editor before the API existed use this key
            // and wrap the actual preset with metadata.
            const imported = JSON.parse(localStorage.getItem('textstudio_presets') || '{}');
            if (imported[name]) return imported[name].preset || imported[name];
        } catch (_) { /* storage is optional */ }
        const response = await fetch('presets/' + encodeURIComponent(name) + '.json');
        if (!response.ok) throw new Error('Preset not found: ' + name);
        return response.json();
    }

    async function renderTextToPNG(params) {
        params = params || {};
        if (typeof params.text !== 'string') throw new Error('text must be a string');
        if (!params.preset && !params.settings) throw new Error('preset or settings is required');
        if (!window.TextEditor || !window.ExportManager) throw new Error('TextMuy has not finished loading');

        let settings;
        if (params.settings) {
            // Render from current editor state (used by Download / Copy buttons)
            settings = TextEditor.createDefaultSettings();
            mergeDeep(settings, params.settings);
        } else {
            const preset = await loadPresetByName(params.preset);
            settings = TextEditor.createDefaultSettings();
            TextEditor.loadPreset(preset, settings);
        }

        settings.text = params.text;
        if (params.width) settings.canvas.width = Math.max(100, Math.min(8000, Number(params.width) || settings.canvas.width));
        if (params.height) settings.canvas.height = Math.max(100, Math.min(8000, Number(params.height) || settings.canvas.height));
        mergeDeep(settings, params.overrides || {});

        const canvas = ExportManager.canvasFromSettings(settings);
        return ExportManager.toBlob(canvas);
    }

    async function downloadPNG(params) {
        const blob = await renderTextToPNG(params);
        const name = (params && params.preset ? params.preset : 'textmuy') + '_' + Date.now() + '.png';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 0);
        return name;
    }

    async function copyImageToClipboard(params) {
        const blob = await renderTextToPNG(params || {});
        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error('Clipboard API not available in this browser. Use HTTPS or localhost.');
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
    }

    window.TextMuyAPI = {
        renderTextToPNG: renderTextToPNG,
        downloadPNG: downloadPNG,
        copyImageToClipboard: copyImageToClipboard,
        loadPresetByName: loadPresetByName
    };
})();