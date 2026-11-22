'use strict';

const lockModule = require('./lock');

exports.LOCK_VERSION = lockModule.LOCK_VERSION;
exports.ENGINE_VERSION = lockModule.ENGINE_VERSION;
exports.LOCK_KEYWORD = lockModule.LOCK_KEYWORD;
exports.computeOptionsHash = lockModule.computeOptionsHash;
exports.createLockFingerprint = lockModule.createLockFingerprint;
exports.writeLock = lockModule.writeLock;
exports.readLock = lockModule.readLock;
exports.verifyLock = lockModule.verifyLock;
exports.shouldSkipConversion = lockModule.shouldSkipConversion;
exports.createLockPlugin = lockModule.createLockPlugin;
exports.lockPlugin = lockModule.createLockPlugin;
exports.default = lockModule.createLockPlugin;



