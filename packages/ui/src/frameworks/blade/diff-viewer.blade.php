<div {{ $attributes->merge(['class' => 'zap-diff-viewer mode-split']) }} role="region">
    <div class="zap-diff-stage zap-checkerboard-wrap">
        <img src="{{ $beforeSrc ?? '' }}" alt="Original" class="zap-diff-img zap-diff-base" />
        <div class="zap-diff-overlay" style="clip-path: inset(0 0 0 {{ $splitPercent ?? 50 }}%);">
            <img src="{{ $afterSrc ?? '' }}" alt="Converted" class="zap-diff-img zap-diff-clipped" />
        </div>
        <div class="zap-diff-divider" style="left: {{ $splitPercent ?? 50 }}%;">
            <div class="zap-diff-handle"></div>
        </div>
    </div>
</div>
