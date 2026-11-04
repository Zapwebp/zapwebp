'use strict';

/**
 * Shared Motion Tokens
 * Centralized motion language across Zapwebp interfaces
 */
const duration = Object.freeze({
  instant: '80ms',
  fast: '150ms',
  base: '220ms',
  slow: '380ms',
  slower: '600ms',
});

const easing = Object.freeze({
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
});

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

module.exports = {
  duration,
  easing,
  reducedMotion,
};
