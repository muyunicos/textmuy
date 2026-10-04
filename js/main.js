/* ===== TEXTMUY MAIN - Initialization ===== */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Prevent native HTML5 drag ghosts while dragging controls (sliders,
        // gradient handles...): the "no-drop" cursor and the dragged element
        // come from the browser's built-in drag behavior, not from the app.
        document.addEventListener('dragstart', function(e) {
            if (e.target && e.target.closest && e.target.closest('#tt')) {
                e.preventDefault();
            }
        });

        // Initialize editor
        TextEditor.init('tt-canvas');
        
        // Initialize controls (pass editor instance)
        if (window.Controls) {
            Controls.init(TextEditor);
        }
        
        // Initialize export manager
        if (window.ExportManager) {
            ExportManager.init(TextEditor);
        }

        // RC45: si el puente llega DESPUES del arranque (p. ej. >1.2 s), el
        // catalogo quedo vacio y la fuente declarada quedo fallida con su
        // aviso visible. Al llegar el puente se relee el catalogo y se
        // reintenta la fuente: el aviso se limpia y el lienzo se repinta
        // solo, sin que el usuario tenga que tocar el selector.
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('textmuy-bridge-ready', reintentarFuenteDeclarada);
        }

        // Hide loading overlay (y retirar la clase de carga: RC44)
        var loading = document.getElementById('tt-canvas-loading');
        if (loading) {
            setTimeout(function() { loading.style.display = 'none'; var ttRoot = document.getElementById('tt'); if (ttRoot && ttRoot.classList) ttRoot.classList.remove('tt-loading'); }, 300);
        }

        // Initialize range slider visual fills
        initRangeSliders();

        // Ensure fill is active by default
        var fillCheckbox = document.getElementById('tt-fill-active-input');
        if (fillCheckbox && !fillCheckbox.checked) {
            fillCheckbox.checked = true;
        }

        // Show TEXT section by default
        var textSection = document.querySelector('#tt-options section[data-name="text"]');
        if (textSection) {
            textSection.style.display = 'flex';
        }

        // Hide all custom columns except fill
        var customColumns = document.querySelectorAll('[data-custom]');
        customColumns.forEach(function(col) {
            if (col.dataset.custom !== 'fill' && col.dataset.custom !== 'fill-lettering' && col.dataset.custom !== 'fill-depth') {
                col.style.display = 'none';
            }
        });

        // Select first custom menu item
        var fillMenu = document.querySelector('#tt-custom-menu li[data-filter="fill"]');
        if (fillMenu) {
            fillMenu.classList.add('selected');
        }
        
        // Fix custom menu to show fill columns
        var customSection = document.querySelector('section[data-name="custom"]');
        if (customSection) {
            var columns = customSection.querySelector('.tt-columns');
            if (columns) {
                columns.querySelectorAll('.tt-column').forEach(function(col) {
                    var custom = col.dataset.custom;
                    if (custom && (custom === 'fill' || custom === 'fill-lettering' || custom === 'fill-depth')) {
                        col.style.display = 'flex';
                    } else {
                        col.style.display = 'none';
                    }
                });
            }
        }

        // Listen for resize to re-render
        window.addEventListener('resize', function() {
            if (window.TextEditor) {
                TextEditor.render();
            }
        });

        // Ctrl+Enter to download
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (window.TextMuyAPI && window.TextEditor) {
                    var w = parseInt(document.getElementById('tt-download-width-input')?.value || 480);
                    var h = parseInt(document.getElementById('tt-download-height-input')?.value || 320);
                    TextMuyAPI.downloadPNG({
                        settings: TextEditor.getSettings(),
                        text: TextEditor.getSettings().text,
                        width: w,
                        height: h
                    });
                }
            }
        });
    });

    function initRangeSliders() {
        var ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(function(range) {
            updateRangeFill(range);
            // Add input listener for live fill update
            range.addEventListener('input', function() {
                updateRangeFill(this);
            });
        });
    }

    // RC45: reintento de la fuente declarada cuando el puente llega tarde.
    // No hace nada si la fuente ya esta disponible o en curso; si el catalogo
    // aun no estaba, loadCatalog() lo trae con la base del puente y despues
    // se asegura la fuente y se repinta. Un fallo real se mantiene visible
    // en #tt-font-error (asegurarFuenteDeclarada nunca rechaza).
    function reintentarFuenteDeclarada() {
        if (!window.TextEditor || !window.FontLoader || !window.FontLoader.loadCatalog) return;
        var ref = null;
        try {
            var s = window.TextEditor.getSettings ? window.TextEditor.getSettings() : null;
            ref = (s && s.font) ? (s.font.src !== undefined ? s.font.src : s.font) : null;
        } catch (_) { return; }
        if (ref === null || ref === undefined || ref === '') return;
        var estado = window.FontLoader.getFontState ? window.FontLoader.getFontState(ref) : null;
        if (estado === 'disponible' || estado === 'pendiente') return;
        window.FontLoader.loadCatalog().then(function() {
            return window.TextEditor.asegurarFuenteDeclarada ? window.TextEditor.asegurarFuenteDeclarada() : null;
        }).then(function() {
            if (window.TextEditor.render) window.TextEditor.render();
        }).catch(function() { /* el fallo se muestra en #tt-font-error */ });
    }

    function updateRangeFill(el) {
        var min = parseFloat(el.min) || 0;
        var max = parseFloat(el.max) || 1;
        var val = parseFloat(el.value) || 0;
        var percent = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(90deg, #4a90d9 ' + percent + '%, #ddd ' + percent + '%)';
    }
})();
