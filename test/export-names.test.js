'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { safeCharacterName, presetDownloadName } = require('../public/lib/export-names');

test('lowercases a simple character name', () => {
  assert.equal(safeCharacterName('Mira'), 'mira');
});

test('replaces each non-alphanumeric with an underscore', () => {
  assert.equal(safeCharacterName('Mira Vale!'), 'mira_vale_');
});

test('falls back when the name is empty', () => {
  assert.equal(safeCharacterName(''), 'character');
});

test('does not collapse a name that is only punctuation', () => {
  assert.equal(safeCharacterName('---'), '___');
});

test('keeps the current preset download string', () => {
  assert.equal(presetDownloadName('Mira', 'Neutral_Idle'), 'mira_Neutral_Idle');
});
