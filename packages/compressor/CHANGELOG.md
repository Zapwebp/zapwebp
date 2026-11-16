# Changelog

All notable changes to `@zapwebp/compressor` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-16

### Added
- Initial stable release of `@zapwebp/compressor`.
- Deterministic binary search quality optimization loop capped at 8 iterations per downscale pass.
- Adaptive Lanczos3 downscaling outer loop with configurable step (default 0.9) and attempt ceiling (default 3).
- Flexible target byte parsing supporting numeric inputs and human-readable units (`B`, `KB`, `MB`, `GB`).
- First-class plugin contract integration conforming to `@zapwebp/plugin-sdk` `CompressionHandler`.
- Structured error throwing with `E_TARGET_UNREACHABLE` including `actualBytes`, `targetBytes`, `suggestedFix`, and `bestAttempt` telemetry.
- Non-throwing mode (`throwOnUnreachable: false`) returning detailed execution diagnostics and best attempts.
