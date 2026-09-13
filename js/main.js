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

        // Gating Const. III: el editor SOLO opera con el puente del plugin.
        // Espera breve a que llegue textmuy-bridge-ready; si no, muestra error
        // claro y detiene la inicializacion (cero fetches locales, cero 404).
        var bridgeChecked = false;
        function arrancarEditor() {
            if (bridgeChecked) return;
            bridgeChecked = true;
            if (!window.TMMotor) {
                mostrarErrorSinPuente();
                return;
            }
            TextEditor.init('tt-canvas');

            // Initialize controls (pass editor instance)
            if (window.Controls) {
                Controls.init(TextEditor);
            }

            // Initialize export manager
            if (window.ExportManager) {
                ExportManager.init(TextEditor);
            }

            // Hide loading overlay
            var loading = document.getElementById('tt-canvas-loading');
            if (loading) {
                setTimeout(function() { loading.style.display = 'none'; }, 300);
            }

            // Initialize range slider visual fills
            initRangeSliders();
        }

        function mostrarErrorSinPuente() {
            var loading = document.getElementById('tt-canvas-loading');
            if (loading) {
                loading.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">' +
                    '<h2>Editor de estilos de texto</h2>' +
                    '<p><strong>Este editor solo funciona dentro del plugin Personalizador PDF.</strong></p>' +
                    '<p>Abre la pesta&ntilde;a <em>Estilos de Texto</em> del panel de administraci&oacute;n.</p>' +
                    '</div>';
                loading.style.display = 'block';
            }
        }

        window.addEventListener('textmuy-bridge-ready', arrancarEditor);
        // Fallback: si el puente ya llego antes de este script, arranca ya.
        if (window.TMMotor) {
            arrancarEditor();
        } else {
            // Timeout de gracia: si en 2s no llego el puente, muestra error.
            setTimeout(function () { if (!bridgeChecked) arrancarEditor(); }, 2000);
        }

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

    function updateRangeFill(el) {
        var min = parseFloat(el.min) || 0;
        var max = parseFloat(el.max) || 1;
        var val = parseFloat(el.value) || 0;
        var percent = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(90deg, #4a90d9 ' + percent + '%, #ddd ' + percent + '%)';
    }
})();