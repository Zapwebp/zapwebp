<div {{ $attributes->merge(['class' => 'zap-quality-slider-wrap']) }}>
    <div class="zap-quality-header">
        <label class="zap-quality-label">{{ $label ?? 'Quality' }}</label>
        <span class="zap-quality-value">{{ $value ?? 85 }}%</span>
    </div>
    <div class="zap-slider-track-wrap">
        <input type="range" min="{{ $min ?? 1 }}" max="{{ $max ?? 100 }}" value="{{ $value ?? 85 }}" class="zap-quality-range-input" />
    </div>
</div>
