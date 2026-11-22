'use strict';

const { ZapToast } = require('./toast');
const { ZapBanner } = require('./banner');
const { ZapModal } = require('./modal');
const { ZapErrorCard } = require('./card');
const { ZapDropzone } = require('./dropzone');
const { ZapUploadButton } = require('./button');
const { ZapUploadProgress } = require('./progress');
const { ZapFormatSelector } = require('./format-selector');
const { ZapQualitySlider } = require('./quality-slider');
const { ZapDiffViewer } = require('./diff-viewer');
const { ZapFileCard } = require('./result-card');
const { ZapBatchBar } = require('./batch-bar');
const { resolveError } = require('../errors');

function defineCustomElements() {
  if (typeof window === 'undefined' || !('customElements' in window)) return;

  // 1. <zap-toast>
  if (!customElements.get('zap-toast')) {
    customElements.define('zap-toast', class extends HTMLElement {
      connectedCallback() {
        if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
        if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
        if (this.children.length > 0) return;

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
        if (!this.hasAttribute('role')) this.setAttribute('role', type === 'error' ? 'alert' : 'region');
        if (this.children.length > 0) return;

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
        if (!this.hasAttribute('role')) this.setAttribute('role', 'dialog');
        if (!this.hasAttribute('aria-modal')) this.setAttribute('aria-modal', 'true');
        if (this.children.length > 0) return;

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

  // 4. <zap-card> & <zap-error-card>
  const ZapCardElement = class extends HTMLElement {
    connectedCallback() {
      const code = this.getAttribute('code');
      if (code) {
        let title = this.getAttribute('title') || '';
        let message = this.textContent?.trim() || '';
        let fix = this.getAttribute('fix') || '';
        let severity = this.getAttribute('severity') || 'error';

        const err = resolveError(code);
        title = title || err.title;
        message = message || err.message;
        fix = fix || err.fix;
        severity = severity || err.severity;

        const card = new ZapErrorCard({
          title,
          message,
          fix,
          code,
          severity,
        });
        card.mount(this);
      }
    }
  };

  if (!customElements.get('zap-card')) {
    customElements.define('zap-card', ZapCardElement);
  }
  if (!customElements.get('zap-error-card')) {
    customElements.define('zap-error-card', class extends ZapCardElement {});
  }

  // 5. <zap-dropzone>
  if (!customElements.get('zap-dropzone')) {
    customElements.define('zap-dropzone', class extends HTMLElement {
      connectedCallback() {
        if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        if (!this.hasAttribute('aria-label')) {
          this.setAttribute('aria-label', this.getAttribute('title') || 'Drop images here to convert');
        }

        if (this.children.length > 0) {
          // Keyboard activation for pre-existing inline child structure
          this.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const fileInput = document.getElementById('file-input');
              if (fileInput) fileInput.click();
            }
          });
          return;
        }

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

  // 8. <zap-format-selector>
  if (!customElements.get('zap-format-selector')) {
    customElements.define('zap-format-selector', class extends HTMLElement {
      connectedCallback() {
        const selected = this.getAttribute('selected') || 'webp';
        const showBadges = this.hasAttribute('show-badges');
        const selector = new ZapFormatSelector({
          selected,
          showBadges,
        });
        selector.mount(this);
      }
    });
  }

  // 9. <zap-quality-slider>
  if (!customElements.get('zap-quality-slider')) {
    customElements.define('zap-quality-slider', class extends HTMLElement {
      connectedCallback() {
        const value = Number(this.getAttribute('value')) || 85;
        const min = Number(this.getAttribute('min')) || 1;
        const max = Number(this.getAttribute('max')) || 100;
        const label = this.getAttribute('label') || 'Quality';

        const slider = new ZapQualitySlider({
          value,
          min,
          max,
          label,
        });
        slider.mount(this);
      }
    });
  }

  // 10. <zap-diff-viewer>
  if (!customElements.get('zap-diff-viewer')) {
    customElements.define('zap-diff-viewer', class extends HTMLElement {
      connectedCallback() {
        const beforeSrc = this.getAttribute('before-src') || '';
        const afterSrc = this.getAttribute('after-src') || '';
        const mode = this.getAttribute('mode') || 'split';
        const splitPercent = Number(this.getAttribute('split-percent')) || 50;

        const viewer = new ZapDiffViewer({
          beforeSrc,
          afterSrc,
          mode,
          splitPercent,
        });
        viewer.mount(this);
      }
    });
  }

  // 11. <zap-file-card>
  if (!customElements.get('zap-file-card')) {
    customElements.define('zap-file-card', class extends HTMLElement {
      connectedCallback() {
        const filename = this.getAttribute('filename') || 'image.png';
        const originalSize = this.getAttribute('original-size') || '0 B';
        const outputSize = this.getAttribute('output-size') || '0 B';
        const savingsPct = Number(this.getAttribute('savings-pct')) || 0;
        const format = this.getAttribute('format') || 'webp';
        const thumbnailSrc = this.getAttribute('thumbnail-src') || '';

        const card = new ZapFileCard({
          filename,
          originalSize,
          outputSize,
          savingsPct,
          format,
          thumbnailSrc,
        });
        card.mount(this);
      }
    });
  }

  // 12. <zap-batch-bar>
  if (!customElements.get('zap-batch-bar')) {
    customElements.define('zap-batch-bar', class extends HTMLElement {
      connectedCallback() {
        const fileCount = Number(this.getAttribute('file-count')) || 0;
        const totalOriginal = this.getAttribute('total-original') || '0 B';
        const totalOutput = this.getAttribute('total-output') || '0 B';
        const savingsPct = Number(this.getAttribute('savings-pct')) || 0;
        const format = this.getAttribute('format') || 'WEBP';
        const view = this.getAttribute('view') || 'grid';

        const bar = new ZapBatchBar({
          fileCount,
          totalOriginal,
          totalOutput,
          savingsPct,
          format,
          view,
        });
        bar.mount(this);
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

