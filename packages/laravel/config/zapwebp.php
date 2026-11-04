<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Zapwebp Binary Path
    |--------------------------------------------------------------------------
    |
    | Path to the zap or zapwebp executable. If installed globally, 'zap' or
    | 'npx zapwebp' is used. You may also point to a local node_modules path:
    | base_path('node_modules/.bin/zap')
    |
    */
    'binary' => env('ZAPWEBP_BINARY', 'zap'),

    /*
    |--------------------------------------------------------------------------
    | Default Conversion Options
    |--------------------------------------------------------------------------
    */
    'defaults' => [
        'format' => env('ZAPWEBP_DEFAULT_FORMAT', 'webp'),
        'quality' => (int) env('ZAPWEBP_DEFAULT_QUALITY', 85),
        'clean' => (bool) env('ZAPWEBP_DEFAULT_CLEAN', true),
        'verify_clean' => (bool) env('ZAPWEBP_VERIFY_CLEAN', false),
        'assert_alpha' => (bool) env('ZAPWEBP_ASSERT_ALPHA', true),
        'scales' => [1],
        'base_width' => 512,
    ],

    /*
    |--------------------------------------------------------------------------
    | Execution Bounds
    |--------------------------------------------------------------------------
    */
    'timeout' => (int) env('ZAPWEBP_TIMEOUT', 60),
    'temp_dir' => env('ZAPWEBP_TEMP_DIR', sys_get_temp_dir()),
];
