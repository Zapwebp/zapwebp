'use strict';

/**
 * ZapErrorCard — Detailed Error Report Card Component
 * Displays code badge, error description, actionable fix, and documentation links.
 */

class ZapErrorCard {
  constructor({
    title = '',
    message = '',
    fix = '',
    code = 'E_ERROR',
    severity = 'error',
    retryable = false,
    suggestedRetry = null,
    onRetry = null,
    onDismiss = null,
  } = {}) {
    this.title = title;
    this.message = message;
    this.fix = fix;
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.suggestedRetry = suggestedRetry;
    this.onRetry = onRetry;
    this.onDismiss = onDismiss;

    this.element = null;
  }

  mount(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || document.body;

    const el = document.createElement('div');
    el.className = `zap-error-card severity-${this.severity}`;
    el.setAttribute('role', 'alert');

    const retryBtnHtml = this.retryable
      ? `<button type="button" class="zap-banner-btn variant-primary zap-card-action-retry">Retry with suggested fix</button>`
      : '';
    const fixHtml = this.fix
      ? `
      <div class="zap-error-card-fix-section">
        <div class="zap-error-card-fix-title">Fix:</div>
        <div class="zap-error-card-fix-text">${escapeHtml(this.fix)}</div>
      </div>`
      : '';

    el.innerHTML = `
      <div class="zap-error-card-header">
        <span class="zap-error-card-code">⚠️ ${escapeHtml(this.code)}</span>
      </div>
      <h3 class="zap-error-card-title">${escapeHtml(this.title)}</h3>
      <div class="zap-error-card-msg">${escapeHtml(this.message)}</div>
      ${fixHtml}
      <div class="zap-error-card-actions">
        <a href="https://zapwebp-docs.vercel.app/errors" target="_blank" rel="noopener noreferrer" class="zap-error-card-link">
          <span>Read documentation</span>
          <span aria-hidden="true">↗</span>
        </a>
        <div style="flex:1;"></div>
        ${retryBtnHtml}
        <button type="button" class="zap-banner-btn zap-card-action-dismiss">Dismiss</button>
      </div>
    `;

    // Event listeners
    el.querySelector('.zap-card-action-dismiss')?.addEventListener('click', () => this.dismiss());

    const retryBtn = el.querySelector('.zap-card-action-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (typeof this.onRetry === 'function') {
          this.onRetry(this.suggestedRetry);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zap:retry', { detail: { code: this.code, suggested: this.suggestedRetry } }));
        }
        this.dismiss();
      });
    }

    container.appendChild(el);
    this.element = el;
    return this;
  }

  dismiss() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
      if (typeof this.onDismiss === 'function') {
        this.onDismiss();
      }
    }
  }
}

/**
 * Pure HTML string renderer for ZapErrorCard (SSR / static markup).
 */
function renderZapErrorCard({
  title = '',
  message = '',
  fix = '',
  code = 'E_ERROR',
  severity = 'error',
  className = '',
} = {}) {
  const fixHtml = fix
    ? `
    <div class="zap-error-card-fix-section">
      <div class="zap-error-card-fix-title">Fix:</div>
      <div class="zap-error-card-fix-text">${escapeHtml(fix)}</div>
    </div>`
    : '';

  return `
<div class="zap-error-card severity-${severity} ${className}" role="alert">
  <div class="zap-error-card-header">
    <span class="zap-error-card-code">⚠️ ${escapeHtml(code)}</span>
  </div>
  <h3 class="zap-error-card-title">${escapeHtml(title)}</h3>
  <div class="zap-error-card-msg">${escapeHtml(message)}</div>
  ${fixHtml}
  <div class="zap-error-card-actions">
    <a href="https://zapwebp-docs.vercel.app/errors" target="_blank" rel="noopener noreferrer" class="zap-error-card-link">
      <span>Read documentation</span>
      <span aria-hidden="true">↗</span>
    </a>
    <div style="flex:1;"></div>
    <button type="button" class="zap-banner-btn">Dismiss</button>
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
  ZapErrorCard,
  renderZapErrorCard,
};

