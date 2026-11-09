# Changelog

All notable changes to `zapwebp-vscode` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-11-09

### Fixed
- Fixed Windows execution failure where `zap.cmd` was not recognized in PATH by replacing shell `.cmd` invocation with bundled self-contained CLI runner (`dist/zap.js`).
- Implemented robust multi-tier fallback: direct in-process core conversion &rarr; bundled CLI via system Node &rarr; `cmd.exe /c zap` &rarr; `cmd.exe /c npx --yes zapwebp`.

## [1.2.0] - 2026-11-07

### Added
- Complete multi-format conversion commands: `Zap to PNG` (`zapwebp.convertToPng`), `Zap to AVIF` (`zapwebp.convertToAvif`), `Zap to JPEG` (`zapwebp.convertToJpeg`), and `Zap to Any Format...` (`zapwebp.convertPrompt`).
- Dedicated `Zap Image To...` submenu in Explorer context menu, Editor context menu, and Editor tab title menu.
- Interactive multi-scale format prompt (`zapwebp.convertScalesPrompt`) for generating retina scale variants in WebP, PNG, or AVIF.
- Background flattening prompt on JPEG conversion (defaulting to `#ffffff`) to strictly prevent accidental black background artifacts on transparent inputs.
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
