# Changelog

All notable changes to `zapwebp` (CLI) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-04

### Removed
- Removed directory watch daemon (`zap listen`) and local Wi-Fi pairing mode.

## [1.1.0] - 2026-11-04

### Added
- Retina scale multiplier support (`--scale 1x,2x,3x`) in single and batch commands.
- Zero-trust metadata scrubbing flag `--clean`.
- Machine-readable JSON output mode (`--json`) for automated AI agent integration.
- Undo/redo journal file support for batch transformations.
- Updated canonical endpoints pointing to `https://zapwebp.vercel.app`.

### Fixed
- Fixed process exit codes and error messages when encountering corrupt images.

## [1.0.0] - 2025-11-01

### Added
- Initial stable release of `zapwebp` CLI.
- Single file and directory batch conversion commands.
- Directory watch daemon (`zap listen`).
