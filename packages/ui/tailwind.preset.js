'use strict';

/**
 * Tailwind CSS Preset for Zapwebp Design System
 * Exports semantic color variables, typography steps, spacing, and transitions.
 */
const zapPreset = {
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          hover: 'var(--color-surface-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          dropzone: 'var(--color-border-dropzone)',
          hover: 'var(--color-border-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          bright: 'var(--color-accent-bright)',
          soft: 'var(--color-accent-soft)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        danger: 'var(--color-danger)',
        focus: 'var(--color-focus-ring)',
        dot: {
          idle: 'var(--color-dot-idle)',
          active: 'var(--color-dot-active)',
          done: 'var(--color-dot-done)',
          error: 'var(--color-dot-error)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontSize: {
        'step--1': 'var(--step--1)',
        'step-0': 'var(--step-0)',
        'step-1': 'var(--step-1)',
        'step-2': 'var(--step-2)',
        'step-3': 'var(--step-3)',
        'step-4': 'var(--step-4)',
        'step-5': 'var(--step-5)',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.2, 0, 0, 1)',
        glide: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
};

module.exports = {
  zapPreset,
};
