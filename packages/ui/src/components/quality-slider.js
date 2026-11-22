'use strict';

/**
 * ZapQualitySlider — Accessible Quality Control Slider
 * Range slider with live percentage readout, touch responsiveness, and lossless indicator badge.
 */

function renderZapQualitySlider({
  value = 85,
  min = 1,
  max = 100,
  step = 1,
  id = 'zap-quality-slider',
  label = 'Quality',
  className = '',
  showLosslessBadge = true,
  disabled = false,
} = {}) {
  const isLossless = Number(value) >= 100;
  const badgeHtml = showLosslessBadge && isLossless ? '<span class="zap-quality-badge-lossless">Lossless</span>' : '';
  const disabledAttr = disabled ? ' disabled' : '';

  const classes = ('zap-quality-slider-wrap ' + className).trim();

  return `
    <div class="${classes}">
      <div class="zap-quality-header">
        <label for="${id}" class="zap-quality-label">${label}</label>
        <div class="zap-quality-readout-wrap">
          <span class="zap-quality-value" id="${id}-val">${value}%</span>
          ${badgeHtml}
        </div>
      </div>
      <div class="zap-slider-track-wrap">
        <input
          type="range"
          id="${id}"
          class="zap-quality-range-input"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
          aria-label="${label}"
          aria-valuemin="${min}"
          aria-valuemax="${max}"
          aria-valuenow="${value}"
          aria-valuetext="${isLossless ? '100% Lossless' : `${value}%`}"${disabledAttr}
        />
      </div>
    </div>
  `.trim();
}

class ZapQualitySlider {
  constructor(options = {}) {
    this.options = {
      value: 85,
      min: 1,
      max: 100,
      step: 1,
      id: 'zap-quality-slider',
      label: 'Quality',
      className: '',
      showLosslessBadge: true,
      disabled: false,
      onChange: null,
      ...options,
    };
    this.value = Number(this.options.value);
    this.el = null;
    this.input = null;
    this.readout = null;
  }

  render() {
    return renderZapQualitySlider({
      ...this.options,
      value: this.value,
    });
  }

  mount(container) {
    if (!container) return;
    container.innerHTML = this.render();
    this.el = container.firstElementChild;
    this.input = this.el.querySelector('.zap-quality-range-input');
    this.readout = this.el.querySelector('.zap-quality-value');
    this.bindEvents();
    return this;
  }

  setValue(val) {
    this.value = Math.max(this.options.min, Math.min(this.options.max, Number(val)));
    if (this.input) {
      this.input.value = String(this.value);
      this.input.setAttribute('aria-valuenow', String(this.value));
      this.input.setAttribute('aria-valuetext', this.value >= 100 ? '100% Lossless' : `${this.value}%`);
    }
    if (this.readout) {
      this.readout.textContent = `${this.value}%`;
    }

    const header = this.el?.querySelector('.zap-quality-readout-wrap');
    if (header && this.options.showLosslessBadge) {
      const existingBadge = header.querySelector('.zap-quality-badge-lossless');
      if (this.value >= 100 && !existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'zap-quality-badge-lossless';
        badge.textContent = 'Lossless';
        header.appendChild(badge);
      } else if (this.value < 100 && existingBadge) {
        existingBadge.remove();
      }
    }

    if (typeof this.options.onChange === 'function') {
      this.options.onChange(this.value);
    }
  }

  bindEvents() {
    if (!this.input) return;
    this.input.addEventListener('input', (e) => {
      this.setValue(e.target.value);
    });
  }
}

module.exports = {
  ZapQualitySlider,
  renderZapQualitySlider,
};
