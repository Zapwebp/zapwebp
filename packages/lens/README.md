# zapwebp-lens

Read-only image inspection suite, container chunk analyzer, alpha mask viewer, and byte diffing CLI.

Covers: Read-only image container inspection, PNG/EXIF/XMP chunk parsing, alpha mask verification, visual diffing (`--diff`), and terminal reporting.

Does not cover: File modification, raster conversion, or cloud uploading.

Applies to: `zapwebp-lens` v1.0.0 and later, Node.js >=22.0.0.

## Quick start

```bash
# Run directly with npx
npx zapwebp-lens logo.png

# Or install globally
npm install -g zapwebp-lens
lens logo.png
```

## What it does

`zapwebp-lens` is a read-only diagnostics tool that never writes, converts, or mutates assets, making it safe for auditing production pipelines and verifying image integrity:
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

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_FILE_NOT_FOUND` | Target image file does not exist | Verify file path |
| `E_INVALID_IMAGE` | File contains malformed headers or unrecognized binary data | Check file integrity |
| `E_DIFF_DIMENSION_MISMATCH` | Comparing two images with different aspect ratios or dimensions | Ensure original and converted images share identical dimensions |

## For agents

```json
{
  "tool": "zapwebp-lens",
  "binaries": ["lens", "zapwebp-lens"],
  "flags": ["--alpha", "--diff", "--open", "--json", "--verbose"],
  "purpose": "read-only image container inspection and alpha verification"
}
```

## Related

- [Lens Documentation](https://zapwebp-docs.vercel.app/plugins/lens): Full CLI options and visual diffing workflows.
- [CLI Reference](https://zapwebp-docs.vercel.app/cli): Terminal tool for conversion operations.
- [Lossless Truth](https://zapwebp-docs.vercel.app/lossless): Pixel verification standards.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
