'use strict';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readVideoApiKey(headers) {
  const bag = headers || {};
  const raw = bag['x-api-key'] || bag['X-Api-Key'] || '';
  return String(raw).trim();
}

const api = { escapeHtml, readVideoApiKey };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.StatusText = api;
}
