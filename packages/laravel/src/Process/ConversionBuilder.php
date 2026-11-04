<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Process;

use Illuminate\Support\Facades\Storage;
use Stringable;

class ConversionBuilder implements Stringable
{
    protected Runner $runner;
    protected string $inputPath;
    protected array $options;

    public function __construct(Runner $runner, string $inputPath, array $options = [])
    {
        $this->runner = $runner;
        $this->inputPath = $inputPath;
        $this->options = $options;
    }

    /**
     * Enforce target locked output format.
     */
    public function lockTarget(string $format): self
    {
        $this->options['lock_target'] = strtolower($format);
        $this->options['to'] = strtolower($format);
        return $this;
    }

    /**
     * Enforce strict failure mode vs non-strict pass-through.
     */
    public function strict(bool $strict = true): self
    {
        $this->options['strict'] = $strict;
        return $this;
    }

    /**
     * Set compression quality (1-100).
     */
    public function quality(int $quality): self
    {
        $this->options['quality'] = $quality;
        return $this;
    }

    /**
     * Enforce maximum input byte size before decoding.
     */
    public function maxInputBytes(int $bytes): self
    {
        $this->options['max_input_bytes'] = $bytes;
        return $this;
    }

    /**
     * Enforce maximum output byte size with iterative step-down compression.
     */
    public function maxOutputBytes(int $bytes): self
    {
        $this->options['max_output_bytes'] = $bytes;
        return $this;
    }

    /**
     * Restrict acceptable input formats.
     */
    public function accept(array $formats): self
    {
        $this->options['accept'] = implode(',', $formats);
        return $this;
    }

    /**
     * Deny specific input formats.
     */
    public function reject(array $formats): self
    {
        $this->options['reject'] = implode(',', $formats);
        return $this;
    }

    /**
     * Enable lossless compression where supported.
     */
    public function lossless(bool $lossless = true): self
    {
        $this->options['lossless'] = $lossless;
        return $this;
    }

    /**
     * Strip metadata and AI provenance.
     */
    public function clean(bool $clean = true): self
    {
        $this->options['clean'] = $clean;
        return $this;
    }

    /**
     * Execute conversion and save to target local file path.
     */
    public function save(?string $outPath = null): string
    {
        if ($outPath !== null) {
            $this->options['output'] = $outPath;
        }
        return $this->runner->execute($this->inputPath, $this->options);
    }

    /**
     * Execute conversion and store on a Laravel filesystem disk.
     */
    public function saveToDisk(string $disk, string $path): string
    {
        $tempOut = tempnam(sys_get_temp_dir(), 'zap_out_');
        $converted = $this->save($tempOut);
        $stream = fopen($converted, 'r');
        try {
            Storage::disk($disk)->put($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            if (file_exists($tempOut)) {
                @unlink($tempOut);
            }
        }
        return $path;
    }

    /**
     * Auto-evaluate when treated as a string.
     */
    public function __toString(): string
    {
        return $this->save();
    }
}

