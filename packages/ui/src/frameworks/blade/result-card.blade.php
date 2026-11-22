<article {{ $attributes->merge(['class' => 'zap-file-card']) }}>
    <div class="zap-file-thumb-wrap zap-checkerboard-wrap">
        <img src="{{ $thumbnailSrc ?? '' }}" alt="{{ $filename ?? 'image' }}" class="zap-file-thumb" />
    </div>
    <div class="zap-file-info">
        <h4 class="zap-file-name">{{ $filename ?? 'image.png' }}</h4>
        <div class="zap-file-meta-row">
            <span class="zap-file-sizes">{{ $originalSize ?? '0 B' }} → {{ $outputSize ?? '0 B' }}</span>
            <span class="zap-file-savings">-{{ abs($savingsPct ?? 0) }}%</span>
        </div>
    </div>
</article>
