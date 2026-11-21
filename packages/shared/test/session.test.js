'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  generateSessionId,
  SessionState,
  SessionManager,
  MemorySessionStore,
  FileSessionStore,
  WebSessionStore,
  ZapwebpError,
} = require('../src');

test('Session: generateSessionId creates valid zap-sess- prefix', () => {
  const id1 = generateSessionId();
  const id2 = generateSessionId();
  assert.ok(id1.startsWith('zap-sess-'));
  assert.ok(id2.startsWith('zap-sess-'));
  assert.notEqual(id1, id2);
});

test('Session: SessionState initializes with expected defaults', () => {
  const session = new SessionState({ surface: 'cli' });
  assert.ok(session.sessionId.startsWith('zap-sess-'));
  assert.equal(session.surface, 'cli');
  assert.equal(session.filesProcessed, 0);
  assert.equal(session.bytesProcessed, 0);
  assert.equal(session.requestsCount, 0);

  const json = session.toJSON();
  assert.equal(json.surface, 'cli');
  assert.equal(json.filesProcessed, 0);
});

test('Session: SessionManager with MemorySessionStore tracks files and bytes', () => {
  const manager = new SessionManager({ surface: 'web' });
  const sess = manager.getSession();

  assert.equal(sess.surface, 'web');
  assert.equal(manager.canProcess(5, 10), true);
  assert.equal(manager.canProcess(15, 10), false);

  manager.record({ filesCount: 4, bytesCount: 4096 });
  assert.equal(manager.getSession().filesProcessed, 4);
  assert.equal(manager.getSession().bytesProcessed, 4096);
  assert.equal(manager.getSession().requestsCount, 1);

  // Enforces maxFilesPerSession
  assert.throws(
    () => manager.record({ filesCount: 7, maxFilesPerSession: 10 }),
    (err) => {
      assert.equal(err.code, 'E_SESSION_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('Session limit of 10 files reached'));
      return true;
    }
  );

  // Reset creates clean session with new ID
  const oldId = manager.getSession().sessionId;
  const newSess = manager.reset();
  assert.notEqual(newSess.sessionId, oldId);
  assert.equal(newSess.filesProcessed, 0);
});

test('Session: FileSessionStore persists session state atomically across runs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-session-test-'));
  const filePath = path.join(tmpDir, 'session.json');

  try {
    const store = new FileSessionStore({ filePath });
    const manager = new SessionManager({ surface: 'cli', store });

    manager.record({ filesCount: 12, bytesCount: 1024 });

    // New manager instance loading from same file
    const store2 = new FileSessionStore({ filePath });
    const manager2 = new SessionManager({ surface: 'cli', store: store2 });
    const loaded = manager2.getSession();

    assert.equal(loaded.filesProcessed, 12);
    assert.equal(loaded.bytesProcessed, 1024);
    assert.equal(loaded.surface, 'cli');

    manager2.reset();
    assert.equal(manager2.getSession().filesProcessed, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
