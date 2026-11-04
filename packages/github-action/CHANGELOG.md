# Changelog

All notable changes to `zapwebp-github-action` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-04

### Added
- Initial stable release of `zapwebp-github-action`.
- Automated Git commit and PR inspection for uncompressed or non-WebP/AVIF images.
- CI gate option `fail-on-regression: true` enforcing image payload budgets.
- Automated PR bot comments summarizing bytes saved and transparency verification results.
