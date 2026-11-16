'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_TEAM_POLICY_TEMPLATE,
  validateTeamPolicy,
  evaluateFilePolicy,
  checkExceptionsStatus,
  formatPolicyStatus,
} = require('../src/index');

test('Team Policy: validates default template and catches invalid schema properties', () => {
  // 1. Default template must be 100% valid
  const defaultValidation = validateTeamPolicy(DEFAULT_TEAM_POLICY_TEMPLATE);
  assert.equal(defaultValidation.valid, true);
  assert.equal(defaultValidation.errors.length, 0);

  // 2. Invalid version
  const badVersion = validateTeamPolicy({ ...DEFAULT_TEAM_POLICY_TEMPLATE, version: 123 });
  assert.equal(badVersion.valid, false);

  // 3. Invalid quality range (min > max)
  const badQuality = validateTeamPolicy({
    version: '1.0.0',
    policy: { quality: { min: 95, max: 70 } },
  });
  assert.equal(badQuality.valid, false);
  assert.ok(badQuality.errors.some((e) => e.includes('cannot be greater than')));

  // 4. Invalid enforcement mode
  const badEnforcement = validateTeamPolicy({
    version: '1.0.0',
    policy: {},
    enforcement: { onCi: 'ignore' },
  });
  assert.equal(badEnforcement.valid, false);
});

test('Team Policy: evaluateFilePolicy enforces rejected formats, clean mode, and quality bounds', () => {
  const policy = {
    version: '1.0.0',
    policy: {
      targetFormat: 'webp',
      quality: { min: 75, max: 90 },
      clean: { required: true },
      formats: {
        accept: ['svg', 'png', 'jpg', 'webp'],
        reject: ['gif', 'tiff'],
      },
      limits: {
        maxInputBytes: 5000000,
      },
    },
    exceptions: [],
  };

  // Rejected format
  const gifEval = evaluateFilePolicy(policy, { path: 'animation.gif', format: 'gif' });
  assert.equal(gifEval.allowed, false);
  assert.ok(gifEval.violations.some((v) => v.includes('explicitly rejected')));

  // Quality too low
  const lowQuality = evaluateFilePolicy(policy, { path: 'icon.svg', format: 'svg' }, { quality: 50 });
  assert.equal(lowQuality.allowed, false);
  assert.ok(lowQuality.violations.some((v) => v.includes('below team policy minimum')));

  // Clean mode disabled when required
  const noClean = evaluateFilePolicy(policy, { path: 'photo.jpg', format: 'jpg' }, { quality: 80, clean: false });
  assert.equal(noClean.allowed, false);
  assert.ok(noClean.violations.some((v) => v.includes('Clean Mode (metadata stripping) is required')));

  // Target format mismatch
  const targetMismatch = evaluateFilePolicy(policy, { path: 'icon.svg', format: 'svg' }, { quality: 80, target: 'png' });
  assert.equal(targetMismatch.allowed, false);
  assert.ok(targetMismatch.violations.some((v) => v.includes('does not match required team target')));

  // Valid conversion
  const valid = evaluateFilePolicy(policy, { path: 'icon.svg', format: 'svg', size: 1000 }, { quality: 85, clean: true, target: 'webp' });
  assert.equal(valid.allowed, true);
  assert.equal(valid.violations.length, 0);
});

test('Team Policy: exceptions apply when unexpired and fail when expired', () => {
  const policy = {
    version: '1.0.0',
    policy: {
      formats: { reject: ['gif'] },
    },
    exceptions: [
      {
        path: 'public/legacy/*.gif',
        reason: 'Legacy animation, frozen',
        approvedBy: 'lead@zapwebp.com',
        expiresAt: '2099-01-01', // Active
      },
      {
        path: 'src/expired/*.gif',
        reason: 'Expired trial',
        approvedBy: 'lead@zapwebp.com',
        expiresAt: '2020-01-01', // Expired
      },
    ],
  };

  // Active exception waives violation
  const activeRes = evaluateFilePolicy(policy, { path: 'public/legacy/spinner.gif', format: 'gif' });
  assert.equal(activeRes.allowed, true);
  assert.ok(activeRes.exceptionApplied);
  assert.equal(activeRes.exceptionApplied.reason, 'Legacy animation, frozen');

  // Expired exception does not waive violation
  const expiredRes = evaluateFilePolicy(policy, { path: 'src/expired/loader.gif', format: 'gif' });
  assert.equal(expiredRes.allowed, false);
});

test('Team Policy: status inspection and formatting', () => {
  const policy = {
    version: '1.0.0',
    policy: { targetFormat: 'webp', quality: { min: 75, max: 90 }, clean: { required: true } },
    enforcement: { onCi: 'block', onLocal: 'warn' },
    exceptions: [
      {
        path: 'public/legacy/*.svg',
        reason: 'Legacy frozen',
        approvedBy: 'architect@zapwebp.com',
        expiresAt: '2099-01-01',
      },
      {
        path: 'temp/*.png',
        reason: 'Past review',
        approvedBy: 'dev@zapwebp.com',
        expiresAt: '2021-01-01',
      },
    ],
  };

  const status = checkExceptionsStatus(policy);
  assert.equal(status.active.length, 1);
  assert.equal(status.expired.length, 1);
  assert.ok(status.active[0].daysRemaining > 0);
  assert.ok(status.expired[0].daysExpired > 0);

  const display = formatPolicyStatus(policy);
  assert.ok(display.includes('Zapwebp Team Policy Status'));
  assert.ok(display.includes('Active Exceptions (1):'));
  assert.ok(display.includes('Expired Exceptions (1):'));
});
