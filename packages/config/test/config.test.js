'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src');

test('Config: exports valid ESLint rule configurations', () => {
  assert.ok(config.eslint.rules);
  const syntaxRules = config.eslint.rules['no-restricted-syntax'];
  assert.ok(Array.isArray(syntaxRules));
  assert.equal(syntaxRules[0], 'error');
  assert.equal(syntaxRules.length, 4, 'Must have 3 restricted syntax selectors plus error level');
  assert.ok(config.eslint.rules['no-restricted-imports']);
  assert.equal(config.eslint.rules.complexity[0], 'warn');
  assert.equal(config.eslint.rules.complexity[1], 10);
});

test('Config: exports valid TypeScript base compiler options', () => {
  assert.ok(config.tsconfig.compilerOptions);
  assert.equal(config.tsconfig.compilerOptions.strict, true);
  assert.equal(config.tsconfig.compilerOptions.target, 'ES2023');
  assert.equal(config.tsconfig.compilerOptions.moduleResolution, 'NodeNext');
});
