'use strict';

/**
 * ZapFormatSelector — Accessible Format Selection Bar
 * Handles pill-based format selection with keyboard accessibility and capability badges.
 */

const DEFAULT_FORMATS = [
  { id: 'webp', label: 'WebP', badge: 'Recommended' },
  { id: 'avif', label: 'AVIF', badge: 'High Compression' },
  { id: 'png', label: 'PNG', badge: 'Lossless' },
  { id: 'jpeg', label: 'JPEG', badge: 'Universal' },
];

function renderZapFormatSelector({
  formats = DEFAULT_FORMATS,
  selected = 'webp',
  id = 'zap-format-selector',
  className = '',
  ariaLabel = 'Target image format',
  showBadges = false,
} = {}) {
  const normFormats = formats.map((f) => (typeof f === 'string' ? { id: f.toLowerCase(), label: f.toUpperCase() } : f));
  const pillsHtml = normFormats
    .map((fmt) => {
      const isSelected = fmt.id.toLowerCase() === selected.toLowerCase();
      const ariaChecked = isSelected ? 'true' : 'false';
      const activeClass = isSelected ? ' is-active' : '';
      const badgeHtml = showBadges && fmt.badge ? `<span class="zap-fmt-badge">${fmt.badge}</span>` : '';
      const disabledAttr = fmt.disabled ? ' disabled' : '';

      return `
        <button
          type="button"
          role="radio"
          class="zap-fmt-pill${activeClass}"
          data-format="${fmt.id}"
          aria-checked="${ariaChecked}"
          tabindex="${isSelected ? '0' : '-1'}"${disabledAttr}
        >
          <span class="zap-fmt-label">${fmt.label}</span>
          ${badgeHtml}
        </button>
      `.trim();
    })
    .join('\n');

  const classes = ('zap-format-selector ' + className).trim();

  return `
    <div id="${id}" class="${classes}" role="radiogroup" aria-label="${ariaLabel}">
      ${pillsHtml}
    </div>
  `.trim();
}

class ZapFormatSelector {
  constructor(options = {}) {
    this.options = {
      formats: DEFAULT_FORMATS,
      selected: 'webp',
      id: 'zap-format-selector',
      className: '',
      ariaLabel: 'Target image format',
      showBadges: false,
      onChange: null,
      ...options,
    };
    this.selected = this.options.selected;
    this.el = null;
  }

  render() {
    return renderZapFormatSelector({
      ...this.options,
      selected: this.selected,
    });
  }

  mount(container) {
    if (!container) return;
    container.innerHTML = this.render();
    this.el = container.firstElementChild;
    this.bindEvents();
    return this;
  }

  setSelected(format) {
    this.selected = format.toLowerCase();
    if (!this.el) return;
    const pills = this.el.querySelectorAll('.zap-fmt-pill');
    pills.forEach((p) => {
      const isSel = p.getAttribute('data-format') === this.selected;
      p.classList.toggle('is-active', isSel);
      p.setAttribute('aria-checked', isSel ? 'true' : 'false');
      p.setAttribute('tabindex', isSel ? '0' : '-1');
      if (isSel) p.focus();
    });
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(this.selected);
    }
  }

  bindEvents() {
    if (!this.el) return;
    const pills = Array.from(this.el.querySelectorAll('.zap-fmt-pill'));

    pills.forEach((p, idx) => {
      p.addEventListener('click', () => {
        const fmt = p.getAttribute('data-format');
        if (fmt) this.setSelected(fmt);
      });

      p.addEventListener('keydown', (e) => {
        let nextIdx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          nextIdx = (idx + 1) % pills.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          nextIdx = (idx - 1 + pills.length) % pills.length;
        }

        if (nextIdx !== -1) {
          const nextPill = pills[nextIdx];
          const fmt = nextPill.getAttribute('data-format');
          if (fmt) this.setSelected(fmt);
        }
      });
    });
  }
}

module.exports = {
  ZapFormatSelector,
  renderZapFormatSelector,
  DEFAULT_FORMATS,
};
