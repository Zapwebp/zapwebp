@props([
    'total' => 0,
    'completed' => 0,
    'failed' => 0,
])

<zap-upload-progress
    total="{{ $total }}"
    completed="{{ $completed }}"
    failed="{{ $failed }}"
    {{ $attributes->merge(['class' => 'zap-upload-prog-blade']) }}
>
</zap-upload-progress>

