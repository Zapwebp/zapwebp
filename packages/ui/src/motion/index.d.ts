export const duration: {
  readonly instant: '80ms';
  readonly fast: '150ms';
  readonly base: '220ms';
  readonly slow: '380ms';
  readonly slower: '600ms';
};

export const easing: {
  readonly standard: 'cubic-bezier(0.2, 0, 0, 1)';
  readonly spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  readonly exit: 'cubic-bezier(0.4, 0, 1, 1)';
  readonly smooth: 'cubic-bezier(0.22, 1, 0.36, 1)';
};

export const reducedMotion: '@media (prefers-reduced-motion: reduce)';
