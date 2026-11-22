'use strict';

/**
 * @typedef {Object} MenuItem
 * @property {string} label
 * @property {string} target
 * @property {number[]} [multipliers]
 * @property {string} description
 * @property {boolean} [isLastUsed]
 * @property {boolean} [isRecommended]
 */

/**
 * Returns candidate target format definitions for a given source format.
 * @param {string} sourceFormat
 * @param {object} [options]
 * @param {boolean} [options.showMultipliersForPng=false]
 * @returns {MenuItem[]}
 */
function getRawMenuItems(sourceFormat, options = {}) {
  const norm = (sourceFormat || '').toLowerCase();
  const showMultipliersForPng = Boolean(options.showMultipliersForPng);

  if (norm === 'svg') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert to WebP with transparency' },
      { label: 'Zap to WebP (1x, 2x, 3x)', target: 'webp', multipliers: [1, 2, 3], description: 'Convert to WebP @1x, @2x, @3x retina variants' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert to lossless PNG with alpha' },
      { label: 'Zap to ICO', target: 'ico', description: 'Generate multi-size Windows ICO' },
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert to next-generation AVIF' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Flatten to JPEG onto solid background' },
    ];
  }

  if (norm === 'png') {
    const items = [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert PNG to WebP' },
      { label: 'Zap to ICO', target: 'ico', description: 'Generate multi-size Windows ICO' },
    ];
    if (showMultipliersForPng) {
      items.push({
        label: 'Zap to WebP (1x, 2x, 3x)',
        target: 'webp',
        multipliers: [1, 2, 3],
        description: 'Convert PNG to WebP @1x, @2x, @3x sizes',
      });
    }
    items.push(
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert PNG to AVIF' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Flatten PNG to JPEG' }
    );
    return items;
  }

  if (norm === 'jpg' || norm === 'jpeg') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert JPEG to WebP' },
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert JPEG to AVIF' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert JPEG to lossless PNG' },
    ];
  }

  if (norm === 'webp') {
    return [
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert WebP to AVIF' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert WebP to PNG' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Convert WebP to JPEG' },
    ];
  }

  if (norm === 'avif') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert AVIF to WebP' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert AVIF to PNG' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Convert AVIF to JPEG' },
    ];
  }

  if (norm === 'heic' || norm === 'heif') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert HEIC to WebP' },
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert HEIC to AVIF' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Convert HEIC to JPEG' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert HEIC to PNG' },
    ];
  }

  if (norm === 'ico') {
    return [
      { label: 'Zap to PNG', target: 'png', description: 'Extract ICO to PNG' },
      { label: 'Zap to WebP', target: 'webp', description: 'Convert ICO to WebP' },
    ];
  }

  if (norm === 'cur') {
    return [
      { label: 'Zap to PNG', target: 'png', description: 'Extract CUR to PNG' },
      { label: 'Zap to ICO', target: 'ico', description: 'Convert CUR to ICO container' },
      { label: 'Zap to WebP', target: 'webp', description: 'Convert CUR to WebP' },
    ];
  }

  if (norm === 'gif') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert GIF to WebP' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert GIF to PNG (first frame)' },
    ];
  }

  if (norm === 'tiff') {
    return [
      { label: 'Zap to WebP', target: 'webp', description: 'Convert TIFF to WebP' },
      { label: 'Zap to PNG', target: 'png', description: 'Convert TIFF to PNG' },
      { label: 'Zap to JPEG', target: 'jpeg', description: 'Convert TIFF to JPEG' },
      { label: 'Zap to AVIF', target: 'avif', description: 'Convert TIFF to AVIF' },
    ];
  }

  // Fallback for custom or unrecognized formats: list common targets not matching source
  const fallback = ['webp', 'png', 'avif', 'jpeg'].filter((t) => t !== norm);
  return fallback.map((t) => ({
    label: `Zap to ${t.toUpperCase()}`,
    target: t,
    description: `Convert ${norm.toUpperCase()} to ${t.toUpperCase()}`,
  }));
}

/**
 * Builds the context-aware menu for a detected source format with preference ranking.
 * @param {string} sourceFormat
 * @param {object} [options]
 * @param {string} [options.defaultTarget]
 * @param {string} [options.preferredTarget]
 * @param {boolean} [options.showMultipliersForPng=false]
 * @returns {MenuItem[]}
 */
function buildMenu(sourceFormat, options = {}) {
  const norm = (sourceFormat || '').toLowerCase();
  const rawItems = getRawMenuItems(norm, options);
  const preferred = (options.preferredTarget || '').toLowerCase();
  const defaultTarget = (options.defaultTarget || (norm === 'webp' ? 'avif' : (norm === 'ico' || norm === 'cur' ? 'png' : 'webp'))).toLowerCase();

  // Annotate items
  const annotated = rawItems.map((item) => {
    const isPreferred = Boolean(preferred && item.target.toLowerCase() === preferred && !item.multipliers);
    const isRecommended = Boolean(!preferred && item.target.toLowerCase() === defaultTarget && !item.multipliers);

    let label = item.label;
    let description = item.description;

    if (isPreferred) {
      label = `${item.label} (★ Last used)`;
      description = `Last used choice — ${description}`;
    } else if (isRecommended) {
      label = `${item.label} (Recommended)`;
      description = `Recommended — ${description}`;
    }

    return {
      ...item,
      label,
      description,
      isLastUsed: isPreferred,
      isRecommended,
    };
  });

  // Sort so that last used or recommended appears first
  annotated.sort((a, b) => {
    if (a.isLastUsed && !b.isLastUsed) return -1;
    if (!a.isLastUsed && b.isLastUsed) return 1;
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return 0;
  });

  return annotated;
}

module.exports = {
  buildMenu,
  getRawMenuItems,
};
