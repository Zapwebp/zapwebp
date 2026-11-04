'use strict';

/**
 * Human-readable byte formatting helper.
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

/**
 * Zapwebp Error Mapping Dictionary.
 * Maps every structured error code to human messages, actionable fixes, component targets, and retry metadata.
 */
const ERROR_MAP = {
  E_UNSAFE_SVG: {
    title: 'Unsafe SVG detected',
    message: 'This SVG contains a script tag, external reference, or entity expansion.',
    fix: 'Remove the script tag or remote reference, or pass --allow-unsafe.',
    component: 'modal',
    severity: 'error',
    retryable: false,
  },
  E_TOO_LARGE: {
    title: 'File is too large',
    message: (ctx) => `This file exceeds the ${formatBytes(ctx?.maxBytes || 5242880)} limit.`,
    fix: 'Compress the file or increase the maximum file limit.',
    component: 'banner',
    severity: 'warning',
    retryable: false,
  },
  E_UNSUPPORTED_FORMAT: {
    title: 'Unsupported file format',
    message: (ctx) => `The format "${ctx?.detected || 'unknown'}" is not supported.`,
    fix: 'Upload an SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF file.',
    component: 'toast',
    severity: 'error',
    retryable: false,
  },
  E_OUTPUT_TOO_LARGE: {
    title: 'Could not compress below target size',
    message: (ctx) => `Output is ${formatBytes(ctx?.actualBytes || 0)}, target is ${formatBytes(ctx?.maxBytes || 0)}.`,
    fix: 'Increase the target size, adjust quality, or downscale the image.',
    component: 'banner',
    severity: 'warning',
    retryable: true,
    suggestedRetry: { quality: 70 },
  },
  E_CORRUPT_HEADER: {
    title: 'File appears corrupted',
    message: 'The file header does not match any known image format.',
    fix: 'Re-download the file, or try a different one.',
    component: 'card',
    severity: 'error',
    retryable: false,
  },
  E_CROP_EMPTY: {
    title: 'Crop resulted in an empty image',
    message: 'The crop coordinates produced a 0×0 result.',
    fix: 'Adjust the crop area coordinates.',
    component: 'toast',
    severity: 'error',
    retryable: false,
  },
  E_ALPHA_NOT_REPRESENTABLE: {
    title: 'Transparency not representable in JPEG',
    message: 'Attempted to convert an image with transparency to JPEG without specifying a background color.',
    fix: 'Supply an explicit background color (e.g. #ffffff) or choose an alpha-capable format (WebP, PNG, AVIF).',
    component: 'modal',
    severity: 'error',
    retryable: true,
    suggestedRetry: { background: '#ffffff' },
  },
  E_TARGET_LOCKED: {
    title: 'Target format locked',
    message: (ctx) => `Output format is locked to ${ctx?.targetFormat || 'the canonical format'}.`,
    fix: 'Upload without requesting another format, or use --override-lock if authorized.',
    component: 'banner',
    severity: 'warning',
    retryable: false,
  },
  E_EMPTY_INPUT: {
    title: 'Empty file',
    message: 'The supplied file contains 0 bytes.',
    fix: 'Select a valid, non-empty image file.',
    component: 'toast',
    severity: 'error',
    retryable: false,
  },
  E_CLEAN_FAILED: {
    title: 'Clean mode strip verification failed',
    message: 'Metadata or private chunks survived the stripping pipeline.',
    fix: 'Inspect file chunks using zapwebp-lens or re-save without private EXIF.',
    component: 'card',
    severity: 'error',
    retryable: false,
  },
  E_RATE_LIMIT: {
    title: 'Too many requests',
    message: 'Rate limit exceeded. Please wait a few moments before trying again.',
    fix: 'Wait a few seconds and retry.',
    component: 'banner',
    severity: 'warning',
    retryable: true,
  },
  E_NETWORK_ERROR: {
    title: 'Network request failed',
    message: 'Could not communicate with the Zapwebp conversion service.',
    fix: 'Check your network connection and retry.',
    component: 'toast',
    severity: 'error',
    retryable: true,
  },
  E_UNKNOWN: {
    title: 'Unexpected conversion failure',
    message: (ctx) => ctx?.message || 'An unexpected error occurred during image conversion.',
    fix: 'Check the browser console or report an issue on GitHub.',
    component: 'toast',
    severity: 'error',
    retryable: false,
  },
};

/**
 * Resolves an error object or code into human-friendly fields.
 * @param {string|Error} codeOrError
 * @param {Record<string, any>} [context]
 * @returns {{ code: string, title: string, message: string, fix: string, component: string, severity: string, retryable: boolean, suggestedRetry?: Record<string, any> }}
 */
function resolveError(codeOrError, context = {}) {
  let code = 'E_UNKNOWN';
  let rawMessage = '';

  if (typeof codeOrError === 'string') {
    code = codeOrError;
  } else if (codeOrError && typeof codeOrError === 'object') {
    code = codeOrError.code || (codeOrError.name && ERROR_MAP[codeOrError.name] ? codeOrError.name : 'E_UNKNOWN');
    rawMessage = codeOrError.message || '';
  }

  const definition = ERROR_MAP[code] || ERROR_MAP.E_UNKNOWN;
  const mergedContext = { message: rawMessage, ...context };

  const message = typeof definition.message === 'function'
    ? definition.message(mergedContext)
    : definition.message;

  return {
    code,
    title: definition.title,
    message,
    fix: definition.fix,
    component: definition.component,
    severity: definition.severity,
    retryable: definition.retryable,
    suggestedRetry: definition.suggestedRetry ? { ...definition.suggestedRetry } : undefined,
  };
}

/**
 * High-level helper: Automatically renders the designated UI component into the DOM.
 * Works seamlessly in client-side browser runtimes.
 * 
 * @param {string|Error} codeOrError 
 * @param {Record<string, any>} [context] 
 * @param {object} [options] 
 * @param {HTMLElement} [options.container] Custom mounting container
 * @param {function} [options.onRetry] Callback when self-correcting retry is activated
 * @param {function} [options.onDismiss] Callback when dismissed
 * @returns {any} Component instance or descriptor
 */
function showError(codeOrError, context = {}, options = {}) {
  const errorInfo = resolveError(codeOrError, context);

  // Dispatch custom DOM event for decoupled integrations (Blade, React, Vue, Svelte)
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = new CustomEvent('zap:error', {
        detail: { ...errorInfo, context, options },
        bubbles: true,
      });
      window.dispatchEvent(event);
    } catch (_) {
      // Ignore if event construction fails in non-standard test runners
    }
  }

  // If in browser DOM, dynamically instantiate the designated component
  if (typeof document !== 'undefined') {
    // Lazily require components to prevent circular imports
    const { ZapToast } = require('../components/toast');
    const { ZapBanner } = require('../components/banner');
    const { ZapModal } = require('../components/modal');
    const { ZapErrorCard } = require('../components/card');

    let instance = null;

    switch (errorInfo.component) {
      case 'modal':
        instance = new ZapModal({
          title: errorInfo.title,
          message: errorInfo.message,
          fix: errorInfo.fix,
          type: errorInfo.severity,
          code: errorInfo.code,
          retryable: errorInfo.retryable,
          suggestedRetry: errorInfo.suggestedRetry,
          onRetry: options.onRetry,
          onDismiss: options.onDismiss,
        });
        instance.show(options.container || document.body);
        break;

      case 'banner':
        instance = new ZapBanner({
          title: errorInfo.title,
          message: errorInfo.message,
          fix: errorInfo.fix,
          type: errorInfo.severity,
          code: errorInfo.code,
          retryable: errorInfo.retryable,
          suggestedRetry: errorInfo.suggestedRetry,
          onRetry: options.onRetry,
          onDismiss: options.onDismiss,
        });
        instance.mount(options.container || document.body);
        break;

      case 'card':
        instance = new ZapErrorCard({
          title: errorInfo.title,
          message: errorInfo.message,
          fix: errorInfo.fix,
          severity: errorInfo.severity,
          code: errorInfo.code,
          retryable: errorInfo.retryable,
          suggestedRetry: errorInfo.suggestedRetry,
          onRetry: options.onRetry,
          onDismiss: options.onDismiss,
        });
        instance.mount(options.container || document.body);
        break;

      case 'toast':
      default:
        instance = ZapToast.show({
          title: errorInfo.title,
          message: errorInfo.message,
          type: errorInfo.severity,
          code: errorInfo.code,
          retryable: errorInfo.retryable,
          suggestedRetry: errorInfo.suggestedRetry,
          onRetry: options.onRetry,
          onDismiss: options.onDismiss,
        });
        break;
    }

    return instance;
  }

  return errorInfo;
}

/**
 * Dismisses all active notifications and modals created by showError.
 */
function dismissAllErrors() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.zap-modal-backdrop, .zap-toast, .zap-banner').forEach((el) => {
    el.remove();
  });
}

module.exports = {
  ERROR_MAP,
  formatBytes,
  resolveError,
  showError,
  dismissAllErrors,
};
