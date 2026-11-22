# Conversion Policy & Team Governance

Covers: Unified conversion policies, team governance contracts (`zapwebp.policy.json`), exception lifecycles, CI/CD blocking rules, lossy and lossless modes, per-format quality overrides, byte boundaries, and magic-byte validation.

Does not cover: Manual byte manipulation or unbounded arbitrary memory allocations.

Applies to: Zapwebp v2.19.0 and later.

## Quick start

Scaffold a team governance policy contract in your repository:

```bash
# Initialize zapwebp.policy.json with corporate defaults
zap init --team

# Validate policy syntax and exception expiration dates
zap policy validate

# Inspect current status and active exceptions
zap policy status
```

Define corporate image rules in `zapwebp.policy.json`:

```json
{
  "$schema": "https://zapwebp.dev/schemas/policy.json",
  "version": "1.0.0",
  "name": "corporate-media-policy",
  "rules": {
    "rejectedFormats": ["bmp", "tiff", "heic"],
    "requireClean": true,
    "quality": { "min": 60, "max": 90 },
    "maxDimensions": { "width": 3840, "height": 2160 },
    "maxOutputBytes": 1048576
  },
  "exceptions": [
    {
      "pattern": "assets/hero/*",
      "allowedFormats": ["avif"],
      "maxOutputBytes": 2097152,
      "reason": "High-fidelity homepage hero banners",
      "approvedBy": "eldrex@zapwebp.com",
      "expires": "2027-12-31"
    }
  ],
  "enforcement": {
    "onLocal": "warn",
    "onCi": "block"
  }
}
```

Or enforce policy parameters on the command line:

```bash
npx zapwebp ./photos/* --to webp --max-input 10485760 --max-output 512000 --accept svg,png,jpeg
```

## What it does

Zapwebp provides a unified **Team Policy Contract** that standardizes image standards across engineering teams, design systems, and CI/CD pipelines.

### 1. Team Governance & CI Enforcement

- **`zapwebp.policy.json`:** The root governance contract. Specifies rejected formats, mandatory Clean Mode (stripping EXIF/GPS), quality boundaries, and dimension limits.
- **Exceptions Lifecycle:** Specific asset directories can define exceptions with pattern matching (e.g. `assets/hero/*`). Every exception requires an `approvedBy` author, a written `reason`, and a mandatory `expires` date. Expired exceptions are immediately rejected in CI.
- **CI/CD Enforcement:** When `enforcement.onCi` is set to `"block"`, any unapproved format or expired exception fails the build with exit code 1.

### 2. Guardrails & Limits

- **`maxInputBytes`:** Checked immediately against buffer byte length *before* libvips or Resvg decode into memory, preventing memory allocation denial-of-service.
- **`maxOutputBytes`:** Compresses output iteratively: if the output exceeds the byte ceiling, Zapwebp steps quality down by 5 points until it fits or throws `E_OUTPUT_TOO_LARGE`.
- **Magic-Byte Format Verification:** Formats are verified against magic byte signatures (`detectFormat`), completely ignoring spoofed file extensions.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_INPUT_TOO_LARGE` | Input file byte size exceeds `maxInputBytes` before decoding | Reduce image resolution or increase `policy.limits.maxInputBytes` |
| `E_OUTPUT_TOO_LARGE` | Encoded output exceeds `maxOutputBytes` even at minimum quality (10) | Reduce dimensions with `--width`, switch to AVIF, or raise `maxOutputBytes` |
| `E_FORMAT_REJECTED` | Input format is disallowed by `policy.formats.reject` or rejected by team policy | Provide a permitted format or adjust policy configuration |
| `E_POLICY_VIOLATION` | File violates corporate policy or uses an expired exception | Convert to an allowed format, reduce dimensions, or renew the policy exception |

## For agents

```json
{
  "capability": "conversion-policy",
  "tools": [
    "validate_policy",
    "get_policy_status"
  ],
  "schema": {
    "version": "1.0.0",
    "rules": {
      "rejectedFormats": "string[]",
      "requireClean": "boolean",
      "quality": { "min": "number", "max": "number" },
      "maxDimensions": { "width": "number", "height": "number" },
      "maxOutputBytes": "number"
    },
    "exceptions": [
      {
        "pattern": "string (glob)",
        "allowedFormats": "string[]",
        "maxOutputBytes": "number",
        "reason": "string",
        "approvedBy": "string",
        "expires": "string (YYYY-MM-DD)"
      }
    ],
    "enforcement": {
      "onLocal": "warn | block",
      "onCi": "warn | block"
    }
  },
  "errorCodes": [
    "E_INPUT_TOO_LARGE",
    "E_OUTPUT_TOO_LARGE",
    "E_FORMAT_REJECTED",
    "E_POLICY_VIOLATION"
  ]
}
```

## Related

- [Performance & Reports](/reports) — Aggregate corporate conversion savings and carbon accounting.
- [Smart Optimization](/smart) — Automatic content profiling and quality tuning.
- [Target Lock](/lock-target) — Universal many-to-one conversion gateway.
- [Clean Mode](/clean) — Strip sensitive metadata and verify certificates.
- [CLI Reference](/cli) — Command line policy subcommands and flags.
- [Errors](/errors) — Machine-readable error catalog with root cause explanations.
