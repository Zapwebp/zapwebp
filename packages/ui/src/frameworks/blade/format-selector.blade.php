<div {{ $attributes->merge(['class' => 'zap-format-selector', 'role' => 'radiogroup']) }}>
    @foreach($formats ?? ['webp', 'avif', 'png', 'jpeg'] as $fmt)
        <button type="button" role="radio" class="zap-fmt-pill {{ ($selected ?? 'webp') === $fmt ? 'is-active' : '' }}" data-format="{{ $fmt }}" aria-checked="{{ ($selected ?? 'webp') === $fmt ? 'true' : 'false' }}">
            <span class="zap-fmt-label">{{ strtoupper($fmt) }}</span>
        </button>
    @endforeach
</div>
