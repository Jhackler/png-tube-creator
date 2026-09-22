'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GifEncoder } = require('../public/lib/gif-encoder');
const { ChromaKey } = require('../public/lib/chroma-key');

test('gif header and trailer still bookend an empty encoder', () => {
  const enc = new GifEncoder(2, 2);
  enc.writeHeader();
  const bytes = enc.finish();
  assert.equal(String.fromCharCode(...bytes.slice(0, 6)), 'GIF89a');
  assert.equal(bytes[bytes.length - 1], 0x3B);
});

test('magenta hex still sets the chroma key channels', () => {
  const key = new ChromaKey();
  key.setKeyColorHex('#FF00FF');
  assert.equal(key.keyR, 255);
  assert.equal(key.keyG, 0);
  assert.equal(key.keyB, 255);
});

test('split modules still export the classes the page expects', () => {
  assert.equal(typeof require('../public/lib/color-quantizer').ColorQuantizer, 'function');
  assert.equal(typeof require('../public/lib/gif-decoder').GifDecoder, 'function');
});
