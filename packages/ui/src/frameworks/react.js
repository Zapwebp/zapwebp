'use strict';

/**
 * @zapwebp/ui/react — React & Next.js Framework Adapter
 * Thin wrapper (<100 lines) connecting React components to @zapwebp/ui vanilla core.
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
 * useZapError hook for React
 */
function useZapError() {
  return {
    showError: (codeOrError, context = {}, options = {}) => showError(codeOrError, context, options),
    dismissAll: () => dismissAllErrors(),
    resolveError: (code, context) => resolveError(code, context),
  };
}

/**
 * Helper to mount a vanilla component inside a React ref container
 */
function createReactWrapper(VanillaClass, defaultProps = {}) {
  return function ReactComponent(props = {}) {
    const merged = { ...defaultProps, ...props };
    // Renders a custom element or DOM container in SSR/client
    return {
      $$typeof: Symbol.for('react.element'),
      type: 'div',
      key: null,
      ref: (node) => {
        if (!node) return;
        node.replaceChildren();
        const instance = new VanillaClass(merged);
        instance.mount(node);
      },
      props: {
        className: `zap-react-wrapper ${merged.className || ''}`.trim(),
        ...merged,
      },
    };
  };
}

const ZapToast = createReactWrapper(VanillaToast);
const ZapBanner = createReactWrapper(VanillaBanner);
const ZapModal = createReactWrapper(VanillaModal);
const ZapErrorCard = createReactWrapper(VanillaErrorCard);
const ZapDropzone = createReactWrapper(VanillaDropzone);
const ZapUploadButton = createReactWrapper(VanillaUploadButton);
const ZapUploadProgress = createReactWrapper(VanillaProgress);
const ZapFormatSelector = createReactWrapper(VanillaFormatSelector);
const ZapQualitySlider = createReactWrapper(VanillaQualitySlider);
const ZapDiffViewer = createReactWrapper(VanillaDiffViewer);
const ZapFileCard = createReactWrapper(VanillaFileCard);
const ZapBatchBar = createReactWrapper(VanillaBatchBar);

module.exports = {
  useZapError,
  useZapStore,
  showError,
  dismissAllErrors,
  ZapToast,
  ZapBanner,
  ZapModal,
  ZapErrorCard,
  ZapDropzone,
  ZapUploadButton,
  ZapUploadProgress,
  ZapFormatSelector,
  ZapQualitySlider,
  ZapDiffViewer,
  ZapFileCard,
  ZapBatchBar,
};

