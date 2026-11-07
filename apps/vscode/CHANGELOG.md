# Changelog

All notable changes to `zapwebp-vscode` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-07

### Added
- Multi-tier execution engine: seamless in-process conversion with automated CLI / `npx zapwebp` fallback when native Electron binaries are unavailable.
- Expanded editor context menus: right-click in editor tab or title bar to convert images.
- Full format support: added `.gif`, `.tiff`, and `.tif` support across Explorer and Editor menus.
- Automatic activation on workspace load (`onStartupFinished`) to guarantee convert-on-save watcher and status bar metrics initialize immediately.
- Active editor fallback for Command Palette execution (`zapwebp.convert` and `zapwebp.convertScales`).

### Fixed
- Fixed extension activation failure in VS Code Electron caused by missing native `sharp` and `@resvg/resvg-js` bindings.
- Fixed VSIX packaging by excluding symlinked `node_modules` and sensitive workspace files.
- Hardened path resolution on Windows environments.

## [1.1.0] - 2026-11-04

### Added
- Official deployment target switched to Open VSX Registry under the `zapwebp` namespace.
- Context menu action: "Zap to WebP (@1x, @2x, @3x)" generating retina scale variants.
- Configurable settings for `zapwebp.convertOnSave`, `zapwebp.clean`, and `zapwebp.outputExtension`.
- Updated contact email `eldrexdelosreyesbula@gmail.com` and repository URLs.

### Fixed
- Fixed transparent image conversion inside web extension contexts.

## [1.0.0] - 2025-11-01

### Added
- Initial release of Zapwebp VS Code extension.
- Single file "Zap to WebP" context menu command.
