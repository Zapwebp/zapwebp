'use strict';

const motion = require('./motion');
const primitives = require('./primitives');
const { zapPreset } = require('../tailwind.preset');

const errors = require('./errors');
const { ZapToast, renderZapToast } = require('./components/toast');
const { ZapBanner, renderZapBanner } = require('./components/banner');
const { ZapModal, renderZapModal } = require('./components/modal');
const { ZapErrorCard, renderZapErrorCard } = require('./components/card');
const { ZapDropzone, renderZapDropzone } = require('./components/dropzone');
const { ZapUploadButton, renderZapUploadButton } = require('./components/button');
const { ZapUploadProgress, renderZapUploadProgress } = require('./components/progress');
const { ZapFormatSelector, renderZapFormatSelector } = require('./components/format-selector');
const { ZapQualitySlider, renderZapQualitySlider } = require('./components/quality-slider');
const { ZapDiffViewer, renderZapDiffViewer } = require('./components/diff-viewer');
const { ZapFileCard, renderZapFileCard } = require('./components/result-card');
const { ZapBatchBar, renderZapBatchBar } = require('./components/batch-bar');
const { defineCustomElements } = require('./components/custom-elements');
const { createZapStore, useZapStore } = require('./state');

module.exports = {
  ...motion,
  ...primitives,
  zapPreset,

  // Errors & Recovery
  ...errors,

  // UI Components
  ZapToast,
  renderZapToast,
  ZapBanner,
  renderZapBanner,
  ZapModal,
  renderZapModal,
  ZapErrorCard,
  renderZapErrorCard,
  ZapDropzone,
  renderZapDropzone,
  ZapUploadButton,
  renderZapUploadButton,
  ZapUploadProgress,
  renderZapUploadProgress,
  ZapFormatSelector,
  renderZapFormatSelector,
  ZapQualitySlider,
  renderZapQualitySlider,
  ZapDiffViewer,
  renderZapDiffViewer,
  ZapFileCard,
  renderZapFileCard,
  ZapBatchBar,
  renderZapBatchBar,

  // Custom Elements
  defineCustomElements,

  // State Management
  createZapStore,
  useZapStore,
};
