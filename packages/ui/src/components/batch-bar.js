'use strict';

/**
 * ZapBatchBar — Multi-File Batch Header & Action Bar
 * Responsive toolbar showing converted file count, byte savings, Download All (ZIP), and View switcher.
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderZapBatchBar({
  fileCount = 0,
  totalOriginal = '0 B',
  totalOutput = '0 B',
  savingsPct = 0,
  format = 'WEBP',
  view = 'grid', // 'grid' | 'list'
  id = 'zap-batch-bar',
  className = '',
} = {}) {
  const isNegative = savingsPct < 0;
  const savingsText = isNegative ? `+${Math.abs(savingsPct)}%` : `-${Math.abs(savingsPct)}%`;

  const classes = ('zap-batch-bar ' + className).trim();

  return `
    <div id="${id}" class="${classes}" role="toolbar" aria-label="Batch conversion actions">
      <div class="zap-batch-info-cluster">
        <span class="zap-batch-count"><strong>${fileCount}</strong> ${fileCount === 1 ? 'file' : 'files'} converted</span>
        <span class="zap-batch-dot" aria-hidden="true">·</span>
        <span class="zap-batch-flow">${escapeHtml(totalOriginal)} → ${escapeHtml(totalOutput)}</span>
        <span class="zap-batch-savings">(${savingsText})</span>
        ${format ? `<span class="zap-batch-fmt-pill">${escapeHtml(format.toUpperCase())}</span>` : ''}
      </div>
      <div class="zap-batch-actions-cluster">
        <button type="button" class="zap-batch-btn zap-batch-add" data-action="add" aria-label="Add more images">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add more</span>
        </button>
        <button type="button" class="zap-batch-btn zap-batch-download-all" data-action="download-all" aria-label="Download all converted files as ZIP">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Download all (ZIP)</span>
        </button>
        <button type="button" class="zap-batch-btn zap-batch-delete-all" data-action="delete-all" aria-label="Delete all converted files">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Delete all</span>
        </button>
        <div class="zap-view-toggle-wrap" role="group" aria-label="View format">
          <button type="button" class="zap-view-btn${view === 'grid' ? ' is-active' : ''}" data-view="grid" aria-label="Grid view" title="Grid view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
          <button type="button" class="zap-view-btn${view === 'list' ? ' is-active' : ''}" data-view="list" aria-label="List view" title="List view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </div>
  `.trim();
}

class ZapBatchBar {
  constructor(options = {}) {
    this.options = { ...options };
    this.el = null;
  }

  render() {
    return renderZapBatchBar(this.options);
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
    this.el.querySelectorAll('.zap-batch-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action && typeof this.options[action] === 'function') {
          this.options[action](e);
        }
      });
    });

    this.el.querySelectorAll('.zap-view-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        if (view && typeof this.options.onViewChange === 'function') {
          this.options.onViewChange(view, e);
        }
      });
    });
  }
}

module.exports = {
  ZapBatchBar,
  renderZapBatchBar,
};
