'use strict';

/**
 * ZapDropzone — Interactive Drag-and-Drop, Paste & File Picker Component
 * Supports dragover states, Ctrl+V clipboard paste, and keyboard activation.
 */

class ZapDropzone {
  constructor({
    accept = 'image/*',
    maxBytes = 5242880,
    multiple = true,
    title = 'Drop images here, or browse',
    hint = 'Supports SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF up to 5 MB',
    onFilesSelected = null,
  } = {}) {
    this.accept = accept;
    this.maxBytes = maxBytes;
    this.multiple = multiple;
    this.title = title;
    this.hint = hint;
    this.onFilesSelected = onFilesSelected;

    this.element = null;
    this.inputElement = null;
    this.boundPasteHandler = this.handlePaste.bind(this);
  }

  mount(targetContainer) {
    if (typeof document === 'undefined') return this;
    const container = targetContainer || document.body;

    const el = document.createElement('div');
    el.className = 'zap-dropzone';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', this.title);

    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'zap-dropzone-input';
    input.accept = this.accept;
    input.multiple = Boolean(this.multiple);
    input.setAttribute('tabindex', '-1');

    el.innerHTML = `
      <div class="zap-dropzone-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      </div>
      <div class="zap-dropzone-title">${escapeHtml(this.title)}</div>
      <div class="zap-dropzone-hint">${escapeHtml(this.hint)}</div>
    `;

    el.appendChild(input);

    // Click triggers file input
    el.addEventListener('click', (e) => {
      if (e.target !== input) {
        input.click();
      }
    });

    // Keyboard activation (Enter / Space)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    // File input change
    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        this.emitFiles(Array.from(input.files));
        input.value = '';
      }
    });

    // Drag and drop handlers
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('is-dragging');
    });

    el.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('is-dragging');
    });

    el.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('is-dragging');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('is-dragging');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.emitFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Window paste listener
    window.addEventListener('paste', this.boundPasteHandler);

    container.appendChild(el);
    this.element = el;
    this.inputElement = input;
    return this;
  }

  handlePaste(e) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const files = [];
    for (const item of e.clipboardData.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      this.emitFiles(files);
    }
  }

  emitFiles(files) {
    if (typeof this.onFilesSelected === 'function') {
      this.onFilesSelected(files);
    }
    if (this.element) {
      this.element.dispatchEvent(
        new CustomEvent('files-selected', {
          detail: { files },
          bubbles: true,
        })
      );
      this.element.dispatchEvent(
        new CustomEvent('files', {
          detail: files,
          bubbles: true,
        })
      );
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', this.boundPasteHandler);
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}

/**
 * Pure HTML string renderer for ZapDropzone (SSR / static markup).
 */
function renderZapDropzone({
  accept = 'image/*',
  multiple = true,
  title = 'Drop images here, or browse',
  hint = 'Supports SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF up to 5 MB',
  className = '',
} = {}) {
  const multiAttr = multiple ? ' multiple' : '';
  return `
<div class="zap-dropzone ${className}" role="button" tabindex="0" aria-label="${escapeHtml(title)}">
  <div class="zap-dropzone-icon" aria-hidden="true">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  </div>
  <div class="zap-dropzone-title">${escapeHtml(title)}</div>
  <div class="zap-dropzone-hint">${escapeHtml(hint)}</div>
  <input type="file" class="zap-dropzone-input" accept="${escapeHtml(accept)}"${multiAttr} tabindex="-1" />
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
  ZapDropzone,
  renderZapDropzone,
};

