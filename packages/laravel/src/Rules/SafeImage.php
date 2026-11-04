<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;
use Zapwebp\Laravel\Facades\Zap;

class SafeImage implements ValidationRule
{
    protected bool $requireAlpha;

    public function __construct(bool $requireAlpha = false)
    {
        $this->requireAlpha = $requireAlpha;
    }

    /**
     * Run the validation rule.
     *
     * @param  string  $attribute
     * @param  mixed  $value
     * @param  Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!($value instanceof UploadedFile) && !is_string($value)) {
            $fail("The {$attribute} must be a valid uploaded file or file path.");
            return;
        }

        $path = $value instanceof UploadedFile ? $value->getRealPath() : $value;

        if (!$path || !file_exists($path)) {
            $fail("The {$attribute} file does not exist on disk.");
            return;
        }

        try {
            $info = Zap::inspect($path);

            if (empty($info['format'])) {
                $fail("The {$attribute} is not a valid or recognized image format.");
                return;
            }

            if ($this->requireAlpha && empty($info['hasAlpha'])) {
                $fail("The {$attribute} must have an alpha transparency channel.");
                return;
            }
        } catch (\Throwable $e) {
            $fail("The {$attribute} failed image safety verification: {$e->getMessage()}");
        }
    }
}
