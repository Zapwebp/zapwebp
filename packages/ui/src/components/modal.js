'use strict';

/**
 * ZapModal — Blocking Dialog Component
 * Traps focus, handles Escape dismissal, and provides accessible modal interactions.
 */

class ZapModal {
  constructor({
    title = '',
    message = '',
    fix = '',
    type = 'error',
    code = '',
    retryable = false,
    suggestedRetry = null,
    onRetry = null,
    onDismiss = null,
  } = {}) {
    this.title = title;
    this.message = message;
    this.fix = fix;
    this.type = type;
    this.code = code;
    this.retryable = retryable;
    this.suggestedRetry = suggestedRetry;
    this.onRetry = onRetry;
    this.onDismiss = onDismiss;

    this.backdrop = null;
    this.previousActiveElement = null;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
  }

  show(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || document.body;

    this.previousActiveElement = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.className = 'zap-modal-backdrop';

    const modalId = `zap-modal-${Date.now()}`;
    const retryBtnHtml = this.retryable
      ? `<button type="button" class="zap-banner-btn variant-primary zap-modal-action-retry">Retry with suggested fix</button>`
      : '';
    const fixSectionHtml = this.fix
      ? `
      <div class="zap-modal-fix-box">
        <div class="zap-modal-fix-label">Recommended Fix</div>
        <div class="zap-modal-fix-text">${escapeHtml(this.fix)}</div>
      </div>`
      : '';

    backdrop.innerHTML = `
      <div class="zap-modal" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title" aria-describedby="${modalId}-desc">
        <div class="zap-modal-header">
          <div class="zap-modal-title-group">
            <h3 id="${modalId}-title" class="zap-modal-title">${escapeHtml(this.title)}</h3>
          </div>
          <button type="button" class="zap-modal-close" aria-label="Close dialog">✕</button>
        </div>
        <div class="zap-modal-body" id="${modalId}-desc">
          <div class="zap-modal-text">${escapeHtml(this.message)}</div>
          ${fixSectionHtml}
        </div>
        <div class="zap-modal-actions">
          ${retryBtnHtml}
          <button type="button" class="zap-banner-btn zap-modal-action-ok">Dismiss</button>
        </div>
      </div>
    `;

    // Event listeners
    backdrop.querySelector('.zap-modal-close')?.addEventListener('click', () => this.close());
    backdrop.querySelector('.zap-modal-action-ok')?.addEventListener('click', () => this.close());

    const retryBtn = backdrop.querySelector('.zap-modal-action-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (typeof this.onRetry === 'function') {
          this.onRetry(this.suggestedRetry);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zap:retry', { detail: { code: this.code, suggested: this.suggestedRetry } }));
        }
        this.close();
      });
    }

    // Click outside backdrop to close
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.close();
      }
    });

    container.appendChild(backdrop);
    this.backdrop = backdrop;

    // Trigger open animation
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      const focusTarget = backdrop.querySelector('.zap-modal-action-retry') || backdrop.querySelector('.zap-modal-action-ok');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      }
    });

    window.addEventListener('keydown', this.boundKeyHandler);
    return this;
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  }

  trapFocus(e) {
    if (!this.backdrop) return;
    const focusable = this.backdrop.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  close() {
    if (!this.backdrop) return;
    window.removeEventListener('keydown', this.boundKeyHandler);

    this.backdrop.classList.remove('is-open');
    setTimeout(() => {
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      this.backdrop = null;

      // Restore focus
      if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
        this.previousActiveElement.focus();
      }

      if (typeof this.onDismiss === 'function') {
        this.onDismiss();
      }
    }, 160);
  }
}

/**
 * Pure HTML string renderer for ZapModal (SSR / static markup).
 */
function renderZapModal({
  title = '',
  message = '',
  fix = '',
  id = 'zap-modal',
  open = true,
  className = '',
} = {}) {
  const fixSectionHtml = fix
    ? `
    <div class="zap-modal-fix-box">
      <div class="zap-modal-fix-label">Recommended Fix</div>
      <div class="zap-modal-fix-text">${escapeHtml(fix)}</div>
    </div>`
    : '';

  return `
<div class="zap-modal-backdrop ${open ? 'is-open' : ''} ${className}">
  <div class="zap-modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-desc">
    <div class="zap-modal-header">
      <h3 id="${id}-title" class="zap-modal-title">${escapeHtml(title)}</h3>
      <button type="button" class="zap-modal-close" aria-label="Close dialog">✕</button>
    </div>
    <div class="zap-modal-body" id="${id}-desc">
      <div class="zap-modal-text">${escapeHtml(message)}</div>
      ${fixSectionHtml}
    </div>
    <div class="zap-modal-actions">
      <button type="button" class="zap-banner-btn zap-modal-action-ok">Dismiss</button>
    </div>
  </div>
</div>`.trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  ZapModal,
  renderZapModal,
};

