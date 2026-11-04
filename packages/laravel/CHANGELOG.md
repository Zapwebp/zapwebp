# Changelog

All notable changes to `zapwebp/laravel` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-04

### Added
- Initial stable release of `zapwebp/laravel` bridge package.
- `Zap` facade with `convert()`, `batch()`, and `check()` methods.
- `SafeImage` custom validation rule verifying transparency and format integrity.
- `ConvertUploads` HTTP middleware for seamless on-the-fly request image optimization.
- Isolated process execution via Symfony `Process` avoiding shell escape vulnerabilities.
