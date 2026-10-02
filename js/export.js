/* ===== TEXTMUY EXPORT - exact-size transparent PNG ===== */
(function() {
    'use strict';

    let editor = null;
    function init(editorInstance) { editor = editorInstance; }

    function canvasFromSettings(settings) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(100, Math.min(8000, Number(settings.canvas.width) || 1920));
        canvas.height = Math.max(100, Math.min(8000, Number(settings.canvas.height) || 1080));
        const exportSettings = JSON.parse(JSON.stringify(settings));
        // The PNG option is intentionally always transparent.  The checkerboard
        // is a preview aid only and must never become exported pixels.
        exportSettings.background.active = false;
        // Presets can use either the legacy background.image form or the
        // current background.fill.image form.  Both must be disabled for a
        // genuinely transparent export.
        if (exportSettings.background.image) exportSettings.background.image.active = false;
        if (exportSettings.background.fill && exportSettings.background.fill.image) {
            exportSettings.background.fill.image.active = false;
        }
        editor.renderToCanvas(canvas, exportSettings, { transparent: true });
        return canvas;
    }

    // RC39 (001-fix-bugs-01): espera a que la fuente declarada este disponible
    // ANTES de dibujar. Sin esta espera, exportar el PNG podia producir una
    // imagen con la tipografia del sistema si la fuente aun no habia
    // terminado de bajar (mismo defecto que en la vista, en el camino de
    // salida). Si la fuente no se puede cargar, lanza con causa y NO se
    // produce la imagen con otra tipografia (FR-005).
    async function canvasFromSettingsAsync(settings) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(100, Math.min(8000, Number(settings.canvas.width) || 1920));
        canvas.height = Math.max(100, Math.min(8000, Number(settings.canvas.height) || 1080));
        const exportSettings = JSON.parse(JSON.stringify(settings));
        // El PNG es siempre transparente: el damero es solo ayuda visual.
        exportSettings.background.active = false;
        if (exportSettings.background.image) exportSettings.background.image.active = false;
        if (exportSettings.background.fill && exportSettings.background.fill.image) {
            exportSettings.background.fill.image.active = false;
        }
        if (editor.renderToCanvasConFuente) {
            await editor.renderToCanvasConFuente(canvas, exportSettings, { transparent: true });
        } else {
            editor.renderToCanvas(canvas, exportSettings, { transparent: true });
        }
        return canvas;
    }

    function toBlob(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob);
                else reject(new Error('Could not create PNG'));
            }, 'image/png');
        });
    }

    async function download() {
        if (!editor) throw new Error('Export manager has not been initialized');
        const blob = await toBlob(await canvasFromSettingsAsync(editor.getSettings()));
        saveBlob(blob, generateFileName());
        return blob;
    }

    function saveBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 0);
    }

    function generateFileName() {
        return 'textmuy_' + new Date().toISOString().replace(/[:.]/g, '-') + '.png';
    }

    window.ExportManager = {
        init: init,
        download: download,
        canvasFromSettings: canvasFromSettings,
        canvasFromSettingsAsync: canvasFromSettingsAsync,
        toBlob: toBlob
    };
})();
