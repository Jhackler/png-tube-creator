'use strict';

(function () {
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
    if (bucket === 'sprite' || bucket === 'video' || bucket === 'extras') return [folder, bucket, file];
    throw new Error('bad bucket');
  }

  function projectHttpError(status, body) {
    if (status === 404) {
      return 'Project save is not on the running server. Quit the app and start launch.sh again after pulling v2-dev.';
    }
    if (status === 413) {
      return 'That file is too big for the server to save. Quit the app and start launch.sh again.';
    }
    const msg = body && (body.error && body.error.message ? body.error.message : body.error);
    if (typeof msg === 'string' && msg) return msg;
    return 'Project save failed (HTTP ' + status + ')';
  }

  function shouldBrowserDownload(projectOpen) {
    return !projectOpen;
  }

  function canonicalExport(name) {
    const base = String(name || '').replace(/\.(webm|gif|mp4|png)$/i, '');
    const overlay = [
      'neutral_idle', 'neutral_speaking', 'happy_idle', 'happy_speaking',
      'sad_idle', 'sad_speaking', 'surprised_idle', 'surprised_speaking',
      'typing', 'eyes_closed',
    ];
    const slot = overlay.find((item) => base === item || base.endsWith('_' + item));
    if (slot) return { bucket: 'overlay', file: slot };
    const extra = ['intro', 'outro', 'animation'].find((item) => base === item || base.endsWith('_' + item));
    if (extra) return { bucket: 'extras', file: extra };
    return { bucket: 'extras', file: fileNameOnly(base || 'export') };
  }

  const builtinLayout = {
    characterFolderName,
    fileNameOnly,
    saveParts,
    canonicalExport,
    projectHttpError,
    shouldBrowserDownload,
  };

  if (!window.ProjectLayout || typeof window.ProjectLayout.saveParts !== 'function') {
    window.ProjectLayout = builtinLayout;
  }

  function layout() {
    return window.ProjectLayout;
  }

  const state = {
    mode: null,
    handle: null,
    rootPath: '',
    label: '',
    status: '',
    statusError: false,
  };

  function isOpen() {
    return state.mode === 'handle' || state.mode === 'path';
  }

  function label() {
    return state.label || 'No folder selected';
  }

  function characterName() {
    return (window.ASAdventurer && window.ASAdventurer.characterName) || 'Character';
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('project-changed'));
  }

  function setStatus(message, isError) {
    state.status = message || '';
    state.statusError = !!isError;
    document.dispatchEvent(new CustomEvent('project-status', {
      detail: { message: state.status, error: state.statusError },
    }));
  }

  function status() {
    return { message: state.status, error: state.statusError };
  }

  function rootPath() {
    return state.rootPath;
  }

  async function readHttpError(resp) {
    const data = await resp.json().catch(() => ({}));
    return layout().projectHttpError(resp.status, data);
  }

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('as-adventurer-project', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(key, value) {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function idbGet(key) {
    const db = await idb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  }

  async function pickFolder() {
    if (typeof window.showDirectoryPicker !== 'function') {
      const input = document.getElementById('projectPathInput');
      if (input) input.focus();
      throw new Error('Brave blocks the folder picker. Paste the folder path and click Use path.');
    }
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    state.mode = 'handle';
    state.handle = handle;
    state.rootPath = '';
    state.label = handle.name;
    await idbSet('handle', handle);
    await idbSet('path', '');
    emit();
    return state.label;
  }

  async function usePath(rootPathValue) {
    const root = String(rootPathValue || '').trim();
    if (!root.startsWith('/')) throw new Error('Path must be absolute, like /mnt/projects1/Vtubing/projects');
    setStatus('Checking that the server can write to ' + root + '…', false);
    const resp = await fetch('/api/project/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root }),
    });
    if (!resp.ok) throw new Error(await readHttpError(resp));
    const data = await resp.json();
    state.mode = 'path';
    state.handle = null;
    state.rootPath = root;
    state.label = root.split('/').filter(Boolean).pop() || root;
    await idbSet('path', root);
    await idbSet('handle', null);
    setStatus('Projects folder open. Create a character, or click one below.', false);
    emit();
    return data.path;
  }

  async function createCharacter(name) {
    const raw = String(name || '').trim();
    if (!raw) throw new Error('Type a character name first.');
    if (!isOpen() || !state.rootPath) throw new Error('Set the projects folder first.');
    const resp = await fetch('/api/project/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: state.rootPath, character: raw }),
    });
    if (!resp.ok) throw new Error(await readHttpError(resp));
    const data = await resp.json();
    const folder = String(data.path || '').split('/').filter(Boolean).pop();
    setStatus('Created ' + folder, false);
    return folder;
  }

  async function restore() {
    try {
      const savedPath = await idbGet('path');
      if (savedPath) {
        await usePath(savedPath);
        return;
      }
      const handle = await idbGet('handle');
      if (!handle) return;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        state.mode = 'handle';
        state.handle = handle;
        state.label = handle.name;
        emit();
      }
    } catch (err) {
      console.warn('[project] restore failed', err);
    }
  }

  async function writeHandle(parts, blob) {
    let dir = state.handle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const file = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async function writePath(parts, blob) {
    const dataBase64 = await blobToBase64(blob);
    const resp = await fetch('/api/project/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        root: state.rootPath,
        parts,
        dataBase64,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(layout().projectHttpError(resp.status, data));
    return data.path;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        resolve(text.includes(',') ? text.split(',')[1] : text);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function saveBlob(bucket, filename, blob) {
    if (!isOpen()) return null;
    try {
      const parts = layout().saveParts(characterName(), bucket, filename);
      if (state.mode === 'handle') await writeHandle(parts, blob);
      else await writePath(parts, blob);
      const saved = parts.join('/');
      setStatus('Saved ' + saved, false);
      return saved;
    } catch (err) {
      setStatus(err.message || 'Project save failed', true);
      throw err;
    }
  }

  function browserDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function saveAndDownload({ bucket, filename, blob, href }) {
    const projectOpen = isOpen();
    const download = !layout() || layout().shouldBrowserDownload(projectOpen);
    if (download) {
      browserDownload(href || URL.createObjectURL(blob), filename);
      return null;
    }
    try {
      const fileBlob = blob || (href ? await (await fetch(href)).blob() : null);
      if (!fileBlob) throw new Error('Nothing to save');
      const saved = await saveBlob(bucket, filename, fileBlob);
      if (window.showToast) window.showToast('Saved ' + saved, 'success');
      return saved;
    } catch (err) {
      setStatus(err.message || 'Project save failed', true);
      if (window.showToast) window.showToast(err.message || 'Project save failed', 'error');
      return null;
    }
  }

  async function listDirs() {
    if (!state.rootPath) return [];
    const resp = await fetch('/api/project/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: state.rootPath }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(layout().projectHttpError(resp.status, data));
    return data.dirs || [];
  }

  window.ProjectStore = {
    isOpen,
    label,
    status,
    rootPath,
    setStatus,
    pickFolder,
    usePath,
    createCharacter,
    restore,
    listDirs,
    saveBlob,
    saveAndDownload,
    characterName,
  };
})();
