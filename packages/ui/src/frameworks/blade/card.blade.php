@props([
    'code' => 'E_ERROR',
    'title' => null,
    'fix' => null,
    'severity' => 'error',
])

<zap-error-card
    code="{{ $code }}"
    @if($title) title="{{ $title }}" @endif
    @if($fix) fix="{{ $fix }}" @endif
    severity="{{ $severity }}"
    {{ $attributes->merge(['class' => 'zap-error-card-blade']) }}
>
    {{ $slot }}
</zap-error-card>

