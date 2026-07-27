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
        return {
            editable: 1,
            text: settings.text,
            font: {
                size: settings.fontSize,
                weight: settings.fontWeight,
                name: settings.font,
                src: settings.font
            },
            align: settings.align,
            rotate: settings.rotate,
            lineHeight: settings.lineHeight,
            letterSpacing: settings.letterSpacing,
            mergeGradients: 0,
            lettering: {
                editable: 1,
                active: settings.lettering.active ? 1 : 0,
                blendmode: settings.lettering.blendmode || 'over',
                boggle: {
                    active: settings.lettering.boggle.active ? 1 : 0,
                    angle: settings.lettering.boggle.angle,
                    amplitude: settings.lettering.boggle.amplitude
                },
                reverseOverlap: {
                    letters: settings.lettering.reverseOverlap.letters,
                    lines: settings.lettering.reverseOverlap.lines
                },
                shadow: {
                    active: settings.lettering.shadow.active ? 1 : 0,
                    size: settings.lettering.shadow.size,
                    distance: settings.lettering.shadow.distance,
                    angle: settings.lettering.shadow.angle,
                    fill: {
                        alpha: settings.lettering.shadow.alpha,
                        color: hexToRgb(settings.lettering.shadow.color)
                    }
                }
            },
            distort: {
                arc: {
                    angle: settings.distort.arc.angle
                }
            },
            processing: {
                active: settings.processing.active ? 1 : 0,
                code: settings.processing.code
            },
            fill: {
                editable: 1,
                active: settings.fill.active ? 1 : 0,
                alpha: settings.fill.alpha,
                color: hexToRgb(settings.fill.color),
                texture: {
                    active: settings.fill.texture.active ? 1 : 0,
                    alpha: settings.fill.texture.alpha,
                    src: settings.fill.texture.src,
                    size: settings.fill.texture.size,
                    repeat: 'repeat',
                    position: 'center'
                },
                gradient: {
                    active: settings.fill.gradient.active ? 1 : 0,
                    angle: settings.fill.gradient.angle,
                    colors: [
                        hexToRgb(settings.fill.gradient.startColor),
                        hexToRgb(settings.fill.gradient.endColor)
                    ]
                }
            },
            depth: {
                editable: 1,
                active: settings.depth.active ? 1 : 0,
                length: settings.depth.length,
                angle: settings.depth.angle,
                fill: {
                    alpha: settings.depth.alpha,
                    color: hexToRgb(settings.depth.color),
                    gradient: {
                        active: settings.depth.gradient.active ? 1 : 0,
                        type: 'depth',
                        angle: settings.depth.gradient.angle,
                        colors: [
                            hexToRgb(settings.depth.gradient.startColor),
                            hexToRgb(settings.depth.gradient.endColor)
                        ]
                    }
                }
            },
            depth2: {
                editable: 1,
                active: settings.depth2.active ? 1 : 0,
                length: settings.depth2.length,
                angle: settings.depth2.angle,
                fill: {
                    alpha: settings.depth2.alpha,
                    color: hexToRgb(settings.depth2.color),
                    gradient: {
                        active: settings.depth2.gradient.active ? 1 : 0,
                        type: 'depth',
                        angle: settings.depth2.gradient.angle,
                        colors: [
                            hexToRgb(settings.depth2.gradient.startColor),
                            hexToRgb(settings.depth2.gradient.endColor)
                        ]
                    }
                }
            },
            outline: {
                first: {
                    editable: 1,
                    active: settings.outline.active ? 1 : 0,
                    width: settings.outline.width,
                    join: settings.outline.join,
                    fill: {
                        alpha: settings.outline.alpha,
                        color: hexToRgb(settings.outline.color),
                        gradient: {
                            active: settings.outline.gradient.active ? 1 : 0,
                            angle: settings.outline.gradient.angle,
                            colors: [
                                hexToRgb(settings.outline.gradient.startColor),
                                hexToRgb(settings.outline.gradient.endColor)
                            ]
                        },
                        texture: {
                            active: settings.outline.texture.active ? 1 : 0,
                            src: settings.outline.texture.src,
                            size: settings.outline.texture.size
                        },
                        palette: {
                            active: settings.outline.palette.active ? 1 : 0,
                            lettering: {
                                method: settings.outline.palette.method
                            }
                        }
                    }
                },
                second: {
                    editable: 1,
                    active: settings.outline2.active ? 1 : 0,
                    width: settings.outline2.width,
                    join: settings.outline2.join,
                    fill: {
                        alpha: settings.outline2.alpha,
                        color: hexToRgb(settings.outline2.color),
                        gradient: {
                            active: settings.outline2.gradient.active ? 1 : 0,
                            angle: settings.outline2.gradient.angle,
                            colors: [
                                hexToRgb(settings.outline2.gradient.startColor),
                                hexToRgb(settings.outline2.gradient.endColor)
                            ]
                        }
                    }
                }
            },
            bevel: {
                inner: {
                    editable: 1,
                    active: settings.bevel.active ? 1 : 0,
                    size: settings.bevel.size,
                    smoothing: settings.bevel.smoothing,
                    soften: settings.bevel.soften,
                    angle: settings.bevel.angle,
                    highlight: {
                        alpha: settings.bevel.highlight.alpha,
                        color: hexToRgb(settings.bevel.highlight.color)
                    },
                    shadow: {
                        alpha: settings.bevel.shadow.alpha,
                        color: hexToRgb(settings.bevel.shadow.color)
                    }
                }
            },
            shadow: {
                outer: {
                    editable: 1,
                    active: settings.shadowOuter.active ? 1 : 0,
                    size: settings.shadowOuter.size,
                    distance: settings.shadowOuter.distance,
                    angle: settings.shadowOuter.angle,
                    strength: settings.shadowOuter.strength,
                    fill: {
                        alpha: settings.shadowOuter.alpha,
                        color: hexToRgb(settings.shadowOuter.color)
                    }
                },
                outer2: {
                    editable: 1,
                    active: settings.shadowOuter2.active ? 1 : 0,
                    size: settings.shadowOuter2.size,
                    distance: settings.shadowOuter2.distance,
                    angle: settings.shadowOuter2.angle,
                    fill: {
                        alpha: settings.shadowOuter2.alpha,
                        color: hexToRgb(settings.shadowOuter2.color)
                    }
                },
                inner: {
                    editable: 1,
                    active: settings.shadowInner.active ? 1 : 0,
                    size: settings.shadowInner.size,
                    distance: settings.shadowInner.distance,
                    angle: settings.shadowInner.angle,
                    offset: settings.shadowInner.offset,
                    alpha: settings.shadowInner.alpha,
                    color: hexToRgb(settings.shadowInner.color),
                    blendmode: settings.shadowInner.blendmode
                },
                inner2: {
                    editable: 1,
                    active: settings.shadowInner2.active ? 1 : 0,
                    size: settings.shadowInner2.size,
                    distance: settings.shadowInner2.distance,
                    angle: settings.shadowInner2.angle,
                    offset: settings.shadowInner2.offset,
                    alpha: settings.shadowInner2.alpha,
                    color: hexToRgb(settings.shadowInner2.color)
                }
            },
            icon: {
                editable: 1,
                active: settings.icon.active ? 1 : 0,
                alpha: settings.icon.alpha,
                src: settings.icon.src,
                size: settings.icon.size,
                rotate: settings.icon.rotate,
                position: settings.icon.position,
                composite: settings.icon.composite,
                offset: {
                    x: settings.icon.offset.x,
                    y: settings.icon.offset.y
                }
            },
            background: {
                editable: 1,
                active: settings.background.active ? 1 : 0,
                composite: settings.background.composite,
                fill: {
                    alpha: settings.background.alpha,
                    color: hexToRgb(settings.background.color),
                    image: {
                        active: settings.background.image.active ? 1 : 0,
                        alpha: settings.background.image.alpha,
                        src: settings.background.image.src,
                        size: settings.background.image.size,
                        repeat: settings.background.image.repeat
                    },
                    gradient: {
                        active: settings.background.gradient.active ? 1 : 0,
                        angle: settings.background.gradient.angle,
                        type: settings.background.gradient.type,
                        colors: [
                            hexToRgb(settings.background.gradient.startColor),
                            hexToRgb(settings.background.gradient.endColor)
                        ]
                    }
                }
            },
            animation: {
                editable: 1,
                active: settings.animation.active ? 1 : 0,
                id: settings.animation.id,
                pause: settings.animation.pause,
                duration: settings.animation.duration
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
            presetList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (li && li.dataset.preset) {
                    loadPresetFile(li.dataset.preset);
                }
            });
        }
    }

    function loadPresetFile(presetName) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'presets/' + presetName + '.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    const preset = JSON.parse(xhr.responseText);
                    editor.loadPreset(preset);
                } catch (e) {
                    console.error('Failed to load preset:', e);
                }
            }
        };
        xhr.send();
    }

    // ===== IMPORT FROM TEXTSTUDIO =====
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
                            editor.loadPreset(preset);
                            cachePreset(presetId, preset);
                            resolve(preset);
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
                                    editor.loadPreset(preset);
                                    const presetId = extractPresetIdFromURL(url);
                                    cachePreset(presetId, preset);
                                    resolve(preset);
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

    function extractPresetFromHTML(html) {
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
        
        return null;
    }

    function extractPresetIdFromURL(url) {
        const match = url.match(/\/logo\/([a-z0-9-]+)(?:\/|$)/i);
        return match ? match[1] : null;
    }

    function cachePreset(presetId, preset) {
        try {
            const cache = JSON.parse(localStorage.getItem('textstudio_presets') || '{}');
            cache[presetId] = {
                preset: preset,
                timestamp: Date.now()
            };
            localStorage.setItem('textstudio_presets', JSON.stringify(cache));
        } catch (e) {
            console.error('Failed to cache preset:', e);
        }
    }

    function getCachedPreset(presetId) {
        try {
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
