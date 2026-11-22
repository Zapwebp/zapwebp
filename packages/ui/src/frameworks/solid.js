'use strict';

/**
 * @zapwebp/ui/solid — Solid.js Framework Adapter
 * Lightweight reactive wrapper connecting Solid components to @zapwebp/ui vanilla core.
 */

const { showError, dismissAllErrors, resolveError } = require('../errors');
const { ZapToast: VanillaToast } = require('../components/toast');
const { ZapBanner: VanillaBanner } = require('../components/banner');
const { ZapModal: VanillaModal } = require('../components/modal');
const { ZapErrorCard: VanillaErrorCard } = require('../components/card');
const { ZapDropzone: VanillaDropzone } = require('../components/dropzone');
const { ZapUploadButton: VanillaUploadButton } = require('../components/button');
const { ZapUploadProgress: VanillaProgress } = require('../components/progress');
const { ZapFormatSelector: VanillaFormatSelector } = require('../components/format-selector');
const { ZapQualitySlider: VanillaQualitySlider } = require('../components/quality-slider');
const { ZapDiffViewer: VanillaDiffViewer } = require('../components/diff-viewer');
const { ZapFileCard: VanillaFileCard } = require('../components/result-card');
const { ZapBatchBar: VanillaBatchBar } = require('../components/batch-bar');
const { useZapStore } = require('../state');

/**
 * useZapError hook for Solid.js
 */
function useZapError() {
  return {
    showError: (codeOrError, context = {}, options = {}) => showError(codeOrError, context, options),
    dismissAll: () => dismissAllErrors(),
    resolveError: (code, context) => resolveError(code, context),
  };
}

/**
 * Helper to mount a vanilla component inside a Solid element ref
 */
function createSolidWrapper(VanillaClass, defaultProps = {}) {
  return function SolidComponent(props = {}) {
    const merged = { ...defaultProps, ...props };
    return {
      t: 'div',
      ref: (el) => {
        if (!el) return;
        el.replaceChildren();
        const instance = new VanillaClass(merged);
        instance.mount(el);
      },
      props: merged,
    };
  };
}

module.exports = {
  useZapError,
  useZapStore,
  showError,
  dismissAllErrors,
  ZapToast: createSolidWrapper(VanillaToast),
  ZapBanner: createSolidWrapper(VanillaBanner),
  ZapModal: createSolidWrapper(VanillaModal),
  ZapErrorCard: createSolidWrapper(VanillaErrorCard),
  ZapDropzone: createSolidWrapper(VanillaDropzone),
  ZapUploadButton: createSolidWrapper(VanillaUploadButton),
  ZapUploadProgress: createSolidWrapper(VanillaProgress),
  ZapFormatSelector: createSolidWrapper(VanillaFormatSelector),
  ZapQualitySlider: createSolidWrapper(VanillaQualitySlider),
  ZapDiffViewer: createSolidWrapper(VanillaDiffViewer),
  ZapFileCard: createSolidWrapper(VanillaFileCard),
  ZapBatchBar: createSolidWrapper(VanillaBatchBar),
};
