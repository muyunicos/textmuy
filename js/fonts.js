/* ===== TEXTSTUDIO FONTS - TTF Font Loading ===== */

(function() {
    'use strict';

    var fontRegistry = {
        '28days-later': { name: '28 Days Later Cyr Regular', path: 'fonts/28days-later.ttf' },
        'nintender': { name: 'Nintender Regular', path: 'fonts/nintender.ttf' },
        'lemon-milk': { name: 'LEMON MILK Pro UltraBold', path: 'fonts/lemon-milk.ttf' }
    };

    var loadedFonts = {};
    var loadingPromises = {};

    function loadFont(fontKey) {
        if (loadedFonts[fontKey]) {
            return Promise.resolve(loadedFonts[fontKey]);
        }
        if (loadingPromises[fontKey]) {
            return loadingPromises[fontKey];
        }

        var fontInfo = fontRegistry[fontKey];
        if (!fontInfo) {
            return Promise.reject('Unknown font: ' + fontKey);
        }

        var font = new FontFace(fontInfo.name, 'url(' + fontInfo.path + ')');
        loadingPromises[fontKey] = font.load().then(function(loaded) {
            document.fonts.add(loaded);
            loadedFonts[fontKey] = fontInfo.name;
            return fontInfo.name;
        }).catch(function(err) {
            console.error('Failed to load font ' + fontKey + ':', err);
            delete loadingPromises[fontKey];
            return null;
        });

        return loadingPromises[fontKey];
    }

    function getFontName(fontKey) {
        if (fontRegistry[fontKey]) {
            return fontRegistry[fontKey].name;
        }
        return fontKey;
    }

    function isCustomFont(fontKey) {
        return fontKey in fontRegistry;
    }

    function preloadAll() {
        var promises = [];
        for (var key in fontRegistry) {
            promises.push(loadFont(key));
        }
        return Promise.all(promises);
    }

    window.FontLoader = {
        loadFont: loadFont,
        getFontName: getFontName,
        isCustomFont: isCustomFont,
        preloadAll: preloadAll,
        registry: fontRegistry
    };

})();
