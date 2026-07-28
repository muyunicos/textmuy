/* ===== PRESET MANAGER - CRUD Operations ===== */
(function() {
    'use strict';

    const STORAGE_KEY = 'textmuy_presets';
    const IMPORTED_KEY = 'textstudio_presets';

    /**
     * Get all presets (local + imported)
     */
    function getAllPresets() {
        const presets = {};
        
        // Load local presets
        try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            Object.keys(local).forEach(name => {
                presets[name] = {
                    name: name,
                    data: local[name],
                    source: 'local',
                    timestamp: local[name].timestamp || Date.now()
                };
            });
        } catch (e) {
            console.error('Failed to load local presets:', e);
        }

        // Load imported presets
        try {
            const imported = JSON.parse(localStorage.getItem(IMPORTED_KEY) || '{}');
            Object.keys(imported).forEach(name => {
                if (!presets[name]) {
                    presets[name] = {
                        name: name,
                        data: imported[name].preset || imported[name],
                        source: 'imported',
                        timestamp: imported[name].timestamp || Date.now()
                    };
                }
            });
        } catch (e) {
            console.error('Failed to load imported presets:', e);
        }

        return presets;
    }

    /**
     * Get preset by name
     */
    function getPreset(name) {
        const presets = getAllPresets();
        return presets[name] ? presets[name].data : null;
    }

    /**
     * Create new preset
     */
    function createPreset(name, settings) {
        if (!name || typeof name !== 'string') {
            throw new Error('Preset name is required');
        }

        const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        
        try {
            const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            
            if (presets[safeName]) {
                throw new Error('Preset already exists: ' + safeName);
            }

            presets[safeName] = {
                ...settings,
                timestamp: Date.now()
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
            return safeName;
        } catch (e) {
            console.error('Failed to create preset:', e);
            throw e;
        }
    }

    /**
     * Update existing preset
     */
    function updatePreset(name, settings) {
        if (!name || typeof name !== 'string') {
            throw new Error('Preset name is required');
        }

        const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        
        try {
            const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            
            if (!presets[safeName]) {
                throw new Error('Preset not found: ' + safeName);
            }

            presets[safeName] = {
                ...settings,
                timestamp: Date.now()
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
            return safeName;
        } catch (e) {
            console.error('Failed to update preset:', e);
            throw e;
        }
    }

    /**
     * Delete preset
     */
    function deletePreset(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Preset name is required');
        }

        const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        
        try {
            const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            
            if (!presets[safeName]) {
                throw new Error('Preset not found: ' + safeName);
            }

            delete presets[safeName];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
            return true;
        } catch (e) {
            console.error('Failed to delete preset:', e);
            throw e;
        }
    }

    /**
     * Duplicate preset
     */
    function duplicatePreset(name, newName) {
        const preset = getPreset(name);
        
        if (!preset) {
            throw new Error('Preset not found: ' + name);
        }

        const finalName = newName || name + '-copy';
        return createPreset(finalName, preset);
    }

    /**
     * Export preset as JSON file
     */
    function exportPreset(name) {
        const preset = getPreset(name);
        
        if (!preset) {
            throw new Error('Preset not found: ' + name);
        }

        const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Import preset from JSON file
     */
    function importPreset(jsonString) {
        try {
            const preset = JSON.parse(jsonString);
            const name = preset.name || 'imported-preset-' + Date.now();
            return createPreset(name, preset);
        } catch (e) {
            console.error('Failed to import preset:', e);
            throw new Error('Invalid preset JSON');
        }
    }

    /**
     * Load preset from file system
     */
    async function loadPresetFromFile(name) {
        try {
            const response = await fetch('presets/' + encodeURIComponent(name) + '.json');
            if (!response.ok) {
                throw new Error('Preset not found: ' + name);
            }
            return await response.json();
        } catch (e) {
            console.error('Failed to load preset file:', e);
            throw e;
        }
    }

    /**
     * Get preset list sorted by timestamp
     */
    function getPresetList() {
        const presets = getAllPresets();
        const list = Object.values(presets).sort((a, b) => b.timestamp - a.timestamp);
        return list;
    }

    /**
     * Clear all local presets
     */
    function clearLocalPresets() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Clear imported presets cache
     */
    function clearImportedPresets() {
        localStorage.removeItem(IMPORTED_KEY);
    }

    /**
     * Get preset count
     */
    function getPresetCount() {
        const presets = getAllPresets();
        return Object.keys(presets).length;
    }

    // Export API
    window.PresetManager = {
        getAllPresets,
        getPreset,
        createPreset,
        updatePreset,
        deletePreset,
        duplicatePreset,
        exportPreset,
        importPreset,
        loadPresetFromFile,
        getPresetList,
        clearLocalPresets,
        clearImportedPresets,
        getPresetCount
    };
})();
