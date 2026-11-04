<?php

declare(strict_types=1);

namespace Zapwebp\Laravel;

use Illuminate\Support\ServiceProvider;
use Zapwebp\Laravel\Process\Runner;

class ZapwebpServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/zapwebp.php',
            'zapwebp'
        );

        $this->app->singleton('zapwebp', function ($app) {
            $config = $app['config']->get('zapwebp', []);
            return new Runner($config);
        });
    }

    /**
     * Bootstrap any package services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/zapwebp.php' => $this->app->configPath('zapwebp.php'),
            ], 'zapwebp-config');
        }
    }
}
