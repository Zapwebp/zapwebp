# Changelog

All notable changes to `@zapwebp/plugin-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-04

### Added
- Standardized plugin hook lifecycle (`beforeConvert`, `afterConvert`, `onError`, `onBatchComplete`).
- `createMockEngine` utility for isolated unit testing.
- `safeDecode` helper for safely parsing image headers without external dependencies.
- Updated canonical repository and documentation links.

## [1.0.0] - 2025-11-01

### Added
- Initial stable release of `@zapwebp/plugin-sdk`.
- `definePlugin` API contract.
