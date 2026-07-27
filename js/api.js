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
        if (!params.preset) throw new Error('preset is required');
        if (!window.TextEditor || !window.ExportManager) throw new Error('TextMuy has not finished loading');

        const preset = await loadPresetByName(params.preset);
        const settings = TextEditor.createDefaultSettings();
        TextEditor.loadPreset(preset, settings);
        settings.text = params.text;
        mergeDeep(settings, params.overrides || {});

        const canvas = ExportManager.canvasFromSettings(settings);
        return ExportManager.toBlob(canvas);
    }

    async function downloadPNG(params) {
        const blob = await renderTextToPNG(params);
        const name = (params.preset || 'textmuy') + '_' + Date.now() + '.png';
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

    window.TextMuyAPI = { renderTextToPNG: renderTextToPNG, downloadPNG: downloadPNG, loadPresetByName: loadPresetByName };
})();
