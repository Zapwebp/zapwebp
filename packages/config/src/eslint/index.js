'use strict';

/**
 * Shared ESLint Configuration for Zapwebp
 * Enforces token discipline, downward dependency boundaries, zero hardcoded values, and KISS/SOLID principles.
 */
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
        message: 'Never hardcode colors. Use design tokens from @zapwebp/ui.',
      },
      {
        selector: "Literal[value=/^https?:\\/\\//]",
        message: 'Never hardcode URLs. Use env vars or constants from @zapwebp/shared.',
      },
      {
        selector: "Literal[value=/^(512|1024|2048|4096|85|7777|30000)$/]",
        message: 'Never hardcode magic numbers. Use constants from @zapwebp/shared.',
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@zapwebp/ui', '@zapwebp/features', '../../apps/*'],
            message: 'Dependencies point down only: Core cannot import UI or Features.',
          },
        ],
      },
    ],
    complexity: ['warn', 10],
    'max-lines-per-function': ['warn', 80],
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
};
