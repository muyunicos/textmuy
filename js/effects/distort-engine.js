/* ===== DISTORT/ARC ENGINE =====
 * Per-character arc/distort effect for text rendering
 * TextStudio-style curve with individual character positioning
 */

(function() {
    'use strict';

    class DistortEngine {
        constructor() {
            this.cache = new Map();
        }

        /**
         * Apply arc distortion to text
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {string} text - Text to distort
         * @param {number} fontSize - Font size in pixels
         * @param {Object} settings - Distort settings
         * @param {number} settings.angle - Arc angle in degrees
         * @param {number} settings.amplitude - Distortion amplitude
         * @param {string} settings.type - Type of distortion ('arc', 'wave', 'bulge')
         */
        applyDistort(ctx, text, fontSize, settings) {
            const { angle = 0, amplitude = 0, type = 'arc' } = settings;
            
            if (Math.abs(angle) < 0.1 && Math.abs(amplitude) < 0.01) {
                return false; // No distortion needed
            }

            const angleRad = (angle * Math.PI) / 180;
            
            if (type === 'arc') {
                return this.applyArc(ctx, text, fontSize, angleRad);
            } else if (type === 'wave') {
                return this.applyWave(ctx, text, fontSize, amplitude);
            } else if (type === 'bulge') {
                return this.applyBulge(ctx, text, fontSize, amplitude);
            }
            
            return false;
        }

        /**
         * Apply arc distortion (TextStudio-style)
         * Characters are positioned along a circular arc
         */
        applyArc(ctx, text, fontSize, angleRad) {
            const chars = text.split('');
            const totalChars = chars.length;
            
            if (totalChars === 0 || Math.abs(angleRad) < 0.01) {
                return false;
            }

            // Calculate radius based on text width and arc angle
            const totalWidth = this.measureTextWidth(ctx, text);
            const radius = totalWidth / (2 * Math.abs(angleRad));
            
            // Ensure minimum radius to prevent extreme distortion
            const minRadius = fontSize * 5;
            const finalRadius = Math.max(radius, minRadius);
            
            // Calculate angle per character
            const anglePerChar = angleRad / totalChars;
            
            // Save current state
            ctx.save();
            
            // Calculate center point
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            
            // Move to starting position
            ctx.translate(centerX, centerY);
            
            // Apply arc transformation per character
            let currentAngle = -angleRad / 2;
            
            chars.forEach((char, index) => {
                const charWidth = ctx.measureText(char).width;
                
                // Calculate position on arc
                const charAngle = currentAngle + anglePerChar / 2;
                const x = Math.sin(charAngle) * finalRadius;
                const y = -Math.cos(charAngle) * finalRadius;
                
                // Calculate rotation for character
                const rotation = charAngle;
                
                // Draw character
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                ctx.fillText(char, -charWidth / 2, 0);
                ctx.restore();
                
                currentAngle += anglePerChar;
            });
            
            ctx.restore();
            return true;
        }

        /**
         * Apply wave distortion
         * Characters oscillate vertically in a sine wave pattern
         */
        applyWave(ctx, text, fontSize, amplitude) {
            const chars = text.split('');
            const totalChars = chars.length;
            
            if (totalChars === 0 || Math.abs(amplitude) < 0.01) {
                return false;
            }

            const waveAmplitude = amplitude * fontSize;
            const frequency = 0.5; // Wave frequency
            
            ctx.save();
            
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            
            // Calculate total text width for centering
            const totalWidth = this.measureTextWidth(ctx, text);
            let currentX = centerX - totalWidth / 2;
            
            chars.forEach((char, index) => {
                const charWidth = ctx.measureText(char).width;
                
                // Calculate wave offset
                const waveOffset = Math.sin(index * frequency) * waveAmplitude;
                
                // Draw character with wave offset
                ctx.save();
                ctx.translate(currentX + charWidth / 2, centerY + waveOffset);
                ctx.fillText(char, -charWidth / 2, 0);
                ctx.restore();
                
                currentX += charWidth;
            });
            
            ctx.restore();
            return true;
        }

        /**
         * Apply bulge distortion
         * Characters bulge outward from center
         */
        applyBulge(ctx, text, fontSize, amplitude) {
            const chars = text.split('');
            const totalChars = chars.length;
            
            if (totalChars === 0 || Math.abs(amplitude) < 0.01) {
                return false;
            }

            const bulgeAmount = amplitude * fontSize;
            
            ctx.save();
            
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            
            // Calculate total text width for centering
            const totalWidth = this.measureTextWidth(ctx, text);
            let currentX = centerX - totalWidth / 2;
            
            chars.forEach((char, index) => {
                const charWidth = ctx.measureText(char).width;
                
                // Calculate distance from center (normalized -1 to 1)
                const normalizedPos = (index / (totalChars - 1)) * 2 - 1;
                
                // Calculate bulge offset (parabolic curve)
                const bulgeOffset = (1 - normalizedPos * normalizedPos) * bulgeAmount;
                
                // Draw character with bulge offset
                ctx.save();
                ctx.translate(currentX + charWidth / 2, centerY - bulgeOffset);
                ctx.fillText(char, -charWidth / 2, 0);
                ctx.restore();
                
                currentX += charWidth;
            });
            
            ctx.restore();
            return true;
        }

        /**
         * Measure total text width
         */
        measureTextWidth(ctx, text) {
            let totalWidth = 0;
            for (const char of text) {
                totalWidth += ctx.measureText(char).width;
            }
            return totalWidth;
        }

        /**
         * Apply boggle effect (random character offset and rotation)
         * Used in lettering effects
         */
        applyBoggle(ctx, text, fontSize, settings) {
            const { angle = 0, amplitude = 0.1 } = settings;
            
            if (Math.abs(amplitude) < 0.01) {
                return false;
            }

            const chars = text.split('');
            const totalChars = chars.length;
            
            if (totalChars === 0) {
                return false;
            }

            // Use seeded random for consistency
            const seed = this.hashCode(text);
            const random = this.seededRandom(seed);
            
            ctx.save();
            
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            
            // Calculate total text width for centering
            const totalWidth = this.measureTextWidth(ctx, text);
            let currentX = centerX - totalWidth / 2;
            
            const angleRad = (angle * Math.PI) / 180;
            const maxOffset = amplitude * fontSize;
            const maxRotation = angleRad;
            
            chars.forEach((char, index) => {
                const charWidth = ctx.measureText(char).width;
                
                // Random offset
                const offsetX = (random() - 0.5) * maxOffset;
                const offsetY = (random() - 0.5) * maxOffset;
                
                // Random rotation
                const rotation = (random() - 0.5) * maxRotation;
                
                // Draw character with random offset and rotation
                ctx.save();
                ctx.translate(currentX + charWidth / 2 + offsetX, centerY + offsetY);
                ctx.rotate(rotation);
                ctx.fillText(char, -charWidth / 2, 0);
                ctx.restore();
                
                currentX += charWidth;
            });
            
            ctx.restore();
            return true;
        }

        /**
         * Simple hash function for seeding
         */
        hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash);
        }

        /**
         * Seeded random number generator
         */
        seededRandom(seed) {
            return function() {
                seed = (seed * 9301 + 49297) % 233280;
                return seed / 233280;
            };
        }

        /**
         * Clear cache
         */
        clearCache() {
            this.cache.clear();
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DistortEngine;
    } else {
        window.DistortEngine = DistortEngine;
    }
})();
