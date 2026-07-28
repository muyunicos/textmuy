/* ===== TEXTSTUDIO CONTROLS - UI Event Handlers ===== */

(function() {
    'use strict';

    let editor = null;

    function init(editorInstance) {
        editor = editorInstance;
        bindControls();
        bindMenuTabs();
        bindCustomMenu();
        bindDownloadControls();
        bindPresets();
        bindImportControls();
        initGradientPickers();
    }

    // Bind all form controls to editor settings
    function bindControls() {
        // Text textarea
        const textarea = document.getElementById('tt-text-textarea');
        if (textarea) {
            textarea.addEventListener('input', function() {
                editor.updateSettings({ text: this.value });
            });
        }

        // Font select
        const fontSelect = document.getElementById('tt-font-picker-input');
        if (fontSelect) {
            fontSelect.addEventListener('change', function() {
                editor.updateSettings({ font: this.value });
            });
        }

        // Font size (zoom)
        const zoomInput = document.getElementById('tt-font-size-input');
        if (zoomInput) {
            updateRangeFill(zoomInput);
            zoomInput.addEventListener('input', function() {
                updateRangeFill(this);
                const value = parseInt(this.value) / 100; // Convert 10-200 range to 0.1-2.0 zoom factor
                // Clamp value to reasonable range
                const clampedValue = Math.max(0.1, Math.min(2.0, value));
                setNestedSetting('canvas.zoom', clampedValue);
            });
        }

        // Letter spacing
        bindRange('tt-letter-spacing-input', 'letterSpacing', function(val) {
            return parseFloat(val) / 100; // Convert -50 to 150 to -0.5 to 1.5
        });

        // Line height
        bindRange('tt-line-height-input', 'lineHeight', function(val) {
            return parseFloat(val);
        });

        // Rotation
        bindRange('tt-rotate-input', 'rotate', function(val) {
            return parseFloat(val);
        });

        // Curve the text (arc) - moved to TEXT section
        const curveInput = document.getElementById('tt-distort-arc-angle-input');
        if (curveInput) {
            curveInput.addEventListener('input', function() {
                const value = parseFloat(this.value);
                setNestedSetting('distort.arc.angle', value);
                // Auto-activate distort when curve is changed
                if (value !== 0) {
                    setNestedSetting('distort.active', true);
                }
            });
        }

        // ===== FILL CONTROLS =====
        bindCheckbox('tt-fill-active-input', 'fill.active');
        bindColor('tt-fill-color-input', 'fill.color');
        bindCheckbox('tt-fill-gradient-active-input', 'fill.gradient.active');
        bindRange('tt-fill-gradient-angle-input', 'fill.gradient.angle', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-fill-alpha-input', 'fill.alpha', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-fill-texture-active-input', 'fill.texture.active');
        const fillTextureSrc = document.getElementById('tt-fill-texture-src-input');
        if (fillTextureSrc) {
            fillTextureSrc.addEventListener('input', function() {
                setNestedSetting('fill.texture.src', this.value);
            });
        }
        bindRange('tt-fill-texture-size-input', 'fill.texture.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-fill-texture-alpha-input', 'fill.texture.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== OUTLINE CONTROLS =====
        bindCheckbox('tt-outline-active-input', 'outline.active');
        bindRange('tt-outline-width-input', 'outline.width', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-outline-fill-color-input', 'outline.color');
        bindCheckbox('tt-outline-fill-gradient-active-input', 'outline.gradient.active');
        bindRange('tt-outline-fill-gradient-angle-input', 'outline.gradient.angle', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-outline-fill-alpha-input', 'outline.alpha', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-outline-texture-active-input', 'outline.texture.active');
        const outlineTextureSrc = document.getElementById('tt-outline-texture-src-input');
        if (outlineTextureSrc) {
            outlineTextureSrc.addEventListener('input', function() {
                setNestedSetting('outline.texture.src', this.value);
            });
        }
        bindRange('tt-outline-texture-size-input', 'outline.texture.size', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-outline-palette-active-input', 'outline.palette.active');
        const outlinePaletteMethod = document.getElementById('tt-outline-palette-method-input');
        if (outlinePaletteMethod) {
            outlinePaletteMethod.addEventListener('change', function() {
                setNestedSetting('outline.palette.method', this.value);
            });
        }

        // ===== OUTLINE 2 CONTROLS =====
        bindCheckbox('tt-outline2-active-input', 'outline2.active');
        bindRange('tt-outline2-width-input', 'outline2.width', function(val) {
            return parseFloat(val);
        });
        const outline2Join = document.getElementById('tt-outline2-join-input');
        if (outline2Join) {
            outline2Join.addEventListener('change', function() {
                setNestedSetting('outline2.join', this.value);
            });
        }
        bindColor('tt-outline2-fill-color-input', 'outline2.color');
        bindCheckbox('tt-outline2-fill-gradient-active-input', 'outline2.gradient.active');
        bindRange('tt-outline2-fill-gradient-angle-input', 'outline2.gradient.angle', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-outline2-fill-alpha-input', 'outline2.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== DEPTH (3D) CONTROLS =====
        bindCheckbox('tt-depth-active-input', 'depth.active');
        bindRange('tt-depth-length-input', 'depth.length', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-depth-angle-input', 'depth.angle', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-depth-color-input', 'depth.color');
        bindRange('tt-depth-alpha-input', 'depth.alpha', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-depth-gradient-active-input', 'depth.gradient.active');
        bindRange('tt-depth-gradient-angle-input', 'depth.gradient.angle', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-depth-texture-active-input', 'depth.texture.active');
        const depthTextureSrc = document.getElementById('tt-depth-texture-src-input');
        if (depthTextureSrc) {
            depthTextureSrc.addEventListener('input', function() {
                setNestedSetting('depth.texture.src', this.value);
            });
        }
        bindRange('tt-depth-texture-size-input', 'depth.texture.size', function(val) {
            return parseFloat(val);
        });

        // ===== INNER SHADOW CONTROLS =====
        bindCheckbox('tt-shadow-inner-active-input', 'shadowInner.active');
        bindRange('tt-shadow-inner-size-input', 'shadowInner.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-inner-distance-input', 'shadowInner.distance', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-inner-angle-input', 'shadowInner.angle', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-shadow-inner-color-input', 'shadowInner.color');
        bindRange('tt-shadow-inner-alpha-input', 'shadowInner.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== OUTER SHADOW CONTROLS =====
        bindCheckbox('tt-shadow-outer-active-input', 'shadowOuter.active');
        bindRange('tt-shadow-outer-size-input', 'shadowOuter.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-outer-distance-input', 'shadowOuter.distance', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-outer-angle-input', 'shadowOuter.angle', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-shadow-outer-fill-color-input', 'shadowOuter.color');
        bindRange('tt-shadow-outer-fill-alpha-input', 'shadowOuter.fill.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== SECOND SHADOW CONTROLS =====
        bindCheckbox('tt-shadow-outer2-active-input', 'shadowOuter2.active');
        bindRange('tt-shadow-outer2-size-input', 'shadowOuter2.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-outer2-distance-input', 'shadowOuter2.distance', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-outer2-angle-input', 'shadowOuter2.angle', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-shadow-outer2-fill-color-input', 'shadowOuter2.color');
        bindRange('tt-shadow-outer2-fill-alpha-input', 'shadowOuter2.alpha', function(val) {
            return parseFloat(val);
        });

        bindCheckbox('tt-shadow-inner2-active-input', 'shadowInner2.active');
        bindRange('tt-shadow-inner2-size-input', 'shadowInner2.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-inner2-distance-input', 'shadowInner2.distance', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-inner2-angle-input', 'shadowInner2.angle', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-shadow-inner2-offset-input', 'shadowInner2.offset', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-shadow-inner2-color-input', 'shadowInner2.color');
        bindRange('tt-shadow-inner2-alpha-input', 'shadowInner2.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== BEVEL CONTROLS =====
        bindCheckbox('tt-bevel-active-input', 'bevel.active');
        bindRange('tt-bevel-size-input', 'bevel.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-bevel-smoothing-input', 'bevel.smoothing', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-bevel-angle-input', 'bevel.angle', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-bevel-highlight-color-input', 'bevel.highlight.color');
        bindRange('tt-bevel-highlight-alpha-input', 'bevel.highlight.alpha', function(val) {
            return parseFloat(val);
        });
        bindColor('tt-bevel-shadow-color-input', 'bevel.shadow.color');
        bindRange('tt-bevel-shadow-alpha-input', 'bevel.shadow.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== LETTERING CONTROLS =====
        bindCheckbox('tt-lettering-active-input', 'lettering.active');
        bindCheckbox('tt-lettering-boggle-active-input', 'lettering.boggle.active');
        bindRange('tt-lettering-boggle-angle-input', 'lettering.boggle.angle', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-lettering-boggle-amplitude-input', 'lettering.boggle.amplitude', function(val) {
            return parseFloat(val);
        });
        bindCheckbox('tt-lettering-reverse-active-input', 'lettering.reverseOverlap.active');
        bindRange('tt-lettering-reverse-letters-input', 'lettering.reverseOverlap.letters', function(val) {
            return parseInt(val);
        });
        bindRange('tt-lettering-reverse-lines-input', 'lettering.reverseOverlap.lines', function(val) {
            return parseInt(val);
        });

        // ===== DISTORT CONTROLS =====
        bindCheckbox('tt-distort-active-input', 'distort.active');
        bindRange('tt-distort-arc-input', 'distort.arc.angle', function(val) {
            return parseFloat(val);
        });

        // ===== BACKGROUND CONTROLS =====
        bindCheckbox('tt-background-active-input', 'background.active');
        bindColor('tt-background-fill-color-input', 'background.color');
        bindRange('tt-background-fill-alpha-input', 'background.alpha', function(val) {
            return parseFloat(val);
        });

        // ===== ALIGNMENT =====
        const alignList = document.querySelector('.tt-align-list');
        if (alignList) {
            alignList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li && li.dataset.id) {
                    document.querySelectorAll('.tt-align-list li').forEach(el => el.classList.remove('selected'));
                    li.classList.add('selected');
                    editor.updateSettings({ align: li.dataset.id });
                }
            });
        }

        // ===== FONT WEIGHT (Bold) =====
        const fontWeightList = document.querySelector('.tt-font-options-list');
        if (fontWeightList) {
            // Initialize first selection
            const firstLi = fontWeightList.querySelector('li');
            if (firstLi) {
                firstLi.classList.add('selected');
                const input = document.getElementById('tt-font-weight-input');
                if (input) {
                    input.value = firstLi.dataset.selected;
                }
            }
            
            fontWeightList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li) {
                    const input = document.getElementById('tt-font-weight-input');
                    if (input) {
                        // Toggle logic: if already selected, toggle to unselected
                        if (li.classList.contains('selected')) {
                            li.classList.remove('selected');
                            input.value = li.dataset.unselected;
                            editor.updateSettings({ fontWeight: li.dataset.unselected });
                        } else {
                            document.querySelectorAll('.tt-font-options-list li').forEach(el => el.classList.remove('selected'));
                            li.classList.add('selected');
                            input.value = li.dataset.selected;
                            editor.updateSettings({ fontWeight: li.dataset.selected });
                        }
                    }
                }
            });
        }

        // ===== OUTLINE JOIN TYPE =====
        const outlineJoin = document.getElementById('tt-outline-join-input');
        if (outlineJoin) {
            outlineJoin.addEventListener('change', function() {
                setNestedSetting('outline.join', this.value);
            });
        }

        // ===== INNER SHADOW OFFSET =====
        bindRange('tt-shadow-inner-offset-input', 'shadowInner.offset', function(val) {
            return parseFloat(val);
        });

        // ===== ICON CONTROLS =====
        bindCheckbox('tt-icon-active-input', 'icon.active');
        const iconSrc = document.getElementById('tt-icon-src-input');
        if (iconSrc) {
            iconSrc.addEventListener('input', function() {
                setNestedSetting('icon.src', this.value);
            });
        }
        const iconPosition = document.getElementById('tt-icon-position-input');
        if (iconPosition) {
            iconPosition.addEventListener('change', function() {
                setNestedSetting('icon.position', this.value);
            });
        }
        bindRange('tt-icon-size-input', 'icon.size', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-icon-offset-x-input', 'icon.offset.x', function(val) {
            return parseFloat(val);
        });
        bindRange('tt-icon-offset-y-input', 'icon.offset.y', function(val) {
            return parseFloat(val);
        });

        // ===== BACKGROUND IMAGE CONTROLS =====
        bindCheckbox('tt-background-image-active-input', 'background.image.active');
        const bgImageSrc = document.getElementById('tt-background-image-input');
        if (bgImageSrc) {
            bgImageSrc.addEventListener('input', function() {
                setNestedSetting('background.image.src', this.value);
            });
        }
        const bgImageSize = document.getElementById('tt-background-image-size-input');
        if (bgImageSize) {
            bgImageSize.addEventListener('change', function() {
                setNestedSetting('background.image.size', this.value);
            });
        }
    }

    // Helper: Bind range input
    function bindRange(id, path, transform) {
        const el = document.getElementById(id);
        if (!el) return;

        updateRangeFill(el);

        el.addEventListener('input', function() {
            updateRangeFill(el);
            const value = transform ? transform(this.value) : this.value;
            setNestedSetting(path, value);
        });
    }

    // Helper: Bind checkbox
    function bindCheckbox(id, path) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            setNestedSetting(path, this.checked);
        });
    }

    // Helper: Bind color input
    function bindColor(id, path) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            setNestedSetting(path, this.value);
        });
    }

    // Helper: Set nested setting
    function setNestedSetting(path, value) {
        const parts = path.split('.');
        const settings = editor.getSettings();
        let obj = settings;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
        editor.render();
    }

    // Helper: Update range slider fill
    function updateRangeFill(el) {
        const min = parseFloat(el.min) || 0;
        const max = parseFloat(el.max) || 1;
        const val = parseFloat(el.value) || 0;
        const percent = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(90deg, #4a90d9 ' + percent + '%, #ddd ' + percent + '%)';
    }

    // ===== MENU TAB SWITCHING =====
    function bindMenuTabs() {
        const menuItems = document.querySelectorAll('#tt-options-menu li');
        const sections = document.querySelectorAll('#tt-options section');

        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                menuItems.forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');

                const name = this.dataset.name;
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.dataset.name === name) {
                        section.classList.add('active');
                    }
                });
            });
        });
    }

    // ===== CUSTOM MENU (Fill, Outline, Shadow, Bevel, Lettering, Distort) =====
    function bindCustomMenu() {
        const customMenuItems = document.querySelectorAll('#tt-custom-menu li');
        const columns = document.querySelectorAll('[data-custom]');

        customMenuItems.forEach(item => {
            item.addEventListener('click', function() {
                customMenuItems.forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');

                const filter = this.dataset.filter;
                columns.forEach(col => {
                    col.style.display = 'flex';
                    if (col.dataset.custom && col.dataset.custom !== filter) {
                        col.style.display = 'none';
                    }
                });
            });
        });
    }

    // ===== DOWNLOAD CONTROLS =====
    function bindDownloadControls() {
        function bindCanvasDimension(id, key) {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', function() {
                const value = Math.max(100, Math.min(8000, parseInt(this.value, 10) || 0));
                if (!value) return;
                const settings = editor.getSettings();
                settings.canvas[key] = value;
                editor.render();
            });
        }
        bindCanvasDimension('tt-custom-width-input', 'width');
        bindCanvasDimension('tt-custom-height-input', 'height');
        const downloadBtn = document.getElementById('tt-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                if (window.ExportManager) ExportManager.download();
            });
        }
        const sizeList = document.getElementById('tt-download-size-list');
        if (sizeList) {
            sizeList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li && li.dataset.size) {
                    document.querySelectorAll('#tt-download-size-list li').forEach(el => el.classList.remove('selected'));
                    li.classList.add('selected');
                    setNestedSetting('download.size', li.dataset.size);
                }
            });
        }

        const formatList = document.getElementById('tt-download-format-list');
        if (formatList) {
            formatList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li && li.dataset.format) {
                    document.querySelectorAll('#tt-download-format-list li').forEach(el => el.classList.remove('selected'));
                    li.classList.add('selected');
                    setNestedSetting('download.format', li.dataset.format);

                    setTimeout(() => {
                        if (window.ExportManager) {
                            ExportManager.download();
                        }
                    }, 100);
                }
            });
        }

        const ratioInput = document.getElementById('tt-download-ratio-input');
        if (ratioInput) {
            ratioInput.addEventListener('change', function() {
                setNestedSetting('download.ratio', this.value);
            });
        }

        const spacingInput = document.getElementById('tt-download-spacing-input');
        if (spacingInput) {
            spacingInput.addEventListener('change', function() {
                setNestedSetting('download.spacing', parseFloat(this.value));
            });
        }

        // Save as New Preset
        const savePresetBtn = document.getElementById('tt-save-preset-btn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', function() {
                saveAsNewPreset();
            });
        }

        // Copy Image
        const copyImageBtn = document.getElementById('tt-copy-image-btn');
        if (copyImageBtn) {
            copyImageBtn.addEventListener('click', function() {
                copyImageToClipboard();
            });
        }
    }

    function saveAsNewPreset() {
        const settings = editor.getSettings();
        const presetName = prompt('Enter preset name:', 'my-preset');
        
        if (!presetName) return;
        
        // Sanitize filename
        const safeName = presetName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        
        // Convert settings to TextStudio-compatible format
        const preset = convertSettingsToPreset(settings);
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safeName + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Preset saved as ' + safeName + '.json');
    }

    function convertSettingsToPreset(settings) {
        // Convert internal settings format to TextStudio preset format
        // Use optional chaining and default values to handle undefined properties
        const s = settings || {};
        return {
            editable: 1,
            text: s.text || 'TEXT',
            font: {
                size: s.canvas?.width ? 64 : (s.fontSize || 64),
                weight: s.fontWeight || 'normal',
                name: s.font || 'Bangers',
                src: s.font || 'Bangers'
            },
            align: s.align || 'center',
            rotate: s.rotate || 0,
            lineHeight: s.lineHeight || 1,
            letterSpacing: s.letterSpacing || 0,
            mergeGradients: 0,
            lettering: {
                editable: 1,
                active: s.lettering?.active ? 1 : 0,
                blendmode: s.lettering?.blendmode || 'over',
                boggle: {
                    active: s.lettering?.boggle?.active ? 1 : 0,
                    angle: s.lettering?.boggle?.angle || 0,
                    amplitude: s.lettering?.boggle?.amplitude || 0.1
                },
                reverseOverlap: {
                    letters: s.lettering?.reverseOverlap?.letters || 0,
                    lines: s.lettering?.reverseOverlap?.lines || 0
                },
                shadow: {
                    active: s.lettering?.shadow?.active ? 1 : 0,
                    size: s.lettering?.shadow?.size || 0,
                    distance: s.lettering?.shadow?.distance || 0,
                    angle: s.lettering?.shadow?.angle || 0,
                    fill: {
                        alpha: s.lettering?.shadow?.alpha || 1,
                        color: hexToRgb(s.lettering?.shadow?.color || '#000000')
                    }
                }
            },
            distort: {
                arc: {
                    angle: s.distort?.arc?.angle || 0
                }
            },
            processing: {
                active: s.processing?.active ? 1 : 0,
                code: s.processing?.code || null
            },
            fill: {
                editable: 1,
                active: s.fill?.active ? 1 : 0,
                alpha: s.fill?.alpha || 1,
                color: hexToRgb(s.fill?.color || '#ffffff'),
                texture: {
                    active: s.fill?.texture?.active ? 1 : 0,
                    alpha: s.fill?.texture?.alpha || 1,
                    src: s.fill?.texture?.src || null,
                    size: s.fill?.texture?.size || 1,
                    repeat: 'repeat',
                    position: 'center',
                    blendmode: s.fill?.texture?.blendmode || 'source-over'
                },
                gradient: {
                    active: s.fill?.gradient?.active ? 1 : 0,
                    angle: s.fill?.gradient?.angle || 0,
                    colors: [
                        hexToRgb(s.fill?.gradient?.startColor || '#ffffff'),
                        hexToRgb(s.fill?.gradient?.endColor || '#000000')
                    ]
                },
                palette: {
                    active: s.fill?.palette?.active ? 1 : 0,
                    lettering: {
                        method: s.fill?.palette?.lettering?.method || 'letter'
                    },
                    styles: s.fill?.palette?.styles || []
                }
            },
            depth: {
                editable: 1,
                active: s.depth?.active ? 1 : 0,
                length: s.depth?.length || 0.1,
                angle: s.depth?.angle || 135,
                fill: {
                    alpha: s.depth?.alpha || 1,
                    color: hexToRgb(s.depth?.color || '#000000'),
                    gradient: {
                        active: s.depth?.gradient?.active ? 1 : 0,
                        type: 'depth',
                        angle: s.depth?.gradient?.angle || 0,
                        colors: [
                            hexToRgb(s.depth?.gradient?.startColor || '#000000'),
                            hexToRgb(s.depth?.gradient?.endColor || '#ffffff')
                        ]
                    },
                    texture: {
                        active: s.depth?.texture?.active ? 1 : 0,
                        src: s.depth?.texture?.src || null,
                        size: s.depth?.texture?.size || 1,
                        blendmode: s.depth?.texture?.blendmode || 'source-over'
                    }
                }
            },
            depth2: {
                editable: 1,
                active: s.depth2?.active ? 1 : 0,
                length: s.depth2?.length || 0.1,
                angle: s.depth2?.angle || 135,
                fill: {
                    alpha: s.depth2?.alpha || 1,
                    color: hexToRgb(s.depth2?.color || '#000000'),
                    gradient: {
                        active: s.depth2?.gradient?.active ? 1 : 0,
                        type: 'depth',
                        angle: s.depth2?.gradient?.angle || 0,
                        colors: [
                            hexToRgb(s.depth2?.gradient?.startColor || '#000000'),
                            hexToRgb(s.depth2?.gradient?.endColor || '#ffffff')
                        ]
                    }
                }
            },
            outline: {
                global: {
                    active: s.outline?.global?.active ? 1 : 0
                },
                dash: {
                    active: s.outline?.dash?.active ? 1 : 0,
                    pattern: s.outline?.dash?.pattern || []
                },
                first: {
                    editable: 1,
                    active: s.outline?.active ? 1 : 0,
                    width: s.outline?.width || 0.1,
                    join: s.outline?.join || 'round',
                    fill: {
                        alpha: s.outline?.alpha || 1,
                        color: hexToRgb(s.outline?.color || '#000000'),
                        gradient: {
                            active: s.outline?.gradient?.active ? 1 : 0,
                            angle: s.outline?.gradient?.angle || 0,
                            colors: [
                                hexToRgb(s.outline?.gradient?.startColor || '#000000'),
                                hexToRgb(s.outline?.gradient?.endColor || '#000000')
                            ]
                        },
                        texture: {
                            active: s.outline?.texture?.active ? 1 : 0,
                            src: s.outline?.texture?.src || null,
                            size: s.outline?.texture?.size || 1,
                            blendmode: s.outline?.texture?.blendmode || 'source-over'
                        },
                        palette: {
                            active: s.outline?.palette?.active ? 1 : 0,
                            lettering: {
                                method: s.outline?.palette?.method || 'letter'
                            },
                            styles: s.outline?.palette?.styles || []
                        }
                    }
                },
                second: {
                    editable: 1,
                    active: s.outline2?.active ? 1 : 0,
                    width: s.outline2?.width || 0.1,
                    join: s.outline2?.join || 'round',
                    fill: {
                        alpha: s.outline2?.alpha || 1,
                        color: hexToRgb(s.outline2?.color || '#000000'),
                        gradient: {
                            active: s.outline2?.gradient?.active ? 1 : 0,
                            angle: s.outline2?.gradient?.angle || 0,
                            colors: [
                                hexToRgb(s.outline2?.gradient?.startColor || '#000000'),
                                hexToRgb(s.outline2?.gradient?.endColor || '#000000')
                            ]
                        }
                    }
                }
            },
            bevel: {
                inner: {
                    editable: 1,
                    active: s.bevel?.active ? 1 : 0,
                    size: s.bevel?.size || 0.1,
                    smoothing: s.bevel?.smoothing || 0,
                    soften: s.bevel?.soften || 0.1,
                    angle: s.bevel?.angle || 135,
                    highlight: {
                        alpha: s.bevel?.highlight?.alpha || 1,
                        color: hexToRgb(s.bevel?.highlight?.color || '#ffffff')
                    },
                    shadow: {
                        alpha: s.bevel?.shadow?.alpha || 1,
                        color: hexToRgb(s.bevel?.shadow?.color || '#000000')
                    }
                }
            },
            shadow: {
                outer: {
                    editable: 1,
                    active: s.shadowOuter?.active ? 1 : 0,
                    size: s.shadowOuter?.size || 0,
                    distance: s.shadowOuter?.distance || 0,
                    angle: s.shadowOuter?.angle || 0,
                    strength: s.shadowOuter?.strength || 0,
                    fill: {
                        alpha: s.shadowOuter?.alpha || 1,
                        color: hexToRgb(s.shadowOuter?.color || '#000000')
                    },
                    blendmode: s.shadowOuter?.blendmode || 'normal'
                },
                outer2: {
                    editable: 1,
                    active: s.shadowOuter2?.active ? 1 : 0,
                    size: s.shadowOuter2?.size || 0,
                    distance: s.shadowOuter2?.distance || 0,
                    angle: s.shadowOuter2?.angle || 0,
                    fill: {
                        alpha: s.shadowOuter2?.alpha || 1,
                        color: hexToRgb(s.shadowOuter2?.color || '#000000')
                    },
                    blendmode: s.shadowOuter2?.blendmode || 'normal'
                },
                inner: {
                    editable: 1,
                    active: s.shadowInner?.active ? 1 : 0,
                    size: s.shadowInner?.size || 0,
                    distance: s.shadowInner?.distance || 0,
                    angle: s.shadowInner?.angle || 0,
                    offset: s.shadowInner?.offset || 0,
                    alpha: s.shadowInner?.alpha || 1,
                    color: hexToRgb(s.shadowInner?.color || '#000000'),
                    blendmode: s.shadowInner?.blendmode || 'normal'
                },
                inner2: {
                    editable: 1,
                    active: s.shadowInner2?.active ? 1 : 0,
                    size: s.shadowInner2?.size || 0,
                    distance: s.shadowInner2?.distance || 0,
                    angle: s.shadowInner2?.angle || 0,
                    offset: s.shadowInner2?.offset || 0,
                    alpha: s.shadowInner2?.alpha || 1,
                    color: hexToRgb(s.shadowInner2?.color || '#000000'),
                    blendmode: s.shadowInner2?.blendmode || 'normal'
                }
            },
            icon: {
                editable: 1,
                active: s.icon?.active ? 1 : 0,
                alpha: s.icon?.alpha || 1,
                src: s.icon?.src || null,
                size: s.icon?.size || 1,
                rotate: s.icon?.rotate || 0,
                position: s.icon?.position || 'left',
                composite: s.icon?.composite || 'source-over',
                blendmode: s.icon?.blendmode || 'source-over',
                offset: {
                    x: s.icon?.offset?.x || 0,
                    y: s.icon?.offset?.y || 0
                }
            },
            background: {
                editable: 1,
                active: s.background?.active ? 1 : 0,
                composite: s.background?.composite || 'source-over',
                fill: {
                    alpha: s.background?.alpha || 1,
                    color: hexToRgb(s.background?.color || '#000000'),
                    image: {
                        active: s.background?.image?.active ? 1 : 0,
                        alpha: s.background?.image?.alpha || 1,
                        src: s.background?.image?.src || null,
                        size: s.background?.image?.size || 'cover',
                        repeat: s.background?.image?.repeat || 'repeat'
                    },
                    gradient: {
                        active: s.background?.gradient?.active ? 1 : 0,
                        angle: s.background?.gradient?.angle || 0,
                        type: s.background?.gradient?.type || 'linear',
                        colors: [
                            hexToRgb(s.background?.gradient?.startColor || '#000000'),
                            hexToRgb(s.background?.gradient?.endColor || '#ffffff')
                        ]
                    }
                }
            },
            animation: {
                editable: 1,
                active: s.animation?.active ? 1 : 0,
                id: s.animation?.id || null,
                pause: s.animation?.pause || 1000,
                duration: s.animation?.duration || 1000
            }
        };
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    function copyImageToClipboard() {
        if (!window.ExportManager || !editor.getCanvas()) {
            alert('Canvas not available');
            return;
        }

        try {
            const canvas = ExportManager.canvasFromSettings(editor.getSettings());
            canvas.toBlob(function(blob) {
                if (!blob) {
                    alert('Failed to create image blob');
                    return;
                }

                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(function() {
                    alert('Image copied to clipboard!');
                }).catch(function(err) {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy image. Your browser may not support this feature.');
                });
            }, 'image/png');
        } catch (e) {
            console.error('Clipboard error:', e);
            alert('Failed to copy image. Your browser may not support this feature.');
        }
    }

    // ===== GRADIENT PICKER =====
    function initGradientPickers() {
        const pickers = document.querySelectorAll('.tt-gradient-picker');
        const gradientFields = {
            'tt-fill-gradient-colors-input': {
                checkbox: 'tt-fill-gradient-active-input',
                settingsPath: 'fill.gradient'
            },
            'tt-outline-fill-gradient-colors-input': {
                checkbox: 'tt-outline-fill-gradient-active-input',
                settingsPath: 'outline.gradient'
            },
            'tt-depth-gradient-colors-input': {
                checkbox: 'tt-depth-gradient-active-input',
                settingsPath: 'depth.gradient'
            },
            'tt-outline2-fill-gradient-colors-input': {
                checkbox: 'tt-outline2-fill-gradient-active-input',
                settingsPath: 'outline2.gradient'
            }
        };

        pickers.forEach(picker => {
            const inputId = picker.dataset.updateInput;
            const config = gradientFields[inputId];
            if (!config) return;

            const colorContainer = document.createElement('div');
            colorContainer.className = 'tt-gradient-colors';
            colorContainer.style.display = 'flex';
            colorContainer.style.gap = '8px';
            colorContainer.style.marginTop = '8px';

            const startColorInput = document.createElement('input');
            startColorInput.type = 'color';
            startColorInput.className = 'tt-color';
            startColorInput.value = '#ffffff';

            const endColorInput = document.createElement('input');
            endColorInput.type = 'color';
            endColorInput.className = 'tt-color';
            endColorInput.value = '#000000';

            colorContainer.appendChild(startColorInput);
            colorContainer.appendChild(endColorInput);
            picker.parentNode.insertBefore(colorContainer, picker.nextSibling);

            function updateGradient() {
                const startColor = startColorInput.value;
                const endColor = endColorInput.value;
                picker.style.background = 'linear-gradient(90deg, ' + startColor + ', ' + endColor + ')';

                const settings = editor.getSettings();
                const parts = config.settingsPath.split('.');
                let obj = settings;
                for (let i = 0; i < parts.length - 1; i++) {
                    obj = obj[parts[i]];
                }
                obj.startColor = startColor;
                obj.endColor = endColor;
                editor.render();
            }

            startColorInput.addEventListener('input', updateGradient);
            endColorInput.addEventListener('input', updateGradient);

            const checkbox = document.getElementById(config.checkbox);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    colorContainer.style.display = this.checked ? 'flex' : 'none';
                    if (this.checked) {
                        updateGradient();
                    }
                });

                colorContainer.style.display = checkbox.checked ? 'flex' : 'none';
            }
        });
    }

    // ===== PRESET LOADING =====
    function bindPresets() {
        const presetList = document.getElementById('tt-preset-list');
        if (presetList) {
            // Load presets dynamically
            loadPresetList();
            
            presetList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li && li.dataset.preset) {
                    loadPreset(li.dataset.preset, li.dataset.source);
                }
            });
        }

        // Bind preset management buttons
        bindPresetButtons();
    }

    async function loadPresetList() {
        const presetList = document.getElementById('tt-preset-list');
        if (!presetList) return;

        presetList.innerHTML = '';

        try {
            // Get all presets from PresetManager
            const presets = typeof PresetManager !== 'undefined' ? PresetManager.getPresetList() : [];
            
            // Add base presets from filesystem
            const basePresets = ['fire-free', 'nintendo', 'looney-tunes'];
            
            // Combine base presets with user presets
            const allPresets = new Set([...basePresets, ...presets.map(p => p.name)]);
            
            allPresets.forEach(presetName => {
                const li = document.createElement('li');
                li.dataset.preset = presetName;
                
                // Determine source
                const preset = presets.find(p => p.name === presetName);
                const source = preset ? preset.source : 'base';
                li.dataset.source = source;
                
                // Display name
                const displayName = presetName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                li.innerHTML = `<span>${displayName}</span>`;
                
                // Add source indicator
                if (source === 'local') {
                    li.classList.add('tt-preset-local');
                } else if (source === 'imported') {
                    li.classList.add('tt-preset-imported');
                }
                
                presetList.appendChild(li);
            });

            // Add "New Preset" option
            const newPresetLi = document.createElement('li');
            newPresetLi.className = 'tt-preset-new';
            newPresetLi.innerHTML = '<span>+ New Preset</span>';
            newPresetLi.addEventListener('click', function(e) {
                e.stopPropagation();
                createNewPreset();
            });
            presetList.appendChild(newPresetLi);

        } catch (e) {
            console.error('Failed to load preset list:', e);
        }
    }

    async function loadPreset(presetName, source) {
        try {
            let preset;
            
            if (source === 'base') {
                // Load from filesystem
                preset = await PresetManager.loadPresetFromFile(presetName);
            } else {
                // Load from PresetManager
                preset = PresetManager.getPreset(presetName);
            }

            if (preset) {
                editor.loadPreset(preset);
            }
        } catch (e) {
            console.error('Failed to load preset:', e);
        }
    }

    function bindPresetButtons() {
        // Save current settings as preset
        const savePresetBtn = document.getElementById('tt-save-preset-btn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', function() {
                saveCurrentAsPreset();
            });
        }

        // Duplicate current preset
        const duplicatePresetBtn = document.getElementById('tt-duplicate-preset-btn');
        if (duplicatePresetBtn) {
            duplicatePresetBtn.addEventListener('click', function() {
                duplicateCurrentPreset();
            });
        }

        // Delete current preset
        const deletePresetBtn = document.getElementById('tt-delete-preset-btn');
        if (deletePresetBtn) {
            deletePresetBtn.addEventListener('click', function() {
                deleteCurrentPreset();
            });
        }

        // Export preset
        const exportPresetBtn = document.getElementById('tt-export-preset-btn');
        if (exportPresetBtn) {
            exportPresetBtn.addEventListener('click', function() {
                exportCurrentPreset();
            });
        }

        // Import preset
        const importPresetBtn = document.getElementById('tt-import-preset-btn');
        if (importPresetBtn) {
            importPresetBtn.addEventListener('click', function() {
                importPresetFromFile();
            });
        }
    }

    function saveCurrentAsPreset() {
        const settings = editor.getSettings();
        const presetName = prompt('Enter preset name:', 'my-preset');
        
        if (!presetName) return;
        
        try {
            const preset = convertSettingsToPreset(settings);
            const safeName = PresetManager.createPreset(presetName, preset);
            alert('Preset saved: ' + safeName);
            loadPresetList(); // Refresh list
        } catch (e) {
            alert('Error saving preset: ' + e.message);
        }
    }

    function duplicateCurrentPreset() {
        const settings = editor.getSettings();
        const currentPreset = settings.presetName || 'current';
        const newName = prompt('Enter new preset name:', currentPreset + '-copy');
        
        if (!newName) return;
        
        try {
            const preset = convertSettingsToPreset(settings);
            const safeName = PresetManager.duplicatePreset(currentPreset, newName);
            alert('Preset duplicated: ' + safeName);
            loadPresetList(); // Refresh list
        } catch (e) {
            alert('Error duplicating preset: ' + e.message);
        }
    }

    function deleteCurrentPreset() {
        const settings = editor.getSettings();
        const currentPreset = settings.presetName;
        
        if (!currentPreset) {
            alert('No preset loaded');
            return;
        }
        
        if (!confirm('Delete preset: ' + currentPreset + '?')) return;
        
        try {
            PresetManager.deletePreset(currentPreset);
            alert('Preset deleted: ' + currentPreset);
            loadPresetList(); // Refresh list
        } catch (e) {
            alert('Error deleting preset: ' + e.message);
        }
    }

    function exportCurrentPreset() {
        const settings = editor.getSettings();
        const currentPreset = settings.presetName || 'preset';
        
        try {
            PresetManager.exportPreset(currentPreset);
        } catch (e) {
            alert('Error exporting preset: ' + e.message);
        }
    }

    function importPresetFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonString = e.target.result;
                    const name = PresetManager.importPreset(jsonString);
                    alert('Preset imported: ' + name);
                    loadPresetList(); // Refresh list
                } catch (err) {
                    alert('Error importing preset: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }

    function createNewPreset() {
        const settings = editor.createDefaultSettings();
        const presetName = prompt('Enter preset name:', 'new-preset');
        
        if (!presetName) return;
        
        try {
            const preset = convertSettingsToPreset(settings);
            const safeName = PresetManager.createPreset(presetName, preset);
            editor.loadPreset(preset);
            alert('Preset created: ' + safeName);
            loadPresetList(); // Refresh list
        } catch (e) {
            alert('Error creating preset: ' + e.message);
        }
    }

    // ===== IMPORT FROM TEXTSTUDIO =====
    
    // Font ID mapping for TextStudio fonts
    const fontIdMap = {
        '832': 'Bangers',
        '833': 'Permanent Marker',
        '834': 'Rock Salt',
        '835': 'Anton',
        '836': 'Oswald',
        '837': 'Montserrat',
        '838': 'Pacifico',
        '839': 'Press Start 2P',
        '840': 'Creepster',
        '841': 'Share Tech Mono',
        '842': 'Rubik Wet Paint',
        '843': 'Carter One',
        '844': 'Fascinate',
        '845': 'Kanit',
        '846': 'Bebas Neue',
        '847': 'Freckle Dragon'
    };

    function bindImportControls() {
        const importBtn = document.getElementById('tt-import-btn');
        const importUrlInput = document.getElementById('tt-import-url-input');
        
        if (importBtn && importUrlInput) {
            importBtn.addEventListener('click', function() {
                const url = importUrlInput.value.trim();
                if (!url) {
                    alert('Please enter a TextStudio URL');
                    return;
                }
                
                // Extract preset ID from URL
                // Format: https://www.textstudio.com/logo/retro-music-font-1100
                const match = url.match(/\/logo\/([a-z0-9-]+)(?:\/|$)/i);
                if (!match) {
                    alert('Invalid TextStudio URL format');
                    return;
                }
                
                const presetId = match[1];
                importFromTextStudio(presetId);
            });
        }
    }

    function importFromTextStudio(presetId) {
        // Try multiple methods to import from TextStudio
        const url = 'https://www.textstudio.com/logo/' + presetId;
        
        // Method 1: Try direct API (may fail due to CORS)
        tryDirectAPI(presetId, url).catch(() => {
            // Method 2: Try CORS proxy with HTML scraping
            tryCORSProxy(url).catch(() => {
                // Method 3: Fallback to manual JSON input
                showManualJSONInput(url);
            });
        });
    }

    function tryDirectAPI(presetId, url) {
        return new Promise((resolve, reject) => {
            const apiUrl = 'https://www.textstudio.com/api/logo/' + presetId;
            const xhr = new XMLHttpRequest();
            xhr.open('GET', apiUrl, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const preset = JSON.parse(xhr.responseText);
                            const mappedPreset = mapFontIds(preset);
                            editor.loadPreset(mappedPreset);
                            cachePreset(presetId, mappedPreset);
                            resolve(mappedPreset);
                        } catch (e) {
                            console.error('Failed to parse preset:', e);
                            reject(e);
                        }
                    } else {
                        reject(new Error('API request failed'));
                    }
                }
            };
            xhr.onerror = () => reject(new Error('API request error'));
            xhr.send();
        });
    }

    function tryCORSProxy(url) {
        return new Promise((resolve, reject) => {
            // Try multiple CORS proxies
            const proxies = [
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?',
                'https://cors-anywhere.herokuapp.com/'
            ];
            
            let proxyIndex = 0;
            
            function tryNextProxy() {
                if (proxyIndex >= proxies.length) {
                    reject(new Error('All CORS proxies failed'));
                    return;
                }
                
                const proxyUrl = proxies[proxyIndex] + encodeURIComponent(url);
                const xhr = new XMLHttpRequest();
                xhr.open('GET', proxyUrl, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                const html = xhr.responseText;
                                const preset = extractPresetFromHTML(html);
                                if (preset) {
                                    const mappedPreset = mapFontIds(preset);
                                    editor.loadPreset(mappedPreset);
                                    const presetId = extractPresetIdFromURL(url);
                                    cachePreset(presetId, mappedPreset);
                                    resolve(mappedPreset);
                                } else {
                                    proxyIndex++;
                                    tryNextProxy();
                                }
                            } catch (e) {
                                console.error('Failed to extract preset:', e);
                                proxyIndex++;
                                tryNextProxy();
                            }
                        } else {
                            proxyIndex++;
                            tryNextProxy();
                        }
                    }
                };
                xhr.onerror = () => {
                    proxyIndex++;
                    tryNextProxy();
                };
                xhr.send();
            }
            
            tryNextProxy();
        });
    }

    function mapFontIds(preset) {
        // Map TextStudio font IDs to actual font names
        if (preset.font && preset.font.src) {
            const fontId = preset.font.src.toString();
            if (fontIdMap[fontId]) {
                preset.font.src = fontIdMap[fontId];
                preset.font.name = fontIdMap[fontId];
            }
        }
        return preset;
    }

    function extractPresetFromHTML(html) {
        // Try to find preset data in window.__PRESET__ or similar
        const windowPresetRegex = /window\.__PRESET__\s*=\s*(\{[\s\S]*?\});/i;
        const windowMatch = windowPresetRegex.exec(html);
        
        if (windowMatch) {
            try {
                return JSON.parse(windowMatch[1]);
            } catch (e) {
                console.error('Failed to parse window.__PRESET__:', e);
            }
        }

        // Try to find preset data in script tags
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        
        while ((match = scriptRegex.exec(html)) !== null) {
            const scriptContent = match[1];
            
            // Try to find JSON object with preset structure
            const jsonRegex = /(\{[\s\S]*"text"[\s\S]*"font"[\s\S]*\})/g;
            const jsonMatch = jsonRegex.exec(scriptContent);
            
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch (e) {
                    continue;
                }
            }
        }
        
        // Try to find in data attributes
        const dataRegex = /data-preset="([^"]*)"/i;
        const dataMatch = dataRegex.exec(html);
        
        if (dataMatch) {
            try {
                return JSON.parse(decodeURIComponent(dataMatch[1]));
            } catch (e) {
                // Try without decode
                try {
                    return JSON.parse(dataMatch[1]);
                } catch (e2) {
                    // Continue to next method
                }
            }
        }

        // Try to find in JSON-LD or other structured data
        const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i;
        const jsonLdMatch = jsonLdRegex.exec(html);
        
        if (jsonLdMatch) {
            try {
                const data = JSON.parse(jsonLdMatch[1]);
                if (data && (data.preset || data.settings)) {
                    return data.preset || data.settings;
                }
            } catch (e) {
                console.error('Failed to parse JSON-LD:', e);
            }
        }
        
        return null;
    }

    function extractPresetIdFromURL(url) {
        const match = url.match(/\/logo\/([a-z0-9-]+)(?:\/|$)/i);
        return match ? match[1] : null;
    }

    function cachePreset(presetId, preset) {
        try {
            if (typeof PresetManager !== 'undefined') {
                PresetManager.createPreset(presetId, preset);
            } else {
                const cache = JSON.parse(localStorage.getItem('textstudio_presets') || '{}');
                cache[presetId] = {
                    preset: preset,
                    timestamp: Date.now()
                };
                localStorage.setItem('textstudio_presets', JSON.stringify(cache));
            }
        } catch (e) {
            console.error('Failed to cache preset:', e);
        }
    }

    function getCachedPreset(presetId) {
        try {
            if (typeof PresetManager !== 'undefined') {
                return PresetManager.getPreset(presetId);
            }
            const cache = JSON.parse(localStorage.getItem('textstudio_presets') || '{}');
            if (cache[presetId]) {
                // Check if cache is not too old (7 days)
                const age = Date.now() - cache[presetId].timestamp;
                if (age < 7 * 24 * 60 * 60 * 1000) {
                    return cache[presetId].preset;
                }
            }
        } catch (e) {
            console.error('Failed to get cached preset:', e);
        }
        return null;
    }

    function showManualJSONInput(url) {
        // Create a modal for manual JSON input
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: #fff; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%;">
                <h3 style="color: #fff; margin-bottom: 15px;">Import Preset from TextStudio</h3>
                <p style="color: #ccc; margin-bottom: 15px; font-size: 14px;">
                    Could not import automatically. Please visit <a href="${url}" target="_blank" style="color: #4a9eff;">${url}</a>, 
                    open browser console (F12), and paste the preset JSON below.
                </p>
                <textarea id="manual-json-input" style="width: 100%; height: 200px; background: #f5f5f5; color: #333; border: 1px solid #ddd; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;" placeholder="Paste JSON here..."></textarea>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button id="manual-json-import" style="flex: 1; padding: 10px; background: #4a9eff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Import</button>
                    <button id="manual-json-cancel" style="flex: 1; padding: 10px; background: #ddd; color: #333; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('manual-json-import').addEventListener('click', function() {
            const jsonText = document.getElementById('manual-json-input').value.trim();
            if (!jsonText) {
                alert('Please paste JSON');
                return;
            }
            
            try {
                const preset = JSON.parse(jsonText);
                editor.loadPreset(preset);
                const presetId = extractPresetIdFromURL(url);
                if (presetId) {
                    cachePreset(presetId, preset);
                }
                document.body.removeChild(modal);
            } catch (e) {
                alert('Invalid JSON: ' + e.message);
            }
        });
        
        document.getElementById('manual-json-cancel').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    }

    // Export
    window.TextControls = {
        init: init
    };

})();
