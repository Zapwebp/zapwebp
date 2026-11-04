# zapwebp-laravel

First-party Laravel bridge for the Zapwebp transparency-safe image conversion engine.

## Features

- **Transparency Preservation**: Guaranteed alpha channel retention for WebP, AVIF, and PNG.
- **Strict Process Isolation**: Zero shell concatenation; uses PHP `Process` array argument passing.
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

### 1. Facade Conversion

```php
use Zapwebp\Laravel\Facades\Zap;

// Single image conversion
$outputPath = Zap::convert(storage_path('app/uploads/hero.png'), [
    'to' => 'webp',
    'quality' => 85,
]);

// Batch conversion
$outputs = Zap::batch([
    storage_path('app/uploads/icon.svg'),
    storage_path('app/uploads/banner.jpg'),
], [
    'to' => 'avif',
]);
```

### 2. Validation Rule

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

### 3. Automatic Upload Middleware

In `bootstrap/app.php` or `app/Http/Kernel.php`:

```php
use Zapwebp\Laravel\Middleware\ConvertUploads;

->withMiddleware(function (Middleware $middleware) {
    $middleware->append(ConvertUploads::class);
})
```

All incoming images will be transparently converted to modern WebP format before reaching your controllers.

## License

MIT © Eldrex Delos Reyes Bula
