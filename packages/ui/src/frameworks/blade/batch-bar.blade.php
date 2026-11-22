<div {{ $attributes->merge(['class' => 'zap-batch-bar', 'role' => 'toolbar']) }}>
    <div class="zap-batch-info-cluster">
        <span class="zap-batch-count"><strong>{{ $fileCount ?? 0 }}</strong> files</span>
        <span class="zap-batch-flow">{{ $totalOriginal ?? '0 B' }} → {{ $totalOutput ?? '0 B' }}</span>
    </div>
    <div class="zap-batch-actions-cluster">
        <button type="button" class="zap-batch-btn zap-batch-download-all">Download all (ZIP)</button>
    </div>
</div>
