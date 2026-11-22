'use strict';

/**
 * @zapwebp/ui/astro — Astro Framework Adapter
 * Zero-JS SSR markup and Web Component definitions for Astro sites.
 */

const { renderZapToast } = require('../components/toast');
const { renderZapBanner } = require('../components/banner');
const { renderZapModal } = require('../components/modal');
const { renderZapErrorCard } = require('../components/card');
const { renderZapDropzone } = require('../components/dropzone');
const { renderZapUploadButton } = require('../components/button');
const { renderZapUploadProgress } = require('../components/progress');
const { renderZapFormatSelector } = require('../components/format-selector');
const { renderZapQualitySlider } = require('../components/quality-slider');
const { renderZapDiffViewer } = require('../components/diff-viewer');
const { renderZapFileCard } = require('../components/result-card');
const { renderZapBatchBar } = require('../components/batch-bar');
const { defineCustomElements } = require('../components/custom-elements');

/**
 * Astro helper: renders a component as static HTML for Astro .astro files
 */
function createAstroComponent(renderFn) {
  return function AstroRenderer(props = {}) {
    return renderFn(props);
  };
}

module.exports = {
  defineCustomElements,
  ZapToast: createAstroComponent(renderZapToast),
  ZapBanner: createAstroComponent(renderZapBanner),
  ZapModal: createAstroComponent(renderZapModal),
  ZapErrorCard: createAstroComponent(renderZapErrorCard),
  ZapDropzone: createAstroComponent(renderZapDropzone),
  ZapUploadButton: createAstroComponent(renderZapUploadButton),
  ZapUploadProgress: createAstroComponent(renderZapUploadProgress),
  ZapFormatSelector: createAstroComponent(renderZapFormatSelector),
  ZapQualitySlider: createAstroComponent(renderZapQualitySlider),
  ZapDiffViewer: createAstroComponent(renderZapDiffViewer),
  ZapFileCard: createAstroComponent(renderZapFileCard),
  ZapBatchBar: createAstroComponent(renderZapBatchBar),
};
