# zapwebp-laravel

First-party Laravel bridge for the Zapwebp transparency-safe image conversion engine.

Covers: Laravel facade (`Zap::convert`, `Zap::batch`, `Zap::check`), Blade directives (`@zapwebp`, `@picture`, `@srcset`), Artisan commands (`php artisan zap:convert`), `SafeImage` validation rule, and automatic `ConvertUploads` middleware.

Does not cover: Client-side JavaScript bundling or remote cloud storage direct SDK bindings.

Applies to: `zapwebp-laravel` v1.0.0 and later, PHP >=8.2, Laravel >=10.0.

## Quick start

```bash
composer require zapwebp/laravel
```

Convert an image using the `Zap` facade:

```php
use Zapwebp\Laravel\Facades\Zap;

$result = Zap::convert(storage_path('app/uploads/hero.png'), [
    'to' => 'webp',
    'quality' => 85,
    'clean' => true,
]);

echo $result->outputPath;      // /path/to/hero.webp
echo $result->savedBytes();    // e.g. 45200 bytes
```

## What it does

`zapwebp-laravel` bridges the Laravel framework with the Zapwebp conversion engine, executing conversions with process isolation and zero third-party telemetry:
- **Transparency Preservation**: Guaranteed alpha channel retention for WebP, AVIF, and PNG.
- **Strict Process Isolation**: Zero shell concatenation; uses PHP `Process` array argument passing.
- **Artisan Commands**: CLI tools `php artisan zap:convert` and `php artisan zap:check`.
- **Blade Directives & Picture Helper**: `@zapwebp`, `@picture`, and `@srcset` directives for instant modern responsive markup.
- **Laravel Facade**: Clean, expressive syntax via `Zap::convert()`, `Zap::batch()`, `Zap::check()`.
- **Validation Rule**: `SafeImage` rule verifies format integrity and alpha presence.
- **Upload Middleware**: `ConvertUploads` middleware automatically converts incoming uploads on the fly.
- **Zero Third-Party Telemetry**: 100% local in-memory or on-disk processing.

## Requirements

- PHP >= 8.2
- Laravel >= 10.0
- Zapwebp CLI installed locally or globally (`npm install -g zapwebp` or `pnpm add -D zapwebp`)

## Configuration

Publish the configuration file (optional):

```bash
php artisan vendor:publish --tag=zapwebp-config
```

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

## Usage

### 1. Artisan Commands

```bash
# Convert a single asset
php artisan zap:convert resources/images/logo.svg --to=webp

# Batch convert an entire directory with scale variants
php artisan zap:convert resources/images --to=webp --scale=1,2,3 --out=public/images

# CI build check: asserts that all images are up-to-date and transparent
php artisan zap:check resources/images
```

### 2. Blade Directives

```blade
{{-- Convert an image inline to WebP --}}
<img src="@zapwebp('images/logo.png', ['width' => 200, 'quality' => 80])" alt="Logo">

{{-- Generate <picture> element with WebP + AVIF fallbacks --}}
@picture('images/hero.png', ['alt' => 'Hero', 'class' => 'hero-banner'], ['formats' => ['avif', 'webp'], 'scales' => [1, 2, 3]])

{{-- Generate srcset attribute --}}
<img src="{{ zap_url('images/logo.png') }}" srcset="@srcset('images/logo.png', [1, 2, 3])" alt="Logo">
```

### 3. Facade Conversion

```php
use Zapwebp\Laravel\Facades\Zap;

// Single image conversion returning ConversionResult
$result = Zap::convert(storage_path('app/uploads/hero.png'), [
    'to' => 'webp',
    'quality' => 85,
    'clean' => true,
]);

// Batch conversion
$outputs = Zap::batch([
    storage_path('app/uploads/icon.svg'),
    storage_path('app/uploads/banner.jpg'),
], [
    'to' => 'avif',
]);
```

### 4. Validation Rule

```php
use Illuminate\Http\Request;
use Zapwebp\Laravel\Rules\SafeImage;

public function upload(Request $request)
{
    $request->validate([
        'avatar' => ['required', 'file', new SafeImage(requireAlpha: true)],
    ]);
}
```

### 5. Automatic Upload Middleware

In `bootstrap/app.php` or `app/Http/Kernel.php`:

```php
use Zapwebp\Laravel\Middleware\ConvertUploads;

->withMiddleware(function (Middleware $middleware) {
    $middleware->append(ConvertUploads::class);
})
```

## Errors

| Code / Exception | Cause | Fix |
|---|---|---|
| `ZapwebpBinaryNotFoundException` | `zap` binary is not located in `$PATH` or configured path | Install `zapwebp` via npm or set `ZAPWEBP_BINARY` in `.env` |
| `UnsafeSvgException` | Input SVG contains active scripts or external entities | Remove executable content from SVG |
| `AlphaDropException` | Converting transparent source to JPEG without background | Specify `'background' => '#ffffff'` in options |
| `ConversionTimeoutException` | Conversion process exceeded configured timeout limit | Increase `'timeout'` in `config/zapwebp.php` |

## For agents

```json
{
  "tool": "zapwebp-laravel",
  "facade": "Zapwebp\\Laravel\\Facades\\Zap",
  "artisan": ["zap:convert", "zap:check"],
  "blade": ["@zapwebp", "@picture", "@srcset"],
  "middleware": "Zapwebp\\Laravel\\Middleware\\ConvertUploads",
  "rule": "Zapwebp\\Laravel\\Rules\\SafeImage"
}
```

## Related

- [Laravel Documentation](https://zapwebp-docs.vercel.app/plugins/laravel): Complete Laravel package walkthrough and test helpers.
- [CLI Reference](https://zapwebp-docs.vercel.app/cli): Underlying terminal CLI executed by the package.
- [Errors Reference](https://zapwebp-docs.vercel.app/errors): System error codes and fixes.

## License

MIT © [Eldrex Delos Reyes Bula](https://github.com/Zapwebp)
