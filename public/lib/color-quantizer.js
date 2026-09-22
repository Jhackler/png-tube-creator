// ═══════════════════════════════════════════════════════════════════
//  COLOR QUANTIZER
// ═══════════════════════════════════════════════════════════════════

class ColorQuantizer {

    static quantize(rgba, maxColors) {
        const numPixels = rgba.length / 4;
        // Reserve one slot for transparent color
        const paletteSlots = Math.max(2, maxColors - 1);

        // Separate transparent vs opaque pixels
        const opaqueColors = [];
        const transparentMask = new Uint8Array(numPixels);

        for (let i = 0; i < numPixels; i++) {
            const a = rgba[i * 4 + 3];
            if (a < 128) {
                transparentMask[i] = 1;
            } else {
                opaqueColors.push(i);
            }
        }

        // Build palette from opaque pixels using median cut
        let palette;
        if (opaqueColors.length === 0) {
            palette = [[0, 0, 0]];
        } else {
            palette = ColorQuantizer.medianCut(rgba, opaqueColors, paletteSlots);
        }

        // Transparent color gets the last index
        const transparentIndex = palette.length;
        palette.push([0, 0, 0]); // transparent entry (color doesn't matter)

        // Map each pixel to nearest palette entry
        const indexedPixels = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
            if (transparentMask[i]) {
                indexedPixels[i] = transparentIndex;
            } else {
                const r = rgba[i * 4];
                const g = rgba[i * 4 + 1];
                const b = rgba[i * 4 + 2];
                indexedPixels[i] = ColorQuantizer.nearestPaletteIndex(palette, r, g, b, transparentIndex);
            }
        }

        return { palette, indexedPixels, transparentIndex };
    }

    static medianCut(rgba, pixelIndices, targetColors) {
        // Build list of RGB values
        const colors = pixelIndices.map(i => [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);

        if (colors.length === 0) return [[0, 0, 0]];
        if (targetColors <= 1) {
            return [ColorQuantizer.averageColors(colors)];
        }

        let boxes = [colors];

        while (boxes.length < targetColors) {
            // Find the box with the greatest color range
            let bestIdx = -1;
            let bestRange = -1;

            for (let i = 0; i < boxes.length; i++) {
                if (boxes[i].length <= 1) continue;
                const range = ColorQuantizer.maxRange(boxes[i]);
                if (range > bestRange) {
                    bestRange = range;
                    bestIdx = i;
                }
            }

            if (bestIdx === -1) break;

            const box = boxes[bestIdx];
            const channel = ColorQuantizer.longestChannel(box);

            // Sort by the longest channel
            box.sort((a, b) => a[channel] - b[channel]);

            const mid = Math.floor(box.length / 2);
            const box1 = box.slice(0, mid);
            const box2 = box.slice(mid);

            boxes.splice(bestIdx, 1, box1, box2);
        }

        return boxes.map(box => ColorQuantizer.averageColors(box));
    }

    static maxRange(colors) {
        let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
        for (const c of colors) {
            if (c[0] < rMin) rMin = c[0]; if (c[0] > rMax) rMax = c[0];
            if (c[1] < gMin) gMin = c[1]; if (c[1] > gMax) gMax = c[1];
            if (c[2] < bMin) bMin = c[2]; if (c[2] > bMax) bMax = c[2];
        }
        return Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
    }

    static longestChannel(colors) {
        let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
        for (const c of colors) {
            if (c[0] < rMin) rMin = c[0]; if (c[0] > rMax) rMax = c[0];
            if (c[1] < gMin) gMin = c[1]; if (c[1] > gMax) gMax = c[1];
            if (c[2] < bMin) bMin = c[2]; if (c[2] > bMax) bMax = c[2];
        }
        const rRange = rMax - rMin, gRange = gMax - gMin, bRange = bMax - bMin;
        if (rRange >= gRange && rRange >= bRange) return 0;
        if (gRange >= bRange) return 1;
        return 2;
    }

    static averageColors(colors) {
        if (colors.length === 0) return [0, 0, 0];
        let rSum = 0, gSum = 0, bSum = 0;
        for (const c of colors) {
            rSum += c[0]; gSum += c[1]; bSum += c[2];
        }
        const n = colors.length;
        return [Math.round(rSum / n), Math.round(gSum / n), Math.round(bSum / n)];
    }

    static nearestPaletteIndex(palette, r, g, b, excludeIndex) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < palette.length; i++) {
            if (i === excludeIndex) continue;
            const dr = r - palette[i][0];
            const dg = g - palette[i][1];
            const db = b - palette[i][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
                if (dist === 0) return i; // exact match — skip rest
            }
        }
        return bestIdx;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColorQuantizer };
}
