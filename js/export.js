/* ===== TEXTMUY EXPORT - PNG Transparent Download ===== */

(function() {
    'use strict';

    let editor = null;

    function init(editorInstance) {
        editor = editorInstance;
    }

    // Main download function - exports transparent PNG at custom size
    function download() {
        const settings = editor.getSettings();
        const widthInput = document.getElementById('tt-custom-width-input');
        const heightInput = document.getElementById('tt-custom-height-input');

        const width = widthInput ? parseInt(widthInput.value) || 1920 : settings.canvas.width;
        const height = heightInput ? parseInt(heightInput.value) || 1080 : settings.canvas.height;

        // Create export canvas with exact dimensions
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.textBaseline = 'middle';
        exportCtx.textAlign = 'center';

        // Do NOT draw background - leave transparent

        // Get settings and render text with auto-fit
        const s = settings;
        const fontName = window.FontLoader ? FontLoader.getFontName(s.font) : s.font;
        const fontWeight = s.fontWeight || 'normal';

        // Auto-fit: binary search for best font size
        const padding = width * (s.canvas.padding || 0.05);
        const availW = width - padding * 2;
        const availH = height - padding * 2;
        const text = s.text || 'TEXT';
        const lines = text.split('\n');

        let lo = 8, hi = 400, best = 8;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            exportCtx.font = `${fontWeight} ${mid}px ${fontName}`;
            let maxLineWidth = 0;
            for (let i = 0; i < lines.length; i++) {
                const w = exportCtx.measureText(lines[i]).width;
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
        exportCtx.font = `${fontWeight} ${fontSizePx}px ${fontName}`;

        const centerX = width / 2;
        const centerY = height / 2;

        // Render text effects (same order as editor)
        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((s.rotate * Math.PI) / 180);

        // Use the editor's internal render functions by temporarily swapping canvas
        // Save original canvas/ctx
        const origCanvas = editor.getCanvas();
        const origCtx = editor.getCtx();

        // Temporarily set our export canvas as the editor's canvas
        // We need to access the internal state - use a workaround
        // Actually, let's just call the editor's render which uses its own canvas
        // Then copy the text portion (without background) to our export canvas

        // Simpler approach: render to editor canvas, then copy pixels to export canvas
        // But editor canvas has background...

        // Best approach: temporarily disable background, render, copy, restore
        const bgActive = s.background.active;
        s.background.active = false;

        // Set canvas dimensions for export
        const origWidth = origCanvas.width;
        const origHeight = origCanvas.height;

        origCanvas.width = width;
        origCanvas.height = height;

        editor.render();

        // Copy rendered content to export canvas
        exportCtx.clearRect(0, 0, width, height);
        exportCtx.drawImage(origCanvas, 0, 0);

        // Restore
        s.background.active = bgActive;
        origCanvas.width = origWidth;
        origCanvas.height = origHeight;
        editor.render();

        exportCtx.restore();

        // Download as PNG
        const fileName = generateFileName();
        exportCanvas.toBlob(function(blob) {
            saveBlob(blob, fileName);
        }, 'image/png');
    }

    // Save blob to file
    function saveBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Generate file name
    function generateFileName() {
        const date = new Date();
        const timestamp = date.getFullYear() + '' +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') + '_' +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');
        return 'textmuy_' + timestamp + '.png';
    }

    // Export the module
    window.ExportManager = {
        init: init,
        download: download
    };

})();