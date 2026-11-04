'use strict';

/**
 * ZapBanner — Persistent Inline / Sticky Banner Message Component
 * Stays visible until user dismisses or acts.
 */

class ZapBanner {
  constructor({
    title = '',
    message = '',
    fix = '',
    type = 'warning',
    position = 'inline',
    layout = 'horizontal',
    actions = ['dismiss'],
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
    this.position = position;
    this.layout = layout;
    this.actions = Array.isArray(actions)
      ? actions
      : typeof actions === 'string'
      ? actions.split(',').map((s) => s.trim())
      : ['dismiss'];
    this.code = code;
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
    el.className = `zap-banner type-${this.type} pos-${this.position} layout-${this.layout}`;
    el.setAttribute('role', this.type === 'error' ? 'alert' : 'region');
    el.setAttribute('aria-label', this.title || 'Notification Banner');

    const iconSvg = this.getIconSvg();
    const fixHtml = this.fix ? `<div class="zap-banner-fix">${escapeHtml(this.fix)}</div>` : '';

    let actionsHtml = '';
    const canRetry = this.retryable || this.actions.includes('retry');
    if (canRetry) {
      actionsHtml += `<button type="button" class="zap-banner-btn variant-primary zap-banner-action-retry">Retry</button>`;
    }
    if (this.actions.includes('dismiss')) {
      actionsHtml += `<button type="button" class="zap-banner-btn zap-banner-action-dismiss">Dismiss</button>`;
    }

    el.innerHTML = `
      <div class="zap-banner-left">
        <div class="zap-banner-icon" aria-hidden="true">${iconSvg}</div>
        <div class="zap-banner-content">
          ${this.title ? `<div class="zap-banner-title">${escapeHtml(this.title)}</div>` : ''}
          <div class="zap-banner-msg">${escapeHtml(this.message)}</div>
          ${fixHtml}
        </div>
      </div>
      ${actionsHtml ? `<div class="zap-banner-actions">${actionsHtml}</div>` : ''}
    `;

    // Event listeners
    const retryBtn = el.querySelector('.zap-banner-action-retry');
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

    const dismissBtn = el.querySelector('.zap-banner-action-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss());
    }

    if (this.position === 'top' && container.firstChild) {
      container.insertBefore(el, container.firstChild);
    } else {
      container.appendChild(el);
    }

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

  getIconSvg() {
    switch (this.type) {
      case 'success':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--zap-success)" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      case 'error':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--zap-error)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      case 'warning':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--zap-warning)" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      case 'info':
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--zap-info)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  }
}

/**
 * Pure HTML string renderer for ZapBanner (SSR / static markup).
 */
function renderZapBanner({
  title = '',
  message = '',
  fix = '',
  type = 'warning',
  position = 'inline',
  layout = 'horizontal',
  className = '',
  showActions = true,
} = {}) {
  const fixHtml = fix ? `<div class="zap-banner-fix">${escapeHtml(fix)}</div>` : '';
  const actionsHtml = showActions
    ? `<div class="zap-banner-actions"><button type="button" class="zap-banner-btn">Dismiss</button></div>`
    : '';

  return `
<div class="zap-banner type-${type} pos-${position} layout-${layout} ${className}" role="${type === 'error' ? 'alert' : 'region'}">
  <div class="zap-banner-left">
    <div class="zap-banner-content">
      ${title ? `<div class="zap-banner-title">${escapeHtml(title)}</div>` : ''}
      <div class="zap-banner-msg">${escapeHtml(message)}</div>
      ${fixHtml}
    </div>
  </div>
  ${actionsHtml}
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
  ZapBanner,
  renderZapBanner,
};

