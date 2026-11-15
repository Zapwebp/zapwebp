'use strict';

/**
 * Malicious XXE entity expansion fixture.
 */
const BILLION_LAUGHS_SVG = `<?xml version="1.0"?>
<!DOCTYPE lolz [
 <!ENTITY lol "lol">
 <!ELEMENT lolz (#PCDATA)>
 <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
 <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
 <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
 <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
 <!ENTITY lol5 "&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <text>&lol5;</text>
</svg>`;

/**
 * Malicious executable script injection fixture.
 */
const SCRIPT_INJECTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <script>/* malicious payload */ alert(document.cookie);</script>
  <rect width="100" height="100" fill="red"/>
</svg>`;

/**
 * Malicious remote SSRF external reference fixture.
 */
const EXTERNAL_REF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <image href="http://169.254.169.254/latest/meta-data/" width="100" height="100"/>
</svg>`;

/**
 * Synthetic PNG decompression bomb declaring 100,000 × 100,000 pixels (10 Gigapixels).
 */
const DECOMPRESSION_BOMB_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x01, 0x86, 0xa0, // Width: 100,000 px
  0x00, 0x01, 0x86, 0xa0, // Height: 100,000 px
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x35, 0x6e, 0x1d, 0x83, // CRC
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/**
 * Corrupted WebP container with truncated magic header.
 */
const CORRUPT_HEADER_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0xff, 0xff, 0xff, 0xff,
]);

/**
 * Adversarial test fixtures catalog mapped to vulnerability taxonomy.
 */
const ADVERSARIAL_FIXTURES = Object.freeze({
  'billion-laughs': {
    name: 'billion-laughs.svg',
    attack: 'XXE entity expansion',
    data: Buffer.from(BILLION_LAUGHS_SVG),
    expectedErrorCodes: ['E_UNSAFE_SVG', 'E_SECURITY_VIOLATION'],
  },
  'script-injection': {
    name: 'script-injection.svg',
    attack: 'Embedded <script> tag execution',
    data: Buffer.from(SCRIPT_INJECTION_SVG),
    expectedErrorCodes: ['E_UNSAFE_SVG', 'E_SECURITY_VIOLATION'],
  },
  'external-ref': {
    name: 'external-ref.svg',
    attack: 'SSRF cloud metadata exfiltration',
    data: Buffer.from(EXTERNAL_REF_SVG),
    expectedErrorCodes: ['E_UNSAFE_SVG', 'E_SECURITY_VIOLATION', 'E_SSRF_PROHIBITED'],
  },
  'decompression-bomb': {
    name: 'decompression-bomb.png',
    attack: 'Excessive dimensions / memory exhaustion',
    data: DECOMPRESSION_BOMB_PNG,
    expectedErrorCodes: ['E_DIMENSIONS_TOO_LARGE', 'E_CONVERSION_FAILED', 'E_IMAGE_TOO_LARGE'],
  },
  'path-traversal': {
    name: '../../../../etc/passwd',
    attack: 'Directory traversal escaping sandbox',
    data: Buffer.from('path traversal payload'),
    expectedErrorCodes: ['E_PATH_TRAVERSAL', 'E_INVALID_PATH', 'E_FORBIDDEN'],
  },
  'corrupt-header': {
    name: 'corrupt-header.webp',
    attack: 'Truncated container / parser crash attempt',
    data: CORRUPT_HEADER_WEBP,
    expectedErrorCodes: ['E_UNSUPPORTED_FORMAT', 'E_CONVERSION_FAILED', 'E_CORRUPT_INPUT'],
  },
});

/**
 * Validates that an adversarial fixture is rejected with a structured security/validation error.
 * @param {string} key - Identifier in ADVERSARIAL_FIXTURES.
 * @param {(data: Buffer, name: string) => Promise<any>} runnerFn - Test handler.
 * @returns {Promise<{ key: string, rejected: boolean, errorCode: string, passed: boolean }>}
 */
async function verifyAdversarialRejection(key, runnerFn) {
  const fixture = ADVERSARIAL_FIXTURES[key];
  if (!fixture) {
    throw new Error(`Unknown adversarial fixture key: ${key}`);
  }

  let rejected = false;
  let thrownError = null;

  try {
    await runnerFn(fixture.data, fixture.name);
  } catch (err) {
    rejected = true;
    thrownError = err;
  }

  if (!rejected) {
    throw new Error(`CRITICAL SECURITY FAILURE: Adversarial fixture "${fixture.name}" (${fixture.attack}) was NOT rejected!`);
  }

  const code = (thrownError && thrownError.code) || 'E_REJECTED';
  return {
    key,
    name: fixture.name,
    attack: fixture.attack,
    rejected: true,
    errorCode: code,
    errorMessage: (thrownError && thrownError.message) || String(thrownError),
    passed: true,
  };
}

module.exports = {
  ADVERSARIAL_FIXTURES,
  BILLION_LAUGHS_SVG,
  SCRIPT_INJECTION_SVG,
  EXTERNAL_REF_SVG,
  DECOMPRESSION_BOMB_PNG,
  CORRUPT_HEADER_WEBP,
  verifyAdversarialRejection,
};
