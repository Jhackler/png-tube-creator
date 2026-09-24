'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { prepareProject, writeProjectFile, fsErrorMessage } = require('../lib/project-write');
const { projectHttpError, shouldBrowserDownload } = require('../public/lib/project-layout');

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

test('an open project does not fall through to the browser download', () => {
  assert.equal(shouldBrowserDownload(true), false);
  assert.equal(shouldBrowserDownload(false), true);
});
