@props([
    'accept' => 'image/*',
    'maxBytes' => 5242880,
    'multiple' => true,
    'title' => 'Drop images here, or browse',
    'hint' => 'Supports SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF up to 5 MB',
])

<zap-dropzone
    accept="{{ $accept }}"
    max-bytes="{{ $maxBytes }}"
    {{ $multiple ? 'multiple' : '' }}
    title="{{ $title }}"
    hint="{{ $hint }}"
    {{ $attributes->merge(['class' => 'zap-dropzone-blade']) }}
>
</zap-dropzone>

