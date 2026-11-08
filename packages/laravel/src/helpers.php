<?php

declare(strict_types=1);

if (!function_exists('zap_url')) {
    /**
     * Resolves the web-accessible URL for an optimized image asset.
     *
     * @param string $path Source path or URL relative to public/
     * @param array $options Configuration options (e.g. ['to' => 'webp'])
     * @return string
     */
    function zap_url(string $path, array $options = []): string
    {
        $targetFormat = strtolower($options['to'] ?? $options['format'] ?? 'webp');
        $outExt = $targetFormat === 'jpeg' ? 'jpg' : $targetFormat;

        $info = pathinfo($path);
        $dirname = ($info['dirname'] ?? '.') === '.' ? '' : rtrim($info['dirname'], '/\\') . '/';
        $filename = $info['filename'] ?? 'image';
        $optimizedRelative = $dirname . $filename . '.' . $outExt;

        if (function_exists('asset')) {
            return asset($optimizedRelative);
        }

        return '/' . ltrim($optimizedRelative, '/');
    }
}

if (!function_exists('zap_srcset')) {
    /**
     * Generates a responsive srcset string with retina multipliers.
     *
     * @param string $path Source path relative to public/
     * @param array<int|float> $scales Multiplier scale array, e.g. [1, 2, 3]
     * @param string|null $format Target format override (e.g. 'webp', 'avif')
     * @return string
     */
    function zap_srcset(string $path, array $scales = [1, 2, 3], ?string $format = null): string
    {
        $targetFormat = strtolower($format ?? 'webp');
        $outExt = $targetFormat === 'jpeg' ? 'jpg' : $targetFormat;

        $info = pathinfo($path);
        $dirname = ($info['dirname'] ?? '.') === '.' ? '' : rtrim($info['dirname'], '/\\') . '/';
        $filename = $info['filename'] ?? 'image';

        $entries = [];
        foreach ($scales as $scale) {
            $num = (float) $scale;
            $scaleSuffix = ($num === 1.0) ? '' : '@' . $scale . 'x';
            $rel = $dirname . $filename . $scaleSuffix . '.' . $outExt;
            $url = function_exists('asset') ? asset($rel) : '/' . ltrim($rel, '/');
            $descriptor = ($num === 1.0) ? '1x' : "{$scale}x";
            $entries[] = "{$url} {$descriptor}";
        }

        return implode(', ', $entries);
    }
}

if (!function_exists('zap_picture')) {
    /**
     * Renders a modern HTML <picture> element supporting AVIF, WebP, and Retina srcset.
     *
     * @param string $path Source image path relative to public/
     * @param array<string, mixed> $attributes HTML attributes for the fallback <img> tag
     * @param array<string, mixed> $options Format and multiplier options
     * @return string
     */
    function zap_picture(string $path, array $attributes = [], array $options = []): string
    {
        $scales = $options['scales'] ?? $options['scale'] ?? [1, 2, 3];
        if (!is_array($scales) || empty($scales)) {
            $scales = [1];
        }

        $formats = $options['formats'] ?? ['avif', 'webp'];
        if (is_string($formats)) {
            $formats = explode(',', $formats);
        }

        $html = "<picture>\n";

        // Modern source formats in descending compression priority
        foreach ($formats as $fmt) {
            $fmtClean = strtolower(trim($fmt));
            $mimeType = match ($fmtClean) {
                'avif' => 'image/avif',
                'webp' => 'image/webp',
                'png' => 'image/png',
                'jpeg', 'jpg' => 'image/jpeg',
                default => 'image/' . $fmtClean,
            };

            $srcset = zap_srcset($path, $scales, $fmtClean);
            $html .= '  <source type="' . htmlspecialchars($mimeType, ENT_QUOTES, 'UTF-8') . '" srcset="' . htmlspecialchars($srcset, ENT_QUOTES, 'UTF-8') . "\">\n";
        }

        // Fallback <img> element
        $defaultFormat = $options['fallback_format'] ?? 'webp';
        $fallbackUrl = zap_url($path, ['to' => $defaultFormat]);

        $imgAttrs = array_merge([
            'src' => $fallbackUrl,
            'alt' => '',
            'loading' => 'lazy',
            'decoding' => 'async',
        ], $attributes);

        // Ensure src is set
        $imgAttrs['src'] = $fallbackUrl;

        $attrPairs = [];
        foreach ($imgAttrs as $key => $val) {
            if ($val === null || $val === false) {
                continue;
            }
            if ($val === true) {
                $attrPairs[] = htmlspecialchars((string) $key, ENT_QUOTES, 'UTF-8');
            } else {
                $attrPairs[] = htmlspecialchars((string) $key, ENT_QUOTES, 'UTF-8') . '="' . htmlspecialchars((string) $val, ENT_QUOTES, 'UTF-8') . '"';
            }
        }

        $html .= '  <img ' . implode(' ', $attrPairs) . ">\n";
        $html .= '</picture>';

        return $html;
    }
}

