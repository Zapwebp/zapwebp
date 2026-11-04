<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Zapwebp\Laravel\Process\ConversionBuilder convert(string $inputPath, array $options = [])
 * @method static \Zapwebp\Laravel\Process\ConversionBuilder ingest(string $inputPath, string $target = 'webp')
 * @method static string execute(string $inputPath, array $options = [])
 * @method static array batch(array $inputPaths, array $options = [])
 * @method static bool check(string $inputPath)
 * @method static array inspect(string $inputPath)
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
