<?php

declare(strict_types=1);

namespace Zapwebp\Laravel\Tests;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use Zapwebp\Laravel\Process\Runner;

class RunnerTest extends TestCase
{
    public function test_runner_initializes_with_defaults(): void
    {
        $runner = new Runner([
            'binary' => 'zap',
            'defaults' => [
                'format' => 'webp',
                'quality' => 80,
            ],
        ]);

        $this->assertSame('zap', $runner->getBinary());
    }

    public function test_runner_throws_on_missing_input_file(): void
    {
        $runner = new Runner();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Input file not found');

        $runner->convert('/non/existent/path/image.png');
    }

    public function test_conversion_builder_fluent_chain(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'zap_test_');
        file_put_contents($temp, 'test');
        try {
            $runner = new Runner();
            $builder = $runner->convert($temp)->lockTarget('webp')->strict();
            $this->assertInstanceOf(\Zapwebp\Laravel\Process\ConversionBuilder::class, $builder);

            $ingestBuilder = $runner->ingest($temp, 'avif');
            $this->assertInstanceOf(\Zapwebp\Laravel\Process\ConversionBuilder::class, $ingestBuilder);
        } finally {
            @unlink($temp);
        }
    }
}
