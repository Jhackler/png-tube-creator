// ═══════════════════════════════════════════════════════════════════
//  GIF DECODER
// ═══════════════════════════════════════════════════════════════════

class GifDecoder {
    /**
     * Decode a GIF file into structured frame data.
     * @param {ArrayBuffer} arrayBuffer
     * @returns {{ width, height, frames: Array<{rgba, delay, left, top, width, height, disposalMethod}> }}
     */
    static decode(arrayBuffer) {
        const d = new Uint8Array(arrayBuffer);
        let p = 0;
        const u8 = () => d[p++];
        const u16 = () => { const v = d[p] | (d[p + 1] << 8); p += 2; return v; };

        // Header
        const sig = String.fromCharCode(d[0], d[1], d[2], d[3], d[4], d[5]);
        if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Not a valid GIF file');
        p = 6;

        // Logical Screen Descriptor
        const width = u16();
        const height = u16();
        const packed = u8();
        const gctFlag = (packed >> 7) & 1;
        const gctSizePow = (packed & 7) + 1;
        const gctCount = 1 << gctSizePow;
        const bgIndex = u8();
        p++; // pixel aspect ratio

        // Global Color Table
        let gct = null;
        if (gctFlag) {
            gct = [];
            for (let i = 0; i < gctCount; i++) gct.push([u8(), u8(), u8()]);
        }

        const frames = [];
        let transIdx = -1, disposal = 0, delay = 100;

        while (p < d.length) {
            const block = u8();

            if (block === 0x21) { // Extension
                const label = u8();
                if (label === 0xF9) { // Graphic Control Extension
                    p++; // block size (always 4)
                    const gp = u8();
                    disposal = (gp >> 2) & 7;
                    const transFlag = gp & 1;
                    delay = u16() * 10; // centiseconds → ms
                    if (delay === 0) delay = 100;
                    transIdx = transFlag ? u8() : (p++, -1);
                    p++; // block terminator
                } else {
                    // Skip sub-blocks
                    while (true) { const sz = u8(); if (sz === 0) break; p += sz; }
                }
            } else if (block === 0x2C) { // Image Descriptor
                const left = u16(), top = u16(), imgW = u16(), imgH = u16();
                const imgPacked = u8();
                const lctFlag = (imgPacked >> 7) & 1;
                const interlaced = (imgPacked >> 6) & 1;
                const lctCount = lctFlag ? (1 << ((imgPacked & 7) + 1)) : 0;

                let ct = gct;
                if (lctFlag) {
                    ct = [];
                    for (let i = 0; i < lctCount; i++) ct.push([u8(), u8(), u8()]);
                }

                // LZW Decompress
                const minCodeSize = u8();
                const compressed = [];
                while (true) { const sz = u8(); if (sz === 0) break; for (let i = 0; i < sz; i++) compressed.push(d[p++]); }

                const indices = GifDecoder.lzwDecode(minCodeSize, compressed, imgW * imgH);

                // Build RGBA
                let rgba = new Uint8ClampedArray(imgW * imgH * 4);
                for (let i = 0; i < imgW * imgH; i++) {
                    const idx = i < indices.length ? indices[i] : 0;
                    if (idx === transIdx) {
                        // transparent
                    } else if (ct && idx < ct.length) {
                        rgba[i * 4] = ct[idx][0]; rgba[i * 4 + 1] = ct[idx][1]; rgba[i * 4 + 2] = ct[idx][2]; rgba[i * 4 + 3] = 255;
                    }
                }

                // Deinterlace
                if (interlaced) {
                    const de = new Uint8ClampedArray(imgW * imgH * 4);
                    const passes = [{ s: 0, d: 8 }, { s: 4, d: 8 }, { s: 2, d: 4 }, { s: 1, d: 2 }];
                    let row = 0;
                    for (const ps of passes) {
                        for (let y = ps.s; y < imgH; y += ps.d) {
                            de.set(rgba.subarray(row * imgW * 4, (row + 1) * imgW * 4), y * imgW * 4);
                            row++;
                        }
                    }
                    rgba = de;
                }

                frames.push({ left, top, width: imgW, height: imgH, rgba, delay, disposalMethod: disposal, transparentIndex: transIdx });
                transIdx = -1; disposal = 0;
            } else if (block === 0x3B) { break; } // Trailer
            else { break; } // Unknown
        }

        return { width, height, frames };
    }

    static lzwDecode(minCodeSize, compressed, pixelCount) {
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;

        // Code table: each entry is an array of pixel indices
        let table = [];
        const resetTable = () => {
            table = [];
            for (let i = 0; i < clearCode; i++) table.push([i]);
            table.push([]); // clear
            table.push([]); // eoi
            codeSize = minCodeSize + 1;
            nextCode = eoiCode + 1;
        };
        resetTable();

        // Bit reader
        let bytePos = 0, bitPos = 0;
        const readCode = () => {
            let code = 0;
            for (let i = 0; i < codeSize; i++) {
                if (bytePos >= compressed.length) return -1;
                if (compressed[bytePos] & (1 << bitPos)) code |= (1 << i);
                bitPos++;
                if (bitPos >= 8) { bitPos = 0; bytePos++; }
            }
            return code;
        };

        const output = [];
        let prev = -1;

        while (output.length < pixelCount) {
            const code = readCode();
            if (code === -1 || code === eoiCode) break;
            if (code === clearCode) { resetTable(); prev = -1; continue; }

            let entry;
            if (code < table.length) {
                entry = table[code];
            } else if (code === nextCode && prev >= 0) {
                entry = [...table[prev], table[prev][0]];
            } else break;

            for (let i = 0; i < entry.length; i++) output.push(entry[i]);

            if (prev >= 0 && nextCode < 4096) {
                table.push([...table[prev], entry[0]]);
                nextCode++;
                if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
            }
            prev = code;
        }
        return output.length > pixelCount ? output.slice(0, pixelCount) : output;
    }

    /**
     * Composite decoded frames into full RGBA canvases, respecting disposal methods.
     */
    static compositeFrames(gif) {
        const { width, height, frames } = gif;
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');

        const result = [];
        let prevImageData = null;

        for (const frame of frames) {
            // Disposal: 2 = restore to bg (clear), 3 = restore to previous
            if (frame.disposalMethod === 2) {
                ctx.clearRect(0, 0, width, height);
            } else if (frame.disposalMethod === 3 && prevImageData) {
                ctx.putImageData(prevImageData, 0, 0);
            }

            // Save state before drawing if disposal 3
            if (frame.disposalMethod === 3) {
                prevImageData = ctx.getImageData(0, 0, width, height);
            }

            // Draw frame patch
            const patch = new ImageData(new Uint8ClampedArray(frame.rgba), frame.width, frame.height);
            ctx.putImageData(patch, frame.left, frame.top);

            // Capture composited frame
            const full = ctx.getImageData(0, 0, width, height);
            result.push({ rgba: new Uint8ClampedArray(full.data), delay: frame.delay });
        }
        return result;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GifDecoder };
}
