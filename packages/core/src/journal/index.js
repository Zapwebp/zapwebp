'use strict';

const crypto = require('node:crypto');

/**
 * @typedef {Object} JournalEntry
 * @property {string} id - Unique transaction identifier
 * @property {string} timestamp - ISO timestamp
 * @property {string} inputHash - SHA-256 hash of input bytes
 * @property {string} outputHash - SHA-256 hash of output bytes
 * @property {string} fromFormat - Input format
 * @property {string} toFormat - Output format
 * @property {number} durationMs - Conversion duration in milliseconds
 * @property {object} options - Options applied
 */

class TransactionJournal {
  constructor(limit = 100) {
    this._entries = [];
    this._limit = limit;
  }

  /**
   * Records a conversion transaction.
   * @param {object} params
   * @returns {JournalEntry}
   */
  record({ inputBytes, outputBytes, fromFormat, toFormat, durationMs, options = {} }) {
    const inputHash = crypto.createHash('sha256').update(inputBytes).digest('hex');
    const outputHash = crypto.createHash('sha256').update(outputBytes).digest('hex');
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      inputHash,
      outputHash,
      fromFormat,
      toFormat,
      durationMs,
      options: { ...options },
    };

    this._entries.unshift(entry);
    if (this._entries.length > this._limit) {
      this._entries.pop();
    }

    return entry;
  }

  /**
   * Retrieves recent transaction entries.
   * @param {number} [count]
   * @returns {JournalEntry[]}
   */
  getEntries(count) {
    return count ? this._entries.slice(0, count) : [...this._entries];
  }

  /**
   * Clears the in-memory journal.
   */
  clear() {
    this._entries = [];
  }
}

const defaultJournal = new TransactionJournal();

module.exports = {
  TransactionJournal,
  defaultJournal,
};
