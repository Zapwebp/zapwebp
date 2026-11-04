# Changelog

All notable changes to `@zapwebp/edge` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-04

### Added
- Standardized Edge runtime handler compatible with Cloudflare Workers, Vercel Edge Functions, and Deno Deploy.
- Zero-dependency streaming response pipeline for on-demand image transformations.
- Updated canonical domain `https://zapwebp.vercel.app`.

### Changed
- Refactored edge request handler to use web standard `Request` and `Response` interfaces.

## [1.0.0] - 2025-11-01

### Added
- Initial experimental edge handler implementation.
