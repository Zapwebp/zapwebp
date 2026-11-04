'use strict';

/**
 * @zapwebp/ui/vue — Vue 3 Framework Adapter
 * Thin wrapper connecting Vue components to @zapwebp/ui vanilla core.
 */

const { showError, dismissAllErrors, resolveError } = require('../errors');
const { ZapToast: VanillaToast } = require('../components/toast');
const { ZapBanner: VanillaBanner } = require('../components/banner');
const { ZapModal: VanillaModal } = require('../components/modal');
const { ZapErrorCard: VanillaErrorCard } = require('../components/card');
const { ZapDropzone: VanillaDropzone } = require('../components/dropzone');
const { ZapUploadButton: VanillaUploadButton } = require('../components/button');
const { ZapUploadProgress: VanillaProgress } = require('../components/progress');
const { useZapStore } = require('../state');

function useZapError() {
  return {
    showError: (codeOrError, context = {}, options = {}) => showError(codeOrError, context, options),
    dismissAll: () => dismissAllErrors(),
    resolveError: (code, context) => resolveError(code, context),
  };
}

function createVueComponent(VanillaClass, name) {
  return {
    name,
    props: ['title', 'message', 'fix', 'type', 'position', 'layout', 'code', 'accept', 'multiple', 'total', 'completed', 'failed'],
    emits: ['files', 'retry', 'dismiss'],
    mounted() {
      const instance = new VanillaClass({
        ...this.$props,
        onFilesSelected: (files) => this.$emit('files', files),
        onRetry: (suggested) => this.$emit('retry', suggested),
        onDismiss: () => this.$emit('dismiss'),
      });
      instance.mount(this.$el);
      this._instance = instance;
    },
    beforeUnmount() {
      if (this._instance && typeof this._instance.destroy === 'function') {
        this._instance.destroy();
      }
    },
    template: `<div class="zap-vue-component"></div>`,
  };
}

const ZapToast = createVueComponent(VanillaToast, 'ZapToast');
const ZapBanner = createVueComponent(VanillaBanner, 'ZapBanner');
const ZapModal = createVueComponent(VanillaModal, 'ZapModal');
const ZapErrorCard = createVueComponent(VanillaErrorCard, 'ZapErrorCard');
const ZapDropzone = createVueComponent(VanillaDropzone, 'ZapDropzone');
const ZapUploadButton = createVueComponent(VanillaUploadButton, 'ZapUploadButton');
const ZapUploadProgress = createVueComponent(VanillaProgress, 'ZapUploadProgress');

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
};

