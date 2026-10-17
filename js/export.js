/* ===== TEXTMUY EXPORT - exact-size transparent PNG ===== */
(function() {
    'use strict';

    let editor = null;
    function init(editorInstance) { editor = editorInstance; }

    // Lienzo de exportacion + settings con fondo apagado (PNG siempre
    // transparente: el damero es solo ayuda visual). Compartido por las dos
    // rutas (sincrona y async con espera de fuente): antes cada una armaba lo
    // mismo y jscpd lo marcaba como clon.
    function prepararCanvasExport(settings) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(100, Math.min(8000, Number(settings.canvas.width) || 1920));
        canvas.height = Math.max(100, Math.min(8000, Number(settings.canvas.height) || 1080));
        const exportSettings = JSON.parse(JSON.stringify(settings));
        exportSettings.background.active = false;
        // Presets con la forma legacy background.image o la actual
        // background.fill.image: ambas apagadas para un PNG transparente real.
        if (exportSettings.background.image) exportSettings.background.image.active = false;
        if (exportSettings.background.fill && exportSettings.background.fill.image) {
            exportSettings.background.fill.image.active = false;
        }
        return { canvas: canvas, exportSettings: exportSettings };
    }

    function canvasFromSettings(settings) {
        const prep = prepararCanvasExport(settings);
        editor.renderToCanvas(prep.canvas, prep.exportSettings, { transparent: true });
        return prep.canvas;
    }

    // RC39 (001-fix-bugs-01): espera a que la fuente declarada este disponible
    // ANTES de dibujar. Sin esta espera, exportar el PNG podia producir una
    // imagen con la tipografia del sistema si la fuente aun no habia
    // terminado de bajar (mismo defecto que en la vista, en el camino de
    // salida). Si la fuente no se puede cargar, lanza con causa y NO se
    // produce la imagen con otra tipografia (FR-005).
    async function canvasFromSettingsAsync(settings) {
        const prep = prepararCanvasExport(settings);
        if (editor.renderToCanvasConFuente) {
            await editor.renderToCanvasConFuente(prep.canvas, prep.exportSettings, { transparent: true });
        } else {
            editor.renderToCanvas(prep.canvas, prep.exportSettings, { transparent: true });
        }
        return prep.canvas;
    }

    function toBlob(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob);
                else reject(new Error('No se pudo crear el PNG'));
            }, 'image/png');
        });
    }

    async function download() {
        if (!editor) throw new Error('El gestor de exportacion no fue inicializado');
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
