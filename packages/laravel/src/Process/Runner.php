<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Process;

use Illuminate\Support\Facades\Process;
use RuntimeException;

class Runner
{
    protected string $binary;
    protected array $defaults;
    protected int $timeout;

    public function __construct(array $config = [])
    {
        $this->binary = $config['binary'] ?? 'zap';
        $this->defaults = $config['defaults'] ?? [
            'format' => 'webp',
            'quality' => 85,
            'clean' => true,
            'verify_clean' => false,
            'assert_alpha' => true,
        ];
        $this->timeout = (int) ($config['timeout'] ?? 60);
    }

    /**
     * Creates a conversion builder for fluent execution.
     *
     * @param string $inputPath Path to source image
     * @param array $options Options overriding defaults
     * @return ConversionBuilder
     * @throws RuntimeException
     */
    public function convert(string $inputPath, array $options = []): ConversionBuilder
    {
        if (!file_exists($inputPath)) {
            throw new RuntimeException("Zapwebp: Input file not found: {$inputPath}");
        }

        return new ConversionBuilder($this, $inputPath, $options);
    }

    /**
     * Ingestion gateway: forces locked conversion into target format.
     *
     * @param string $inputPath
     * @param string $target
     * @return ConversionBuilder
     */
    public function ingest(string $inputPath, string $target = 'webp'): ConversionBuilder
    {
        return $this->convert($inputPath, [
            'lock_target' => $target,
            'strict' => true,
        ]);
    }

    /**
     * Executes process conversion synchronously returning the output file path.
     *
     * @param string $inputPath Path to source image
     * @param array $options Options overriding defaults
     * @return string Output file path
     * @throws RuntimeException
     */
    public function execute(string $inputPath, array $options = []): string
    {
        if (!file_exists($inputPath)) {
            throw new RuntimeException("Zapwebp: Input file not found: {$inputPath}");
        }

        $opts = array_merge($this->defaults, $options);
        $targetFormat = $opts['to'] ?? $opts['format'] ?? 'webp';

        $args = [$this->binary, $inputPath];

        if (isset($opts['lock_target']) || isset($opts['lockTarget'])) {
            $lock = $opts['lock_target'] ?? $opts['lockTarget'];
            $args[] = '--lock-target';
            $args[] = (string) $lock;
            $targetFormat = (string) $lock;
        } else {
            $args[] = '--to';
            $args[] = $targetFormat;
        }

        if (isset($opts['strict'])) {
            $args[] = !empty($opts['strict']) ? '--strict' : '--no-strict';
        }

        if (isset($opts['output'])) {
            $args[] = '-o';
            $args[] = (string) $opts['output'];
        } elseif (isset($opts['out_dir'])) {
            $args[] = '--out-dir';
            $args[] = (string) $opts['out_dir'];
        }

        if (isset($opts['quality'])) {
            $args[] = '--quality';
            $args[] = (string) $opts['quality'];
        }

        if (isset($opts['max_input_bytes'])) {
            $args[] = '--max-input';
            $args[] = (string) $opts['max_input_bytes'];
        }

        if (isset($opts['max_output_bytes'])) {
            $args[] = '--max-output';
            $args[] = (string) $opts['max_output_bytes'];
        }

        if (isset($opts['accept'])) {
            $args[] = '--accept';
            $args[] = is_array($opts['accept']) ? implode(',', $opts['accept']) : (string) $opts['accept'];
        }

        if (isset($opts['reject'])) {
            $args[] = '--reject';
            $args[] = is_array($opts['reject']) ? implode(',', $opts['reject']) : (string) $opts['reject'];
        }

        if (!empty($opts['lossless'])) {
            $args[] = '--lossless';
        }

        if (!empty($opts['clean'])) {
            $args[] = '--clean';
        } else {
            $args[] = '--no-clean';
        }

        if (!empty($opts['verify_clean'])) {
            $args[] = '--verify-clean';
        }

        if (!empty($opts['assert_alpha'])) {
            $args[] = '--assert-alpha';
        }

        if (!empty($opts['scales']) && is_array($opts['scales'])) {
            $args[] = '--scale';
            $args[] = implode(',', $opts['scales']);
        }

        $result = Process::timeout($this->timeout)->run($args);

        if (!$result->successful()) {
            throw new RuntimeException(
                "Zapwebp conversion failed (exit code {$result->exitCode()}): " .
                trim($result->errorOutput() ?: $result->output())
            );
        }

        if (isset($opts['output'])) {
            return (string) $opts['output'];
        }

        // Default path deduction
        $dir = isset($opts['out_dir']) ? (string) $opts['out_dir'] : dirname($inputPath);
        $baseName = pathinfo($inputPath, PATHINFO_FILENAME);
        $outExt = $targetFormat === 'jpeg' ? 'jpg' : $targetFormat;
        return rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . "{$baseName}.{$outExt}";
    }

    /**
     * Converts a batch of images.
     *
     * @param array<string> $inputPaths
     * @param array $options
     * @return array<string>
     */
    public function batch(array $inputPaths, array $options = []): array
    {
        $outputs = [];
        foreach ($inputPaths as $path) {
            $outputs[] = $this->convert($path, $options);
        }
        return $outputs;
    }

    /**
     * Verifies whether an input image requires conversion or contains safety flaws.
     *
     * @param string $inputPath
     * @return bool True if safe and up to date, False if check exits non-zero
     */
    public function check(string $inputPath): bool
    {
        if (!file_exists($inputPath)) {
            return false;
        }

        $args = [$this->binary, 'check', $inputPath];
        $result = Process::timeout($this->timeout)->run($args);

        return $result->successful();
    }

    /**
     * Inspects container chunks, metadata, and alpha properties of an image.
     *
     * @param string $inputPath
     * @return array
     */
    public function inspect(string $inputPath): array
    {
        if (!file_exists($inputPath)) {
            throw new RuntimeException("Zapwebp: File not found: {$inputPath}");
        }

        $args = [$this->binary, 'inspect', $inputPath, '--json'];
        $result = Process::timeout($this->timeout)->run($args);

        if (!$result->successful()) {
            throw new RuntimeException("Zapwebp inspect failed: " . trim($result->errorOutput() ?: $result->output()));
        }

        $data = json_decode($result->output(), true);
        return is_array($data) ? $data : ['raw' => $result->output()];
    }

    /**
     * Returns the resolved binary path.
     */
    public function getBinary(): string
    {
        return $this->binary;
    }
}
