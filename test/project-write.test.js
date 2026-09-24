'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  prepareProject,
  writeProjectFile,
  fsErrorMessage,
  listProjectDirs,
  openProjectRoot,
} = require('../lib/project-write');
const { projectHttpError, shouldBrowserDownload, characterExists } = require('../public/lib/project-layout');

test('open rejects a missing path and a file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'as-project-'));
  const missing = path.join(root, 'nope');
  const file = path.join(root, 'notes.txt');
  fs.writeFileSync(file, 'x');
  assert.throws(() => openProjectRoot(missing), /does not exist/);
  assert.throws(() => openProjectRoot(file), /not a folder/);
  assert.throws(() => listProjectDirs('relative/path'), /absolute path/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('opening a projects folder does not create a character', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'as-project-'));
  assert.equal(openProjectRoot(root), root);
  assert.deepEqual(fs.readdirSync(root), []);
  fs.rmSync(root, { recursive: true, force: true });
});

test('list returns only real directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'as-project-'));
  fs.mkdirSync(path.join(root, 'Mira'));
  fs.mkdirSync(path.join(root, 'Ada'));
  fs.writeFileSync(path.join(root, 'notes.txt'), 'nope');
  fs.mkdirSync(path.join(root, '.hidden'));
  assert.deepEqual(listProjectDirs(root), ['Ada', 'Mira']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('prepare creates the character folder and a marker', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'as-project-'));
  const dir = prepareProject(root, 'Mira Vale');
  assert.equal(dir, path.join(root, 'Mira_Vale'));
  assert.equal(fs.readFileSync(path.join(dir, 'ready.txt'), 'utf8'), 'ok\n');
  fs.rmSync(root, { recursive: true, force: true });
});

test('writeProjectFile creates sprite/chroma.png under the character', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'as-project-'));
  const dest = writeProjectFile(root, ['Mira', 'sprite', 'chroma.png'], Buffer.from('png'));
  assert.equal(fs.readFileSync(dest, 'utf8'), 'png');
  fs.rmSync(root, { recursive: true, force: true });
});

test('permission errors are a sentence, not a code', () => {
  assert.match(fsErrorMessage({ code: 'EACCES', message: 'EACCES: permission denied' }), /cannot write/i);
});

test('a missing save route tells you to restart launch.sh', () => {
  assert.match(projectHttpError(404, ''), /launch\.sh/);
});

test('an existing folder is not treated as a new character', () => {
  assert.equal(characterExists(['Mira_Vale', 'Ada'], 'Mira Vale'), true);
  assert.equal(characterExists(['Ada'], 'Mira Vale'), false);
  assert.equal(characterExists(null, 'Mira'), false);
});

test('an open project does not fall through to the browser download', () => {
  assert.equal(shouldBrowserDownload(true), false);
  assert.equal(shouldBrowserDownload(false), true);
});
