'use strict';

const { getMock, resetMock } = require('./mock-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');
const vscode = require('vscode');

const { formatBytes, showSuccess, showError } = require('../src/ui/toast');
const { ZapStatusBar } = require('../src/ui/status-bar');

test('ui.formatBytes formats bytes accurately', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2150), '2.1 KB');
  assert.equal(formatBytes(1572864), '1.5 MB');
});

test('ui.showSuccess formats single file toast with filename, size, and savings percentage', () => {
  const mock = resetMock();
  showSuccess(1, 1500, {
    filename: 'logo.webp',
    sourceSize: 2000,
    outputSize: 500,
  });
  assert.equal(mock._infoMessages[mock._infoMessages.length - 1], '✅ logo.webp saved (500 B, −75%)');
});

test('ui.showSuccess formats multi-file batch toast with count and total savings', () => {
  const mock = resetMock();
  showSuccess(3, 15360);
  assert.equal(mock._infoMessages[mock._infoMessages.length - 1], '✅ 3 files converted (15.0 KB saved)');
});

test('ui.showError formats actionable error message with error code and filename', () => {
  const mock = resetMock();
  const mockUri = { path: '/workspace/icons/danger.svg' };
  showError(mockUri, {
    code: 'E_UNSAFE_SVG',
    message: 'SVG contains active script elements or event handlers.',
  });
  assert.equal(
    mock._errorMessages[mock._errorMessages.length - 1],
    'Zapwebp [E_UNSAFE_SVG]: Failed to convert danger.svg — SVG contains active script elements or event handlers.'
  );
});

test('ui.ZapStatusBar manages daily conversion counts and formatted tooltips', () => {
  resetMock();
  const sb = new ZapStatusBar();
  assert.equal(sb.count, 0);

  sb.increment(1, 1024);
  assert.equal(sb.count, 1);
  assert.equal(sb.bytesSaved, 1024);
  assert.equal(sb.item.text, '⚡ Zapwebp: 1 file converted');

  sb.increment(3, 3072);
  assert.equal(sb.count, 4);
  assert.equal(sb.bytesSaved, 4096);
  assert.equal(sb.item.text, '⚡ Zapwebp: 4 files converted');

  // Simulate day change
  sb.currentDate = '2020-01-01';
  sb.increment(1, 512);
  assert.equal(sb.count, 1, 'Should reset count after date rollover');
  assert.equal(sb.bytesSaved, 512);

  sb.dispose();
});
