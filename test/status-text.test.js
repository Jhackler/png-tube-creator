'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, readVideoApiKey } = require('../public/lib/status-text');

test('escapes angle brackets in provider errors', () => {
  assert.equal(escapeHtml('<img onerror=alert(1)>'), '&lt;img onerror=alert(1)&gt;');
});

test('reads the Gemini key from the header only', () => {
  assert.equal(readVideoApiKey({ 'x-api-key': ' gemini-key ' }), 'gemini-key');
  assert.equal(readVideoApiKey({}), '');
  assert.equal(readVideoApiKey(null), '');
});
