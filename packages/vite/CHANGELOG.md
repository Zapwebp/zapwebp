# Changelog

All notable changes to `zapwebp-vite` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-04

### Added
- Initial stable release of `zapwebp-vite`.
- Automatic build-time SVG and raster image conversion to WebP and AVIF.
- Multiplier scale generation (`scale: [1, 2, 3]`) for responsive `<picture>` and `srcset` tags.
- Generation of `zapwebp.manifest.json` asset report during `vite build`.
- Zero-trust metadata scrubbing during bundle compilation.
