'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectFile, characterFolderName } = require('./project-paths');

function fsErrorMessage(err) {
  if (!err) return 'Project save failed';
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return 'The server cannot write to that folder. Check that your user can create files there.';
  }
  if (err.code === 'ENOENT') {
    return err.message && err.message !== 'ENOENT'
      ? err.message
      : 'That path does not exist, and the server could not create it.';
  }
  if (err.code === 'ENOTDIR') return 'That path is not a folder.';
  return err.message || 'Project save failed';
}

function openProjectRoot(root) {
  if (!root || typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('project root must be an absolute path');
  }
  const rootResolved = path.resolve(root);
  let stat;
  try {
    stat = fs.statSync(rootResolved);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw Object.assign(new Error('That folder does not exist.'), { code: 'ENOENT' });
    }
    throw err;
  }
  if (!stat.isDirectory()) {
    throw Object.assign(new Error('That path is not a folder.'), { code: 'ENOTDIR' });
  }
  fs.accessSync(rootResolved, fs.constants.W_OK);
  return rootResolved;
}

function prepareProject(root, character) {
  const folder = characterFolderName(character);
  const marker = resolveProjectFile(root, [folder, 'ready.txt']);
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, 'ok\n');
  return path.dirname(marker);
}

function listProjectDirs(root) {
  if (!root || typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('project root must be an absolute path');
  }
  const rootResolved = path.resolve(root);
  const entries = fs.readdirSync(rootResolved, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function writeProjectFile(root, parts, buffer) {
  const dest = resolveProjectFile(root, parts);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  return dest;
}

module.exports = {
  fsErrorMessage,
  prepareProject,
  writeProjectFile,
  listProjectDirs,
  openProjectRoot,
};
