'use strict';

const { ZapToast } = require('./toast');
const { ZapBanner } = require('./banner');
const { ZapModal } = require('./modal');
const { ZapErrorCard } = require('./card');
const { ZapDropzone } = require('./dropzone');
const { ZapUploadButton } = require('./button');
const { ZapUploadProgress } = require('./progress');
const { resolveError } = require('../errors');

function defineCustomElements() {
  if (typeof window === 'undefined' || !('customElements' in window)) return;

  // 1. <zap-toast>
  if (!customElements.get('zap-toast')) {
    customElements.define('zap-toast', class extends HTMLElement {
      connectedCallback() {
        const type = this.getAttribute('type') || 'info';
        const code = this.getAttribute('code');
        let title = this.getAttribute('title') || '';
        let message = this.textContent?.trim() || '';

        if (code) {
          const err = resolveError(code);
          title = title || err.title;
          message = message || err.message;
        }

        const duration = this.hasAttribute('duration') ? Number(this.getAttribute('duration')) : 4000;
        const toast = new ZapToast({
          title,
          message,
          type,
          duration,
          dismissible: this.getAttribute('dismissible') !== 'false',
          code: code || '',
        });
        toast.mount(this);
      }
    });
  }

  // 2. <zap-banner>
  if (!customElements.get('zap-banner')) {
    customElements.define('zap-banner', class extends HTMLElement {
      connectedCallback() {
        const type = this.getAttribute('type') || 'warning';
        const code = this.getAttribute('code');
        const actions = this.getAttribute('actions') || 'dismiss';
        let title = this.getAttribute('title') || '';
        let message = this.textContent?.trim() || '';
        let fix = this.getAttribute('fix') || '';

        if (code) {
          const err = resolveError(code);
          title = title || err.title;
          message = message || err.message;
          fix = fix || err.fix;
        }

        const banner = new ZapBanner({
          title,
          message,
          fix,
          type,
          position: this.getAttribute('position') || 'inline',
          layout: this.getAttribute('layout') || 'horizontal',
          actions,
          code: code || '',
        });
        banner.mount(this);
      }
    });
  }

  // 3. <zap-modal>
  if (!customElements.get('zap-modal')) {
    customElements.define('zap-modal', class extends HTMLElement {
      connectedCallback() {
        const type = this.getAttribute('type') || 'error';
        const code = this.getAttribute('code');
        let title = this.getAttribute('title') || '';
        let message = this.textContent?.trim() || '';
        let fix = this.getAttribute('fix') || '';

        if (code) {
          const err = resolveError(code);
          title = title || err.title;
          message = message || err.message;
          fix = fix || err.fix;
        }

        const modal = new ZapModal({
          title,
          message,
          fix,
          type,
          code: code || '',
        });
        if (this.hasAttribute('open')) {
          modal.show(this);
        }
      }
    });
  }

  // 4. <zap-error-card>
  if (!customElements.get('zap-error-card')) {
    customElements.define('zap-error-card', class extends HTMLElement {
      connectedCallback() {
        const code = this.getAttribute('code') || 'E_ERROR';
        let title = this.getAttribute('title') || '';
        let message = this.textContent?.trim() || '';
        let fix = this.getAttribute('fix') || '';
        let severity = this.getAttribute('severity') || 'error';

        if (code) {
          const err = resolveError(code);
          title = title || err.title;
          message = message || err.message;
          fix = fix || err.fix;
          severity = severity || err.severity;
        }

        const card = new ZapErrorCard({
          title,
          message,
          fix,
          code,
          severity,
        });
        card.mount(this);
      }
    });
  }

  // 5. <zap-dropzone>
  if (!customElements.get('zap-dropzone')) {
    customElements.define('zap-dropzone', class extends HTMLElement {
      connectedCallback() {
        const accept = this.getAttribute('accept') || 'image/*';
        const maxBytes = Number(this.getAttribute('max-bytes')) || 5242880;
        const multiple = this.getAttribute('multiple') !== 'false';
        const title = this.getAttribute('title') || 'Drop images here, or browse';
        const hint = this.getAttribute('hint') || 'Supports SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF up to 5 MB';

        const dz = new ZapDropzone({
          accept,
          maxBytes,
          multiple,
          title,
          hint,
          onFilesSelected: (files) => {
            const callbackName = this.getAttribute('on-files-selected');
            if (callbackName && typeof window[callbackName] === 'function') {
              window[callbackName](files);
            }
          },
        });
        dz.mount(this);
      }
    });
  }

  // 6. <zap-upload-button>
  if (!customElements.get('zap-upload-button')) {
    customElements.define('zap-upload-button', class extends HTMLElement {
      connectedCallback() {
        const label = this.textContent?.trim() || 'Upload Images';
        const accept = this.getAttribute('accept') || 'image/*';
        const multiple = this.getAttribute('multiple') !== 'false';

        const btn = new ZapUploadButton({
          label,
          accept,
          multiple,
        });
        btn.mount(this);
      }
    });
  }

  // 7. <zap-upload-progress>
  if (!customElements.get('zap-upload-progress')) {
    customElements.define('zap-upload-progress', class extends HTMLElement {
      connectedCallback() {
        const total = Number(this.getAttribute('total')) || 0;
        const completed = Number(this.getAttribute('completed')) || 0;
        const failed = Number(this.getAttribute('failed')) || 0;

        const prog = new ZapUploadProgress({
          total,
          completed,
          failed,
        });
        prog.mount(this);
      }
    });
  }
}

// Auto-register in browser environment
if (typeof window !== 'undefined') {
  defineCustomElements();
}

module.exports = {
  defineCustomElements,
};

