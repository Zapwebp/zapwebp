'use strict';

const { resolveOptions, DEFAULT_OPTIONS } = require('./options');
const { withZapwebp } = require('./wrapper');
const { supabaseAdapter } = require('./adapters/supabase');
const { firebaseAdapter, firebaseAdminAdapter } = require('./adapters/firebase');
const { neocitiesAdapter } = require('./adapters/neocities');

module.exports = {
  resolveOptions,
  DEFAULT_OPTIONS,
  withZapwebp,
  supabaseAdapter,
  firebaseAdapter,
  firebaseAdminAdapter,
  neocitiesAdapter,
};
