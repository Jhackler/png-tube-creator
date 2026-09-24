'use strict';

(function () {
  const layout = () => window.ProjectLayout;

  const state = {
    mode: null,
    handle: null,
    rootPath: '',
    label: '',
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
    if (!window.showDirectoryPicker) {
      throw new Error('This browser has no folder picker. Type an absolute path instead.');
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

  function usePath(rootPath) {
    const root = String(rootPath || '').trim();
    if (!root.startsWith('/')) throw new Error('Path must be absolute, like /home/you/vtuber');
    state.mode = 'path';
    state.handle = null;
    state.rootPath = root;
    state.label = root.split('/').filter(Boolean).pop() || root;
    idbSet('path', root);
    idbSet('handle', null);
    emit();
    return state.label;
  }

  async function restore() {
    try {
      const savedPath = await idbGet('path');
      if (savedPath) {
        usePath(savedPath);
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
    if (!resp.ok) throw new Error((data.error && data.error.message) || data.error || ('HTTP ' + resp.status));
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
    const parts = layout().saveParts(characterName(), bucket, filename);
    if (state.mode === 'handle') await writeHandle(parts, blob);
    else await writePath(parts, blob);
    return parts.join('/');
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
    let saved = null;
    try {
      const fileBlob = blob || (href ? await (await fetch(href)).blob() : null);
      if (fileBlob) saved = await saveBlob(bucket, filename, fileBlob);
      if (saved && window.showToast) window.showToast('Saved ' + saved, 'success');
    } catch (err) {
      if (window.showToast) window.showToast('Project save failed: ' + err.message, 'error');
    }
    browserDownload(href || URL.createObjectURL(blob), filename);
    return saved;
  }

  window.ProjectStore = {
    isOpen,
    label,
    pickFolder,
    usePath,
    restore,
    saveBlob,
    saveAndDownload,
    characterName,
  };
})();
