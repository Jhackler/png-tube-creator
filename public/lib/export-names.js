'use strict';

function safeCharacterName(name) {
  const charName = name || 'character';
  return String(charName).toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function presetDownloadName(characterName, preset) {
  return `${safeCharacterName(characterName)}_${preset}`;
}

const api = { safeCharacterName, presetDownloadName };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.ExportNames = api;
}
