/* ===== TEXTSTUDIO EXPORT - Download Functionality ===== */

(function() {
    'use strict';

    let editor = null;

    function init(editorInstance) {
        editor = editorInstance;
    }

    // Main download function
    function download() {
        const settings = editor.getSettings();
        const canvas = editor.getCanvas();
        const ctx = editor.getCtx();

        if (!canvas || !ctx) {
            console.error('Canvas not available for export');
            return;
        }

        const format = settings.download.format || 'png';
        const quality = settings.download.size || 'medium';
        const ratio = settings.download.ratio || 'fit';
        const spacing = settings.download.spacing || 0.05;

        // Create export canvas with appropriate scale
        const scale = getQualityScale(quality);
        const exportCanvas = createExportCanvas(canvas, ctx, scale, ratio, spacing, settings);

        // Export based on format
        switch (format) {
            case 'png':
                downloadCanvas(exportCanvas, 'png', 1.0);
                break;
            case 'transparent-png':
                downloadCanvas(exportCanvas, 'png', 1.0);
                break;
            case 'jpg':
                downloadCanvas(exportCanvas, 'jpg', 0.92);
                break;
            case 'pdf':
                downloadPDF(exportCanvas);
                break;
            default:
                downloadCanvas(exportCanvas, 'png', 1.0);
        }
    }

    // Get scale factor for quality
    function getQualityScale(quality) {
        switch (quality) {
            case 'medium': return 1;   // LITE
            case 'big': return 2;     // PRO
            case 'max': return 4;     // ULTRA
            default: return 1;
        }
    }

    // Create export canvas with proper dimensions and content
    function createExportCanvas(sourceCanvas, sourceCtx, scale, ratio, spacing, settings) {
        const sourceWidth = sourceCanvas.width;
        const sourceHeight = sourceCanvas.height;

        // Calculate export dimensions
        let exportWidth = sourceWidth * scale;
        let exportHeight = sourceHeight * scale;

        // Apply aspect ratio
        if (ratio !== 'fit') {
            var parts = ratio.split(':');
            var w = parseFloat(parts[0]);
            var h = parseFloat(parts[1]);
            var ratioVal = w / h;
            var sourceRatio = sourceWidth / sourceHeight;

            if (ratioVal > sourceRatio) {
                exportHeight = exportWidth / ratioVal;
            } else {
                exportWidth = exportHeight * ratioVal;
            }
        }

        // Add spacing
        var spacingPx = spacing * Math.min(exportWidth, exportHeight);
        exportWidth += spacingPx * 2;
        exportHeight += spacingPx * 2;

        // Create export canvas
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;
        var exportCtx = exportCanvas.getContext('2d');

        // Fill background
        if (settings.background.active && settings.background.alpha > 0) {
            exportCtx.fillStyle = settings.background.color;
            exportCtx.globalAlpha = settings.background.alpha;
            exportCtx.fillRect(0, 0, exportWidth, exportHeight);
            exportCtx.globalAlpha = 1;
        } else {
            exportCtx.fillStyle = '#000000';
            exportCtx.fillRect(0, 0, exportWidth, exportHeight);
        }

        // Draw source canvas
        exportCtx.drawImage(
            sourceCanvas,
            spacingPx,
            spacingPx,
            exportWidth - spacingPx * 2,
            exportHeight - spacingPx * 2
        );

        return exportCanvas;
    }

    // Download canvas as image
    function downloadCanvas(canvas, format, quality) {
        var mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        var fileName = generateFileName(format);

        if (format === 'png') {
            canvas.toBlob(function(blob) {
                saveBlob(blob, fileName);
            }, mimeType, quality);
        } else {
            // For JPG, create a white background
            var tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            var tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);

            tempCanvas.toBlob(function(blob) {
                saveBlob(blob, fileName);
            }, mimeType, quality);
        }
    }

    // Download as PDF
    function downloadPDF(canvas) {
        var imgData = canvas.toDataURL('image/png');
        var fileName = generateFileName('pdf');

        // For simplicity, download as PNG with .pdf extension
        var link = document.createElement('a');
        link.href = imgData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Save blob to file
    function saveBlob(blob, fileName) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Generate file name
    function generateFileName(format) {
        var date = new Date();
        var timestamp = date.getFullYear() + '' +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') + '_' +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');

        var ext = format === 'jpg' ? 'jpg' : format === 'pdf' ? 'pdf' : 'png';
        return 'textstudio_' + timestamp + '.' + ext;
    }

    // Export the module
    window.ExportManager = {
        init: init,
        download: download
    };

})();
