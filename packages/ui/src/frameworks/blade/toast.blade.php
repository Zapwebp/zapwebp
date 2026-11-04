@props([
    'type' => 'info',
    'code' => null,
    'duration' => 4000,
    'dismissible' => true,
    'title' => null,
])

<zap-toast
    type="{{ $type }}"
    @if($code) code="{{ $code }}" @endif
    @if($title) title="{{ $title }}" @endif
    duration="{{ $duration }}"
    dismissible="{{ $dismissible ? 'true' : 'false' }}"
    {{ $attributes->merge(['class' => 'zap-toast-blade']) }}
>
    {{ $slot }}
</zap-toast>

