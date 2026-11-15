/**
 * @zapwebp/ui Web Components Suite
 * Standard W3C Custom Elements conforming to WCAG 2.2 AA.
 * Encapsulates <zap-dropzone>, <zap-toast>, <zap-banner>, <zap-modal>, <zap-card>.
 */

(function (global) {
  'use strict';

  if (typeof window === 'undefined' || !('customElements' in window)) return;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // 1. <zap-dropzone>
  // =========================================================================
  if (!customElements.get('zap-dropzone')) {
    customElements.define(
      'zap-dropzone',
      class extends HTMLElement {
        connectedCallback() {
          if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
          if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
          if (!this.hasAttribute('aria-label')) {
            this.setAttribute('aria-label', this.getAttribute('title') || 'Drop images here to convert');
          }

          // Keyboard Enter / Space support for accessible activation
          this.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const fileInput = document.getElementById('file-input');
              if (fileInput) fileInput.click();
            }
          });
        }
      }
    );
  }

  // =========================================================================
  // 2. <zap-toast>
  // =========================================================================
  if (!customElements.get('zap-toast')) {
    customElements.define(
      'zap-toast',
      class extends HTMLElement {
        connectedCallback() {
          this.setAttribute('role', 'status');
          this.setAttribute('aria-live', 'polite');
          this.className = `toast-item toast-${this.getAttribute('type') || 'info'}`;

          const duration = Number(this.getAttribute('duration')) || 4500;
          this.timer = setTimeout(() => {
            this.dismiss();
          }, duration);
        }

        dismiss() {
          if (this.timer) clearTimeout(this.timer);
          this.classList.add('is-hiding');
          setTimeout(() => {
            if (this.parentNode) this.parentNode.removeChild(this);
          }, 200);
        }
      }
    );
  }

  // =========================================================================
  // 3. <zap-banner>
  // =========================================================================
  if (!customElements.get('zap-banner')) {
    customElements.define(
      'zap-banner',
      class extends HTMLElement {
        connectedCallback() {
          const type = this.getAttribute('type') || 'warning';
          this.setAttribute('role', type === 'error' ? 'alert' : 'region');
          if (!this.hasAttribute('aria-label')) {
            this.setAttribute('aria-label', this.getAttribute('title') || 'Notification');
          }
        }
      }
    );
  }

  // =========================================================================
  // 4. <zap-modal>
  // =========================================================================
  if (!customElements.get('zap-modal')) {
    customElements.define(
      'zap-modal',
      class extends HTMLElement {
        connectedCallback() {
          this.setAttribute('role', 'dialog');
          this.setAttribute('aria-modal', 'true');

          this.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              this.close();
            }
          });
        }

        open() {
          this.hidden = false;
          this.classList.add('is-open');
          const focusable = this.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable) focusable.focus();
        }

        close() {
          this.classList.remove('is-open');
          this.hidden = true;
          this.dispatchEvent(new CustomEvent('zap-modal-close', { bubbles: true }));
        }
      }
    );
  }

  // =========================================================================
  // 5. <zap-card>
  // =========================================================================
  if (!customElements.get('zap-card')) {
    customElements.define(
      'zap-card',
      class extends HTMLElement {
        connectedCallback() {
          if (!this.classList.contains('result-card') && !this.classList.contains('single-result-card')) {
            this.classList.add('result-card');
          }
          if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'article');
          }
        }
      }
    );
  }

  global.ZapWebComponents = {
    escapeHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
