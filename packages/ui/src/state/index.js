'use strict';

const { resolveError } = require('../errors');

/**
 * Creates an event-driven Zapwebp UI conversion state store.
 * Zero-dependency state manager with reactive subscription support.
 */
function createZapStore(initialConfig = {}) {
  let state = {
    status: 'idle', // 'idle' | 'uploading' | 'converting' | 'done' | 'error'
    progress: 0,
    errors: [],
    lastResult: null,
    files: [],
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
      lastResult: null,
      files: [],
    });
  }

  function clearErrors() {
    setState({ errors: [] });
  }

  function dismissError(index) {
    const updated = [...state.errors];
    if (index >= 0 && index < updated.length) {
      updated.splice(index, 1);
      setState({
        errors: updated,
        status: updated.length === 0 ? (state.lastResult ? 'done' : 'idle') : state.status,
      });
    }
  }

  async function upload(fileList, options = {}) {
    const files = Array.isArray(fileList) ? fileList : Array.from(fileList || []);
    if (files.length === 0) return null;

    setState({
      status: 'uploading',
      progress: 10,
      files,
      errors: [],
    });

    try {
      const uploadHandler = options.uploader || initialConfig.uploader;
      let result = null;

      if (typeof uploadHandler === 'function') {
        setState({ status: 'converting', progress: 50 });
        result = await uploadHandler(files, {
          targetFormat: state.targetFormat,
          ...options,
        });
      } else {
        // Default simulated progress if no uploader callback is provided
        setState({ status: 'converting', progress: 75 });
        result = files.map((f) => ({
          name: f.name,
          size: f.size,
          format: state.targetFormat,
          url: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined' && (f instanceof Blob) ? URL.createObjectURL(f) : null,
        }));
      }

      setState({
        status: 'done',
        progress: 100,
        lastResult: result,
      });

      return result;
    } catch (err) {
      const resolved = resolveError(err);
      const errors = [...state.errors, resolved];
      setState({
        status: 'error',
        progress: 0,
        errors,
      });
      throw err;
    }
  }

  return {
    getState,
    setState,
    subscribe,
    upload,
    reset,
    clearErrors,
    dismissError,
    get status() { return state.status; },
    get progress() { return state.progress; },
    get errors() { return state.errors; },
    get lastResult() { return state.lastResult; },
    get files() { return state.files; },
  };
}

let defaultStore = null;

/**
 * Accesses or instantiates the global singleton ZapStore.
 */
function useZapStore(config) {
  if (!defaultStore || config) {
    defaultStore = createZapStore(config);
  }
  return defaultStore;
}

module.exports = {
  createZapStore,
  useZapStore,
};
