@props([
    'title' => 'Zapwebp Dialog',
    'type' => 'error',
    'code' => null,
    'fix' => null,
    'open' => false,
])

<zap-modal
    title="{{ $title }}"
    type="{{ $type }}"
    @if($code) code="{{ $code }}" @endif
    @if($fix) fix="{{ $fix }}" @endif
    @if($open) open @endif
    {{ $attributes->merge(['class' => 'zap-modal-blade']) }}
>
    {{ $slot }}
</zap-modal>

