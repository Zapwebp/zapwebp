<?php

declare(strict_types=1);

namespace Zapwebp\Laravel;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Zapwebp\Laravel\Commands\ZapCheckCommand;
use Zapwebp\Laravel\Commands\ZapConvertCommand;
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

        // Ensure helpers are loaded
        require_once __DIR__ . '/helpers.php';
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

            $this->commands([
                ZapConvertCommand::class,
                ZapCheckCommand::class,
            ]);
        }

        $this->registerBladeDirectives();
    }

    /**
     * Registers custom Blade directives for Zapwebp.
     */
    protected function registerBladeDirectives(): void
    {
        if (!class_exists(Blade::class)) {
            return;
        }

        // @zapwebp('images/hero.png', ['to' => 'webp'])
        Blade::directive('zapwebp', function ($expression) {
            return "<?php echo \\zap_url({$expression}); ?>";
        });

        // @picture('images/hero.png', ['alt' => 'Hero'], ['formats' => ['avif', 'webp']])
        Blade::directive('picture', function ($expression) {
            return "<?php echo \\zap_picture({$expression}); ?>";
        });

        // @srcset('images/hero.png', [1, 2, 3], 'webp')
        Blade::directive('srcset', function ($expression) {
            return "<?php echo \\zap_srcset({$expression}); ?>";
        });
    }
}
