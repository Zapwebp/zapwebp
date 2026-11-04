@props([
    'type' => 'warning',
    'code' => null,
    'actions' => 'dismiss',
    'title' => null,
    'fix' => null,
    'position' => 'inline',
    'layout' => 'horizontal',
])

<zap-banner
    type="{{ $type }}"
    @if($code) code="{{ $code }}" @endif
    @if($title) title="{{ $title }}" @endif
    @if($fix) fix="{{ $fix }}" @endif
    actions="{{ $actions }}"
    position="{{ $position }}"
    layout="{{ $layout }}"
    {{ $attributes->merge(['class' => 'zap-banner-blade']) }}
>
    {{ $slot }}
</zap-banner>

