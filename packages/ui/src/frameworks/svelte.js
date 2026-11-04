'use strict';

/**
 * @zapwebp/ui/svelte — Svelte Framework Adapter
 * Svelte action helpers and wrappers for @zapwebp/ui vanilla core.
 */

const { showError, dismissAllErrors, resolveError } = require('../errors');
const { ZapDropzone } = require('../components/dropzone');
const { ZapToast } = require('../components/toast');
const { ZapBanner } = require('../components/banner');
const { ZapModal } = require('../components/modal');
const { ZapErrorCard } = require('../components/card');
const { ZapUploadButton } = require('../components/button');
const { ZapUploadProgress } = require('../components/progress');

/**
 * Svelte Action for ZapDropzone
 * Usage: <div use:zapDropzone={{ onFiles: handleFiles }}></div>
 */
function zapDropzone(node, options = {}) {
  const instance = new ZapDropzone({
    ...options,
    onFilesSelected: (files) => {
      node.dispatchEvent(new CustomEvent('files', { detail: files }));
      if (typeof options.onFiles === 'function') {
        options.onFiles(files);
      }
    },
  });
  instance.mount(node);

  return {
    destroy() {
      instance.destroy();
    },
  };
}

module.exports = {
  zapDropzone,
  showError,
  dismissAllErrors,
  resolveError,
  ZapToast,
  ZapBanner,
  ZapModal,
  ZapErrorCard,
  ZapDropzone,
  ZapUploadButton,
  ZapUploadProgress,
};

