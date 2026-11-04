'use strict';

const Module = require('node:module');

const registeredCommands = new Map();
const virtualFs = new Map();
const logs = [];
const infoMessages = [];
const errorMessages = [];

const config = {
  convertOnSave: false,
  baseWidth: 512,
  quality: 85,
  clean: true,
  outputExtension: 'webp',
};

const activeMock = {
  commands: {
    registerCommand: (id, handler) => {
      registeredCommands.set(id, handler);
      return { dispose: () => registeredCommands.delete(id) };
    },
    executeCommand: async (id, ...args) => {
      const handler = registeredCommands.get(id);
      if (!handler) throw new Error(`Command ${id} not found`);
      return handler(...args);
    },
  },
  languages: {
    registerHoverProvider: (selector, provider) => {
      activeMock._hoverProvider = { selector, provider };
      return { dispose: () => {} };
    },
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, def) => (key in config ? config[key] : def),
    }),
    fs: {
      readFile: async (uri) => {
        const content = virtualFs.get(uri.path);
        if (!content) throw new Error(`File not found: ${uri.path}`);
        return content;
      },
      writeFile: async (uri, data) => {
        virtualFs.set(uri.path, Buffer.from(data));
      },
    },
    createFileSystemWatcher: (pattern) => {
      const watcher = {
        pattern,
        changeHandlers: [],
        createHandlers: [],
        onDidChange: (cb) => watcher.changeHandlers.push(cb),
        onDidCreate: (cb) => watcher.createHandlers.push(cb),
        dispose: () => {},
      };
      activeMock._watcher = watcher;
      return watcher;
    },
    onDidSaveTextDocument: (cb) => {
      activeMock._onSave = cb;
      return { dispose: () => {} };
    },
  },
  window: {
    showInformationMessage: (msg) => {
      infoMessages.push(msg);
      return Promise.resolve();
    },
    showErrorMessage: (msg) => {
      errorMessages.push(msg);
      return Promise.resolve();
    },
    showOpenDialog: () => Promise.resolve([]),
    withProgress: async (opts, task) => {
      return task({ report: () => {} });
    },
    createOutputChannel: (name) => ({
      name,
      appendLine: (msg) => logs.push(msg),
      show: () => {},
      dispose: () => {},
    }),
    createStatusBarItem: () => ({
      text: '',
      tooltip: '',
      command: '',
      show: () => {},
      dispose: () => {},
    }),
  },
  StatusBarAlignment: { Right: 2 },
  ProgressLocation: { Notification: 15 },
  Hover: class {
    constructor(contents) {
      this.contents = contents;
    }
  },
  MarkdownString: class {
    constructor() {
      this.value = '';
      this.supportHtml = false;
      this.isTrusted = false;
    }
    appendMarkdown(str) {
      this.value += str;
    }
  },
  Uri: {
    file: (p) => ({
      path: p.replace(/\\/g, '/'),
      toString: () => `file://${p.replace(/\\/g, '/')}`,
      with: function (change) {
        const newPath = change.path !== undefined ? change.path : this.path;
        return {
          path: newPath,
          toString: () => `file://${newPath}`,
          with: this.with,
        };
      },
    }),
  },
  _registeredCommands: registeredCommands,
  _virtualFs: virtualFs,
  _config: config,
  _logs: logs,
  _infoMessages: infoMessages,
  _errorMessages: errorMessages,
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') {
    return activeMock;
  }
  return originalLoad.apply(this, arguments);
};

function resetMock(initialConfig = {}) {
  registeredCommands.clear();
  virtualFs.clear();
  logs.length = 0;
  infoMessages.length = 0;
  errorMessages.length = 0;
  delete activeMock._hoverProvider;
  delete activeMock._watcher;
  delete activeMock._onSave;

  for (const k of Object.keys(config)) {
    delete config[k];
  }
  Object.assign(config, {
    convertOnSave: false,
    baseWidth: 512,
    quality: 85,
    clean: true,
    outputExtension: 'webp',
    ...initialConfig,
  });

  return activeMock;
}

module.exports = {
  getMock: () => activeMock,
  resetMock,
};
