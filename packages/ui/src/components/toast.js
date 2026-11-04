'use strict';

/**
 * ZapToast — Ephemeral Notification Component
 * Bottom-right or top-right notification that auto-dismisses with accessible alerts.
 */

let toastContainers = {};

function getContainer(position = 'bottom-right') {
  if (typeof document === 'undefined') return null;
  const key = `pos-${position}`;
  if (!toastContainers[key] || !document.body.contains(toastContainers[key])) {
    const el = document.createElement('div');
    el.className = `zap-toast-container ${key}`;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
    toastContainers[key] = el;
  }
  return toastContainers[key];
}

class ZapToast {
  constructor({
    title = '',
    message = '',
    type = 'info',
    duration = 4000,
    dismissible = true,
    position = 'bottom-right',
    code = '',
    retryable = false,
    suggestedRetry = null,
    onRetry = null,
    onDismiss = null,
  } = {}) {
    this.title = title;
    this.message = message;
    this.type = type;
    this.duration = duration;
    this.dismissible = dismissible;
    this.position = position;
    this.code = code;
    this.retryable = retryable;
    this.suggestedRetry = suggestedRetry;
    this.onRetry = onRetry;
    this.onDismiss = onDismiss;

    this.element = null;
    this.timer = null;
  }

  mount(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || getContainer(this.position);
    if (!container) return this;

    const el = document.createElement('div');
    el.className = `zap-toast type-${this.type} is-entering`;
    el.setAttribute('role', this.type === 'error' ? 'alert' : 'status');

    const iconSvg = this.getIconSvg();
    const retryBtnHtml = this.retryable
      ? `<button type="button" class="zap-banner-btn variant-primary zap-toast-retry-btn" style="margin-top:6px;padding:3px 8px;font-size:11px;">Retry</button>`
      : '';
    const dismissHtml = this.dismissible
      ? `<button type="button" class="zap-toast-dismiss" aria-label="Dismiss notification">✕</button>`
      : '';

    el.innerHTML = `
      <div class="zap-toast-icon" aria-hidden="true">${iconSvg}</div>
      <div class="zap-toast-content">
        ${this.title ? `<div class="zap-toast-title">${escapeHtml(this.title)}</div>` : ''}
        <div class="zap-toast-msg">${escapeHtml(this.message)}</div>
        ${retryBtnHtml}
      </div>
      ${dismissHtml}
    `;

    // Dismiss button
    const dismissBtn = el.querySelector('.zap-toast-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss());
    }

    // Retry button
    const retryBtn = el.querySelector('.zap-toast-retry-btn');
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

    // Trigger entrance animation
    requestAnimationFrame(() => {
      el.classList.remove('is-entering');
    });

    // Auto dismiss
    if (this.duration > 0) {
      this.timer = setTimeout(() => {
        this.dismiss();
      }, this.duration);
    }

    return this;
  }

  dismiss() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.element) return;

    this.element.classList.add('is-leaving');
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.element = null;
      if (typeof this.onDismiss === 'function') {
        this.onDismiss();
      }
    }, 180);
  }

  getIconSvg() {
    switch (this.type) {
      case 'success':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--zap-success)" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      case 'error':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--zap-error)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      case 'warning':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--zap-warning)" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      case 'info':
      default:
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--zap-info)" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  }

  static show(options) {
    const toast = new ZapToast(options);
    toast.mount();
    return toast;
  }

  static success(message, options = {}) {
    return ZapToast.show({ message, type: 'success', ...options });
  }

  static error(message, options = {}) {
    return ZapToast.show({ message, type: 'error', ...options });
  }

  static warning(message, options = {}) {
    return ZapToast.show({ message, type: 'warning', ...options });
  }

  static info(message, options = {}) {
    return ZapToast.show({ message, type: 'info', ...options });
  }
}

/**
 * Pure HTML string renderer for ZapToast (SSR / static markup).
 */
function renderZapToast({
  title = '',
  message = '',
  type = 'info',
  dismissible = true,
  className = '',
} = {}) {
  const dismissHtml = dismissible
    ? `<button type="button" class="zap-toast-dismiss" aria-label="Dismiss notification">✕</button>`
    : '';
  const titleHtml = title ? `<div class="zap-toast-title">${escapeHtml(title)}</div>` : '';
  const role = type === 'error' ? 'alert' : 'status';

  return `
<div class="zap-toast type-${type} ${className}" role="${role}">
  <div class="zap-toast-content">
    ${titleHtml}
    <div class="zap-toast-msg">${escapeHtml(message)}</div>
  </div>
  ${dismissHtml}
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
  ZapToast,
  renderZapToast,
};

