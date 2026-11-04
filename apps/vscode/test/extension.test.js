'use strict';

const { getMock } = require('./mock-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');

test('VS Code extension source exports activate lifecycle function', () => {
  const extension = require('../src/extension.js');
  assert.equal(typeof extension.activate, 'function');
  assert.equal(typeof extension.deactivate, 'function');

  const context = { subscriptions: [] };
  extension.activate(context);
  assert.ok(context.subscriptions.length >= 5);
  extension.deactivate();
});
