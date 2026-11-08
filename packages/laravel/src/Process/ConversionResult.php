<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Process;

use Stringable;

/**
 * Encapsulates the verified metrics and output location of a completed conversion.
 */
class ConversionResult implements Stringable
{
    /**
     * Absolute or storage path to the converted image file.
     */
    public string $outputPath;

    /**
     * Original input file size in bytes.
     */
    public int $originalSize;

    /**
     * Output file size in bytes after conversion and metadata stripping.
     */
    public int $convertedSize;

    /**
     * Output format (e.g. 'webp', 'avif', 'png', 'jpeg').
     */
    public string $format;

    /**
     * Pixel width of the converted output, if known.
     */
    public ?int $width;

    /**
     * Pixel height of the converted output, if known.
     */
    public ?int $height;

    /**
     * Whether an alpha transparency channel was verified present in the output.
     */
    public bool $hasAlpha;

    /**
     * Elapsed execution time in milliseconds.
     */
    public float $durationMs;

    /**
     * Creates a new ConversionResult instance.
     *
     * @param string $outputPath
     * @param int $originalSize
     * @param int $convertedSize
     * @param string $format
     * @param int|null $width
     * @param int|null $height
     * @param bool $hasAlpha
     * @param float $durationMs
     */
    public function __construct(
        string $outputPath,
        int $originalSize = 0,
        int $convertedSize = 0,
        string $format = 'webp',
        ?int $width = null,
        ?int $height = null,
        bool $hasAlpha = false,
        float $durationMs = 0.0
    ) {
        $this->outputPath = $outputPath;
        $this->originalSize = $originalSize;
        $this->convertedSize = $convertedSize > 0 ? $convertedSize : (file_exists($outputPath) ? (int) filesize($outputPath) : 0);
        $this->format = strtolower($format);
        $this->width = $width;
        $this->height = $height;
        $this->hasAlpha = $hasAlpha;
        $this->durationMs = $durationMs;
    }

    /**
     * Returns the number of bytes saved during conversion.
     *
     * @return int
     */
    public function savedBytes(): int
    {
        return max(0, $this->originalSize - $this->convertedSize);
    }

    /**
     * Returns the percentage reduction in file size (0.0 to 100.0).
     *
     * @return float
     */
    public function savedPercentage(): float
    {
        if ($this->originalSize <= 0) {
            return 0.0;
        }

        $saved = $this->originalSize - $this->convertedSize;
        return round(($saved / $this->originalSize) * 100.0, 2);
    }

    /**
     * String representation returns the output path for seamless backward compatibility.
     *
     * @return string
     */
    public function __toString(): string
    {
        return $this->outputPath;
    }
}

