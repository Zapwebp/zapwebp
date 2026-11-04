@props([
    'accept' => 'image/*',
    'multiple' => true,
])

<zap-upload-button
    accept="{{ $accept }}"
    {{ $multiple ? 'multiple' : '' }}
    {{ $attributes->merge(['class' => 'zap-upload-btn-blade']) }}
>
    {{ $slot->isEmpty() ? 'Upload Images' : $slot }}
</zap-upload-button>

