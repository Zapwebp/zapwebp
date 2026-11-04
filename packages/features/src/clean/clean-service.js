'use strict';

const { detectMetadata, generateCleanCertificate, verifyAlpha } = require('@zapwebp/core');

/**
 * Clean Mode Service
 * Detects AI provenance tags and guarantees stripped containers with cryptographic verification.
 */
class CleanService {
  /**
   * Inspects buffer for metadata blocks, AI identifiers, and C2PA manifests.
   * @param {Buffer | Uint8Array} buffer
   */
  static inspect(buffer) {
    return detectMetadata(buffer);
  }

  /**
   * Generates SHA-256 certificate for clean output.
   * @param {Buffer | Uint8Array} output
   */
  static certify(output) {
    return generateCleanCertificate(output);
  }

  /**
   * Verifies that output preserves alpha transparency without black background artifacts.
   * @param {Buffer | Uint8Array} output
   */
  static verifyTransparency(output) {
    return verifyAlpha(output);
  }
}

module.exports = {
  CleanService,
};
