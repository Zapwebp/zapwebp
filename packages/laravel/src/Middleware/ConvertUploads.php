<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;
use Zapwebp\Laravel\Facades\Zap;

class ConvertUploads
{
    /**
     * Handle an incoming request and automatically convert image uploads to WebP.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $targetFormat Target format (default: webp)
     */
    public function handle(Request $request, Closure $next, string $targetFormat = 'webp'): Response
    {
        $files = $request->allFiles();

        if (empty($files)) {
            return $next($request);
        }

        foreach ($files as $key => $file) {
            if ($file instanceof UploadedFile) {
                $converted = $this->convertFile($file, $targetFormat);
                if ($converted) {
                    $files[$key] = $converted;
                }
            } elseif (is_array($file)) {
                foreach ($file as $subKey => $subFile) {
                    if ($subFile instanceof UploadedFile) {
                        $converted = $this->convertFile($subFile, $targetFormat);
                        if ($converted) {
                            $files[$key][$subKey] = $converted;
                        }
                    }
                }
            }
        }

        $request->files->replace($files);

        return $next($request);
    }

    /**
     * Converts a single uploaded file and returns a new UploadedFile instance.
     */
    protected function convertFile(UploadedFile $file, string $targetFormat): ?UploadedFile
    {
        $mime = $file->getMimeType() ?: '';
        if (!str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml') {
            return null;
        }

        $realPath = $file->getRealPath();
        if (!$realPath || !file_exists($realPath)) {
            return null;
        }

        try {
            $tempDir = config('zapwebp.temp_dir', sys_get_temp_dir());
            $outName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '.' . ($targetFormat === 'jpeg' ? 'jpg' : $targetFormat);
            $outPath = rtrim($tempDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'zap_' . uniqid() . '_' . $outName;

            Zap::convert($realPath, [
                'to' => $targetFormat,
                'output' => $outPath,
            ]);

            return new UploadedFile(
                $outPath,
                $outName,
                $targetFormat === 'jpeg' ? 'image/jpeg' : 'image/' . $targetFormat,
                null,
                true // test mode to allow simulated uploaded file
            );
        } catch (\Throwable) {
            // Fail open: retain original upload if conversion cannot proceed
            return null;
        }
    }
}
