# zapwebp-laravel

First-party Laravel bridge for the Zapwebp transparency-safe image conversion engine.

## Features

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

## Installation

```bash
composer require zapwebp/laravel
```

Publish the configuration file (optional):

```bash
php artisan vendor:publish --tag=zapwebp-config
```

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

## Usage

### 1. Artisan Commands

Batch convert images with progress reporting and savings summaries:

```bash
# Convert a specific directory or image
php artisan zap:convert public/images --to=webp --quality=85 --clean

# Multi-scale retina generation
php artisan zap:convert public/images/logo.png --to=avif --scale=1 --scale=2 --scale=3

# Dry-run audit without writing
php artisan zap:convert public/images --dry-run

# Audit image integrity, alpha preservation, and metadata hygiene
php artisan zap:check public/images --assert-alpha --strict
```

### 2. Blade Directives

Render modern responsive image elements in your Blade views:

```blade
{{-- Output optimized URL --}}
<img src="@zapwebp('images/banner.png', ['to' => 'webp'])" alt="Banner">

{{-- Full <picture> element with AVIF, WebP, and Retina multipliers --}}
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

echo $result->outputPath;      // /path/to/hero.webp
echo $result->savedBytes();    // e.g. 45200 bytes
echo $result->savedPercentage(); // e.g. 52.4%

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

All incoming images will be transparently converted to modern WebP format before reaching your controllers.

## License

MIT © [Eldrex Delos Reyes Bula](https://github.com/Zapwebp)
