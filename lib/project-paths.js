'use strict';

const path = require('path');
const layout = require('../public/lib/project-layout');

function resolveProjectFile(root, parts) {
  if (!root || typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('project root must be an absolute path');
  }
  if (!Array.isArray(parts) || !parts.length) throw new Error('missing path');
  const rootResolved = path.resolve(root);
  const dest = path.resolve(rootResolved, ...parts.map(layout.fileNameOnly));
  const rel = path.relative(rootResolved, dest);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('path escapes project');
  }
  return dest;
}

module.exports = Object.assign({ resolveProjectFile }, layout);
