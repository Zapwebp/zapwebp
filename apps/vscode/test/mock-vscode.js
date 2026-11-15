'use strict';

const Module = require('node:module');

const registeredCommands = new Map();
const virtualFs = new Map();
const virtualDirs = new Set();
const logs = [];
const infoMessages = [];
const warningMessages = [];
const errorMessages = [];

const config = {
  convertOnSave: false,
  baseWidth: 512,
  quality: 85,
  clean: true,
  outputExtension: 'webp',
};

const activeMock = {
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
  },
  env: {
    openExternal: async () => true,
    clipboard: {
      writeText: async () => {},
    },
  },
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
      stat: async (uri) => {
        const content = virtualFs.get(uri.path);
        if (!content) throw new Error(`File not found: ${uri.path}`);
        return { size: content.byteLength };
      },
      readFile: async (uri) => {
        const content = virtualFs.get(uri.path);
        if (!content) throw new Error(`File not found: ${uri.path}`);
        return content;
      },
      writeFile: async (uri, data) => {
        virtualFs.set(uri.path, Buffer.from(data));
      },
      readDirectory: async (uri) => {
        const targetPath = uri.path.replace(/\/+$/, '');
        const prefix = targetPath ? `${targetPath}/` : '/';
        const entries = new Map();

        // 1. Files in virtualFs
        for (const filePath of virtualFs.keys()) {
          if (filePath.startsWith(prefix)) {
            const rel = filePath.slice(prefix.length);
            const slashIdx = rel.indexOf('/');
            if (slashIdx === -1) {
              entries.set(rel, 1); // File
            } else {
              const dirName = rel.slice(0, slashIdx);
              entries.set(dirName, 2); // Directory
            }
          }
        }

        // 2. Explicit directories in virtualDirs
        for (const dirPath of virtualDirs) {
          if (dirPath.startsWith(prefix)) {
            const rel = dirPath.slice(prefix.length);
            const slashIdx = rel.indexOf('/');
            const dirName = slashIdx === -1 ? rel : rel.slice(0, slashIdx);
            if (dirName) {
              entries.set(dirName, 2);
            }
          }
        }

        return Array.from(entries.entries());
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
    showInformationMessage: (msg, ...items) => {
      infoMessages.push(msg);
      if (typeof activeMock._infoMessageHandler === 'function') {
        return Promise.resolve(activeMock._infoMessageHandler(msg, items));
      }
      return Promise.resolve(items[0]);
    },
    showWarningMessage: (msg, ...items) => {
      warningMessages.push(msg);
      return Promise.resolve(undefined);
    },
    showErrorMessage: (msg, ...items) => {
      errorMessages.push(msg);
      return Promise.resolve(undefined);
    },
    showOpenDialog: (options) => {
      if (typeof activeMock._openDialogHandler === 'function') {
        return Promise.resolve(activeMock._openDialogHandler(options));
      }
      return Promise.resolve([]);
    },
    showQuickPick: (items, options) => {
      if (typeof activeMock._quickPickHandler === 'function') {
        return Promise.resolve(activeMock._quickPickHandler(items, options));
      }
      return Promise.resolve(Array.isArray(items) ? items[0] : undefined);
    },
    showInputBox: (options) => {
      if (typeof activeMock._inputBoxHandler === 'function') {
        return Promise.resolve(activeMock._inputBoxHandler(options));
      }
      return Promise.resolve(options?.value ?? '#ffffff');
    },
    withProgress: async (opts, task) => {
      return task({ report: () => {} }, { isCancellationRequested: false });
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
    createWebviewPanel: (viewType, title, showOptions, options) => {
      let isDisposed = false;
      const panel = {
        viewType,
        title,
        showOptions,
        options,
        webview: {
          html: '',
          _messageHandlers: [],
          onDidReceiveMessage: (cb) => {
            panel.webview._messageHandlers.push(cb);
            return { dispose: () => {} };
          },
          postMessage: async (msg) => {
            for (const h of panel.webview._messageHandlers) {
              await h(msg);
            }
          },
        },
        _disposeHandlers: [],
        onDidDispose: (cb) => {
          panel._disposeHandlers.push(cb);
          return { dispose: () => {} };
        },
        dispose: () => {
          if (isDisposed) return;
          isDisposed = true;
          for (const h of panel._disposeHandlers) {
            h();
          }
        },
      };
      activeMock._lastWebviewPanel = panel;
      if (typeof activeMock._onWebviewCreated === 'function') {
        activeMock._onWebviewCreated(panel);
      }
      return panel;
    },
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
    parse: (url) => ({
      path: url,
      toString: () => url,
    }),
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
  _virtualDirs: virtualDirs,
  _config: config,
  _logs: logs,
  _infoMessages: infoMessages,
  _warningMessages: warningMessages,
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
  virtualDirs.clear();
  logs.length = 0;
  infoMessages.length = 0;
  warningMessages.length = 0;
  errorMessages.length = 0;
  delete activeMock._hoverProvider;
  delete activeMock._watcher;
  delete activeMock._onSave;
  delete activeMock._quickPickHandler;
  delete activeMock._inputBoxHandler;
  delete activeMock._openDialogHandler;
  delete activeMock._infoMessageHandler;
  delete activeMock._onWebviewCreated;
  activeMock._lastWebviewPanel = null;

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
