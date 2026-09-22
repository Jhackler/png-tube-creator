// ═══════════════════════════════════════════════════════════════════
//  GIF ENCODER
// ═══════════════════════════════════════════════════════════════════

class GifEncoder {
    constructor(width, height, loop = 0) {
        this.width = width;
        this.height = height;
        this.loop = loop; // 0 = infinite
        this.bufSize = 1024 * 256; // start with 256KB
        this.buf = new Uint8Array(this.bufSize);
        this.bufPos = 0;
        this.started = false;
        this.frameCount = 0;
    }

    /* ─── Low-level writers ─── */
    _grow(needed) {
        while (this.bufPos + needed > this.bufSize) {
            this.bufSize *= 2;
        }
        const newBuf = new Uint8Array(this.bufSize);
        newBuf.set(this.buf);
        this.buf = newBuf;
    }
    writeByte(v) {
        if (this.bufPos >= this.bufSize) this._grow(1024);
        this.buf[this.bufPos++] = v & 0xFF;
    }
    writeShort(v) { this.writeByte(v & 0xFF); this.writeByte((v >> 8) & 0xFF); }
    writeString(s) { for (let i = 0; i < s.length; i++) this.writeByte(s.charCodeAt(i)); }
    writeBytes(arr) { for (let i = 0; i < arr.length; i++) this.writeByte(arr[i]); }

    /* ─── GIF Structure ─── */
    writeHeader() {
        this.writeString('GIF89a');
    }

    writeLogicalScreenDescriptor() {
        this.writeShort(this.width);
        this.writeShort(this.height);
        // Packed: no GCT (0), color res 7 (111), no sort (0), GCT size 0 (000)
        this.writeByte(0x70); // 0111_0000
        this.writeByte(0);    // bg color index
        this.writeByte(0);    // pixel aspect ratio
    }

    writeNetscapeExtension() {
        this.writeByte(0x21); // Extension introducer
        this.writeByte(0xFF); // Application extension
        this.writeByte(0x0B); // Block size
        this.writeString('NETSCAPE2.0');
        this.writeByte(0x03); // Sub-block size
        this.writeByte(0x01); // Sub-block ID
        this.writeShort(this.loop);
        this.writeByte(0x00); // Block terminator
    }

    writeGraphicControlExtension(delayCentiseconds, transparentIndex, disposal = 2) {
        this.writeByte(0x21); // Extension introducer
        this.writeByte(0xF9); // GCE label
        this.writeByte(0x04); // Block size
        // Packed: reserved(000), disposal(DDD), no user input(0), transparent flag(1)
        const packed = ((disposal & 0x07) << 2) | 0x01;
        this.writeByte(packed);
        this.writeShort(delayCentiseconds);
        this.writeByte(transparentIndex);
        this.writeByte(0x00); // Block terminator
    }

    writeImageDescriptor(lctSizeField, left = 0, top = 0, w = this.width, h = this.height) {
        this.writeByte(0x2C); // Image separator
        this.writeShort(left);
        this.writeShort(top);
        this.writeShort(w);
        this.writeShort(h);
        // Packed: LCT flag(1), no interlace(0), no sort(0), reserved(00), LCT size
        this.writeByte(0x80 | (lctSizeField & 0x07));
    }

    writeColorTable(palette, tableSize) {
        for (let i = 0; i < tableSize; i++) {
            if (i < palette.length) {
                this.writeByte(palette[i][0]); // R
                this.writeByte(palette[i][1]); // G
                this.writeByte(palette[i][2]); // B
            } else {
                this.writeByte(0); this.writeByte(0); this.writeByte(0);
            }
        }
    }

    writeLZWData(indexedPixels, minCodeSize) {
        this.writeByte(minCodeSize);

        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        const maxCodeValue = 4096;

        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;
        // Open-addressing hash table for LZW — much faster than Map
        const HASH_SIZE = 8192;
        const hashKeys = new Int32Array(HASH_SIZE).fill(-1);
        const hashVals = new Int32Array(HASH_SIZE);

        const subBlockData = [];
        let curByte = 0;
        let curBit = 0;

        const emitCode = (code) => {
            curByte |= (code << curBit);
            curBit += codeSize;
            while (curBit >= 8) {
                subBlockData.push(curByte & 0xFF);
                curByte >>>= 8;
                curBit -= 8;
            }
        };

        const resetTable = () => {
            hashKeys.fill(-1);
            codeSize = minCodeSize + 1;
            nextCode = eoiCode + 1;
        };

        // Emit clear code to start
        emitCode(clearCode);
        resetTable();

        if (indexedPixels.length === 0) {
            emitCode(eoiCode);
        } else {
            let w = indexedPixels[0];

            for (let i = 1; i < indexedPixels.length; i++) {
                const k = indexedPixels[i];
                const key = w * (clearCode + 2) + k;
                // Open-addressing lookup
                let slot = (key * 2654435761 >>> 0) & (HASH_SIZE - 1);
                let found = false;
                while (hashKeys[slot] !== -1) {
                    if (hashKeys[slot] === key) {
                        w = hashVals[slot];
                        found = true;
                        break;
                    }
                    slot = (slot + 1) & (HASH_SIZE - 1);
                }
                if (!found) {
                    emitCode(w);

                    if (nextCode < maxCodeValue) {
                        hashKeys[slot] = key;
                        hashVals[slot] = nextCode;
                        if (nextCode >= (1 << codeSize) && codeSize < 12) {
                            codeSize++;
                        }
                        nextCode++;
                    } else {
                        emitCode(clearCode);
                        resetTable();
                    }

                    w = k;
                }
            }

            emitCode(w);
            emitCode(eoiCode);
        }

        // Flush remaining bits
        if (curBit > 0) {
            subBlockData.push(curByte & 0xFF);
        }

        // Write sub-blocks (max 255 bytes each)
        this._grow(subBlockData.length + Math.ceil(subBlockData.length / 255) + 2);
        let pos = 0;
        while (pos < subBlockData.length) {
            const chunkSize = Math.min(255, subBlockData.length - pos);
            this.buf[this.bufPos++] = chunkSize;
            for (let j = 0; j < chunkSize; j++) {
                this.buf[this.bufPos++] = subBlockData[pos++];
            }
        }
        this.buf[this.bufPos++] = 0x00; // Block terminator
    }

    /* ─── High-level API ─── */
    begin() {
        this.bufSize = 1024 * 256;
        this.buf = new Uint8Array(this.bufSize);
        this.bufPos = 0;
        this.writeHeader();
        this.writeLogicalScreenDescriptor();
        this.writeNetscapeExtension();
        this.started = true;
    }

    addFrame(palette, indexedPixels, transparentIndex, delayCentiseconds) {
        if (!this.started) this.begin();

        // Calculate LCT parameters
        const minCodeSize = Math.max(2, Math.ceil(Math.log2(palette.length)));
        const tableSize = 1 << minCodeSize;
        const lctSizeField = minCodeSize - 1;

        // Pad palette to table size
        const paddedPalette = [...palette];
        while (paddedPalette.length < tableSize) {
            paddedPalette.push([0, 0, 0]);
        }

        this.writeGraphicControlExtension(delayCentiseconds, transparentIndex);
        this.writeImageDescriptor(lctSizeField);
        this.writeColorTable(paddedPalette, tableSize);
        this.writeLZWData(indexedPixels, minCodeSize);
    }

    /**
     * Add an optimized delta frame. Compares rgba to the previous frame,
     * only encodes changed pixels within the minimum bounding box.
     */
    addOptimizedFrame(rgba, palette, transparentIndex, delayCentiseconds) {
        if (!this.started) this.begin();
        const w = this.width, h = this.height;
        const numPixels = w * h;

        // Persistent color cache across frames (RGB key → palette index)
        if (!this._colorCache) this._colorCache = new Map();
        const cache = this._colorCache;

        // Map all pixels to palette indices with caching
        const indexed = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
            const a = rgba[i * 4 + 3];
            if (a < 128) {
                indexed[i] = transparentIndex;
            } else {
                const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
                const key = (r << 16) | (g << 8) | b;
                let idx = cache.get(key);
                if (idx === undefined) {
                    idx = ColorQuantizer.nearestPaletteIndex(palette, r, g, b, transparentIndex);
                    cache.set(key, idx);
                }
                indexed[i] = idx;
            }
        }

        const minCodeSize = Math.max(2, Math.ceil(Math.log2(palette.length)));
        const tableSize = 1 << minCodeSize;
        const lctSizeField = minCodeSize - 1;
        const paddedPalette = [...palette];
        while (paddedPalette.length < tableSize) paddedPalette.push([0, 0, 0]);

        // Find bounding box of all OPAQUE pixels to avoid encoding empty borders
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (indexed[y * w + x] !== transparentIndex) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Disposal=2 (restore to background) — prevents ghosting
        this.writeGraphicControlExtension(delayCentiseconds, transparentIndex, 2);

        if (maxX < 0) {
            // Fully transparent frame — write tiny 1x1
            const tinyPixels = new Uint8Array([transparentIndex]);
            this.writeImageDescriptor(lctSizeField, 0, 0, 1, 1);
            this.writeColorTable(paddedPalette, tableSize);
            this.writeLZWData(tinyPixels, minCodeSize);
        } else {
            // Extract bounding box sub-image
            const bw = maxX - minX + 1;
            const bh = maxY - minY + 1;
            const subPixels = new Uint8Array(bw * bh);
            for (let y = 0; y < bh; y++) {
                for (let x = 0; x < bw; x++) {
                    subPixels[y * bw + x] = indexed[(minY + y) * w + (minX + x)];
                }
            }

            this.writeImageDescriptor(lctSizeField, minX, minY, bw, bh);
            this.writeColorTable(paddedPalette, tableSize);
            this.writeLZWData(subPixels, minCodeSize);
        }

        this.frameCount++;
    }

    finish() {
        this.writeByte(0x3B); // GIF trailer
        return this.buf.slice(0, this.bufPos);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GifEncoder };
}
