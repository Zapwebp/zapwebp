'use strict';

/**
 * ZapFileCard — Conversion Result Card Component
 * Accessible card presenting file thumbnail, byte statistics, savings badge, and action buttons.
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderZapFileCard({
  id = '',
  filename = 'image.png',
  originalSize = '0 B',
  outputSize = '0 B',
  savingsPct = 0,
  format = 'webp',
  thumbnailSrc = '',
  status = 'ready', // 'converting' | 'ready' | 'error'
  errorMessage = '',
  className = '',
} = {}) {
  const isNegative = savingsPct < 0;
  const savingsClass = isNegative ? 'is-expanded' : 'is-reduced';
  const savingsText = isNegative ? `+${Math.abs(savingsPct)}%` : `-${Math.abs(savingsPct)}%`;

  return `
    <article class="zap-file-card ${className}".trim() data-file-id="${escapeHtml(id)}">
      <div class="zap-file-thumb-wrap zap-checkerboard-wrap">
        ${
          thumbnailSrc
            ? `<img src="${escapeHtml(thumbnailSrc)}" alt="${escapeHtml(filename)}" class="zap-file-thumb" />`
            : `<div class="zap-file-thumb-fallback"><span class="zap-fmt-tag">${escapeHtml(format.toUpperCase())}</span></div>`
        }
      </div>
      <div class="zap-file-info">
        <h4 class="zap-file-name" title="${escapeHtml(filename)}">${escapeHtml(filename)}</h4>
        <div class="zap-file-meta-row">
          <span class="zap-file-sizes">${escapeHtml(originalSize)} → ${escapeHtml(outputSize)}</span>
          <span class="zap-file-savings ${savingsClass}">${savingsText}</span>
        </div>
        ${status === 'error' && errorMessage ? `<div class="zap-file-error" role="alert">${escapeHtml(errorMessage)}</div>` : ''}
      </div>
      <div class="zap-file-actions-row">
        <button type="button" class="zap-action-btn zap-action-preview" data-action="preview" aria-label="Preview ${escapeHtml(filename)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
        <button type="button" class="zap-action-btn zap-action-crop" data-action="crop" aria-label="Crop ${escapeHtml(filename)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>
        </button>
        <button type="button" class="zap-action-btn zap-action-download" data-action="download" aria-label="Download ${escapeHtml(filename)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
        <button type="button" class="zap-action-btn zap-action-delete" data-action="delete" aria-label="Delete ${escapeHtml(filename)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </article>
  `.trim();
}

class ZapFileCard {
  constructor(options = {}) {
    this.options = { ...options };
    this.el = null;
  }

  render() {
    return renderZapFileCard(this.options);
  }

  mount(container) {
    if (!container) return;
    container.innerHTML = this.render();
    this.el = container.firstElementChild;
    this.bindEvents();
    return this;
  }

  bindEvents() {
    if (!this.el) return;
    this.el.querySelectorAll('.zap-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action && typeof this.options[action] === 'function') {
          this.options[action](this.options, e);
        }
      });
    });
  }
}

module.exports = {
  ZapFileCard,
  renderZapFileCard,
};
