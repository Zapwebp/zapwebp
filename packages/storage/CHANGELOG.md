# Changelog

All notable changes to `@zapwebp/storage` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-04

### Added
- Cloud adapter implementations for Supabase Storage, Firebase Storage, and Neocities.
- Pre-upload conversion pipeline preserving transparency in WebP and AVIF.
- Cascading variant deletion ensuring all `@1x`, `@2x`, `@3x` variants are cleaned up atomically.
- Updated documentation and bug report links.

## [1.0.0] - 2025-11-01

### Added
- Initial release of `@zapwebp/storage`.
- Abstract storage adapter interface.
