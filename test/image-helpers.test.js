'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBaseUrl,
  normalizeImageResponse,
  bearer,
  toDataUrl,
} = require('../lib/image-provider/helpers');

test('strips a trailing slash from a base URL', () => {
  assert.equal(
    normalizeBaseUrl('https://openrouter.ai/api/v1/', 'x'),
    'https://openrouter.ai/api/v1'
  );
});

test('uses the fallback when the base URL is empty', () => {
  assert.equal(normalizeBaseUrl('', 'https://api.openai.com/v1'), 'https://api.openai.com/v1');
});

test('keeps a b64 image payload', () => {
  assert.deepEqual(
    normalizeImageResponse({ data: [{ b64_json: 'abc' }] }),
    { data: [{ b64_json: 'abc' }] }
  );
});

test('keeps an image URL payload', () => {
  assert.deepEqual(
    normalizeImageResponse({ data: [{ url: 'https://example.com/a.png' }] }),
    { data: [{ url: 'https://example.com/a.png' }] }
  );
});

test('rejects an empty image response', () => {
  assert.throws(
    () => normalizeImageResponse({}),
    (err) => err.status === 502 && /No image/.test(err.message)
  );
});

test('rejects a missing API key', () => {
  assert.throws(
    () => bearer(''),
    (err) => err.status === 401
  );
});

test('adds a Bearer prefix', () => {
  assert.equal(bearer('sk-test'), 'Bearer sk-test');
});

test('does not double-prefix Bearer', () => {
  assert.equal(bearer('Bearer already'), 'Bearer already');
});

test('wraps raw base64 as a png data URL', () => {
  assert.equal(toDataUrl('abc').startsWith('data:image/png;base64,'), true);
});

test('leaves an https URL alone', () => {
  assert.equal(toDataUrl('https://example.com/a.png'), 'https://example.com/a.png');
});
