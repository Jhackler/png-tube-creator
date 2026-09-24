'use strict';

const OVERLAY_SLOTS = [
  'neutral_idle',
  'neutral_speaking',
  'happy_idle',
  'happy_speaking',
  'sad_idle',
  'sad_speaking',
  'surprised_idle',
  'surprised_speaking',
  'typing',
  'eyes_closed',
];

const EXTRA_SLOTS = ['intro', 'outro', 'animation'];

function characterFolderName(name) {
  const raw = String(name || '').trim();
  const safe = raw
    .replace(/[\/\\:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return safe || 'Character';
}

function fileNameOnly(filename) {
  const base = String(filename || '').split(/[\/\\]/).pop().replace(/^\.+/, '');
  if (!base || base === '.' || base === '..') throw new Error('bad filename');
  return base;
}

function saveParts(character, bucket, filename) {
  const folder = characterFolderName(character);
  const file = fileNameOnly(filename);
  if (bucket === 'overlay') return [folder, file];
  if (bucket === 'sprite' || bucket === 'video' || bucket === 'extras') {
    return [folder, bucket, file];
  }
  throw new Error('bad bucket');
}

function canonicalExport(name) {
  const base = String(name || '').replace(/\.(webm|gif|mp4|png)$/i, '');
  const slot = OVERLAY_SLOTS.find((item) => base === item || base.endsWith('_' + item));
  if (slot) return { bucket: 'overlay', file: slot };
  const extra = EXTRA_SLOTS.find((item) => base === item || base.endsWith('_' + item));
  if (extra) return { bucket: 'extras', file: extra };
  return { bucket: 'extras', file: fileNameOnly(base || 'export') };
}

const api = {
  OVERLAY_SLOTS,
  EXTRA_SLOTS,
  characterFolderName,
  fileNameOnly,
  saveParts,
  canonicalExport,
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.ProjectLayout = api;
