/* ===== TEXTSTUDIO CONTROLS - UI Event Handlers ===== */

(function() {
    'use strict';

    let editor = null;
    let currentPresetName = null;

    function init(editorInstance) {
        editor = editorInstance;
        bindControls();
        bindLineSizingUI();
        bindMenuTabs();
        bindCustomMenu();
        bindDownloadControls();
        bindImportControls();
        initShowBrotherTabs();
        initTextureUploads();
        initIconGallery();
        initBackgroundGallery();
        initRangeSliders();
        initFontFilters();
        initActiveFieldsets();
        initUndoRedo();
        initFillLayersUI();
        bindGradientColorInputs();
        initPresetGallery();
    }


    // UNICA fuente de verdad del alcance por linea (constitucion VII, sin rutas
    // dobles): el editor la expone y aqui se consulta. Antes controls.js tenia
    // su propia lista, que quedo desactualizada (marcaba `align`, `letterSpacing`
    // y `font.src` como globales cuando son por linea, y listaba un
    // `lines.sizing` que ya no existe).
    function isGlobalOnlyPath(path) {
        if (editor && typeof editor.isGlobalPath === 'function') return editor.isGlobalPath(path);
        // Sin editor (arranque parcial): solo lo que nunca es por linea.
        return path === 'text' || path === 'canvas' || path === 'lines'
            || path === 'download' || path === 'processing'
            || path.indexOf('canvas.') === 0 || path.indexOf('lines') === 0
            || path === 'rotate' || path === 'distort'
            || path.indexOf('lettering.flag') === 0 || path.indexOf('lettering.boggle') === 0;
    }

    // Helper: set nested setting and trigger render
    // When a line target (L1, L2...) is active, delegate to editor.setTargetedSetting
    // so style overrides are properly scoped to that line number. Global-only
    // paths (text, canvas, layout...) always write to the base settings.
    function setNestedSetting(path, value) {
        if (!editor) return;
        if (!isGlobalOnlyPath(path) && /^L\d+$/.test(editor.getLineTarget())) {
            editor.setTargetedSetting(path, value);
        } else {
            const settings = editor.getSettings();
            const keys = path.split('.');
            let obj = settings;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        }
        editor.render();
    }

    // RC68: al aplicar una imagen desde la galeria se escribe el ID numerico
    // en el settings (contrato R2) y render() lo omite hasta resolverlo. Este
    // helper replica el camino de loadPreset: resuelve refs id->URL via
    // TextMuyAPI.prepareImgRefs (catalogo img.json cacheado + puente) y
    // repinta. Sin puente/catalogo la imagen se omite sin 404 (el motor ya
    // guarda los cargadores contra refs numericas).
    function repintarConRefsResueltas() {
        if (!editor || !window.TextMuyAPI || !window.TextMuyAPI.prepareImgRefs) return;
        window.TextMuyAPI.prepareImgRefs(editor.getSettings()).then(function () {
            if (editor.render) editor.render();
        }).catch(function (_) { /* sin puente: omitida sin 404 */ });
    }

        // Gating por target: la barra unica siempre visible en
        // TEXT/STYLES/ICON (oculta en BACKGROUND/DOWNLOAD); el grupo Canvas
        // Size (data-global-only) solo visible en All.
        function applyLineTargetGating() {
            if (!editor) return;
            const target = editor.getLineTarget();
            const isLine = /^L\d+$/.test(target);
            const bar = document.querySelector('[data-line-target-bar]');
            const activeLi = document.querySelector('#tt-options-menu li.selected');
            const activeName = activeLi ? activeLi.dataset.name : 'text';
            const showBar = activeName === 'text' || activeName === 'custom' || activeName === 'icon';
            if (bar) bar.hidden = !showBar;
            document.querySelectorAll('[data-global-only]').forEach(function(el) {
                el.hidden = isLine;
            });
        }


    // Bind line-style target tabs (All / L1 / L2 / L3)
    function bindLineStyleTabs() {
        const tabs = document.querySelectorAll('[data-line-style]');
        if (!tabs.length) return;

        function updateSelection() {
            const target = editor.getLineTarget();
            tabs.forEach(function(tab) {
                const value = String(tab.dataset.lineStyle || '');
                const normalized = value === 'all' ? 'all' : ('L' + value);
                tab.classList.toggle('selected', normalized === target);
            });
        }

        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                const value = String(tab.dataset.lineStyle || '');
                const target = value === 'all' ? 'all' : ('L' + value);
                editor.setLineTarget(target);
                updateSelection();
            });
        });

        updateSelection();

        // Re-sync tabs when the target changes from anywhere (loadPreset, API, editor).
        document.addEventListener('textmuy:line-target-updated', updateSelection);

        // Re-sync gradient pickers from the effective settings of the new target.
        document.addEventListener('textmuy:line-target-updated', function() {
            if (window.GradientPicker && window.GradientPicker.init) {
                window.GradientPicker.init();
            }
        });

        // 002-text-tab US2 (research R2): el gating de la barra y de los grupos
        // globales se registra y se aplica AQUI, en el arranque, y no dentro del
        // listener de arriba. Antes vivia anidado en ese listener, que nunca se
        // dispara al abrir: la barra "Style target" quedaba con hidden=true
        // hasta que el usuario cambiaba de pestana (FR-002).
        document.addEventListener('textmuy:line-target-updated', applyLineTargetGating);
        applyLineTargetGating();
    }

    // Bind canvas size inputs with bidirectional logic
    function bindCanvasSizeInputs() {
        const widthInput = document.getElementById('tt-canvas-width-input');
        const heightInput = document.getElementById('tt-canvas-height-input');
        const ratioInput = document.getElementById('tt-canvas-ratio-input');

        if (!widthInput || !heightInput || !ratioInput) return;

        // Width input change - updates ratio and height
        widthInput.addEventListener('input', function() {
            const width = parseInt(this.value) || 480;
            const height = parseInt(heightInput.value) || 320;
            const ratio = parseFloat((height / width).toFixed(2)) || 0.67;
            ratioInput.value = ratio;
            setNestedSetting('canvas.width', width);
            setNestedSetting('canvas.ratio', ratio);
        });

        // Height input change - updates ratio and width
        heightInput.addEventListener('input', function() {
            const height = parseInt(this.value) || 320;
            const width = parseInt(widthInput.value) || 480;
            const ratio = parseFloat((height / width).toFixed(2)) || 0.67;
            ratioInput.value = ratio;
            setNestedSetting('canvas.height', height);
            setNestedSetting('canvas.ratio', ratio);
        });

        // Ratio input change - updates height
        ratioInput.addEventListener('input', function() {
            const ratio = parseFloat(this.value) || 0.67;
            const width = parseInt(widthInput.value) || 480;
            const height = Math.round(width * ratio);
            heightInput.value = height;
            setNestedSetting('canvas.ratio', ratio);
            setNestedSetting('canvas.height', height);
        });

        // Initialize from settings
        const settings = editor.getSettings();
        if (settings.canvas) {
            if (settings.canvas.width) widthInput.value = settings.canvas.width;
            if (settings.canvas.height) heightInput.value = settings.canvas.height;
            if (settings.canvas.ratio) ratioInput.value = settings.canvas.ratio;
        }
    }

    // ===== SISTEMA DE LINEAS (002-text-tab D2) =====
    // Los selectores de tamano y de herencia ofrecen SOLO opciones que no
    // cierran un ciclo (FR-013): `opcionesValidas` viene ya filtrado por las dos
    // aristas y de forma transitiva (R-L3.1).

    function selTiene(sel, valor) {
        // `options` puede no existir todavia (el elemento se acaba de crear).
        const opts = sel && sel.options ? sel.options : [];
        return Array.prototype.some.call(opts, function (o) { return o.value === valor; });
    }

    function pintarOpciones(sel, valores, seleccionado) {
        sel.innerHTML = '';
        valores.forEach(function (v) {
            const o = document.createElement('option');
            o.value = v.valor;
            o.textContent = v.texto;
            sel.appendChild(o);
        });
        sel.value = selTiene(sel, seleccionado) ? seleccionado : (valores[0] ? valores[0].valor : '');
    }

        function refrescarLineasUI() {
        if (!editor) return;
        const target = editor.getLineTarget();
        const lineNo = parseInt(String(target).slice(1), 10) || 0;
        const isLine = /^L\d+$/.test(target);
        const settings = editor.getSettings() || {};
        const sz = (isLine && editor.getLineSizing) ? editor.getLineSizing() : null;
        const ref = (sz && sz.ref === 'linea') ? 'linea' : 'canvas';
        const refLine = (sz && sz.refLine) || 0;
        const mode = (sz && sz.mode) === 'width' ? 'width' : 'fontsize';

        // --- Regla de tamano de la linea activa ---
        // Se ofrecen SIEMPRE L1/L2/L3, se escriban o no: el texto del cuadro es
        // una MUESTRA para disenar el estilo, no el contenido que recibe el
        // cliente. Limitar las opciones a las lineas presentes ataba el diseno al
        // texto de prueba (medido: con una sola linea, "Hereda de" solo ofrecia
        // ALL y no habia forma de definir la estructura de lineas).
        const refSel = document.getElementById('tt-line-sizing-ref-input');
        const refLabel = document.querySelector('[data-line-sizing-label]');
        if (refSel) {
            const valores = [{ valor: 'canvas', texto: 'Canvas' }];
            if (isLine && editor.opcionesValidas) {
                editor.opcionesValidas(settings, lineNo, 'refLine').forEach(function (li) {
                    valores.push({ valor: 'linea:' + li + ':fontsize', texto: 'L' + li + ' · %' });
                    valores.push({ valor: 'linea:' + li + ':width', texto: 'L' + li + ' · ancho' });
                });
            }
            pintarOpciones(refSel, valores,
                ref === 'linea' ? ('linea:' + refLine + ':' + mode) : 'canvas');
            refSel.hidden = !isLine;
            refSel.setAttribute('data-line-sizing-active', sz ? '1' : '0');
            if (refLabel) {
                refLabel.hidden = !isLine;
                refLabel.setAttribute('data-line-sizing-active', sz ? '1' : '0');
            }
        }

        // --- De quien hereda la linea activa ---
        const inhSel = document.getElementById('tt-line-inherit-input');
        const inhLabel = document.querySelector('[data-line-inherit-label]');
        if (inhSel) {
            const padre = (isLine && settings.lines && settings.lines.inherit)
                ? settings.lines.inherit[String(lineNo)] : null;
            const valores = [{ valor: 'ALL', texto: 'ALL' }];
            if (isLine && editor.opcionesValidas) {
                editor.opcionesValidas(settings, lineNo, 'inherit').forEach(function (li) {
                    valores.push({ valor: 'L' + li, texto: 'L' + li });
                });
            }
            pintarOpciones(inhSel, valores, padre || 'ALL');
            inhSel.hidden = !isLine;
            inhSel.setAttribute('data-line-inherit-active', padre ? '1' : '0');
            if (inhLabel) inhLabel.hidden = !isLine;
        }

        // --- "Max Font Size": global en All, de la linea activa con L1/L2/L3 ---------
// Con una linea activa el control manda sobre ESA linea y la referencia
// elegida en "Sizing ref:" decide a que se compara:
    //   Canvas -> porcentaje del lado limitante del lienzo (relativo, no px)
//   Lx ->   porcentaje del tamano de Lx
//   ancho -> el tamano lo manda el ancho de la referencia (el control se apaga)
// El valor SIEMPRE es relativo: el canvas es dinamico (500 px o 5000 px).
    const maxLabel = document.getElementById('tt-max-font-size-label-text');
    const maxHint = document.getElementById('tt-max-font-size-hint');
    const maxInput = document.getElementById('tt-canvas-max-font-size-input');
    if (maxLabel) maxLabel.textContent = isLine ? ('Max Font Size (' + target + ')') : 'Max Font Size (1 character)';
    if (maxHint) {
        maxHint.hidden = isLine;
        if (!isLine) {
            maxHint.setAttribute('title', 'Tope del texto completo: afecta a todas las lineas');
        }
    }
    if (maxInput) {
        const porAncho = isLine && ref === 'linea' && mode === 'width';
        // Con referencia "ancho" el tamano lo decide el ancho de la referencia.
        if (porAncho) {
            maxInput.disabled = true;
            maxInput.setAttribute('title', 'El tamano lo fija el ancho de la linea de referencia');
        } else {
            maxInput.disabled = false;
            maxInput.removeAttribute('title');
        }
    }
}
    function bindLineSizingUI() {
            const refSel = document.getElementById('tt-line-sizing-ref-input');
            if (refSel && !refSel.dataset.bound) {
                refSel.dataset.bound = '1';
                refSel.addEventListener('change', function() {
                    if (!editor) return;
                    const v = String(this.value || 'canvas');
                    if (v === 'canvas') {
                        // Referencia al lienzo: el tope se mide sobre el lado
                        // limitante del area util (relativo, no px fijos).
                        editor.setLineSizing({ ref: 'canvas' });
                    } else {
                        const parts = v.split(':');
                        editor.setLineSizing({
                            ref: 'linea',
                            refLine: parseInt(parts[1], 10) || 0,
                            mode: parts[2] === 'width' ? 'width' : 'fontsize'
                        });
                    }
                    refrescarLineasUI();
                    editor.render();
                });
            }

            // Herencia de la linea activa (US6): de quien parte antes de mezclar
            // sus propios ajustes. ALL es el valor por defecto.
            const inhSel = document.getElementById('tt-line-inherit-input');
            if (inhSel && !inhSel.dataset.bound) {
                inhSel.dataset.bound = '1';
                inhSel.addEventListener('change', function() {
                    if (!editor || !editor.setLineInherit) return;
                    editor.setLineInherit(String(this.value || 'ALL'));
                    refrescarLineasUI();
                    editor.render();
                });
            }

            document.addEventListener('textmuy:line-target-updated', refrescarLineasUI);
            document.addEventListener('textmuy:settings-updated', refrescarLineasUI);
            refrescarLineasUI();
        }
    // Helper: get nested setting
    function getNestedSetting(path) {
        if (!editor) return undefined;
        const settings = editor.getSettings();
        const keys = path.split('.');
        let obj = settings;
        for (const key of keys) {
            if (obj === undefined || obj === null) return undefined;
            obj = obj[key];
        }
        return obj;
    }

    // Bind a range input
    function registerBinding(id, settingPath) {
        window.TextEditorControls = window.TextEditorControls || { bindings: [] };
        if (!Array.isArray(window.TextEditorControls.bindings)) window.TextEditorControls.bindings = [];
        const exists = window.TextEditorControls.bindings.some(function(b) { return b.id === id; });
        if (!exists) window.TextEditorControls.bindings.push({ id: id, settingPath: settingPath });
    }

    function refreshInputDecorations(el) {
        if (!el) return;
        if (typeof updateRangeFill === 'function') updateRangeFill(el);
        if (el.type === 'checkbox' && typeof updateVisibility === 'function') {
            try { updateVisibility(); } catch (e) { /* fieldset sync best-effort */ }
        }
        var grad = el && el.id ? document.getElementById(el.id) : null;
        if (grad && grad.tagName === 'INPUT' && /gradient-colors/.test(grad.id) &&
            window.GradientPicker && typeof window.GradientPicker.init === 'function') {
            window.GradientPicker.init();
        }
    }
    window.TextEditorControls = window.TextEditorControls || {};
    window.TextEditorControls.bindings = window.TextEditorControls.bindings || [];
    window.TextEditorControls.refreshInputDecorations = refreshInputDecorations;
    window.TextEditorControls.reportFontError = reportFontError;

    // ===== AVISO DE FUENTE NO DISPONIBLE (RC39, 001-fix-bugs-01) =====
    // La constitucion prohibe sustituir una fuente por otra en silencio. Para
    // que el usuario no confunda "el lienzo se ve con otra tipografia" con un
    // fallo, el aviso va a un aviso visible junto al selector de fuentes, y no
    // solo a la consola.
    function reportFontError(causa) {
        let box = document.getElementById('tt-font-error');
        if (!box) return;
        if (!causa) {
            box.hidden = true;
            box.textContent = '';
            return;
        }
        box.hidden = false;
        box.textContent = 'La fuente seleccionada no se pudo cargar: ' + causa
            + ' Se conserva la fuente elegida; no se usa ninguna otra.';
        box.setAttribute('role', 'alert');
    }

    function bindRange(id, settingPath, transformFn) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            const val = transformFn ? transformFn(this.value) : this.value;
            setNestedSetting(settingPath, val);
        });
    }

    // Bind a checkbox
    function bindCheckbox(id, settingPath) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            setNestedSetting(settingPath, this.checked);
        });
    }

    // Bind a color input
    function bindColor(id, settingPath) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            setNestedSetting(settingPath, this.value);
        });
    }

    // Bind a select
    function bindSelect(id, settingPath) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            setNestedSetting(settingPath, this.value);
        });
    }

    // Fuentes pueden llegar despues del arranque (catalogo, puente). El
    // render espera a que la fuente este lista, y se vuelve a pintar cuando
    // queda disponible, para que el lienzo nunca muestre otra tipografia.
    let fontLoadRequestId = 0;
    function bindFontSelect(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            const fontKey = this.value;
            if (fontKey === '' || fontKey === null || fontKey === undefined) return;
            const requestId = ++fontLoadRequestId;
            // La identidad de la fuente es la que se guarda en el estado.
            let identidad = fontKey;
            if (window.FontLoader && window.FontLoader.resolveFontId) {
                try { identidad = window.FontLoader.resolveFontId(fontKey); }
                catch (e) { console.warn('Fuente no resoluble: ' + ((e && e.message) || e)); return; }
            }
            setNestedSetting('font.src', identidad);
            // El lienzo se pinta cuando la fuente este disponible: cargar
            // primero evita ver la tipografia anterior como si fuera la nueva
            // (FR-002). Cualquier entrada del selector llega aqui y carga su
            // fuente, sin excepciones (R-C4.2).
            if (window.TextEditor && window.TextEditor.asegurarFuenteDeclarada) {
                window.TextEditor.asegurarFuenteDeclarada().then(function() {
                    if (requestId === fontLoadRequestId) window.TextEditor.render();
                });
            } else {
                editor.render();
            }
        });
    }

    // Formato de la burbuja de un slider (data-bubble). Antes era una EXPRESION
    // JS que se resolvia con eval(): ejecucion de codigo arbitrario desde un
    // atributo del DOM en cada render del slider. Ahora es un nombre de formato
    // y el valor se compone aqui, sin evaluar nada (M1).
    //
    // Sufijos: 'pct' multiplica por 100 y redondea (rangos fraccionarios como
    // letterSpacing, que va de -0.5 a 1.5); 'grado' anade el simbolo de grado.
    function textoBubble(formato, valor) {
        const v = Number(valor);
        if (!isFinite(v)) return String(valor === undefined || valor === null ? '' : valor);
        let salida = String(v);
        if (formato === 'pct') salida = String(Math.round(v * 100)) + '%';
        else if (formato === 'pct-directo') salida = String(v) + '%';
        else if (formato === 'grado') salida = String(v) + '\u00B0';
        return salida;
    }

    // Update range fill (bubble)
    function updateRangeFill(input) {
        const bubble = input.parentElement?.querySelector('output');
        if (bubble && input.dataset.bubble) {
            try {
                bubble.textContent = textoBubble(input.dataset.bubble, input.value);
                const pct = (input.value - input.min) / (input.max - input.min) * 100;
                bubble.style.left = `calc(${pct}% + ${0.5 - pct * 0.01}px)`;
            } catch(e) {}
        }
    }

    // Bind all form controls to editor settings
    function bindControls() {
        // TEXT
        bindCanvasSizeInputs();
        bindRange('tt-canvas-zoom-input', 'canvas.zoom', parseInt);
        bindRange('tt-canvas-max-font-size-input', 'canvas.maxFontSize', parseInt);
        bindRange('tt-canvas-margin-input', 'canvas.padding', function(v) { return parseFloat(v) / 100; });
        bindTextarea('tt-text-textarea', 'text');
        bindAlignList('tt-align-input', 'align');
        bindFontWeight('tt-font-weight-input');
        bindCheckbox('tt-merge-gradients-input', 'mergeGradients');
        bindFontSelect('tt-font-picker-input');
        bindRangeWithRender('tt-font-size-input', 'font.size', parseInt);
        bindRange('tt-letter-spacing-input', 'letterSpacing', parseFloat);
        // Line height: PORCENTAJE con base 0% = ajuste justo (R-L4.4). Ya no se
// transforma: el valor que se escribe es el que se muestra.
        bindRange('tt-line-height-input', 'lineHeight', parseInt);
        bindRange('tt-rotate-input', 'rotate', parseFloat);
        bindRange('tt-distort-arc-angle-input', 'distort.arc.angle', parseFloat);

        // Bind line-style target tabs (All / L1 / L2 / L3)
        bindLineStyleTabs();

        // Initialize canvas controls from settings
        const settings = editor.getSettings();
        if (settings.canvas) {
            const maxFontSizeInput = document.getElementById('tt-canvas-max-font-size-input');
            if (maxFontSizeInput && settings.canvas.maxFontSize) {
                maxFontSizeInput.value = settings.canvas.maxFontSize;
            }
            const marginInput = document.getElementById('tt-canvas-margin-input');
            if (marginInput && settings.canvas.padding !== undefined) {
                marginInput.value = Math.round(settings.canvas.padding * 100);
        // ===== LINE SIZING UI (selector de referencia de tamano) =====
        // Visible solo con target L1/L2/...; escribe a lines.sizing (global).

            }
        }

        // FILL
        bindCheckbox('tt-fill-active-input', 'fill.active');

        // LETTERING
        bindCheckbox('tt-lettering-active-input', 'lettering.active');
        bindCheckbox('tt-lettering-flag-active-input', 'lettering.flag.active');
        bindRangeWithRender('tt-lettering-flag-tilt-input', 'lettering.flag.tilt', parseFloat);
        bindSelect('tt-lettering-flag-tilt-mode-input', 'lettering.flag.tiltMode');
        bindRangeWithRender('tt-lettering-flag-rise-input', 'lettering.flag.rise', parseFloat);
        bindRangeWithRender('tt-lettering-flag-wave-width-input', 'lettering.flag.waveWidth', parseFloat);
        bindRangeWithRender('tt-lettering-flag-wave-shift-input', 'lettering.flag.waveShift', parseFloat);
        bindSelect('tt-lettering-flag-shape-input', 'lettering.flag.shape');
        bindCheckbox('tt-lettering-boggle-active-input', 'lettering.boggle.active');
        bindRange('tt-lettering-boggle-max-rotation-input', 'lettering.boggle.maxRotation', parseFloat);
        bindRange('tt-lettering-boggle-scatter-height-input', 'lettering.boggle.scatterHeight', parseFloat);
        bindCheckbox('tt-lettering-shadow-active-input', 'lettering.shadow.active');
        bindRange('tt-lettering-shadow-size-input', 'lettering.shadow.size', parseFloat);
        bindRange('tt-lettering-shadow-fill-alpha-input', 'lettering.shadow.fill.alpha', parseFloat);
        bindRange('tt-lettering-shadow-distance-input', 'lettering.shadow.distance', parseFloat);
        bindRange('tt-lettering-shadow-angle-input', 'lettering.shadow.angle', parseFloat);
        bindColor('tt-lettering-shadow-fill-color-input', 'lettering.shadow.fill.color');
        bindCheckbox('tt-lettering-reverse-overlap-letters-input', 'lettering.reverseOverlap.letters');
        bindCheckbox('tt-lettering-reverse-overlap-lines-input', 'lettering.reverseOverlap.lines');
        bindSelect('tt-lettering-blendmode-input', 'lettering.blendmode');

        // DEPTH #1
        bindCheckbox('tt-depth-active-input', 'depth.active');
        bindRange('tt-depth-length-input', 'depth.length', parseFloat);
        bindRange('tt-depth-angle-input', 'depth.angle', parseFloat);
        bindColor('tt-depth-fill-color-input', 'depth.fill.color');
        bindCheckbox('tt-depth-fill-gradient-active-input', 'depth.fill.gradient.active');
        bindRange('tt-depth-fill-merge-alpha-input', 'depth.fill.mergeAlpha', parseFloat);
        bindRange('tt-depth-fill-alpha-input', 'depth.fill.alpha', parseFloat);
        bindCheckbox('tt-depth-fill-texture-active-input', 'depth.fill.texture.active');
        bindSelect('tt-depth-fill-texture-blendmode-input', 'depth.fill.texture.blendmode');
        bindSelect('tt-depth-fill-texture-repeat-input', 'depth.fill.texture.repeat');
        bindSelect('tt-depth-fill-texture-position-input', 'depth.fill.texture.position');
        bindSelect('tt-depth-fill-texture-size-input', 'depth.fill.texture.size');
        bindRange('tt-depth-fill-texture-alpha-input', 'depth.fill.texture.alpha', parseFloat);
        bindCheckbox('tt-depth2-active-input', 'depth2.active');
        bindRange('tt-depth2-length-input', 'depth2.length', parseFloat);
        bindRange('tt-depth2-angle-input', 'depth2.angle', parseFloat);
        bindColor('tt-depth2-fill-color-input', 'depth2.fill.color');
        bindCheckbox('tt-depth2-fill-gradient-active-input', 'depth2.fill.gradient.active');
        bindRange('tt-depth2-fill-merge-alpha-input', 'depth2.fill.mergeAlpha', parseFloat);
        bindRange('tt-depth2-fill-alpha-input', 'depth2.fill.alpha', parseFloat);

        // OUTLINE #1
        bindCheckbox('tt-outline-first-active-input', 'outline.first.active');
        bindRange('tt-outline-first-width-input', 'outline.first.width', parseFloat);
        bindColor('tt-outline-first-fill-color-input', 'outline.first.fill.color');
        bindCheckbox('tt-outline-first-fill-gradient-active-input', 'outline.first.fill.gradient.active');
        bindRange('tt-outline-first-fill-gradient-angle-input', 'outline.first.fill.gradient.angle', parseFloat);
        bindCheckbox('tt-outline-first-fill-palette-active-input', 'outline.first.fill.palette.active');
        bindSelect('tt-outline-first-fill-palette-lettering-method-input', 'outline.first.fill.palette.lettering.method');
        bindSelect('tt-outline-first-position-input', 'outline.first.position');
        bindRange('tt-outline-first-dash-input', 'outline.first.dash', parseFloat);
        bindRange('tt-outline-first-fill-alpha-input', 'outline.first.fill.alpha', parseFloat);
        bindCheckbox('tt-outline-first-fill-texture-active-input', 'outline.first.fill.texture.active');
        bindSelect('tt-outline-first-fill-texture-blendmode-input', 'outline.first.fill.texture.blendmode');
        bindSelect('tt-outline-first-fill-texture-repeat-input', 'outline.first.fill.texture.repeat');
        bindSelect('tt-outline-first-fill-texture-position-input', 'outline.first.fill.texture.position');
        bindSelect('tt-outline-first-fill-texture-size-input', 'outline.first.fill.texture.size');
        bindRange('tt-outline-first-fill-texture-alpha-input', 'outline.first.fill.texture.alpha', parseFloat);
        bindCheckbox('tt-outline-first-fill-texture-lettering-input', 'outline.first.fill.texture.lettering');
        bindCheckbox('tt-outline-first-specular-active-input', 'outline.first.specular.active');
        bindRange('tt-outline-first-specular-blur-input', 'outline.first.specular.blur', parseFloat);
        bindRange('tt-outline-first-specular-scale-input', 'outline.first.specular.scale', parseFloat);
        bindRange('tt-outline-first-specular-constant-input', 'outline.first.specular.constant', parseFloat);
        bindRange('tt-outline-first-specular-exponent-input', 'outline.first.specular.exponent', parseFloat);
        bindRange('tt-outline-first-specular-azimuth-input', 'outline.first.specular.azimuth', parseFloat);
        bindRange('tt-outline-first-specular-elevation-input', 'outline.first.specular.elevation', parseFloat);
        bindColor('tt-outline-first-specular-color-input', 'outline.first.specular.color');
        bindSelect('tt-outline-first-specular-blendmode-input', 'outline.first.specular.blendmode');
        bindCheckbox('tt-outline-first-specular-type-input', 'outline.first.specular.type');
        bindRange('tt-outline-first-specular-point-x-input', 'outline.first.specular.point.x', parseFloat);
        bindRange('tt-outline-first-specular-point-y-input', 'outline.first.specular.point.y', parseFloat);
        bindRange('tt-outline-first-specular-point-z-input', 'outline.first.specular.point.z', parseFloat);
        bindJoinRadio('tt-outline-first-join-input', 'outline.first.join');

        // OUTLINE #2
        bindCheckbox('tt-outline-second-active-input', 'outline.second.active');
        bindRange('tt-outline-second-width-input', 'outline.second.width', parseFloat);
        bindSelect('tt-outline-second-position-input', 'outline.second.position');
        bindColor('tt-outline-second-fill-color-input', 'outline.second.fill.color');
        bindCheckbox('tt-outline-second-fill-gradient-active-input', 'outline.second.fill.gradient.active');
        bindRange('tt-outline-second-dash-input', 'outline.second.dash', parseFloat);
        bindRange('tt-outline-second-fill-alpha-input', 'outline.second.fill.alpha', parseFloat);
        bindCheckbox('tt-outline-second-fill-texture-active-input', 'outline.second.fill.texture.active');
        bindCheckbox('tt-outline-second-specular-active-input', 'outline.second.specular.active');
        bindRange('tt-outline-second-specular-blur-input', 'outline.second.specular.blur', parseFloat);
        bindRange('tt-outline-second-specular-scale-input', 'outline.second.specular.scale', parseFloat);
        bindRange('tt-outline-second-specular-constant-input', 'outline.second.specular.constant', parseFloat);
        bindRange('tt-outline-second-specular-exponent-input', 'outline.second.specular.exponent', parseFloat);
        bindRange('tt-outline-second-specular-azimuth-input', 'outline.second.specular.azimuth', parseFloat);
        bindRange('tt-outline-second-specular-elevation-input', 'outline.second.specular.elevation', parseFloat);
        bindColor('tt-outline-second-specular-color-input', 'outline.second.specular.color');
        bindJoinRadio('tt-outline-second-join-input', 'outline.second.join');

        // CONTOUR 3D
        bindCheckbox('tt-outline-global-active-input', 'outline.global.active');
        bindRange('tt-outline-global-width-input', 'outline.global.width', parseFloat);
        bindColor('tt-outline-global-fill-color-input', 'outline.global.fill.color');
        bindCheckbox('tt-outline-global-fill-gradient-active-input', 'outline.global.fill.gradient.active');
        bindRange('tt-outline-global-fill-alpha-input', 'outline.global.fill.alpha', parseFloat);
        bindCheckbox('tt-outline-global-shadow-active-input', 'outline.global.shadow.active');
        bindCheckbox('tt-outline-global-mask-input', 'outline.global.mask');
        bindCheckbox('tt-outline-global-projection-input', 'outline.global.projection');
        bindCheckbox('tt-outline-global2-active-input', 'outline.global2.active');
        bindRange('tt-outline-global2-width-input', 'outline.global2.width', parseFloat);
        bindColor('tt-outline-global2-fill-color-input', 'outline.global2.fill.color');
        bindRange('tt-outline-global2-fill-alpha-input', 'outline.global2.fill.alpha', parseFloat);
        bindCheckbox('tt-outline-global2-shadow-active-input', 'outline.global2.shadow.active');
        bindCheckbox('tt-outline-global2-mask-input', 'outline.global2.mask');

        // BEVEL INNER
        bindCheckbox('tt-bevel-inner-active-input', 'bevel.inner.active');
        bindRange('tt-bevel-inner-size-input', 'bevel.inner.size', parseFloat);
        bindRange('tt-bevel-inner-soften-input', 'bevel.inner.soften', parseFloat);
        bindRange('tt-bevel-inner-angle-input', 'bevel.inner.angle', parseFloat);
        bindRange('tt-bevel-inner-altitude-input', 'bevel.inner.altitude', parseFloat);
        bindColor('tt-bevel-inner-highlight-color-input', 'bevel.inner.highlight.color');
        bindSelect('tt-bevel-inner-highlight-blendmode-input', 'bevel.inner.highlight.blendmode');
        bindRange('tt-bevel-inner-highlight-alpha-input', 'bevel.inner.highlight.alpha', parseFloat);
        bindColor('tt-bevel-inner-shadow-color-input', 'bevel.inner.shadow.color');
        bindSelect('tt-bevel-inner-shadow-blendmode-input', 'bevel.inner.shadow.blendmode');
        bindRange('tt-bevel-inner-shadow-alpha-input', 'bevel.inner.shadow.alpha', parseFloat);

        // SPECULAR
        bindCheckbox('tt-specular-inner-active-input', 'specular.inner.active');
        bindRange('tt-specular-inner-blur-input', 'specular.inner.blur', parseFloat);
        bindRange('tt-specular-inner-scale-input', 'specular.inner.scale', parseFloat);
        bindRange('tt-specular-inner-constant-input', 'specular.inner.constant', parseFloat);
        bindRange('tt-specular-inner-exponent-input', 'specular.inner.exponent', parseFloat);
        bindRange('tt-specular-inner-azimuth-input', 'specular.inner.azimuth', parseFloat);
        bindRange('tt-specular-inner-elevation-input', 'specular.inner.elevation', parseFloat);
        bindColor('tt-specular-inner-color-input', 'specular.inner.color');

        // INNER SHADOW #1
        bindCheckbox('tt-shadow-inner-active-input', 'shadow.inner.active');
        bindRange('tt-shadow-inner-size-input', 'shadow.inner.size', parseFloat);
        bindRange('tt-shadow-inner-strength-input', 'shadow.inner.strength', parseFloat);
        bindRange('tt-shadow-inner-alpha-input', 'shadow.inner.alpha', parseFloat);
        bindRange('tt-shadow-inner-distance-input', 'shadow.inner.distance', parseFloat);
        bindRange('tt-shadow-inner-angle-input', 'shadow.inner.angle', parseFloat);
        bindRange('tt-shadow-inner-offset-input', 'shadow.inner.offset', parseFloat);
        bindColor('tt-shadow-inner-color-input', 'shadow.inner.color');
        bindSelect('tt-shadow-inner-blendmode-input', 'shadow.inner.blendmode');

        // INNER SHADOW #2
        bindCheckbox('tt-shadow-inner2-active-input', 'shadow.inner2.active');
        bindRange('tt-shadow-inner2-size-input', 'shadow.inner2.size', parseFloat);
        bindRange('tt-shadow-inner2-strength-input', 'shadow.inner2.strength', parseFloat);
        bindRange('tt-shadow-inner2-alpha-input', 'shadow.inner2.alpha', parseFloat);
        bindRange('tt-shadow-inner2-distance-input', 'shadow.inner2.distance', parseFloat);
        bindRange('tt-shadow-inner2-angle-input', 'shadow.inner2.angle', parseFloat);
        bindRange('tt-shadow-inner2-offset-input', 'shadow.inner2.offset', parseFloat);
        bindColor('tt-shadow-inner2-color-input', 'shadow.inner2.color');

        // OUTER SHADOW #1
        bindCheckbox('tt-shadow-outer-active-input', 'shadow.outer.active');
        bindRange('tt-shadow-outer-size-input', 'shadow.outer.size', parseFloat);
        bindRange('tt-shadow-outer-strength-input', 'shadow.outer.strength', parseFloat);
        bindRange('tt-shadow-outer-fill-alpha-input', 'shadow.outer.fill.alpha', parseFloat);
        bindRange('tt-shadow-outer-distance-input', 'shadow.outer.distance', parseFloat);
        bindRange('tt-shadow-outer-angle-input', 'shadow.outer.angle', parseFloat);
        bindCheckbox('tt-shadow-outer-mask-input', 'shadow.outer.mask');
        bindColor('tt-shadow-outer-fill-color-input', 'shadow.outer.fill.color');
        bindCheckbox('tt-shadow-outer-fill-gradient-active-input', 'shadow.outer.fill.gradient.active');

        // OUTER SHADOW #2
        bindCheckbox('tt-shadow-outer2-active-input', 'shadow.outer2.active');
        bindRange('tt-shadow-outer2-size-input', 'shadow.outer2.size', parseFloat);
        bindRange('tt-shadow-outer2-strength-input', 'shadow.outer2.strength', parseFloat);
        bindRange('tt-shadow-outer2-fill-alpha-input', 'shadow.outer2.fill.alpha', parseFloat);
        bindRange('tt-shadow-outer2-distance-input', 'shadow.outer2.distance', parseFloat);
        bindRange('tt-shadow-outer2-angle-input', 'shadow.outer2.angle', parseFloat);
        bindCheckbox('tt-shadow-outer2-mask-input', 'shadow.outer2.mask');
        bindColor('tt-shadow-outer2-fill-color-input', 'shadow.outer2.fill.color');

        // ICON
        bindCheckbox('tt-icon-active-input', 'icon.active');
        bindRange('tt-icon-size-input', 'icon.size', parseFloat);
        bindSelect('tt-icon-position-input', 'icon.position');
        bindRange('tt-icon-offset-x-input', 'icon.offset.x', parseFloat);
        bindRange('tt-icon-offset-y-input', 'icon.offset.y', parseFloat);
        bindRange('tt-icon-rotate-input', 'icon.rotate', parseFloat);
        bindRange('tt-icon-alpha-input', 'icon.alpha', parseFloat);
        bindSelect('tt-icon-composite-input', 'icon.composite');

        // BACKGROUND
        bindCheckbox('tt-background-active-input', 'background.active');
        bindColor('tt-background-fill-color-input', 'background.fill.color');
        bindCheckbox('tt-background-fill-gradient-active-input', 'background.fill.gradient.active');
        bindSelect('tt-background-fill-gradient-type-input', 'background.fill.gradient.type');
        bindRange('tt-background-fill-gradient-angle-input', 'background.fill.gradient.angle', parseFloat);
        bindRange('tt-background-fill-alpha-input', 'background.fill.alpha', parseFloat);
        bindCheckbox('tt-background-fill-image-active-input', 'background.fill.image.active');
        bindSelect('tt-background-fill-image-repeat-input', 'background.fill.image.repeat');
        bindRange('tt-background-fill-image-alpha-input', 'background.fill.image.alpha', parseFloat);
        bindRange('tt-background-fill-image-size-custom-input', 'background.fill.image.size.custom', parseFloat);
        bindSelect('tt-background-composite-input', 'background.composite');

        // Background image size type controls visibility of custom size option
        const bgSizeType = document.getElementById('tt-background-fill-image-size-type-input');
        const bgSizeCustom = document.getElementById('tt-background-fill-image-size-custom-option');
        if (bgSizeType && bgSizeCustom) {
            bgSizeType.addEventListener('change', function() {
                setNestedSetting('background.fill.image.size', this.value);
                bgSizeCustom.style.display = this.value === 'custom' ? 'block' : 'none';
            });
        }
    }

    // Helper: bind textarea
    function bindTextarea(id, settingPath) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            setNestedSetting(settingPath, this.value);
        });
    }

    // Helper: bind align list (icon-based selection)
    function bindAlignList(inputId, settingPath) {
        registerBinding(inputId, settingPath);
        const input = document.getElementById(inputId);
        const list = input?.parentElement?.querySelector('.tt-align-list');
        if (!list || !input) return;
        list.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li || !li.dataset.id) return;
            input.value = li.dataset.id;
            this.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            setNestedSetting(settingPath, li.dataset.id);
        });
    }

    // Helper: bind font weight toggle
    function bindFontWeight(inputId) {
        const input = document.getElementById(inputId);
        const list = document.querySelector('.tt-font-options-list');
        if (!input || !list) return;
        list.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li) return;
            const newValue = input.value === 'normal' ? 'bold' : 'normal';
            input.value = newValue;
            this.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            if (newValue === 'bold') li.classList.add('selected');
            setNestedSetting('font.weight', newValue);
        });
    }

    // Helper: bind range input with render trigger
    function bindRangeWithRender(id, settingPath, transformFn) {
        registerBinding(id, settingPath);
        const el = document.getElementById(id);
        if (!el) return;
        updateRangeFill(el);
        el.addEventListener('input', function() {
            updateRangeFill(this);
            const val = transformFn ? transformFn(this.value) : this.value;
            setNestedSetting(settingPath, val);
        });
    }

    // Helper: bind join/vertices radio-style list
    function bindJoinRadio(inputId, settingPath) {
        const input = document.getElementById(inputId);
        const list = input?.parentElement?.querySelector('.tt-outline-join-list');
        if (!list || !input) return;
        list.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li || !li.dataset.id) return;
            input.value = li.dataset.id;
            this.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            setNestedSetting(settingPath, li.dataset.id);
        });
    }

    // ===== TT-SHOW-BROTHER TABS =====
    function initShowBrotherTabs() {
        document.querySelectorAll('.tt-show-brother').forEach(function(tabList) {
            tabList.addEventListener('click', function(e) {
                const li = e.target.closest('li');
                if (!li || !li.dataset.show) return;
                this.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                li.classList.add('selected');
                const parent = this.closest('.tt-column-inner');
                if (parent) {
                    parent.querySelectorAll('fieldset').forEach(fs => {
                        fs.style.display = fs.id === li.dataset.show ? 'block' : 'none';
                    });
                }
            });
        });
    }

    /** Aplica una imagen a un input: guarda el id (R2: solo id en .txm) y
     * muestra la preview con la URL resuelta. src puede ser id numerico,
     * URL legacy o data-URL (standalone/embebida). */
    function aplicarImagenAInput(input, src) {
        const settingPath = input.dataset.ttOption;
        if (settingPath) setNestedSetting(settingPath, src);
        const url = urlDeImgRef(src);
        const preview = input.parentElement.nextElementSibling;
        if (preview && preview.classList.contains('tt-texture-preview')) {
            preview.style.display = 'block';
            const img = preview.querySelector('.tt-texture-preview-image');
            if (img && url) img.src = url;
        }
        const previewContainer = input.closest('.tt-option')?.querySelector('[id$="preview-container"]');
        if (previewContainer) {
            previewContainer.style.display = 'block';
            const img = previewContainer.querySelector('img');
            if (img && url) img.src = url;
        }
    }

    // R2: resuelve un imgRef (id numerico | URL | data-URL) a URL mostrable
    // (delega en TextMuyAPI, unica fuente). Si el catalogo aun no cargo,
    // '' para ids (cero 404 de ruido: el re-render tras prepareImgRefs pinta
    // la preview); strings tal cual.
    function urlDeImgRef(ref) {
        try {
            if (window.TextMuyAPI && window.TextMuyAPI.urlDeImgRef) return window.TextMuyAPI.urlDeImgRef(ref);
        } catch (_) {}
        return (typeof ref === 'string') ? ref : '';
    }

    // ===== TEXTURE UPLOADS (imagenes al servidor via puente) =====
    function initTextureUploads() {
        document.querySelectorAll('input[type="file"][accept="image/*"]').forEach(function(input) {
            function aplicarImagen(src) {
                aplicarImagenAInput(input, src);
            }

            function usarLocalEmbebida(file) {
                const reader = new FileReader();
                reader.onload = function(ev) { aplicarImagen(ev.target.result); };
                reader.readAsDataURL(file);
            }

            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const categoria = categoriaDe(input);
                // Con puente: la imagen sube a tm/img/ y el settings guarda SU ID
                // numerico (R2: solo id en .txm; la preview usa la URL resuelta).
                // Sin puente (standalone): data-URL embebida.
                if (window.PresetManager && window.PresetManager.bridgeAvailable && window.PresetManager.bridgeAvailable()) {
                    window.PresetManager.uploadImage(file, { categoria: categoria }).then(function(res) {
                        aplicarImagen(res.id > 0 ? res.id : res.url);
                    }).catch(function(err) {
                        // M6: aviso en linea en vez de alert(). El importador de
                        // imagen trae su propio estado; si no existe, la consola.
                        const msg = ((err && err.message) || 'No se pudo subir la imagen.')
                            + ' La imagen se usara embebida en el preset.';
                        console.warn(msg);
                        usarLocalEmbebida(file);
                    });
                } else {
                    usarLocalEmbebida(file);
                }
            });

            insertarBotonMisImagenes(input, aplicarImagen);
        });

        // Delete texture buttons
        document.querySelectorAll('.tt-texture-delete-icon, [id$="preview-delete-icon"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const preview = this.closest('.tt-texture-preview, [id$="preview-container"]');
                if (preview) preview.style.display = 'none';
                const option = this.closest('.tt-option, fieldset');
                if (option) {
                    const fileInput = option.querySelector('input[type="file"]');
                    if (fileInput) {
                        fileInput.value = '';
                        const settingPath = fileInput.dataset.ttOption;
                        if (settingPath) setNestedSetting(settingPath, null);
                    }
                }
            });
        });
    }

    /** Categoria de imagen segun el data-tt-option (icon.* / background.* -> su carpeta). */
    function categoriaDe(input) {
        const p = (input && input.dataset && input.dataset.ttOption) || '';
        if (p.indexOf('icon.') === 0) return 'iconos';
        if (p.indexOf('background.') === 0) return 'fondos';
        return 'varios';
    }

    /** Boton "Seleccionar imagen" junto a cada importador de imagen (abre la galeria). */
    function insertarBotonMisImagenes(input, aplicar) {
        if (!input) return;
        const label = input.closest('label');
        if (label) { label.style.display = 'none'; }
        const contenedor = (label || input).parentElement;
        if (!contenedor || contenedor.querySelector('.tt-galpanel-select-btn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tt-galpanel-select-btn';
        btn.textContent = 'Select';
        btn.title = 'Subir, buscar o elegir una imagen';
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var categoria = categoriaDe(input);
            var sec = input.closest('section');
            if (categoria === 'fondos' && window.TextMuyGaleria) {
                // BACKGROUND con preview en vivo: backup + controles Opacity/Repeat.
                // La galeria confirma el id numerico (R2); el preview usa la URL.
                var backupBg = getNestedSetting ? JSON.parse(JSON.stringify(getNestedSetting('background.fill.image') || {})) : {};
                window.TextMuyGaleria.abrir('fondos', function(src) {
                    setNestedSetting('background.active', true);
                    setNestedSetting('background.fill.image.active', true);
                    setNestedSetting('background.fill.image.src', src);
                    // RC68: resolver el id -> URL y repintar (mismo camino que
                    // loadPreset); sin esto el fondo no se ve al aplicar.
                    repintarConRefsResueltas();
                }, sec, {
                    preview: true,
                    controls: {
                        type: 'background',
                        current: getNestedSetting ? JSON.parse(JSON.stringify(getNestedSetting('background.fill.image') || {})) : {},
                        onChange: function(key, value) {
                            setNestedSetting('background.fill.image.' + key, value);
                        }
                    },
                    applyLabel: 'Aplicar',
                    onCancel: function() {
                        setNestedSetting('background.fill.image', JSON.parse(JSON.stringify(backupBg)));
                    }
                });
            } else {
                abrirModalMisImagenes(aplicar, categoria, sec);
            }
        });
        contenedor.appendChild(btn);
    }

    // El puente llega por postMessage y puede llegar DESPUES de init(): los
    // botones "Mis imagenes" se inyectan (idempotente) cuando aparece.
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('textmuy-bridge-ready', function () {
            document.querySelectorAll('input[type="file"][accept="image/*"]').forEach(function (input) {
                insertarBotonMisImagenes(input, function (src) { aplicarImagenAInput(input, src); });
            });
        });
    }

    // ===== GALERIA UNIFICADA DE IMAGENES =====
    // Implementacion en js/galeria.js (window.TextMuyGaleria). Facade para no
    // romper callers; aplica en el contexto indicado.
    function abrirModalMisImagenes(aplicar, categoria, seccion) {
        if (window.TextMuyGaleria) window.TextMuyGaleria.abrir(categoria||'varios', aplicar, seccion);
    }

    // ===== ICON GALLERY / BACKGROUND GALLERY (retiradas en RC61) =====
    // Las galerias propias de iconos y fondos se eliminaron: eran codigo
    // INALCANZABLE (las dos funciones empezaban con un `return`) y arrastraban
    // 136 URLs de cdn.textstudio.com incrustadas en el modulo, contra §5 (los
    // recursos son datos del plugin) y §7 (sin datos de fabrica). El HTML
    // tampoco tenia sus contenedores (#tt-icon-gallery, #tt-background-gallery,
    // los search, los -list y los -no-result), asi que no se perdia ninguna
    // funcion visible. Los iconos y fondos se eligen con la galeria unificada
    // (galeria.js) sobre el catalogo `img` del plugin.

    function initIconGallery() { /* sin galeria propia: ver la nota de arriba */ }
    function initBackgroundGallery() { /* sin galeria propia: ver la nota de arriba */ }

    // ===== MENU TABS =====
    function bindMenuTabs() {
        const menu = document.getElementById('tt-options-menu');
        const options = document.getElementById('tt-options');
        if (!menu || !options) return;

        menu.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li || !li.dataset.name) return;
            menu.querySelectorAll('li').forEach(function(item) { item.classList.remove('selected'); });
            li.classList.add('selected');
            const sectionName = li.dataset.name;
            if (typeof applyLineTargetGating === 'function') { try { applyLineTargetGating(); } catch (e) {} }
            options.querySelectorAll('section').forEach(function(section) {
                section.style.display = section.dataset.name === sectionName ? 'flex' : 'none';
            });
        });
    }

    // ===== CUSTOM MENU (STYLES sub-tabs) =====
    function bindCustomMenu() {
        const customMenu = document.getElementById('tt-custom-menu');
        if (!customMenu) return;

        customMenu.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li || !li.dataset.filter) return;
            customMenu.querySelectorAll('li').forEach(function(item) { item.classList.remove('selected'); });
            li.classList.add('selected');
            const filter = li.dataset.filter;
            const columns = this.closest('section').querySelector('.tt-columns');
            if (columns) {
                columns.querySelectorAll('.tt-column').forEach(function(col) {
                    const custom = col.dataset.custom;
                    if (custom && custom.startsWith(filter)) {
                        col.style.display = 'flex';
                    } else {
                        col.style.display = 'none';
                    }
                });
            }
        });
    }

    // ===== GRADIENT COLOR INPUTS =====
    // The visual gradient pickers write "#rrggbbaa pos%, ..." strings into
    // hidden inputs and dispatch an 'input' event, but nothing listened to
    // those inputs, so the gradient colors never reached the settings and the
    // renderer fell back to its white->black default gradient.
    const GRADIENT_PICKER_DEFAULT = '#ff0000ff 0%, #00ff00ff 100%';

    function parseGradientColorsString(value) {
        const stops = [];
        String(value || '').split(',').forEach(function(part) {
            const match = part.trim().match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?\s+(\d+(?:\.\d+)?)\s*%$/i);
            if (match) {
                stops.push({
                    color: '#' + match[1],
                    pos: Math.max(0, Math.min(1, parseFloat(match[2]) / 100))
                });
            }
        });
        return stops;
    }

    function bindGradientColorInputs() {
        document.querySelectorAll('input[type="hidden"][data-tt-option*="gradient.colors"]').forEach(function(input) {
            const path = input.getAttribute('data-tt-option');

            // Seed the picker default when the setting has no colors yet, so
            // enabling the gradient shows colors instead of white/black.
            const current = getNestedSetting(path);
            if (!Array.isArray(current) || current.length < 2) {
                input.value = GRADIENT_PICKER_DEFAULT;
                input.dispatchEvent(new Event('input'));
            }

            input.addEventListener('input', function() {
                setNestedSetting(path, parseGradientColorsString(this.value));
            });
        });

        // Rebuild the pickers when settings are reloaded from a preset or
        // undo/redo, so they display the loaded gradient colors.
        document.addEventListener('textmuy:settings-updated', function() {
            if (window.GradientPicker && window.GradientPicker.init) {
                window.GradientPicker.init();
            }
        });
    }

    // ===== FILL LAYERS UI =====
    const MAX_FILL_LAYERS = 4;
    const FILL_BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
    const FILL_REPEATS = [['none', 'no repeat'], ['letter', '1 style / letter'], ['word', '1 style / word'], ['line', '1 style / line']];
    const FILL_STYLE_RAMP = ['#ff3b3b', '#ffb400', '#ffe600', '#2ecc40', '#00a8ff', '#8e44ad'];

    function getFillLayers() {
        let layers = getNestedSetting('fill.layers');
        if ((!Array.isArray(layers) || !layers.length) && editor) {
            // The renderer migrates legacy fill.* fields on the fly, but that
            // array is never stored in settings — so the panel used to edit a
            // different (or empty) layer list and its changes (fit, scale,
            // colors...) never reached the canvas. Seed settings.fill.layers
            // with the migrated layers once so both sides share one array.
            const migrated = window.TextEditor && window.TextEditor.getFillLayers
                ? window.TextEditor.getFillLayers(editor.getSettings())
                : null;
            if (Array.isArray(migrated) && migrated.length) {
                setNestedSetting('fill.layers', migrated);
                layers = getNestedSetting('fill.layers');
            }
        }
        return Array.isArray(layers) ? layers : [];
    }

    function setFillLayers(layers) {
        setNestedSetting('fill.layers', layers);
        renderFillLayersUI();
    }

    function fillStylePreview(style) {
        if (!style) return '#ffffff';
        if (style.type === 'gradient' && style.gradient && Array.isArray(style.gradient.colors) && style.gradient.colors.length) {
            const stops = style.gradient.colors.map(function(s) {
                const color = typeof s === 'string' ? s : (s && s.color) || '#ffffff';
                const pos = s && s.pos !== undefined ? Math.round(s.pos * 100) : null;
                return pos !== null ? color + ' ' + pos + '%' : color;
            }).join(', ');
            return 'linear-gradient(90deg, ' + stops + ')';
        }
        if (style.type === 'texture' && style.texture && style.texture.src) {
            return 'url(' + style.texture.src + ') center/cover';
        }
        return (style.color && typeof style.color === 'string') ? style.color : '#ffffff';
    }

    function renderFillLayersUI() {
        const container = document.getElementById('tt-fill-layers');
        if (!container) return;
        const layers = getFillLayers();
        container.innerHTML = '';
        layers.forEach(function(layer, li) {
            container.appendChild(buildFillLayerRow(layer, li, layers.length));
        });
        const addBtn = document.getElementById('tt-fill-add-layer-btn');
        if (addBtn) addBtn.style.display = layers.length >= MAX_FILL_LAYERS ? 'none' : 'block';
    }


    function buildFillLayerRow(layer, li, total) {
        const wrap = document.createElement('div');
        wrap.className = 'tt-fill-layer';

        const head = document.createElement('div');
        head.className = 'tt-fill-layer-head';

        const num = document.createElement('span');
        num.className = 'tt-fill-layer-num';
        num.textContent = '#' + (li + 1);
        head.appendChild(num);

        const repeat = document.createElement('select');
        repeat.className = 'tt-fill-layer-repeat';
        repeat.title = 'How the styles repeat';
        FILL_REPEATS.forEach(function(r) {
            const opt = document.createElement('option');
            opt.value = r[0];
            opt.textContent = r[1];
            repeat.appendChild(opt);
        });
        repeat.value = layer.repeat || 'none';
        repeat.addEventListener('change', function() {
            const layers = getFillLayers();
            layers[li].repeat = this.value;
            setFillLayers(layers);
        });
        head.appendChild(repeat);

        const alpha = document.createElement('input');
        alpha.type = 'range';
        alpha.min = '0'; alpha.max = '1'; alpha.step = '0.01';
        alpha.value = layer.alpha !== undefined ? layer.alpha : 1;
        alpha.title = 'Opacity';
        alpha.addEventListener('input', function() {
            const layers = getFillLayers();
            layers[li].alpha = parseFloat(this.value);
            setNestedSetting('fill.layers', layers);
        });
        head.appendChild(alpha);

        const blend = document.createElement('select');
        blend.className = 'tt-fill-layer-blend';
        blend.title = 'Blend mode';
        FILL_BLEND_MODES.forEach(function(m) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            blend.appendChild(opt);
        });
        blend.value = layer.blendmode || 'source-over';
        blend.addEventListener('change', function() {
            const layers = getFillLayers();
            layers[li].blendmode = this.value;
            setFillLayers(layers);
        });
        head.appendChild(blend);

        if (total > 1) {
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.textContent = '✕';
            rm.title = 'Remove layer';
            rm.className = 'tt-fill-layer-remove';
            rm.addEventListener('click', function() {
                const layers = getFillLayers();
                layers.splice(li, 1);
                setFillLayers(layers);
            });
            head.appendChild(rm);
        }
        wrap.appendChild(head);

        const stylesList = document.createElement('ul');
        stylesList.className = 'tt-fill-styles';
        (layer.styles || []).forEach(function(style, si) {
            stylesList.appendChild(buildFillStyleRow(layer, li, si));
        });
        wrap.appendChild(stylesList);

        const addStyle = document.createElement('button');
        addStyle.type = 'button';
        addStyle.className = 'tt-fill-add-style-btn';
        addStyle.textContent = '+ Add style';
        addStyle.addEventListener('click', function() {
            const layers = getFillLayers();
            layers[li].styles.push({ type: 'color', color: FILL_STYLE_RAMP[layers[li].styles.length % FILL_STYLE_RAMP.length] });
            setFillLayers(layers);
        });
        wrap.appendChild(addStyle);

        return wrap;
    }

    function buildFillStyleRow(layer, li, si) {
        const style = layer.styles[si];
        const row = document.createElement('li');
        row.className = 'tt-fill-style';

        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'tt-fill-style-preview';
        preview.title = 'Edit style';
        preview.style.background = fillStylePreview(style);
        preview.addEventListener('click', function(e) {
            e.stopPropagation();
            openFillStyleEditor(li, si, preview);
        });
        row.appendChild(preview);

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = '✎';
        edit.title = 'Edit style';
        edit.className = 'tt-fill-style-edit';
        edit.addEventListener('click', function(e) {
            e.stopPropagation();
            openFillStyleEditor(li, si, preview);
        });
        row.appendChild(edit);

        if (layer.styles.length > 1) {
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.textContent = '✕';
            rm.title = 'Remove style';
            rm.className = 'tt-fill-style-remove';
            rm.addEventListener('click', function() {
                const layers = getFillLayers();
                layers[li].styles.splice(si, 1);
                setFillLayers(layers);
            });
            row.appendChild(rm);
        }
        return row;
    }


    // Floating style editor: Color / Gradient / Pattern
    let fillStyleEditorEl = null;

    function closeFillStyleEditor() {
        if (fillStyleEditorEl) {
            fillStyleEditorEl.remove();
            fillStyleEditorEl = null;
        }
        document.removeEventListener('click', fillStyleDocClick, true);
    }

    // Close only when the click lands OUTSIDE the panel. Capture-phase
    // document listeners run before the panel's own stopPropagation, so the
    // old "close on any click" approach killed every interaction inside it
    // (gradient handles, sliders, buttons).
    function fillStyleDocClick(e) {
        if (fillStyleEditorEl && !fillStyleEditorEl.contains(e.target)) {
            closeFillStyleEditor();
        }
    }

    function openFillStyleEditor(layerIdx, styleIdx, anchor) {
        closeFillStyleEditor();
        const layer = getFillLayers()[layerIdx];
        if (!layer || !layer.styles[styleIdx]) return;
        let style = layer.styles[styleIdx];

        const panel = document.createElement('div');
        panel.id = 'tt-fill-style-editor';
        panel.className = 'tt-fill-style-editor';
        const rect = anchor.getBoundingClientRect();
        panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 250)) + 'px';
        panel.style.top = Math.min(rect.bottom + 6, window.innerHeight - 280) + 'px';
        panel.addEventListener('click', function(e) { e.stopPropagation(); });

        const tabs = document.createElement('div');
        tabs.className = 'tt-fill-style-tabs';
        const TABS = [['color', 'Color'], ['gradient', 'Gradient'], ['texture', 'Pattern']];
        const body = document.createElement('div');
        body.className = 'tt-fill-style-body';

        // Rebuilds body + tab selection in-place (panel keeps its position)
        function refreshEditorBody() {
            const layers = getFillLayers();
            if (!layers[layerIdx] || !layers[layerIdx].styles[styleIdx]) return;
            style = layers[layerIdx].styles[styleIdx];
            tabs.querySelectorAll('.tt-fill-style-tab').forEach(function(tab, i) {
                tab.classList.toggle('selected', TABS[i][0] === style.type);
            });
            body.innerHTML = '';
            buildFillStyleEditorBody(body, style, layerIdx, styleIdx, refreshEditorBody);
        }

        TABS.forEach(function(t) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = t[1];
            b.className = 'tt-fill-style-tab' + (style.type === t[0] ? ' selected' : '');
            b.addEventListener('click', function() {
                const layers = getFillLayers();
                const st = layers[layerIdx].styles[styleIdx];
                if (!st) return;
                if (t[0] === 'color' && !st.color) st.color = '#ffffff';
                if (t[0] === 'gradient' && !st.gradient) {
                    st.gradient = { angle: 0, colors: [{ color: '#ff0000', pos: 0 }, { color: '#00ff00', pos: 1 }] };
                }
                if (t[0] === 'texture' && !st.texture) {
                    st.texture = { src: null, repeat: 'repeat', position: 'center', fit: 'fill', scale: 1 };
                }
                st.type = t[0];
                // setFillLayers renders the canvas + rebuilds the layer rows
                // (chip previews update) but the floating panel is a separate
                // element, so it keeps its position. The body is refreshed
                // in-place instead of re-opening with a detached anchor
                // (whose getBoundingClientRect returns zeros -> position bug).
                setFillLayers(layers);
                refreshEditorBody();
            });
            tabs.appendChild(b);
        });
        // The initial body must be built AFTER the panel is attached to the
        // document: the gradient tab locates its picker with
        // document.querySelectorAll('.tt-gradient-picker'), which cannot see
        // elements inside a detached subtree (this is why the picker only
        // appeared after clicking the Gradient tab).
        panel.appendChild(tabs);
        panel.appendChild(body);
        document.body.appendChild(panel);
        buildFillStyleEditorBody(body, style, layerIdx, styleIdx, refreshEditorBody);
        fillStyleEditorEl = panel;
        setTimeout(function() {
            document.addEventListener('click', fillStyleDocClick, true);
        }, 0);
    }

    function buildFillStyleEditorBody(body, style, layerIdx, styleIdx, refreshEditorBody) {
        if (style.type === 'color') {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = /^#[0-9a-fA-F]{6}$/.test(style.color || '') ? style.color : '#ffffff';
            input.addEventListener('input', function() {
                const layers = getFillLayers();
                layers[layerIdx].styles[styleIdx].color = this.value;
                setNestedSetting('fill.layers', layers);
                renderFillLayersUI();
            });
            body.appendChild(input);
            return;
        }

        if (style.type === 'gradient') {
            const colorsInput = document.createElement('input');
            colorsInput.type = 'hidden';
            colorsInput.id = 'tt-fill-style-gradient-colors-' + layerIdx + '-' + styleIdx;
            colorsInput.value = gradientColorsToPickerString(style.gradient);
            colorsInput.addEventListener('input', function() {
                const layers = getFillLayers();
                layers[layerIdx].styles[styleIdx].gradient.colors = parseGradientColorsString(this.value);
                setNestedSetting('fill.layers', layers);
                renderFillLayersUI();
            });
            body.appendChild(colorsInput);

            const pickerDiv = document.createElement('div');
            pickerDiv.className = 'tt-gradient-picker';
            pickerDiv.setAttribute('data-update-input', colorsInput.id);
            body.appendChild(pickerDiv);

            const angleRow = document.createElement('div');
            angleRow.className = 'tt-fill-style-angle';
            const angleLabel = document.createElement('span');
            angleLabel.className = 'tt-label';
            angleLabel.textContent = 'Direction:';
            const angle = document.createElement('input');
            angle.type = 'range';
            angle.min = '-180'; angle.max = '180'; angle.step = '2.5';
            angle.value = (style.gradient && style.gradient.angle) || 0;
            angle.addEventListener('input', function() {
                const layers = getFillLayers();
                layers[layerIdx].styles[styleIdx].gradient.angle = parseFloat(this.value);
                setNestedSetting('fill.layers', layers);
            });
            angleRow.appendChild(angleLabel);
            angleRow.appendChild(angle);
            body.appendChild(angleRow);

            // Initialize ONLY this panel's picker. The global init() rebuilds
            // every picker on the page; the targeted create() keeps the
            // static pickers (and their state) untouched.
            if (window.GradientPicker && window.GradientPicker.create) {
                window.GradientPicker.create(pickerDiv, colorsInput);
            } else if (window.GradientPicker && window.GradientPicker.init) {
                window.GradientPicker.init();
            }
            return;
        }

        // ===== PATTERN (texture) =====
        const tex = style.texture || {};

        const hint = document.createElement('div');
        hint.className = 'tt-label';
        hint.textContent = 'Pattern image:';
        body.appendChild(hint);

        const file = document.createElement('input');
        file.type = 'file';
        file.accept = 'image/*';
        file.style.display = 'none';
        file.addEventListener('change', function(e) {
            const f = e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const layers = getFillLayers();
                layers[layerIdx].styles[styleIdx].texture.src = ev.target.result;
                setFillLayers(layers);
                if (refreshEditorBody) refreshEditorBody();
            };
            reader.readAsDataURL(f);
        });
        body.appendChild(file);

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.textContent = 'Select';
        selectBtn.style.cssText = 'display:block;width:100%;padding:5px 14px;font-size:12px;background:var(--tt-bg-panel-2,#222);color:var(--tt-text,#ccc);border:1px solid var(--tt-border-btn,#555);border-radius:4px;cursor:pointer;margin:4px 0;';
        selectBtn.addEventListener('click', function() {
            if (window.TextMuyGaleria) {
                var sec = document.querySelector('section[data-name="custom"]');
                // Backup del estilo actual para poder revertir con ✕
                var backupTex = JSON.parse(JSON.stringify(style.texture || {}));
                var backupType = style.type;
                var backupActive = style.active;
                window.TextMuyGaleria.abrir('fondos', function(src) {
                    // Live preview con URL resuelta; al confirmar (Aplicar) la
                    // galeria re-llama con el id numerico (R2: solo id en .txm).
                    const layers = getFillLayers();
                    layers[layerIdx].styles[styleIdx].texture.src = (typeof src === 'number') ? src : (window.TextMuyAPI && window.TextMuyAPI.urlDeImgRef ? window.TextMuyAPI.urlDeImgRef(src) : src);
                    layers[layerIdx].styles[styleIdx].type = 'texture';
                    layers[layerIdx].styles[styleIdx].active = true;
                    setFillLayers(layers);
                    // RC68: resolver el id -> URL y repintar; sin esto la
                    // textura no se ve al aplicar y el motor pedia el id como
                    // URL relativa (404 .../textmuy/6).
                    repintarConRefsResueltas();
                }, sec, {
                    preview: true,
                    controls: {
                        type: 'pattern',
                        current: JSON.parse(JSON.stringify(style.texture || {})),
                        onChange: function(key, value) {
                            const layers = getFillLayers();
                            layers[layerIdx].styles[styleIdx].texture[key] = value;
                            setFillLayers(layers);
                        }
                    },
                    applyLabel: 'Aplicar',
                    onCancel: function() {
                        // Restaurar el backup (puede ser id numerico R2)
                        const layers = getFillLayers();
                        layers[layerIdx].styles[styleIdx].texture = JSON.parse(JSON.stringify(backupTex));
                        layers[layerIdx].styles[styleIdx].type = backupType;
                        layers[layerIdx].styles[styleIdx].active = backupActive;
                        setFillLayers(layers);
                    }
                });
            } else {
                file.click();
            }
        });
        body.appendChild(selectBtn);

        // --- Fit: stretch / fit / fill ---
        const fitRow = document.createElement('div');
        fitRow.className = 'tt-fill-style-angle';
        const fitLabel = document.createElement('span');
        fitLabel.className = 'tt-label';
        fitLabel.textContent = 'Fit:';
        const fit = document.createElement('select');
        [['stretch', 'stretch'], ['fit', 'fit'], ['fill', 'fill']].forEach(function(f) {
            const opt = document.createElement('option');
            opt.value = f[0];
            opt.textContent = f[1];
            fit.appendChild(opt);
        });
        fit.value = tex.fit || 'fill';
        fit.addEventListener('change', function() {
            const layers = getFillLayers();
            layers[layerIdx].styles[styleIdx].texture.fit = this.value;
            setNestedSetting('fill.layers', layers);
        });
        fitRow.appendChild(fitLabel);
        fitRow.appendChild(fit);
        body.appendChild(fitRow);

        // --- Scale: 10% to 100% ---
        const scaleRow = document.createElement('div');
        scaleRow.className = 'tt-fill-style-angle';
        const scaleLabel = document.createElement('span');
        scaleLabel.className = 'tt-label';
        scaleLabel.textContent = 'Scale:';
        const scale = document.createElement('input');
        scale.type = 'range';
        scale.min = '10'; scale.max = '100'; scale.step = '5';
        scale.value = Math.round((tex.scale !== undefined ? tex.scale : 1) * 100);
        const scaleBubble = document.createElement('span');
        scaleBubble.className = 'tt-label';
        scaleBubble.textContent = scale.value + '%';
        scale.addEventListener('input', function() {
            scaleBubble.textContent = this.value + '%';
            const layers = getFillLayers();
            layers[layerIdx].styles[styleIdx].texture.scale = parseFloat(this.value) / 100;
            setNestedSetting('fill.layers', layers);
        });
        scaleRow.appendChild(scaleLabel);
        scaleRow.appendChild(scale);
        scaleRow.appendChild(scaleBubble);
        body.appendChild(scaleRow);

        // --- Repeat ---
        const repeat = document.createElement('select');
        [['repeat', 'repeat'], ['no-repeat', 'no-repeat']].forEach(function(r) {
            const opt = document.createElement('option');
            opt.value = r[0];
            opt.textContent = r[1];
            repeat.appendChild(opt);
        });
        repeat.value = tex.repeat || 'repeat';
        repeat.addEventListener('change', function() {
            const layers = getFillLayers();
            layers[layerIdx].styles[styleIdx].texture.repeat = this.value;
            setNestedSetting('fill.layers', layers);
        });
        body.appendChild(repeat);

        // --- Position: 3x3 origin grid ---
        const POSITIONS = [
            ['left top', 'center top', 'right top'],
            ['left center', 'center', 'right center'],
            ['left bottom', 'center bottom', 'right bottom']
        ];
        const gridLabel = document.createElement('div');
        gridLabel.className = 'tt-label';
        gridLabel.textContent = 'Origin:';
        body.appendChild(gridLabel);
        const grid = document.createElement('div');
        grid.className = 'tt-fill-position-grid';
        POSITIONS.forEach(function(rowOpts) {
            const rowEl = document.createElement('div');
            rowEl.className = 'tt-fill-position-grid-row';
            rowOpts.forEach(function(pos) {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'tt-fill-position-cell' + ((tex.position || 'center') === pos ? ' selected' : '');
                cell.title = pos;
                cell.addEventListener('click', function() {
                    grid.querySelectorAll('.tt-fill-position-cell').forEach(function(c2) { c2.classList.remove('selected'); });
                    cell.classList.add('selected');
                    const layers = getFillLayers();
                    layers[layerIdx].styles[styleIdx].texture.position = pos;
                    setNestedSetting('fill.layers', layers);
                });
                rowEl.appendChild(cell);
            });
            grid.appendChild(rowEl);
        });
        body.appendChild(grid);
    }
    function gradientColorsToPickerString(gradient) {
        const colors = gradient && gradient.colors;
        if (!Array.isArray(colors)) return '';
        return colors.map(function(stop) {
            let hex;
            if (typeof stop === 'string') hex = stop.replace('#', '');
            else if (stop && stop.color) hex = String(stop.color).replace('#', '');
            else return null;
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            hex = hex.slice(0, 6);
            const pos = Math.round((stop && stop.pos !== undefined ? Number(stop.pos) : 0) * 100);
            return '#' + hex + 'ff ' + pos + '%';
        }).filter(Boolean).join(', ');
    }

    function initFillLayersUI() {
        const addBtn = document.getElementById('tt-fill-add-layer-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const layers = getFillLayers();
                if (layers.length >= MAX_FILL_LAYERS) return;
                layers.push({ active: true, alpha: 1, blendmode: 'source-over', repeat: 'none', styles: [{ type: 'color', color: '#ffffff' }] });
                setFillLayers(layers);
            });
        }
        document.addEventListener('textmuy:settings-updated', renderFillLayersUI);
        renderFillLayersUI();
    }

    // ===== DOWNLOAD CONTROLS =====
    // The download size must match the canvas size the user configured in the
    // TEXT section, so both inputs stay synced with settings.canvas.
    function syncDownloadSizeInputs() {
        if (!editor) return;
        const settings = editor.getSettings();
        if (!settings.canvas) return;
        const wInput = document.getElementById('tt-download-width-input');
        const hInput = document.getElementById('tt-download-height-input');
        if (wInput && settings.canvas.width) wInput.value = settings.canvas.width;
        if (hInput && settings.canvas.height) hInput.value = settings.canvas.height;
    }

    function bindDownloadControls() {
        const downloadBtn = document.getElementById('tt-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() {
                if (window.TextMuyAPI && editor) {
                    const settings = editor.getSettings();
                    const width = parseInt(document.getElementById('tt-download-width-input')?.value) ||
                        (settings.canvas && settings.canvas.width) || 480;
                    const height = parseInt(document.getElementById('tt-download-height-input')?.value) ||
                        (settings.canvas && settings.canvas.height) || 320;
                    const scale = parseFloat(document.getElementById('tt-download-scale-input')?.value || 1);
                    // Render from the current editor state (settings) so the
                    // downloaded PNG matches what the user sees.
                    TextMuyAPI.downloadPNG({
                        settings: settings,
                        text: settings.text,
                        width: Math.round(width * scale),
                        height: Math.round(height * scale)
                    });
                }
            });
        }

        // Editing the download size also resizes the canvas (single source of
        // truth: settings.canvas.width/height).
        const dlWidthInput = document.getElementById('tt-download-width-input');
        const dlHeightInput = document.getElementById('tt-download-height-input');
        if (dlWidthInput) {
            dlWidthInput.addEventListener('input', function() {
                const w = parseInt(this.value);
                if (w > 0) setNestedSetting('canvas.width', w);
            });
        }
        if (dlHeightInput) {
            dlHeightInput.addEventListener('input', function() {
                const h = parseInt(this.value);
                if (h > 0) setNestedSetting('canvas.height', h);
            });
        }
        // Keep the download inputs aligned with the canvas when a preset is
        // loaded, undo/redo runs, or the canvas inputs change.
        document.addEventListener('textmuy:settings-updated', syncDownloadSizeInputs);
        syncDownloadSizeInputs();

        const copyBtn = document.getElementById('tt-copy-image-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                if (window.TextMuyAPI && editor) {
                    TextMuyAPI.copyImageToClipboard({
                        settings: editor.getSettings(),
                        text: editor.getSettings().text
                    });
                }
            });
        }

        // "Save as New Preset" vive ahora en la galeria inferior (unico panel de
        // presets): tt-gallery-save-btn -> initPresetGallery().

        const ratioInput = document.getElementById('tt-download-ratio-input');
        if (ratioInput) {
            ratioInput.addEventListener('change', function() {
                const ratio = this.value;
                if (ratio !== 'fit' && editor) {
                    const parts = ratio.split(':').map(Number);
                    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
                        const wInput = document.getElementById('tt-download-width-input');
                        const hInput = document.getElementById('tt-download-height-input');
                        if (wInput && hInput) {
                            const w = parseInt(wInput.value) || 480;
                            hInput.value = Math.round(w * parts[1] / parts[0]);
                        }
                    }
                }
            });
        }

        const spacingInput = document.getElementById('tt-download-spacing-input');
        if (spacingInput) {
            spacingInput.addEventListener('change', function() {
                if (editor) {
                    editor.getSettings().download = editor.getSettings().download || {};
                    editor.getSettings().download.spacing = parseFloat(this.value);
                }
            });
        }
    }

    // ===== IMPORT DE PRESETS (TextStudio -> .txm en el servidor) =====
    /**
     * Guarda un preset importado (formato TextStudio crudo) como .txm via el
     * puente; sin puente descarga el .txm. Al final refresca la galeria
     * inferior (unico panel de presets).
     */
    function guardarPresetImportado(nombre, presetRaw) {
        if (!window.PresetManager) { console.error('PresetManager no esta disponible.'); return; }
        let settings = presetRaw;
        if (window.TextEditor && TextEditor.createDefaultSettings && TextEditor.loadPreset) {
            settings = TextEditor.createDefaultSettings();
            TextEditor.loadPreset(presetRaw, settings);
        }
        window.PresetManager.savePreset(nombre, settings).then(function (res) {
            // M6: estado en linea en vez de alert(). El aviso vive en el
            // importador; si no esta (guardado desde otro camino) se usa la
            // consola para no bloquear el hilo con un dialog nativo.
            const msg = 'Preset importado y guardado como "' + res.name + '"'
                + (res.mode === 'server' ? ' (en el servidor).' : ' (.txm descargado).');
            avisarImport(msg, false);
            if (typeof refrescarGaleriaPresets === 'function') refrescarGaleriaPresets();
        }).catch(function (e) {
            avisarImport('Error al guardar el preset importado: ' + e.message, true);
        });
    }

    // Ultimo aviso del importador: lo llena setAvisoImport cuando el panel
    // existe (bindImportControls) y sirve de respaldo por consola si no.
    let ultimoAviso = null;
    function avisarImport(texto, esError) {
        if (ultimoAviso) ultimoAviso(texto, esError);
        else if (esError) console.error(texto);
        else console.log(texto);
    }

    // ===== IMPORT CONTROLS =====
    function bindImportControls() {
        const importBtn = document.getElementById('tt-import-btn');
        const importUrl = document.getElementById('tt-import-url-input');
        if (!importBtn || !importUrl) return;

        // Estado en linea del importador (M6): sustituye a los alert() nativos,
        // que en un panel de WordPress bloquean el hilo y rompen el foco. Se
        // crea una sola vez junto al boton y se rellena con el resultado.
        let aviso = document.getElementById('tt-import-status');
        if (!aviso) {
            aviso = document.createElement('p');
            aviso.id = 'tt-import-status';
            aviso.hidden = true;
            aviso.style.margin = '6px 0 0';
            aviso.style.fontSize = '12px';
            importBtn.parentElement.appendChild(aviso);
        }
        function setAvisoImport(texto, esError) {
            aviso.textContent = texto;
            aviso.hidden = !texto;
            aviso.style.color = esError ? 'var(--tt-danger, #d33)' : 'var(--tt-success, #2b2)';
        }
        // guardarPresetImportado avisa por aqui si existe el panel.
        ultimoAviso = setAvisoImport;

        // Acepta la URL o el HTML/JSON pegado a mano. Extrae el preset de
        // `window.__PRESET__` o del JSON-LD, que es lo mismo que hacia con los
        // proxies pero sin mandar nada afuera.
        function intentarImportar(texto) {
            const match = texto.match(/window\.__PRESET__\s*=\s*({[^;]+})/);
            if (match) {
                try {
                    const preset = JSON.parse(match[1]);
                    if (window.PresetManager) guardarPresetImportado('imported-' + Date.now(), preset);
                    importBtn.textContent = 'Import';
                    importBtn.disabled = false;
                    return true;
                } catch (e) {
                    setAvisoImport('El `window.__PRESET__` de la pagina no es JSON valido: ' + e.message, true);
                    importBtn.textContent = 'Import';
                    importBtn.disabled = false;
                    return true;
                }
            }

            const jsonLdMatch = texto.match(/<script[^>]+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);
            if (jsonLdMatch) {
                try {
                    const data = JSON.parse(jsonLdMatch[1]);
                    if (data && data.text) {
                        if (window.PresetManager) guardarPresetImportado('imported-' + Date.now(), data);
                        importBtn.textContent = 'Import';
                        importBtn.disabled = false;
                        return true;
                    }
                    setAvisoImport('El JSON-LD de la pagina no trae el campo "text" del preset.', true);
                    importBtn.textContent = 'Import';
                    importBtn.disabled = false;
                    return true;
                } catch (e) {
                    setAvisoImport('El JSON-LD de la pagina no es JSON valido: ' + e.message, true);
                    importBtn.textContent = 'Import';
                    importBtn.disabled = false;
                    return true;
                }
            }
            return false;
        }

        importBtn.addEventListener('click', function() {
            const url = importUrl.value.trim();
            if (!url) { setAvisoImport('Pega la URL del preset de TextStudio.', true); return; }
            setAvisoImport('');
            importBtn.textContent = 'Importando...';
            importBtn.disabled = true;

            // RC61: FUERA los proxies CORS publicos (allorigins / corsproxy /
            // codetabs). Mandaban a un servicio de terceros la URL que pega el
            // administrador, y en un panel de WordPress eso es una fuga de datos
            // involuntaria hacia un destino no auditable. Ademas eran la unica
            // via: desde el iframe, leer textstudio.com directo lo bloquea CORS.
            // Quedan dos caminos honestos:
            //   1. fetch directo, que solo funciona si el sitio manda CORS;
            //   2. pegar el HTML/JSON a mano (ver el aviso de abajo).
            // Lo correcto a futuro es un `op=fetch-remoto` en el motor (§3): la
            // peticion saldria del servidor del plugin. Documentado en AGENTS.md.
            fetch(url)
                .then(function(r) {
                    if (!r.ok) throw new Error('respuesta ' + r.status);
                    return r.text();
                })
                .then(function(html) {
                    if (!intentarImportar(html)) {
                        setAvisoImport('Se leyo la pagina pero no se encontro el preset. '
                            + 'Abrila con "Ver codigo fuente" y pega el HTML o el JSON aca.', true);
                        importBtn.textContent = 'Import';
                        importBtn.disabled = false;
                    }
                })
                .catch(function(e) {
                    // Sin proxy no hay segunda vuelta: se explica que hacer.
                    setAvisoImport('El navegador no puede leer esa URL (' + ((e && e.message) || e)
                        + '). Abri la pagina del preset, copia su codigo fuente (o el JSON) '
                        + 'y pegalo en este campo.', true);
                    importBtn.textContent = 'Import';
                    importBtn.disabled = false;
                });
        });
    }

    // ===== FIELDSET AUTO-MINIMIZE =====
    function initActiveFieldsets() {
        // Find all checkboxes inside <legend> inside <fieldset>
        document.querySelectorAll('fieldset legend input[type="checkbox"]').forEach(function(checkbox) {
            const fieldset = checkbox.closest('fieldset');
            if (!fieldset) return;

            // Get setting path
            const settingPath = checkbox.getAttribute('data-tt-option');
            if (!settingPath) return;

            // Only handle checkboxes that control the fieldset visibility (end with .active)
            const parts = settingPath.split('.');
            const isActiveToggle = parts[parts.length - 1] === 'active';

            if (!isActiveToggle) return;

            // Initial state
            toggleFieldset(fieldset, checkbox.checked);

            // Update on change
            checkbox.addEventListener('change', function() {
                toggleFieldset(fieldset, checkbox.checked);
            });
        });

        function toggleFieldset(fieldset, isActive) {
            if (isActive) {
                fieldset.classList.remove('tt-col-disabled');
                if (fieldset.hasAttribute('data-autominimize')) {
                    fieldset.classList.remove('tt-minimized');
                }
            } else {
                fieldset.classList.add('tt-col-disabled');
                if (fieldset.hasAttribute('data-autominimize')) {
                    fieldset.classList.add('tt-minimized');
                }
            }
        }
    }

    // ===== RANGE DEFAULTS =====
    function getValueAtPath(source, path) {
        return path.split('.').reduce(function(value, key) {
            return value === undefined || value === null ? undefined : value[key];
        }, source);
    }

    function getDefaultRangeValue(control, defaults) {
        const settingPath = control.getAttribute('data-tt-option');
        const settingDefault = settingPath && defaults ? getValueAtPath(defaults, settingPath) : undefined;
        if (typeof settingDefault === 'boolean') return settingDefault ? '1' : '0';
        return settingDefault !== undefined && settingDefault !== null ? String(settingDefault) : control.defaultValue;
    }

    function getUndoLabel(control) {
        const labels = document.querySelectorAll('label[for]');
        for (let i = 0; i < labels.length; i++) {
            if (labels[i].htmlFor === control.id) return labels[i];
        }
        return control.closest('.tt-option');
    }

    function initUndoRedo() {
        const defaults = editor && editor.createDefaultSettings ? editor.createDefaultSettings() : null;

        document.querySelectorAll('input[type="range"]').forEach(function(control) {
            let undoSpan = document.querySelector('[data-undo-control="' + control.id + '"]');
            if (!undoSpan) {
                const label = getUndoLabel(control);
                if (!label) return;
                undoSpan = document.createElement('span');
                undoSpan.className = 'tt-undo';
                undoSpan.setAttribute('data-undo-control', control.id);
                label.appendChild(undoSpan);
            }

            const defaultValue = getDefaultRangeValue(control, defaults);
            control.value = defaultValue;
            undoSpan.title = 'Restore default value';
            undoSpan.setAttribute('role', 'button');
            undoSpan.setAttribute('tabindex', '0');

            function updateVisibility() {
                undoSpan.style.display = control.value === defaultValue ? 'none' : 'inline-flex';
            }

            function restoreDefault(event) {
                if (event) event.preventDefault();
                if (control.value === defaultValue) return;
                control.value = defaultValue;
                control.dispatchEvent(new Event('input', { bubbles: true }));
                updateRangeFill(control);
                updateVisibility();
            }

            control.addEventListener('input', updateVisibility);
            control.addEventListener('change', updateVisibility);
            undoSpan.addEventListener('click', restoreDefault);
            undoSpan.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') restoreDefault(event);
            });
            undoSpan._updateDefaultVisibility = updateVisibility;
            updateVisibility();
        });
    }

    function refreshUndoControls() {
        document.querySelectorAll('[data-undo-control]').forEach(function(undoSpan) {
            if (undoSpan._updateDefaultVisibility) undoSpan._updateDefaultVisibility();
        });
    }

    // ===== RANGE SLIDERS =====
    function initRangeSliders() {
        document.querySelectorAll('input[type="range"]').forEach(function(range) {
            updateRangeFill(range);
            range.addEventListener('input', function() {
                updateRangeFill(this);
            });
        });
    }

    // ===== FONT PICKER DESDE CATALOGO (cero hardcode en HTML/JS) =====
    // El <select> estatico de index.html es solo fallback inicial: al
    // arrancar se reconstruye desde fonts.json (Google) + fisicas del puente
    // + fuentes fisicas del puente. La busqueda y las categorias viven solo
    // en la galeria de fuentes.
    // El <select> estatico de index.html es solo un esqueleto: al arrancar se
    // reconstruye desde el catalogo. RC39: se puebla desde UNA sola fuente de
    // verdad (FontLoader.listFontEntries), con la identidad numerica como
    // valor. Antes se poblaba desde el mapa de categorias y luego se le
    // anadian las fisicas del puente con OTRA clave, de modo que la misma
    // fuente aparecia dos veces y algunas entradas no cargaban nada.
    function rebuildFontPicker() {
        const fontSelect = document.getElementById('tt-font-picker-input');
        if (!fontSelect || !window.FontLoader || !window.FontLoader.loadCatalog) return Promise.resolve();
        const prevValue = fontSelect.value;
        return window.FontLoader.loadCatalog().then(function () {
            if (!window.FontLoader.listFontEntries) return;
            const entradas = window.FontLoader.listFontEntries();
            while (fontSelect.firstChild) fontSelect.removeChild(fontSelect.firstChild);
            const porCategoria = {};
            entradas.forEach(function (e) {
                const cat = e.categoria || 'custom';
                if (!porCategoria[cat]) porCategoria[cat] = [];
                porCategoria[cat].push(e);
            });
            const labelOf = function (c) { return c.charAt(0).toUpperCase() + c.slice(1); };
            Object.keys(porCategoria).sort().forEach(function (cat) {
                const g = document.createElement('optgroup');
                g.label = labelOf(cat);
                g.setAttribute('data-font-group', cat);
                porCategoria[cat].forEach(function (e) {
                    const o = document.createElement('option');
                    // La identidad numerica es el valor: es la unica clave que
                    // el camino de carga entiende (R-C4.1, R-C4.2).
                    o.value = String(e.id);
                    o.textContent = e.name;
                    g.appendChild(o);
                });
                fontSelect.appendChild(g);
            });
            // Sin catalogo no hay entradas: no se ofrecen fuentes que luego
            // fallen al elegirse (R-C4.4).
            restaurarSeleccion(fontSelect, prevValue);
            sincronizarSeleccion(fontSelect);
        });
    }
    // Deja el selector mostrando la fuente del proyecto. Si la fuente actual
    // no esta en la lista, se selecciona la primera disponible en vez de
    // dejar el selector en blanco (R-C4.3, FR-010).
    function restaurarSeleccion(fontSelect, valor) {
        if (!fontSelect || !valor) return;
        const opcion = fontSelect.querySelector('option[value="' + valor + '"]');
        if (opcion) {
            fontSelect.value = valor;
            return;
        }
        if (fontSelect.options && fontSelect.options.length > 0) {
            fontSelect.selectedIndex = 0;
        }
    }
    // Sincroniza el selector con el estado del proyecto SIN disparar el evento
    // change: escribir la fuente es una decision del usuario, no una consecuencia
    // de repintar el selector.
    //
    // FR-031: la referencia del proyecto se RESUELVE a identidad antes de buscar
    // la opcion. Sin esto, un proyecto que declara la fuente por nombre visible
    // (referencia antigua, como el estado por defecto 'Bangers') busca
    // option[value="Bangers"], que no existe porque las opciones van por identidad
    // numerica; el desplegable queda sin seleccion valida y el navegador muestra
    // la PRIMERA entrada de la lista, que es otra fuente. El usuario veia
    // "MUY-Alegria" en el desplegable mientras el lienzo dibujaba Bangers.
    function sincronizarSeleccion(fontSelect) {
        if (!fontSelect || !editor) return;
        const ref = editor.getSettings && editor.getSettings().font ? editor.getSettings().font.src : null;
        if (ref === null || ref === undefined || ref === '') return;
        let valor = String(ref);
        // Resolver a identidad antes de buscar la opcion.
        if (window.FontLoader && window.FontLoader.resolveFontId && !/^\d+$/.test(valor)) {
            try { valor = String(window.FontLoader.resolveFontId(ref)); }
            catch (_) {
                // FR-033: no se puede representar la fuente declarada. NO se deja
                // una entrada arbitraria: se limpia la seleccion para que el
                // desplegable no muestre una fuente que el usuario no eligio.
                try { fontSelect.selectedIndex = -1; } catch (_e) {}
                return;
            }
        }
        if (fontSelect.querySelector('option[value="' + valor + '"]')) {
            if (fontSelect.value !== valor) fontSelect.value = valor;
        }
    }
    // ===== FONT PICKER + GALERIA =====
    function initFontFilters() {
        const fontSelect = document.getElementById('tt-font-picker-input');
        if (!fontSelect) return;

        // Un solo paso: el catalogo se lee una vez y el selector se puebla con
        // el listado unico. Antes habia un segundo paso que anadia las mismas
        // fuentes con otra clave (R-C4.1).
        rebuildFontPicker();

        // Tras cargar un preset, deshacer o rehacer, el selector debe reflejar
        // la fuente del proyecto (R-C4.3, FR-010). Se sincroniza SIN disparar
        // el evento change: escribir la fuente es del usuario, no del editor.
        document.addEventListener('textmuy:settings-updated', function () {
            sincronizarSeleccion(fontSelect);
        });

        // Cuando llega el puente (o tras un margen), el catalogo se relee por
        // si el servidor ya habia escrito el inventario. Se reconstruye desde
        // la misma fuente de verdad, asi que no aparecen duplicados.
        function refrescar() {
            if (window.FontLoader && window.FontLoader.loadUserFonts) {
                window.FontLoader.loadUserFonts().then(rebuildFontPicker).catch(function () {});
            } else {
                rebuildFontPicker();
            }
        }
        window.addEventListener('textmuy-bridge-ready', refrescar);
        setTimeout(refrescar, 100);
        function seleccionarFuente(key, item) {
            if (key === null || key === undefined || key === '') return;
            // La clave es la IDENTIDAD de la fuente. Se normaliza a numero
            // cuando el catalogo la reconoce, para que el valor escrito en el
            // estado sea siempre la identidad canonica (R-C1.3).
            let valor = key;
            if (window.FontLoader && window.FontLoader.resolveFontId) {
                try { valor = window.FontLoader.resolveFontId(key); }
                catch (_) { /* referencia no resoluble: se usa tal cual */ }
            }
            valor = String(valor);
            let option = fontSelect.querySelector('option[value="' + valor + '"]');
            if (!option && (item && (item.id !== undefined))) {
                // La galeria conoce una fuente que el catalogo aun no tiene.
                const g = document.createElement('optgroup');
                g.setAttribute('data-font-group', (item && item.categoria) || 'custom');
                option = document.createElement('option');
                option.value = valor;
                option.textContent = (item && (item.titulo || item.name)) || valor;
                g.appendChild(option);
                fontSelect.appendChild(g);
            }
            if (!option) return;
            fontSelect.value = valor;
            fontSelect.dispatchEvent(new Event('change'));
        }

        // Boton Galeria de fuentes (busqueda, categorias, preview y CRUD).
        const fontGalleryBtn = document.getElementById('tt-font-gallery-btn');
        if (fontGalleryBtn && !fontGalleryBtn.dataset.bound) {
            fontGalleryBtn.dataset.bound = '1';
            fontGalleryBtn.addEventListener('click', function() {
                if (!window.TextMuyGaleriaFuentes) return;
                window.TextMuyGaleriaFuentes.abrir(function(key, item) {
                    seleccionarFuente(key, item);
                    // Refrescar por si hubo altas/bajas en la galeria: el
                    // listado se reconstruye desde la misma fuente de verdad.
                    refrescar();
                });
            });
        }
    }

    // ===== PRESET GALLERY (unico panel de presets: grilla inferior con miniaturas) =====
    // Fuente de datos: listado del puente (presets/*.txm del servidor). Refresca
    // al abrir y tras cada guardar/borrar/importar. El boton de migracion sube
    // los presets legacy de localStorage (versiones anteriores) al servidor.
    let refrescarGaleriaPresets = null;

    function initPresetGallery() {
        const gallery = document.getElementById('tt-preset-gallery');
        const toggle = document.getElementById('tt-preset-gallery-toggle');
        const grid = document.getElementById('tt-gallery-grid');
        const search = document.getElementById('tt-gallery-search');
        const saveBtn = document.getElementById('tt-gallery-save-btn');
        const statusEl = document.getElementById('tt-gallery-status');
        if (!gallery || !toggle || !grid) return;

        let presetSpriteInfo = null;
        let presetSpriteVersion = 0;
        window.addEventListener('textmuy:sprite-invalidado', function(ev) {
            if (ev.detail && ev.detail.ambito === 'tm-presets') {
                presetSpriteVersion++;
                presetSpriteInfo = null;
            }
        });
        // RC37: la hoja de miniaturas de presets se LEE por la ruta canonica
        // (api.js::ensureSpriteCanonico: thumbs.webp validado contra
        // thumbs.sprite_firma del catalogo). Antes se reconstruia en cada
        // apertura y el render de cada tile llamaba a
        // PresetManager.ensureThumbnail(), que dibuja el preset -> cargaba la
        // fuente de TODOS los presets al abrir. Sin hoja certificada la galeria
        // muestra el nombre y nada mas; la generacion es explicita (boton).
        let presetIdsPorNombre = {}; // nombre .txm sin extension -> id de presets.json
        function cargarPresetSprite() {
            const version = ++presetSpriteVersion;
            if (!window.TextMuyAPI || !window.TextMuyAPI.ensureSpriteCanonico) {
                return Promise.resolve(null);
            }
            const hoja = window.TextMuyAPI.asegurarHojaCompleta
                // T017: la hoja se completa sola. El nucleo de dos fases lee la
                // certificada y, si faltan celdas, las dibuja (render del preset,
                // que carga su fuente) y persiste una sola vez.
                ? window.TextMuyAPI.asegurarHojaCompleta("tm-presets", {
                    renderTile: function (it) {
                        const PM = window.PresetManager;
                        if (!PM || !PM.renderPresetTile) return null;
                        const nombre = it && it.file ? String(it.file).replace(/\.txm$/i, '') : '';
                        return nombre ? PM.renderPresetTile(nombre) : null;
                    },
                    onProgress: function (hechos, total, fallos) {
                        setStatus('Completando miniaturas: ' + hechos + '/' + total +
                            (fallos ? ' (' + fallos + ' con error)' : '') + '...');
                    }
                })
                // Modulo viejo en cache (sin el nucleo): degrada a solo lectura.
                : window.TextMuyAPI.ensureSpriteCanonico("tm-presets")
                    .then(function (s) { return { estado: s ? 'listo' : 'error' }; });
            const cat = window.TextMuyAPI.loadCatalogo
                // RC44: .then() envuelve la llamada; un throw sincronico tambien
                // queda como rechazo capturado (defensa del contrato async).
                ? Promise.resolve().then(function() { return window.TextMuyAPI.loadCatalogo("tm-presets"); }).catch(function() { return null; })
                : Promise.resolve(null);
            return Promise.all([hoja, cat]).then(function(r) {
                if (version !== presetSpriteVersion) return null;
                const s = r[0], parsed = r[1];
                if (parsed && parsed.items) {
                    Object.keys(parsed.items).forEach(function(id) {
                        const f = parsed.items[id] && parsed.items[id].file;
                        if (f) presetIdsPorNombre[String(f).replace(/\.txm$/i, '')] = Number(id);
                    });
                }
                // `s` es el estado del nucleo {estado, causa}; tras generar se
                // relee la hoja ya certificada para poder dibujar las celdas.
                if (s && s.estado === 'error') {
                    setStatus('Miniaturas: ' + (s.causa || 'sin causa'), true);
                    return null;
                }
                return Promise.resolve(window.TextMuyAPI.ensureSpriteCanonico("tm-presets"))
                    .then(function (hoja) {
                        if (version !== presetSpriteVersion) return null;
                        if (!hoja || !hoja.spriteImage) return null;
                        presetSpriteInfo = { spriteImage: hoja.spriteImage, spriteUrl: hoja.spriteUrl };
                        setStatus('Miniaturas listas.');
                        return presetSpriteInfo;
                    });
            }).catch(function() { return null; });
        }

        function setStatus(msg, esError) {
            if (!statusEl) return;
            statusEl.textContent = msg || '';
            statusEl.classList.toggle('tt-gallery-status-error', !!esError);
        }

        function populate() {
            grid.innerHTML = '';
            const nombres = (window.PresetManager && window.PresetManager.listPresets)
                ? window.PresetManager.listPresets()
                : [];
            nombres.forEach(function(name) {
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'tt-gallery-tile';
                tile.dataset.preset = name;
                tile.setAttribute('aria-label', name);

                // Miniatura desde la hoja CANONICA del ambito (celda = id-1).
                // Sin hoja no hay <img>: el label del tile ya muestra el nombre
                // y la galeria no toca la red.
                let celda = null;
                const pid = presetIdsPorNombre[name];
                if (presetSpriteInfo && window.TextMuyAPI && window.TextMuyAPI.drawTileCanonico
                    && typeof pid === "number" && pid >= 1) {
                    try { celda = window.TextMuyAPI.drawTileCanonico("tm-presets", pid); }
                    catch (_) { celda = null; }
                }
                if (celda) tile.appendChild(celda);
                else {
                    // Sin hoja: se conserva la altura del tile y se avisa que no
                    // hay miniatura generada (el nombre vive en el label).
                    const ph = document.createElement('span');
                    ph.className = 'tt-gallery-tile-ph';
                    ph.textContent = 'sin miniatura';
                    tile.appendChild(ph);
                }

                const label = document.createElement('span');
                label.className = 'tt-gallery-tile-label';
                label.textContent = name;
                tile.appendChild(label);

                const del = document.createElement('span');
                del.className = 'tt-gallery-tile-delete';
                del.title = 'Borrar preset';
                del.setAttribute('role', 'button');
                del.setAttribute('aria-label', 'Borrar preset ' + name);
                del.textContent = '\u00d7';
                del.addEventListener('click', function(e) {
                    e.stopPropagation();
                    borrarPreset(name);
                });
                tile.appendChild(del);

                tile.addEventListener('click', function() {
                    if (window.PresetManager && window.PresetManager.loadPreset) {
                        window.PresetManager.loadPreset(name);
                        currentPresetName = name;
                        markSelected();
                    }
                });

                grid.appendChild(tile);

                // RC37: sin hoja canonica NO se pide la miniatura de cada preset:
                // PresetManager.ensureThumbnail() dibuja el preset y con eso carga
                // su fuente, o sea abrir la galeria se bajaba todas. El label del
                // tile ya muestra el nombre; las miniaturas se generan a pedido.
            });
            markSelected();
        }

        function borrarPreset(name) {
            if (!confirm('Borrar el preset "' + name + '" (su .txm del servidor)?')) return;
            if (!window.PresetManager) return;
            window.PresetManager.deletePreset(name).then(function() {
                setStatus('Preset "' + name + '" borrado.');
                if (currentPresetName === name) currentPresetName = null;
                populate();
            }).catch(function(e) { setStatus(e.message, true); });
        }

        function guardarPreset() {
            if (!editor || !window.PresetManager || !window.PresetManager.savePreset) return;
            const nombre = prompt('Nombre del preset:');
            if (!nombre) return;
            setStatus('Guardando "' + nombre + '"...');
            window.PresetManager.savePreset(nombre, editor.getSettings()).then(function(res) {
                if (res.mode === 'server') {
                    setStatus('Preset "' + res.name + '" guardado en el servidor.');
                } else {
                    setStatus('No se pudo guardar el preset.');
                }
                populate();
            }).catch(function(e) { setStatus(e.message, true); });
        }

        toggle.addEventListener('click', function() {
            const open = gallery.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (!open) return;
            // RC44: sin puente la galeria NO opera: estado visible en vez de
            // panel vacio o excepcion (AGENTS 4.2). El status vive en el
            // toolbar y es el punto de aviso del panel.
            if (!(window.PresetManager && window.PresetManager.bridgeAvailable && window.PresetManager.bridgeAvailable())) {
                setStatus('Los presets requieren el plugin (puente no disponible). Recarga la pagina.', true);
                return;
            }
            if (!presetSpriteInfo) {
                // T017 (spec 009, estado `listando`): el listado se pinta YA con
                // los nombres y la hoja se completa en segundo plano. Antes la
                // lista esperaba a `cargarPresetSprite()`: como esa funcion ahora
                // GENERA la hoja (dibuja el preset y carga su fuente), un render
                // lento podia dejar la galeria en 0 tiles.
                populate();
                cargarPresetSprite().then(populate);
            } else {
                populate();
            }
        });

        if (search) search.addEventListener('input', filterTiles);
        if (saveBtn) saveBtn.addEventListener('click', guardarPreset);
        // Permite refrescar la galeria desde fuera (import de TextStudio, etc.).
        refrescarGaleriaPresets = function() { populate(); };

        function markSelected() {
            grid.querySelectorAll('.tt-gallery-tile').forEach(function(t) {
                t.classList.toggle('selected', t.dataset.preset === currentPresetName);
            });
        }

        function filterTiles() {
            const q = (search.value || '').toLowerCase();
            grid.querySelectorAll('.tt-gallery-tile').forEach(function(t) {
                const name = (t.dataset.preset || '').toLowerCase();
                t.style.display = name.indexOf(q) !== -1 ? '' : 'none';
            });
        }
    }

    // (Los "Local projects (.txm)" via File System Access se eliminaron en 3.2.0:
    // guardar un preset ahora escribe {nombre}.txm + {nombre}.webp directamente
    // en presets/ del servidor via el puente; sin puente, savePreset descarga el
    // .txm. La carga/miniatura la resuelve loadPreset/ensureThumbnail.)

    // Expose init
    window.Controls = {
        init: init,
        refreshUndoControls: refreshUndoControls
    };
})();
