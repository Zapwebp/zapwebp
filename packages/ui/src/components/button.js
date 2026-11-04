'use strict';

/**
 * ZapUploadButton — Minimal File Picker Trigger Button Component
 */

class ZapUploadButton {
  constructor({
    label = 'Upload Images',
    accept = '.svg,.png,.jpg,.jpeg,.webp,.avif,.gif,.tiff',
    multiple = true,
    onFilesSelected = null,
  } = {}) {
    this.label = label;
    this.accept = accept;
    this.multiple = multiple;
    this.onFilesSelected = onFilesSelected;

    this.element = null;
    this.inputElement = null;
  }

  mount(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || document.body;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zap-upload-button';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <span>${escapeHtml(this.label)}</span>
    `;

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.accept = this.accept;
    input.multiple = Boolean(this.multiple);

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        const files = Array.from(input.files);
        if (typeof this.onFilesSelected === 'function') {
          this.onFilesSelected(files);
        }
        btn.dispatchEvent(
          new CustomEvent('files-selected', {
            detail: { files },
            bubbles: true,
          })
        );
        input.value = '';
      }
    });

    container.appendChild(btn);
    container.appendChild(input);

    this.element = btn;
    this.inputElement = input;
    return this;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement);
      this.inputElement = null;
    }
  }
}

/**
 * Pure HTML string renderer for ZapUploadButton (SSR / static markup).
 */
function renderZapUploadButton({
  label = 'Upload Images',
  accept = 'image/*',
  multiple = true,
  className = '',
} = {}) {
  const multiAttr = multiple ? ' multiple' : '';
  return `
<label class="zap-upload-button ${className}">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
  <span>${escapeHtml(label)}</span>
  <input type="file" style="display:none;" accept="${escapeHtml(accept)}"${multiAttr} />
</label>`.trim();
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
  ZapUploadButton,
  renderZapUploadButton,
};

