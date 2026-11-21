import path from 'node:path';
import shared from '@zapwebp/shared';

const { SessionManager, FileSessionStore } = shared;

/**
 * Path to session.json
 * @param {string} rootDir
 * @returns {string}
 */
export function getSessionFilePath(rootDir) {
  return path.join(rootDir, '.zapwebp', 'session.json');
}

/**
 * Creates a standard SessionManager for CLI root directory.
 * @param {string} rootDir
 * @returns {SessionManager}
 */
export function getSessionManager(rootDir) {
  const filePath = getSessionFilePath(rootDir);
  const store = new FileSessionStore({ filePath });
  return new SessionManager({ surface: 'cli', store });
}

/**
 * Loads the current session state.
 * @param {string} rootDir
 * @returns {Promise<object>}
 */
export async function loadSession(rootDir) {
  const manager = getSessionManager(rootDir);
  return manager.getSession().toJSON();
}

/**
 * Records newly processed files in the session.
 * @param {string} rootDir
 * @param {number} count
 * @param {number} [bytes=0]
 * @returns {Promise<object>}
 */
export async function recordSession(rootDir, count, bytes = 0) {
  const manager = getSessionManager(rootDir);
  return manager.record({ filesCount: count, bytesCount: bytes }).toJSON();
}

/**
 * Resets the current session count to 0 with a fresh session ID.
 * @param {string} rootDir
 * @returns {Promise<object>}
 */
export async function resetSession(rootDir) {
  const manager = getSessionManager(rootDir);
  return manager.reset().toJSON();
}
