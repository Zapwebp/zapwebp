<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;
use Zapwebp\Laravel\Facades\Zap;

class ZapConvertCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zap:convert
                            {path? : Path to image file, directory, or glob}
                            {--to=webp : Target format (webp, avif, png, jpeg)}
                            {--quality=85 : Compression quality from 1 to 100}
                            {--clean : Strip EXIF, GPS, and AI provenance metadata}
                            {--lossless : Force lossless compression}
                            {--scale=* : Multiplier scales e.g. --scale=1 --scale=2}
                            {--out-dir= : Destination directory}
                            {--dry-run : Simulate conversion without writing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Convert images using Zapwebp with guaranteed transparency safety and metadata stripping';

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
        $inputPath = $this->argument('path');
        if (empty($inputPath)) {
            $defaultPublic = function_exists('public_path') ? public_path('images') : 'public/images';
            if (is_dir($defaultPublic)) {
                $inputPath = $defaultPublic;
            } else {
                $inputPath = getcwd();
            }
        }

        $targetFormat = strtolower((string) $this->option('to'));
        $quality = (int) $this->option('quality');
        $clean = (bool) $this->option('clean');
        $lossless = (bool) $this->option('lossless');
        $scales = (array) $this->option('scale');
        $outDir = $this->option('out-dir') ? (string) $this->option('out-dir') : null;
        $dryRun = (bool) $this->option('dry-run');

        if (empty($scales)) {
            $scales = [1];
        }

        $files = $this->resolveFiles((string) $inputPath);

        if (empty($files)) {
            $this->warn("No eligible image files found matching: {$inputPath}");
            return Command::SUCCESS;
        }

        $this->info("⚡ Zapwebp: Processing " . count($files) . " image(s) → {$targetFormat} (Quality: {$quality}%)");
        if ($dryRun) {
            $this->comment("[DRY RUN] Simulation mode — no files will be written.");
        }

        $rows = [];
        $totalOriginal = 0;
        $totalConverted = 0;
        $errorsCount = 0;

        foreach ($files as $file) {
            $origSize = (int) filesize($file);
            $totalOriginal += $origSize;
            $fileName = basename($file);

            if ($dryRun) {
                $rows[] = [
                    $fileName,
                    $this->formatBytes($origSize),
                    '— (simulated)',
                    '0%',
                    '✔ Ready',
                ];
                continue;
            }

            try {
                $options = [
                    'to' => $targetFormat,
                    'quality' => $quality,
                    'clean' => $clean,
                    'lossless' => $lossless,
                    'scales' => $scales,
                ];
                if ($outDir !== null) {
                    $options['out_dir'] = $outDir;
                }

                $result = Zap::convert($file, $options);
                $outputPath = (string) $result;
                $convSize = file_exists($outputPath) ? (int) filesize($outputPath) : 0;
                $totalConverted += $convSize;

                $savedBytes = max(0, $origSize - $convSize);
                $percent = $origSize > 0 ? round(($savedBytes / $origSize) * 100, 1) : 0;

                $rows[] = [
                    $fileName,
                    $this->formatBytes($origSize),
                    $this->formatBytes($convSize),
                    "{$percent}%",
                    '✔ Done',
                ];
            } catch (\Throwable $e) {
                $errorsCount++;
                $rows[] = [
                    $fileName,
                    $this->formatBytes($origSize),
                    'Error',
                    '0%',
                    '✖ ' . $e->getMessage(),
                ];
            }
        }

        $this->table(
            ['Source File', 'Original Size', 'Converted Size', 'Saved', 'Status'],
            $rows
        );

        if (!$dryRun && $totalOriginal > 0) {
            $overallSaved = max(0, $totalOriginal - $totalConverted);
            $overallPercent = round(($overallSaved / $totalOriginal) * 100, 1);
            $this->info(
                "Total: " . $this->formatBytes($totalOriginal) . " → " .
                $this->formatBytes($totalConverted) . " (" .
                $this->formatBytes($overallSaved) . " saved, {$overallPercent}% reduction)."
            );
        }

        return $errorsCount > 0 ? Command::FAILURE : Command::SUCCESS;
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

        // Glob fallback
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
