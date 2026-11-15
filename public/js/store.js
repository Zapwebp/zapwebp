/**
 * @zapwebp/ui State & Persistence Store
 * Manages conversion queue, reactive subscriptions, settings, and IndexedDB persistence.
 */

(function (global) {
  'use strict';

  const DB_NAME = 'zapwebp-db';
  const DB_VERSION = 1;
  let dbPromise = null;

  function getDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbPromise;
  }

  async function dbSaveFile(record) {
    try {
      const db = await getDb();
      if (!db) return;
      return new Promise((resolve) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
    } catch {}
  }

  async function dbDeleteFile(id) {
    try {
      const db = await getDb();
      if (!db || !db.objectStoreNames.contains('files')) return;
      return new Promise((resolve) => {
        const tx = db.transaction('files', 'readwrite');
        const req = tx.objectStore('files').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
    } catch {}
  }

  async function dbClearFiles() {
    try {
      const db = await getDb();
      if (db && db.objectStoreNames.contains('files')) {
        await new Promise((resolve) => {
          const tx = db.transaction('files', 'readwrite');
          const req = tx.objectStore('files').clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        });
      }
    } catch {}
  }

  async function dbGetAllFiles() {
    try {
      const db = await getDb();
      if (!db) return [];
      return new Promise((resolve) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  function createZapStore(initialConfig = {}) {
    let state = {
      status: 'idle', // 'idle' | 'uploading' | 'converting' | 'done' | 'error'
      progress: 0,
      errors: [],
      files: [],
      convertedCount: 0,
      totalBytesSaved: 0,
      targetFormat: initialConfig.targetFormat || 'webp',
      ...initialConfig.initialState,
    };

    const listeners = new Set();

    function getState() {
      return { ...state };
    }

    function setState(updates) {
      state = { ...state, ...updates };
      listeners.forEach((fn) => {
        try {
          fn(getState());
        } catch (err) {
          console.error('[ZapStore listener error]', err);
        }
      });
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function reset() {
      setState({
        status: 'idle',
        progress: 0,
        errors: [],
        files: [],
      });
    }

    return {
      getState,
      setState,
      subscribe,
      reset,
    };
  }

  global.ZapStore = {
    createZapStore,
    dbSaveFile,
    dbDeleteFile,
    dbClearFiles,
    dbGetAllFiles,
  };
})(typeof window !== 'undefined' ? window : globalThis);
