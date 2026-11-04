# `zapwebp-lens`

Read-only image inspection suite, container chunk analyzer, alpha mask viewer, and byte diffing CLI.

Never writes, converts, or mutates assets. Safe for auditing production pipelines and verifying image integrity.

## Installation

```bash
npm install -g zapwebp-lens
# or execute directly
npx zapwebp-lens <image>
```

## Features

- **Chunk & Container Analysis**: Inspects PNG chunks, EXIF blocks, XMP packets, ICC profiles, and WebP RIFF headers.
- **Alpha Channel Mask Inspection**: Verifies pixel-level alpha preservation (`--alpha`) with transparent corner tests.
- **Visual Diffing & Side-by-Side Review**: Generates split visual comparisons between original and converted assets (`--diff`, `--open`).
- **Batch Verification Reports**: Analyzes entire asset directories with `--json` output for automated CI pipelines.

## Usage

```bash
# Basic inspection
lens image.webp

# Alpha channel verification
lens logo.png --alpha

# Side-by-side visual diff in default browser
lens source.png output.webp --diff --open
```

## License

MIT © Zapwebp

