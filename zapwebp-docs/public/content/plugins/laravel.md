# Laravel Package

Covers: the official Laravel bridge (`zapwebp/laravel`), `Zap` facade, `SafeImage` validation rules, `ConvertUploads` middleware, and zero-shell process isolation.

Does not cover: Node.js frontend asset build tools. See [Vite Plugin](/plugins/vite) or [Next.js Plugin](/plugins/next).

Applies to: `zapwebp/laravel` v1.0.0 and later, PHP 8.2+, Laravel 10.0+.

## Quick start

```bash
composer require zapwebp/laravel
```

Optionally publish the configuration file:

```bash
php artisan vendor:publish --tag=zapwebp-config
```

Use the `Zap` facade directly in your controllers:

```php
use Zapwebp\Laravel\Facades\Zap;

// Single file conversion
$result = Zap::convert(
    input: storage_path('app/uploads/hero.png'),
    format: 'webp',
    quality: 85,
    clean: true
);

return response()->json([
    'path' => $result->outputPath,
    'saved_bytes' => $result->originalSize - $result->convertedSize,
]);
```

## What it does

- **Laravel Facade**: Expressive syntax via `Zap::convert()`, `Zap::batch()`, and `Zap::check()`.
- **Artisan Commands**: CLI terminal commands `php artisan zap:convert` and `php artisan zap:check` for batch converting assets and auditing transparency.
- **Blade Directives & Helpers**: Native `@zapwebp`, `@picture`, and `@srcset` directives for generating accessible, responsive `<picture>` markup with AVIF/WebP sources.
- **Validation Rule**: Built-in `SafeImage` rule verifies that incoming client files are authentic images with uncorrupted alpha channels.
- **Upload Middleware**: `ConvertUploads` middleware automatically transforms incoming multipart image uploads before reaching controller actions.
- **Zero Shell Concatenation**: Utilizes Symfony `Process` with strict parameter arrays to prevent command injection risks.

## Configuration

In `config/zapwebp.php`:

```php
return [
    'binary' => env('ZAPWEBP_BINARY', 'zap'),
    'defaults' => [
        'format' => env('ZAPWEBP_DEFAULT_FORMAT', 'webp'),
        'quality' => (int) env('ZAPWEBP_DEFAULT_QUALITY', 85),
        'clean' => true,
        'assert_alpha' => true,
    ],
    'timeout' => 60,
];
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_BINARY_NOT_FOUND` | The `zap` CLI executable was not located in your system `$PATH` or specified binary path. | Install `zapwebp` via `npm install -g zapwebp` or configure `ZAPWEBP_BINARY` in `.env`. |
| `E_VALIDATION_FAILED` | Uploaded image violated transparency or dimension integrity rules. | Provide a valid image file matching allowed formats. |

## Related

- [Storage Adapters](/plugins/storage) — Cloud storage integrations for Supabase and Firebase.
- [REST API](/api) — Stateless HTTP conversion microservice endpoints.
- [CLI](/cli) — Command-line binary powering the backend process runner.

## For agents

```json
{
  "pkg": "zapwebp/laravel",
  "version": "1.0.0",
  "contract": "Zap::convert(string $input, array $options = []): ConversionResult",
  "requirements": {
    "php": ">=8.2",
    "laravel/framework": ">=10.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/laravel",
  "docs": "https://zapwebp-docs.vercel.app/plugins/laravel"
}
```
