'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ZapwebpError } = require('./errors');

/**
 * Generates a standard Zapwebp Session ID.
 * @returns {string} e.g. zap-sess-uuid
 */
function generateSessionId() {
  return `zap-sess-${crypto.randomUUID()}`;
}

/**
 * Unified Session State Contract.
 */
class SessionState {
  constructor({
    sessionId = null,
    surface = 'generic',
    createdAt = null,
    updatedAt = null,
    expiresAt = null,
    filesProcessed = 0,
    bytesProcessed = 0,
    requestsCount = 0,
  } = {}) {
    const now = new Date().toISOString();
    this.sessionId = sessionId || generateSessionId();
    this.surface = surface;
    this.createdAt = createdAt || now;
    this.updatedAt = updatedAt || now;
    this.expiresAt = expiresAt || null;
    this.filesProcessed = Number.isFinite(filesProcessed) && filesProcessed >= 0 ? filesProcessed : 0;
    this.bytesProcessed = Number.isFinite(bytesProcessed) && bytesProcessed >= 0 ? bytesProcessed : 0;
    this.requestsCount = Number.isFinite(requestsCount) && requestsCount >= 0 ? requestsCount : 0;
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      surface: this.surface,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt,
      filesProcessed: this.filesProcessed,
      bytesProcessed: this.bytesProcessed,
      requestsCount: this.requestsCount,
    };
  }
}

/**
 * In-Memory Session Store.
 */
class MemorySessionStore {
  constructor(initialState = null) {
    this.session = initialState ? new SessionState(initialState) : null;
  }

  load() {
    return this.session;
  }

  save(session) {
    this.session = session;
  }

  clear() {
    this.session = null;
  }
}

/**
 * File-backed Atomic Session Store (for CLI & MCP).
 */
class FileSessionStore {
  constructor({ filePath = path.join('.zapwebp', 'session.json') } = {}) {
    this.filePath = path.resolve(filePath);
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      return new SessionState(data);
    } catch {
      return null;
    }
  }

  save(session) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(session.toJSON(), null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch {}
  }

  clear() {
    try {
      if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    } catch {}
  }
}

/**
 * Browser SessionStorage Store (for Web App).
 */
class WebSessionStore {
  constructor({ storageKey = 'zapwebp_session_v1' } = {}) {
    this.storageKey = storageKey;
    this.fallback = new MemorySessionStore();
  }

  load() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(this.storageKey);
        if (raw) return new SessionState(JSON.parse(raw));
      }
    } catch {}
    return this.fallback.load();
  }

  save(session) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.storageKey, JSON.stringify(session.toJSON()));
        return;
      }
    } catch {}
    this.fallback.save(session);
  }

  clear() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(this.storageKey);
        return;
      }
    } catch {}
    this.fallback.clear();
  }
}

/**
 * Universal Session Manager across Browser, CLI, MCP, and SDK.
 */
class SessionManager {
  /**
   * @param {object} [options]
   * @param {string} [options.surface='generic'] - 'web' | 'cli' | 'mcp' | 'sdk' | 'storage'
   * @param {object} [options.store] - Store instance (MemorySessionStore, FileSessionStore, WebSessionStore)
   * @param {number|null} [options.ttlMs=86400000] - 24 hour rolling TTL default
   */
  constructor({
    surface = 'generic',
    store = null,
    ttlMs = 86400000, // 24 hours
  } = {}) {
    this.surface = surface;
    this.ttlMs = ttlMs;
    this.store = store || new MemorySessionStore();
  }

  /**
   * Loads current session or creates a new one if expired or absent.
   * @returns {SessionState}
   */
  getSession() {
    let session = this.store.load();
    const now = Date.now();

    if (session) {
      if (session.expiresAt && now > new Date(session.expiresAt).getTime()) {
        session = null; // Expired
      }
    }

    if (!session) {
      const expiresAt = this.ttlMs ? new Date(now + this.ttlMs).toISOString() : null;
      session = new SessionState({
        surface: this.surface,
        expiresAt,
      });
      this.store.save(session);
    }

    return session;
  }

  /**
   * Checks if adding count files would exceed maxFilesPerSession.
   * @param {number} count
   * @param {number|null} maxFilesPerSession
   * @returns {boolean}
   */
  canProcess(count = 1, maxFilesPerSession = null) {
    if (maxFilesPerSession === null) return true;
    const session = this.getSession();
    return session.filesProcessed + count <= maxFilesPerSession;
  }

  /**
   * Records newly processed files and bytes. Throws E_SESSION_LIMIT_EXCEEDED if limit would be breached.
   * @param {object} params
   * @param {number} [params.filesCount=1]
   * @param {number} [params.bytesCount=0]
   * @param {number|null} [params.maxFilesPerSession=null]
   * @returns {SessionState}
   */
  record({ filesCount = 1, bytesCount = 0, maxFilesPerSession = null } = {}) {
    const session = this.getSession();

    if (maxFilesPerSession !== null && session.filesProcessed + filesCount > maxFilesPerSession) {
      throw new ZapwebpError({
        code: 'E_SESSION_LIMIT_EXCEEDED',
        message: `Session limit of ${maxFilesPerSession} files reached. Processed ${session.filesProcessed + filesCount} files in this session.`,
        fix: this.surface === 'cli'
          ? "Start a new session with 'zap --reset-session', or raise the limit in .zapwebp/config.json."
          : 'Close and re-open the session, or raise the limit in settings.',
        retryable: false,
      });
    }

    session.filesProcessed += filesCount;
    session.bytesProcessed += bytesCount;
    session.requestsCount += 1;
    session.updatedAt = new Date().toISOString();
    if (this.ttlMs) {
      session.expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    }

    this.store.save(session);
    return session;
  }

  /**
   * Resets the active session to 0 with a new sessionId.
   * @returns {SessionState}
   */
  reset() {
    const now = Date.now();
    const expiresAt = this.ttlMs ? new Date(now + this.ttlMs).toISOString() : null;
    const session = new SessionState({
      surface: this.surface,
      expiresAt,
    });
    this.store.save(session);
    return session;
  }
}

module.exports = {
  generateSessionId,
  SessionState,
  SessionManager,
  MemorySessionStore,
  FileSessionStore,
  WebSessionStore,
};
