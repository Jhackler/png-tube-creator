'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  characterFolderName,
  saveParts,
  resolveProjectFile,
} = require('../lib/project-paths');

test('character folder keeps case and replaces spaces', () => {
  assert.equal(characterFolderName('Mira Vale'), 'Mira_Vale');
});

test('overlay save is Character/neutral_idle.webm', () => {
  assert.deepEqual(
    saveParts('Mira Vale', 'overlay', 'neutral_idle.webm'),
    ['Mira_Vale', 'neutral_idle.webm']
  );
});

test('sprite save goes in the sprite subfolder', () => {
  assert.deepEqual(
    saveParts('Mira', 'sprite', 'chroma.png'),
    ['Mira', 'sprite', 'chroma.png']
  );
});

test('overlay slot names are not prefixed', () => {
  const { canonicalExport } = require('../lib/project-paths');
  assert.deepEqual(canonicalExport('neutral_idle'), { bucket: 'overlay', file: 'neutral_idle' });
  assert.deepEqual(canonicalExport('mira_neutral_idle'), { bucket: 'overlay', file: 'neutral_idle' });
  assert.deepEqual(canonicalExport('intro.webm'), { bucket: 'extras', file: 'intro' });
});

test('resolve stays inside the project root', () => {
  const root = path.resolve('/tmp/as-project');
  const dest = resolveProjectFile(root, ['Mira', 'neutral_idle.webm']);
  assert.equal(dest, path.join(root, 'Mira', 'neutral_idle.webm'));
});

test('resolve rejects a root escape', () => {
  const root = path.resolve('/tmp/as-project');
  assert.throws(() => resolveProjectFile(root, ['..', 'etc', 'passwd']));
});
