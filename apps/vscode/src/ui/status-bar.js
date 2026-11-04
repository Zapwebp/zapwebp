'use strict';

const vscode = require('vscode');
const { formatBytes } = require('./toast');

/**
 * Returns today's ISO date string (YYYY-MM-DD) in local time.
 * @returns {string}
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class ZapStatusBar {
  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Zapwebp');
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'zapwebp.showOutput';

    this.currentDate = getTodayDate();
    this.count = 0;
    this.bytesSaved = 0;

    this.refresh();
  }

  /**
   * Refreshes status bar item representation.
   */
  refresh() {
    this.checkDailyReset();
    if (this.count === 0) {
      this.item.text = '⚡ Zapwebp';
      this.item.tooltip = 'Zapwebp: Ready to convert images. Click to view logs.';
    } else {
      this.item.text = `⚡ Zapwebp: ${this.count} file${this.count === 1 ? '' : 's'} converted`;
      this.item.tooltip = `Zapwebp: ${this.count} file${this.count === 1 ? '' : 's'} converted (${formatBytes(this.bytesSaved)} saved today). Click to view logs.`;
    }
    this.item.show();
  }

  /**
   * Verifies date and resets counter if day rolled over.
   */
  checkDailyReset() {
    const today = getTodayDate();
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.count = 0;
      this.bytesSaved = 0;
    }
  }

  /**
   * Increments the conversion count and saved bytes.
   * @param {number} [filesCount=1]
   * @param {number} [bytes=0]
   */
  increment(filesCount = 1, bytes = 0) {
    this.checkDailyReset();
    this.count += filesCount;
    this.bytesSaved += Math.max(0, bytes);
    this.refresh();
  }

  /**
   * Appends an entry to the Zapwebp output channel.
   * @param {string} message
   */
  log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Reveals the Zapwebp output channel panel.
   */
  showOutput() {
    this.outputChannel.show(true);
  }

  /**
   * Disposes the status bar item and output channel.
   */
  dispose() {
    this.item.dispose();
    this.outputChannel.dispose();
  }
}

const statusBar = new ZapStatusBar();

module.exports = {
  ZapStatusBar,
  statusBar,
};
