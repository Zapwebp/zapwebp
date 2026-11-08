# Laravel Package

Covers: opisyal na Laravel package `zapwebp/laravel`, Zap facade, SafeImage validation rule, at ConvertUploads middleware.

Does not cover: Node.js server configurations. Tingnan ang [REST API](/api).

Applies to: `zapwebp/laravel` v1.0.0 at mas bago.

## Quick start

```bash
composer require zapwebp/laravel
```

```php
use Zap;

$webp = Zap::convert($uploadedFile)->to('webp')->quality(85)->save();
```

## What it does

Nagbibigay ang `zapwebp/laravel` ng maayos at idiomatic na integrasyon para sa mga developer ng PHP at Laravel. Mayroon itong kasamang custom form validation rules (`SafeImage`) na humaharang sa mga mapanganib na SVG at middleware na awtomatikong nagko-convert ng mga in-upload na file patungong WebP.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_BINARY_NOT_FOUND` | Hindi makita ang zap binary sa PATH ng system | I-install ang CLI globally o itakda ang path sa config |
| `E_VALIDATION_FAILED` | Bumagsak ang file sa pagsusuri ng SafeImage | Mag-upload ng wastong imahe na walang scripts |

## For agents

```json
{
  "package": "zapwebp/laravel",
  "ecosystem": "php",
  "facade": "Zap",
  "rules": ["SafeImage"],
  "middleware": ["ConvertUploads"]
}
```

## Related

- [UI Kit](/ui): Paggamit ng Blade components kasama ang Laravel.
- [Storage Adapters](/plugins/storage): Pag-save ng mga na-convert na file sa cloud.
