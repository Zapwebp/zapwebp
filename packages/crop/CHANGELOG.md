# Changelog

All notable changes to `@zapwebp/crop` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-04

### Added
- Initial stable release of `@zapwebp/crop`.
- Auto-crop support with aspect ratio evaluation (1:1, 16:9, 4:5, 3:2, 9:16, 21:9).
- Configurable gravity anchors: `center`, `top`, `bottom`, `left`, `right`, `face`, and custom normalized coordinates `{ x, y }`.
- Face detection heuristic with skin-tone clustering analysis and 500ms safety timeout fallback to `center`.
- Manual coordinate cropping supporting absolute pixel coordinates and percentage ratios with automatic boundary clamping.
- Both `cover` (crop excess) and `contain` (letterbox with custom background) fit strategies.
- Predefined crop presets (`avatar`, `thumbnail`, `banner`, `product`, `story`).
- Composable `cropTransform` for direct integration into `convertImage` and `withZapwebp` pipelines.
