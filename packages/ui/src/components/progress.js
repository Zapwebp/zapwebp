'use strict';

/**
 * ZapUploadProgress — Conversion Progress Bar Component
 * Accessible progress bar tracking total, completed, and failed conversions.
 */

class ZapUploadProgress {
  constructor({
    total = 0,
    completed = 0,
    failed = 0,
    showMeta = true,
  } = {}) {
    this.total = Number(total) || 0;
    this.completed = Number(completed) || 0;
    this.failed = Number(failed) || 0;
    this.showMeta = Boolean(showMeta);

    this.element = null;
  }

  get percentage() {
    if (this.total <= 0) return 0;
    const progress = Math.min(100, Math.round(((this.completed + this.failed) / this.total) * 100));
    return progress;
  }

  mount(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || document.body;

    const el = document.createElement('div');
    el.className = 'zap-upload-progress';
    this.element = el;
    this.render();

    container.appendChild(el);
    return this;
  }

  update({ total, completed, failed }) {
    if (total !== undefined) this.total = Number(total) || 0;
    if (completed !== undefined) this.completed = Number(completed) || 0;
    if (failed !== undefined) this.failed = Number(failed) || 0;
    this.render();
  }

  render() {
    if (!this.element) return;
    const pct = this.percentage;

    const metaHtml = this.showMeta
      ? `
      <div class="zap-upload-progress-header">
        <span class="zap-upload-progress-count">${this.completed} of ${this.total} completed ${this.failed > 0 ? `(${this.failed} failed)` : ''}</span>
        <span class="zap-upload-progress-percent">${pct}%</span>
      </div>`
      : '';

    this.element.innerHTML = `
      ${metaHtml}
      <div class="zap-upload-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="zap-upload-progress-fill" style="width: ${pct}%;"></div>
      </div>
    `;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}

/**
 * Pure HTML string renderer for ZapUploadProgress (SSR / static markup).
 */
function renderZapUploadProgress({
  total = 0,
  completed = 0,
  failed = 0,
  showMeta = true,
  className = '',
} = {}) {
  const tot = Number(total) || 0;
  const comp = Number(completed) || 0;
  const fail = Number(failed) || 0;
  const pct = tot > 0 ? Math.min(100, Math.round(((comp + fail) / tot) * 100)) : 0;

  const metaHtml = showMeta
    ? `
    <div class="zap-upload-progress-header">
      <span class="zap-upload-progress-count">${comp} of ${tot} completed ${fail > 0 ? `(${fail} failed)` : ''}</span>
      <span class="zap-upload-progress-percent">${pct}%</span>
    </div>`
    : '';

  return `
<div class="zap-upload-progress ${className}">
  ${metaHtml}
  <div class="zap-upload-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="zap-upload-progress-fill" style="width: ${pct}%;"></div>
  </div>
</div>`.trim();
}

module.exports = {
  ZapUploadProgress,
  renderZapUploadProgress,
};

