/* ===== TEXTSTUDIO MAIN - Initialization ===== */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        TextEditor.init('tt-canvas');
        TextControls.init(TextEditor);
        ExportManager.init(TextEditor);

        var loading = document.getElementById('tt-canvas-loading');
        if (loading) {
            setTimeout(function() { loading.style.display = 'none'; }, 500);
        }

        var textarea = document.getElementById('tt-text-textarea');
        if (textarea) { textarea.value = 'TEXT'; }

        initRangeSliders();

        var bgCheckbox = document.getElementById('tt-background-active-input');
        if (bgCheckbox) { bgCheckbox.checked = true; }

        var fillCheckbox = document.getElementById('tt-fill-active-input');
        if (fillCheckbox) { fillCheckbox.checked = true; }

        var textSection = document.querySelector('#tt-options section[data-name="text"]');
        if (textSection) { textSection.classList.add('active'); }

        var fillColumn = document.querySelector('[data-custom="fill"]');
        if (fillColumn) { fillColumn.style.display = 'flex'; }

        var fillMenu = document.querySelector('#tt-custom-menu li[data-filter="fill"]');
        if (fillMenu) { fillMenu.classList.add('selected'); }
    });

    function initRangeSliders() {
        var ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(function(range) { updateRangeFill(range); });
    }

    function updateRangeFill(el) {
        var min = parseFloat(el.min) || 0;
        var max = parseFloat(el.max) || 1;
        var val = parseFloat(el.value) || 0;
        var percent = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(90deg, #4a90d9 ' + percent + '%, #ddd ' + percent + '%)';
    }

    window.addEventListener('resize', function() {
        if (window.TextEditor) { TextEditor.render(); }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (window.ExportManager) { ExportManager.download(); }
        }
    });

    var showMenuIcon = document.getElementById('show-menu-icon');
    var menuHeader = document.getElementById('menu-header');
    if (showMenuIcon && menuHeader) {
        showMenuIcon.addEventListener('click', function() {
            menuHeader.style.display = menuHeader.style.display === 'block' ? 'none' : 'block';
        });
    }

})();
