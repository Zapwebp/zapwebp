'use strict';

/**
 * ZapDiffViewer — Interactive Image Comparison & Diff Inspection Component
 * Provides split-slider and side-by-side comparison with alpha channel transparency checkerboard.
 */

function renderZapDiffViewer({
  beforeSrc = '',
  afterSrc = '',
  beforeLabel = 'Original',
  afterLabel = 'Converted',
  splitPercent = 50,
  mode = 'split', // 'split' | 'side-by-side'
  id = 'zap-diff-viewer',
  className = '',
} = {}) {
  if (mode === 'side-by-side') {
    const classes = ('zap-diff-viewer mode-side-by-side ' + className).trim();
    return `
      <div id="${id}" class="${classes}">
        <div class="zap-diff-panel zap-diff-before">
          <span class="zap-diff-badge">${beforeLabel}</span>
          <div class="zap-checkerboard-wrap">
            <img src="${beforeSrc}" alt="${beforeLabel}" class="zap-diff-img" />
          </div>
        </div>
        <div class="zap-diff-panel zap-diff-after">
          <span class="zap-diff-badge">${afterLabel}</span>
          <div class="zap-checkerboard-wrap">
            <img src="${afterSrc}" alt="${afterLabel}" class="zap-diff-img" />
          </div>
        </div>
      </div>
    `.trim();
  }

  const splitClasses = ('zap-diff-viewer mode-split ' + className).trim();
  return `
    <div id="${id}" class="${splitClasses}" role="region" aria-label="Image comparison viewer">
      <div class="zap-diff-stage zap-checkerboard-wrap">
        <img src="${beforeSrc}" alt="${beforeLabel}" class="zap-diff-img zap-diff-base" />
        <div class="zap-diff-overlay" style="clip-path: inset(0 0 0 ${splitPercent}%);">
          <img src="${afterSrc}" alt="${afterLabel}" class="zap-diff-img zap-diff-clipped" />
        </div>
        <div
          class="zap-diff-divider"
          style="left: ${splitPercent}%;"
          role="slider"
          aria-label="Comparison split position"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${splitPercent}"
          tabindex="0"
        >
          <div class="zap-diff-handle" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
              <polyline points="9 18 3 12 9 6"></polyline>
              <polyline points="9 18 15 12 9 6"></polyline>
              <polyline points="15 18 21 12 15 6"></polyline>
            </svg>
          </div>
        </div>
        <span class="zap-diff-badge zap-diff-badge-before">${beforeLabel}</span>
        <span class="zap-diff-badge zap-diff-badge-after">${afterLabel}</span>
      </div>
    </div>
  `.trim();
}

class ZapDiffViewer {
  constructor(options = {}) {
    this.options = {
      beforeSrc: '',
      afterSrc: '',
      beforeLabel: 'Original',
      afterLabel: 'Converted',
      splitPercent: 50,
      mode: 'split',
      id: 'zap-diff-viewer',
      className: '',
      ...options,
    };
    this.splitPercent = this.options.splitPercent;
    this.el = null;
    this.isDragging = false;
  }

  render() {
    return renderZapDiffViewer({
      ...this.options,
      splitPercent: this.splitPercent,
    });
  }

  mount(container) {
    if (!container) return;
    container.innerHTML = this.render();
    this.el = container.firstElementChild;
    this.bindEvents();
    return this;
  }

  setSplit(percent) {
    this.splitPercent = Math.max(0, Math.min(100, Number(percent)));
    if (!this.el) return;
    const overlay = this.el.querySelector('.zap-diff-overlay');
    const divider = this.el.querySelector('.zap-diff-divider');
    if (overlay) {
      overlay.style.clipPath = `inset(0 0 0 ${this.splitPercent}%)`;
    }
    if (divider) {
      divider.style.left = `${this.splitPercent}%`;
      divider.setAttribute('aria-valuenow', String(Math.round(this.splitPercent)));
    }
  }

  bindEvents() {
    if (!this.el || this.options.mode !== 'split') return;
    const stage = this.el.querySelector('.zap-diff-stage');
    const divider = this.el.querySelector('.zap-diff-divider');
    if (!stage || !divider) return;

    const onMove = (clientX) => {
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      this.setSplit(pct);
    };

    stage.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      onMove(e.clientX);
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
      if (this.isDragging) onMove(e.clientX);
    });

    const stopDragging = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    };

    stage.addEventListener('pointerup', stopDragging);
    stage.addEventListener('pointercancel', stopDragging);

    divider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSplit(this.splitPercent - 5);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSplit(this.splitPercent + 5);
      }
    });
  }
}

module.exports = {
  ZapDiffViewer,
  renderZapDiffViewer,
};
