import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Calculates SHA-256 of file buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
function fileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates unique transaction ID.
 * @returns {string}
 */
export function generateTransactionId() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rnd = crypto.randomBytes(3).toString('hex');
  return `${ts}-${rnd}`;
}

/**
 * Resolves journal and backup directories.
 * @param {string} rootDir
 * @returns {{ zapDir: string, journalDir: string, backupsDir: string }}
 */
export function getJournalPaths(rootDir) {
  const zapDir = path.resolve(rootDir, '.zapwebp');
  return {
    zapDir,
    journalDir: path.join(zapDir, 'journal'),
    backupsDir: path.join(zapDir, 'backups'),
  };
}

/**
 * Persists a transaction to the journal directory.
 * @param {string} rootDir
 * @param {object} transaction
 * @returns {Promise<string>} path to saved journal file
 */
export async function writeTransaction(rootDir, transaction) {
  const { journalDir } = getJournalPaths(rootDir);
  await mkdir(journalDir, { recursive: true });
  const journalPath = path.join(journalDir, `${transaction.id}.json`);
  await writeFile(journalPath, JSON.stringify(transaction, null, 2) + '\n', 'utf8');
  return journalPath;
}

/**
 * Lists past transactions sorted from newest to oldest.
 * @param {string} rootDir
 * @returns {Promise<object[]>}
 */
export async function listTransactions(rootDir) {
  const { journalDir } = getJournalPaths(rootDir);
  const files = await readdir(journalDir).catch(() => []);
  const transactions = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await readFile(path.join(journalDir, file), 'utf8');
      const data = JSON.parse(content);
      transactions.push(data);
    } catch {}
  }

  return transactions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

/**
 * Reverts an executed transaction.
 * @param {string} rootDir
 * @param {string} [targetId] - ID of transaction, or latest if omitted
 * @param {object} [options]
 * @returns {Promise<{ id: string, undoneCount: number, operations: object[] }>}
 */
export async function undoTransaction(rootDir, targetId, options = {}) {
  const transactions = await listTransactions(rootDir);
  if (!transactions.length) {
    throw new Error('No conversion transactions found in .zapwebp/journal.');
  }

  const tx = targetId
    ? transactions.find((t) => t.id === targetId || t.id.endsWith(targetId))
    : transactions.find((t) => t.status !== 'undone');

  if (!tx) {
    throw new Error(`Transaction not found or already undone: ${targetId || 'latest'}`);
  }

  const { backupsDir, journalDir } = getJournalPaths(rootDir);
  const undoneOperations = [];

  for (const op of tx.operations) {
    const fullPath = path.resolve(rootDir, op.path);

    if (op.type === 'create') {
      const existing = await readFile(fullPath).catch(() => null);
      if (existing) {
        const currentHash = fileHash(existing);
        if (currentHash !== op.sha256 && !options.forceUndo) {
          throw new Error(`Cannot undo create for ${op.path}: file was modified since conversion. Use --force-undo to delete anyway.`);
        }
        // Backup created file so redo can restore it
        const backupFile = path.resolve(backupsDir, tx.id, op.path);
        await mkdir(path.dirname(backupFile), { recursive: true });
        await writeFile(backupFile, existing);
        await rm(fullPath, { force: true });
        undoneOperations.push({ type: 'delete_created', path: op.path });
      }
    } else if (op.type === 'modify' || op.type === 'delete') {
      let backupFile;
      if (op.backupPath && path.isAbsolute(op.backupPath)) {
        backupFile = op.backupPath;
      } else if (op.backupPath && op.backupPath.includes('.zapwebp')) {
        backupFile = path.resolve(rootDir, op.backupPath);
      } else {
        backupFile = path.resolve(backupsDir, tx.id, op.backupPath || op.path);
      }
      const backupData = await readFile(backupFile).catch(() => null);
      if (!backupData) {
        throw new Error(`Backup data missing for ${op.path} in transaction ${tx.id}`);
      }
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, backupData);
      undoneOperations.push({ type: 'restored_from_backup', path: op.path });
    }
  }

  // Update transaction status
  tx.status = 'undone';
  tx.undoneAt = new Date().toISOString();
  await writeFile(path.join(journalDir, `${tx.id}.json`), JSON.stringify(tx, null, 2) + '\n', 'utf8');

  return {
    id: tx.id,
    undoneCount: undoneOperations.length,
    operations: undoneOperations,
  };
}

/**
 * Re-applies a previously undone transaction.
 * @param {string} rootDir
 * @param {string} [targetId]
 * @returns {Promise<{ id: string, redoneCount: number, operations: object[] }>}
 */
export async function redoTransaction(rootDir, targetId) {
  const transactions = await listTransactions(rootDir);
  const tx = targetId
    ? transactions.find((t) => t.id === targetId || t.id.endsWith(targetId))
    : transactions.find((t) => t.status === 'undone');

  if (!tx) {
    throw new Error(`No undone transaction found to redo: ${targetId || 'latest'}`);
  }

  const { journalDir, backupsDir } = getJournalPaths(rootDir);
  const redoneOps = [];

  for (const op of tx.operations) {
    const fullPath = path.resolve(rootDir, op.path);
    if (op.type === 'create' || op.type === 'modify') {
      const backupFile = path.resolve(backupsDir, tx.id, op.path);
      const backupData = await readFile(backupFile).catch(() => null);
      if (backupData) {
        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, backupData);
        redoneOps.push({ type: 'recreated', path: op.path });
      }
    }
  }

  tx.status = 'completed';
  delete tx.undoneAt;
  await writeFile(path.join(journalDir, `${tx.id}.json`), JSON.stringify(tx, null, 2) + '\n', 'utf8');

  return {
    id: tx.id,
    redoneCount: redoneOps.length,
    operations: redoneOps,
  };
}

/**
 * Prunes old journal transactions and their backup directories.
 * @param {string} rootDir
 * @param {number} [maxKeep=50]
 * @param {number} [maxAgeDays=30]
 * @param {object} [options={}]
 * @param {boolean} [options.all=false] - Purge all backups regardless of age
 * @param {boolean} [options.dryRun=false] - Preview without deleting
 * @returns {Promise<{ prunedCount: number, prunedFiles: string[] }>}
 */
export async function pruneJournal(rootDir, maxKeep = 50, maxAgeDays = 30, options = {}) {
  const transactions = await listTransactions(rootDir);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const { journalDir, backupsDir } = getJournalPaths(rootDir);

  let prunedCount = 0;
  const prunedFiles = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const age = now - new Date(tx.startedAt).getTime();
    const shouldPrune = Boolean(options.all) || i >= maxKeep || age > maxAgeMs;

    if (shouldPrune) {
      const journalFile = path.join(journalDir, `${tx.id}.json`);
      const backupDir = path.join(backupsDir, tx.id);
      prunedFiles.push(journalFile, backupDir);
      prunedCount++;

      if (!options.dryRun) {
        await rm(journalFile, { force: true }).catch(() => {});
        await rm(backupDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  return { prunedCount, prunedFiles };
}
