'use strict';

/**
 * Standard Structured Error Class
 */
class ZapwebpError extends Error {
  /**
   * @param {object} params
   * @param {string} params.code
   * @param {string} params.message
   * @param {string} [params.fix]
   * @param {string} [params.docs]
   * @param {number} [params.exitCode=1]
   * @param {object} [params.input]
   * @param {string} [params.target]
   * @param {object} [params.suggestedFix]
   */
  constructor({ code, message, fix, docs, exitCode = 1, input, target, suggestedFix, retryable, ...rest }) {
    super(message);
    this.name = 'ZapwebpError';
    this.code = code;
    this.fix = fix || '';
    this.docs = docs || `https://zapwebp-docs.vercel.app/errors#${code}`;
    this.exitCode = exitCode;
    if (input !== undefined) this.input = input;
    if (target !== undefined) this.target = target;
    if (suggestedFix !== undefined) this.suggestedFix = suggestedFix;
    this.retryable = typeof retryable === 'boolean'
      ? retryable
      : Boolean(this.suggestedFix || code === 'E_ALPHA_NOT_REPRESENTABLE' || code === 'E_TOO_LARGE' || code === 'E_UNSAFE_SVG');
    Object.assign(this, rest);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      fix: this.fix,
      docs: this.docs,
      retryable: this.retryable,
      ...(this.suggestedFix !== undefined ? { suggestedFix: this.suggestedFix } : {}),
      ...(this.input !== undefined ? { input: this.input } : {}),
      ...(this.target !== undefined ? { target: this.target } : {}),
      exitCode: this.exitCode,
    };
  }
}

/**
 * Standard Error Message Catalog
 * Centralized, code-keyed error definitions matching content/errors.md.
 */
const ERROR_CATALOG = Object.freeze({
  E_UNSUPPORTED_FORMAT: {
    code: 'E_UNSUPPORTED_FORMAT',
    message: 'Cannot decode this file into the locked target format.',
    fix: 'Upload a supported format, or install the format plugin for this file.',
  },
  E_ALPHA_NOT_REPRESENTABLE: {
    code: 'E_ALPHA_NOT_REPRESENTABLE',
    message: 'JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.',
    fix: 'Pass --background "#ffffff" or choose WebP/PNG/AVIF.',
    suggestedFix: { background: '#ffffff' },
  },
  alpha_loss_forbidden: {
    code: 'alpha_loss_forbidden',
    message: 'JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.',
    fix: 'Pass --background "#ffffff" or choose --to webp.',
  },
  file_empty: {
    code: 'file_empty',
    message: 'The input file is empty (0 bytes).',
    fix: 'Verify the file source or complete the download before converting.',
  },
  unsupported_format: {
    code: 'unsupported_format',
    message: 'Unsupported or unrecognized image format. Supported inputs: SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF.',
    fix: 'Ensure the file format is supported or install a format expansion plugin.',
  },
  svg_invalid: {
    code: 'svg_invalid',
    message: 'This file does not contain a valid SVG document.',
    fix: 'Validate your SVG markup in an editor before converting.',
  },
  svg_active_content: {
    code: 'svg_active_content',
    message: 'This SVG contains active content (<script>, <foreignObject>, or event handlers) and cannot be converted.',
    fix: 'Sanitize the SVG to remove scripts or active tags.',
  },
  svg_custom_entity: {
    code: 'svg_custom_entity',
    message: 'Custom XML entities are not supported.',
    fix: 'Remove <!ENTITY> declarations from the SVG header.',
  },
  svg_doctype_unsupported: {
    code: 'svg_doctype_unsupported',
    message: 'DOCTYPE declarations are not supported.',
    fix: 'Remove <!DOCTYPE> declarations from the SVG header.',
  },
  dimensions_exceeded: {
    code: 'dimensions_exceeded',
    message: 'Image dimensions exceed the 4096 px side or pixel-count limit.',
    fix: 'Resize the asset or pass a smaller --width option.',
  },
  options_invalid: {
    code: 'options_invalid',
    message: 'Conversion options must be an object.',
    fix: 'Check the CLI flags or options object supplied.',
  },
  E_EMPTY_FILE: {
    code: 'E_EMPTY_FILE',
    message: 'The input file is empty (0 bytes).',
    fix: 'Ensure the file was downloaded or copied completely.',
  },
  E_CORRUPT_HEADER: {
    code: 'E_CORRUPT_HEADER',
    message: 'File is too small to contain a valid container header.',
    fix: 'The asset appears truncated or corrupt.',
  },
  E_UNKNOWN_FORMAT: {
    code: 'E_UNKNOWN_FORMAT',
    message: 'The file header does not match any recognized format.',
    fix: 'Check the file extension or install a community format plugin.',
  },
  E_UNSAFE_SVG: {
    code: 'E_UNSAFE_SVG',
    message: 'SVG contains dangerous or active content.',
    fix: 'Remove scripts, foreignObjects, or external URLs from the SVG.',
  },
  E_PATH_TRAVERSAL: {
    code: 'E_PATH_TRAVERSAL',
    message: 'Path escapes working directory boundary.',
    fix: 'Specify an input or output path inside the project root.',
  },
  E_SSRF_BLOCKED: {
    code: 'E_SSRF_BLOCKED',
    message: 'Access to local networks, private subnets, and cloud metadata is forbidden.',
    fix: 'Provide a publicly accessible HTTPS image URL.',
  },
  E_UNSAFE_PROTOCOL: {
    code: 'E_UNSAFE_PROTOCOL',
    message: 'Only secure HTTPS URLs are permitted.',
    fix: 'Use an https:// URL.',
  },
  E_CLEAN_FAILED: {
    code: 'E_CLEAN_FAILED',
    message: 'Metadata handler failed to eliminate targeted metadata.',
    fix: 'Inspect the file with zapwebp-lens and check metadata plugins.',
  },
  E_CORRUPT_CONTAINER: {
    code: 'E_CORRUPT_CONTAINER',
    message: 'File container became unreadable after metadata stripping.',
    fix: 'Check the metadata plugin implementation.',
  },
  E_WRITE_LOCKED: {
    code: 'E_WRITE_LOCKED',
    message: 'Destination file is locked by another process.',
    fix: 'Close any viewer or editor holding a file lock and retry.',
  },
  E_WRITE_PERMISSION: {
    code: 'E_WRITE_PERMISSION',
    message: 'Permission denied writing to destination directory.',
    fix: 'Verify write permissions for the destination folder.',
  },
  E_READ_PERMISSION: {
    code: 'E_READ_PERMISSION',
    message: 'Permission denied reading input file.',
    fix: 'Verify read permissions for the source file.',
  },
  E_DISK_FULL: {
    code: 'E_DISK_FULL',
    message: 'No space left on device.',
    fix: 'Free disk space and re-run conversion.',
  },
  E_TOO_LARGE: {
    code: 'E_TOO_LARGE',
    message: 'Input file exceeds maximum allowed bytes limit.',
    fix: 'Compress the input file or increase maxInputBytes in conversion policy.',
  },
  E_INPUT_TOO_LARGE: {
    code: 'E_INPUT_TOO_LARGE',
    message: 'Input file exceeds maximum allowed bytes limit.',
    fix: 'Compress the input file or increase maxInputBytes in conversion policy.',
  },
  E_INPUT_TOO_SMALL: {
    code: 'E_INPUT_TOO_SMALL',
    message: 'Input file is smaller than minimum required bytes limit.',
    fix: 'Provide an image file meeting the minimum byte requirement.',
  },
  E_OUTPUT_TOO_LARGE: {
    code: 'E_OUTPUT_TOO_LARGE',
    message: 'Could not compress image below target output bytes limit.',
    fix: 'Increase maxOutputBytes, adjust quality, or downscale image dimensions.',
    suggestedFix: { quality: 70 },
  },
  E_OUTPUT_TOO_SMALL: {
    code: 'E_OUTPUT_TOO_SMALL',
    message: 'Converted output is smaller than minimum required output bytes.',
    fix: 'Increase quality, adjust size limits, or provide a higher resolution input.',
  },
  E_OUTPUT_BELOW_RANGE: {
    code: 'E_OUTPUT_BELOW_RANGE',
    message: 'Converted output falls below the configured target size range.',
    fix: 'Adjust minOutputBytes or allow flexible compression mode.',
  },
  E_SAME_FORMAT_REJECTED: {
    code: 'E_SAME_FORMAT_REJECTED',
    message: 'Input format matches target lock format and same-format uploads are rejected by policy.',
    fix: 'Change sameFormat policy to "passthrough" or "reencode", or provide a different input format.',
  },
  E_SYMLINK_LOOP: {
    code: 'E_SYMLINK_LOOP',
    message: 'Symlink cycle detected during path traversal.',
    fix: 'Remove recursive symlinks or exclude the folder using ignore patterns.',
  },
  E_TIMEOUT: {
    code: 'E_TIMEOUT',
    message: 'Image conversion exceeded the maximum timeout threshold.',
    fix: 'Downscale the asset or increase conversion timeout configuration.',
  },
  E_WASM_FAILED: {
    code: 'E_WASM_FAILED',
    message: 'WASM conversion engine failed to initialize.',
    fix: 'Ensure WebAssembly is supported in your environment or use the native CLI.',
  },
  E_NODE_VERSION: {
    code: 'E_NODE_VERSION',
    message: 'Current Node.js version is too old. Node.js >= 22.0.0 is required.',
    fix: 'Upgrade your Node.js runtime to version 22 or later.',
  },
  E_INVALID_CONFIG: {
    code: 'E_INVALID_CONFIG',
    message: 'Zapwebp configuration file is malformed or invalid.',
    fix: 'Check the syntax and option keys in zapwebp.config.js or package.json.',
  },
  E_UPLOADER_REQUIRED: {
    code: 'E_UPLOADER_REQUIRED',
    message: 'createZapStore requires an active conversion handler to convert images.',
    fix: 'Provide an uploader callback function in initialConfig or upload options.',
  },
  E_CROP_EMPTY: {
    code: 'E_CROP_EMPTY',
    message: 'The requested crop region has zero or negative dimensions.',
    fix: 'Specify valid non-zero crop coordinates within image bounds.',
  },
  E_MODEL_FAILED: {
    code: 'E_MODEL_FAILED',
    message: 'AI detection model failed to load or initialize.',
    fix: 'Verify WASM runtime access or fall back to Smart-Subject mode.',
    suggestedFix: { mode: 'subject', strategy: 'attention' },
  },
  E_RATE_LIMIT: {
    code: 'E_RATE_LIMIT',
    message: 'Too many requests. Rate limit threshold exceeded.',
    fix: 'Wait a few moments before submitting additional requests.',
  },
  E_AUTH: {
    code: 'E_AUTH',
    message: 'Authentication credentials for storage provider are invalid or expired.',
    fix: 'Verify API keys, service tokens, or environment credentials.',
  },
  E_STORAGE: {
    code: 'E_STORAGE',
    message: 'Storage provider returned an unhandled error during write or read.',
    fix: 'Check remote storage bucket permissions and connection status.',
  },
  E_FORMAT_REJECTED: {
    code: 'E_FORMAT_REJECTED',
    message: 'Image format is rejected by conversion policy allowlist or denylist.',
    fix: 'Update accepted formats policy or supply an allowed image file.',
  },
  E_UNSUPPORTED_LOCALE: {
    code: 'E_UNSUPPORTED_LOCALE',
    message: 'Requested locale is not supported.',
    fix: 'Choose a supported locale (e.g. en, tl).',
  },
});

module.exports = {
  ZapwebpError,
  ERROR_CATALOG,
};
