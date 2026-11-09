'use strict';

const { resolveOptions, DEFAULT_OPTIONS, validateStorageConfig, validateAdapterContract } = require('./options');
const { withZapwebp, writeWithRetry } = require('./wrapper');
const { validateStoragePath, stripCredentials, validateSafeUrl, isPrivateIp } = require('./sanitize');
const { supabaseAdapter, SUPABASE_RLS_TEMPLATES } = require('./adapters/supabase');
const { firebaseAdapter, firebaseAdminAdapter, FIREBASE_RULES_TEMPLATES } = require('./adapters/firebase');
const { neocitiesAdapter } = require('./adapters/neocities');

module.exports = {
  resolveOptions,
  DEFAULT_OPTIONS,
  validateStorageConfig,
  validateAdapterContract,
  validateStoragePath,
  validateSafeUrl,
  isPrivateIp,
  stripCredentials,
  withZapwebp,
  writeWithRetry,
  supabaseAdapter,
  SUPABASE_RLS_TEMPLATES,
  firebaseAdapter,
  firebaseAdminAdapter,
  FIREBASE_RULES_TEMPLATES,
  neocitiesAdapter,
};
