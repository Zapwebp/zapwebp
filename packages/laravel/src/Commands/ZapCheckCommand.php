<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;
use Zapwebp\Laravel\Facades\Zap;

class ZapCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zap:check
                            {path : Path to image file or directory}
                            {--assert-alpha : Require images to have alpha transparency}
                            {--strict : Fail with non-zero exit code if safety issues or dirty metadata are found}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Audit images for format validity, alpha channel preservation, and metadata hygiene';

    /**
     * Supported file extensions.
     *
     * @var array<string>
     */
    protected array $supportedExtensions = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tiff'];

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $inputPath = (string) $this->argument('path');
        $assertAlpha = (bool) $this->option('assert-alpha');
        $strict = (bool) $this->option('strict');

        $files = $this->resolveFiles($inputPath);

        if (empty($files)) {
            $this->warn("No eligible image files found matching: {$inputPath}");
            return Command::SUCCESS;
        }

        $this->info("⚡ Zapwebp: Auditing " . count($files) . " image(s)...");

        $rows = [];
        $failures = 0;

        foreach ($files as $file) {
            $fileName = basename($file);
            $size = (int) filesize($file);

            try {
                $info = Zap::inspect($file);
                $format = $info['format'] ?? pathinfo($file, PATHINFO_EXTENSION);
                $hasAlpha = !empty($info['hasAlpha']);
                $metaHints = $info['metadata']['aiProvenanceHints'] ?? [];
                $clean = empty($metaHints) && empty($info['metadata']['hasExif']);

                $status = '✔ Safe';
                $issues = [];

                if ($assertAlpha && !$hasAlpha) {
                    $issues[] = 'No alpha channel';
                }

                if ($strict && !$clean) {
                    $issues[] = 'Contains metadata/provenance';
                }

                if (!empty($issues)) {
                    $status = '✖ ' . implode(', ', $issues);
                    $failures++;
                }

                $rows[] = [
                    $fileName,
                    strtoupper((string) $format),
                    $this->formatBytes($size),
                    $hasAlpha ? '✔ Yes' : 'No',
                    $clean ? '✔ Clean' : '⚠ Dirty',
                    $status,
                ];
            } catch (\Throwable $e) {
                $failures++;
                $rows[] = [
                    $fileName,
                    'UNKNOWN',
                    $this->formatBytes($size),
                    '—',
                    '—',
                    '✖ ' . $e->getMessage(),
                ];
            }
        }

        $this->table(
            ['Image File', 'Format', 'Size', 'Alpha Channel', 'Clean State', 'Audit Status'],
            $rows
        );

        if ($failures > 0) {
            $this->error("Zapwebp Check: {$failures} file(s) failed safety/hygiene verification.");
            return $strict ? Command::FAILURE : Command::SUCCESS;
        }

        $this->info("Zapwebp Check: All " . count($files) . " image(s) verified safe and compliant.");
        return Command::SUCCESS;
    }

    /**
     * Resolves matching image files from a given path or directory.
     *
     * @param string $path
     * @return array<string>
     */
    protected function resolveFiles(string $path): array
    {
        if (is_file($path)) {
            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            return in_array($ext, $this->supportedExtensions, true) ? [realpath($path) ?: $path] : [];
        }

        if (is_dir($path)) {
            $finder = new Finder();
            $finder->files()->in($path)->depth('< 5');

            $patterns = array_map(fn($ext) => "*.{$ext}", $this->supportedExtensions);
            $finder->name($patterns);

            $files = [];
            foreach ($finder as $file) {
                $files[] = $file->getRealPath();
            }
            return $files;
        }

        $globMatches = glob($path);
        if ($globMatches) {
            return array_filter($globMatches, function ($p) {
                $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
                return in_array($ext, $this->supportedExtensions, true);
            });
        }

        return [];
    }

    /**
     * Formats bytes to human-readable string.
     *
     * @param int $bytes
     * @return string
     */
    protected function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return "{$bytes} B";
        }
        if ($bytes < 1048576) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return round($bytes / 1048576, 2) . ' MB';
    }
}

