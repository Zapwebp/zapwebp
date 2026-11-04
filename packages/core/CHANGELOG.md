# Changelog

All notable changes to `@zapwebp/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-04

### Added
- Multi-format conversion pipelines: SVG, PNG, JPEG, WebP, AVIF, TIFF, and GIF.
- Automated zero-trust metadata scrubbing with `cleanMetadata`.
- Native alpha channel preservation assertions preventing accidental opaque black backgrounds.
- Canonical domain configuration (`https://zapwebp.vercel.app`) and maintainer contact alignment (`eldrexdelosreyesbula@gmail.com`).

### Changed
- Standardized error codes to strict machine-readable enum format (`E_UNSAFE_SVG`, `E_ALPHA_NOT_REPRESENTABLE`, `E_INPUT_TOO_LARGE`).

## [1.0.0] - 2025-11-01

### Added
- Initial stable release of `@zapwebp/core`.
- High-efficiency in-memory SVG to WebP conversion.
- Bounded memory limits and zero-telemetry execution.
