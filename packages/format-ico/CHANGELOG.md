# Changelog

All notable changes to `@zapwebp/format-ico` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-15

### Added
- High-resolution multi-size ICO/CUR format handler implementing `@zapwebp/plugin-sdk` `FormatHandler` and `definePlugin`.
- Robust binary container parser (`parseIco`) extracting embedded PNGs and legacy BMP DIBs (32-bit ARGB, 24-bit BGR, 8/4/1 bpp palletized with AND transparency masks).
- High-resolution ICO container builder (`encodeIco`) with default resolutions `[16, 32, 48, 64, 128, 256]` preserving 8-bit alpha channels.
- Comprehensive Favicon Suite generator (`generateFaviconSuite`) producing `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-32x32.png`, `favicon-16x16.png`, W3C `site.webmanifest`, and HTML link snippets.
- Standalone CLI executable `zapwebp-favicon` supporting custom sizes, path prefixes, HTML exports, and machine-readable `--json` output.
- Full TypeScript declarations (`src/index.d.ts`) and AI agent manifest (`agent.json`).
