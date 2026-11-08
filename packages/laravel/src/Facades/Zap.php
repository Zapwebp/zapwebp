<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Zapwebp\Laravel\Process\ConversionBuilder convert(string $inputPath, array $options = [])
 * @method static \Zapwebp\Laravel\Process\ConversionBuilder ingest(string $inputPath, string $target = 'webp')
 * @method static \Zapwebp\Laravel\Process\ConversionResult execute(string $inputPath, array $options = [])
 * @method static array batch(array $inputPaths, array $options = [])
 * @method static bool check(string $inputPath)
 * @method static array inspect(string $inputPath)
 * @method static string url(string $path, array $options = [])
 * @method static string picture(string $path, array $attributes = [], array $options = [])
 * @method static string srcset(string $path, array $scales = [1, 2, 3], ?string $format = null)
 *
 * @see \Zapwebp\Laravel\Process\Runner
 */
class Zap extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor(): string
    {
        return 'zapwebp';
    }
}
