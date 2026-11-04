'use strict';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderInspectTerminal(res, filename) {
  const lines = [];
  lines.push(`${filename} · ${(res.format || 'UNKNOWN').toUpperCase()} · ${res.width || '?'}×${res.height || '?'} · ${formatBytes(res.bytes)}`);
  lines.push('─'.repeat(45));
  lines.push(`Chunks found: ${res.chunks.length}`);
  for (const c of res.chunks) {
    const icon = c.isMetadata ? '⚠️ ' : '✅';
    lines.push(`  ${icon} ${c.type.padEnd(8)} (${c.size} bytes)${c.isMetadata ? ' (metadata)' : ''}`);
  }
  lines.push('');
  const metaChunks = res.chunks.filter((c) => c.isMetadata);
  if (metaChunks.length === 0) {
    lines.push('Metadata chunks: 0');
    lines.push('  ✅ No EXIF');
    lines.push('  ✅ No XMP');
    lines.push('  ✅ No C2PA');
    lines.push('  ✅ No ICCP');
  } else {
    lines.push(`Metadata chunks: ${metaChunks.length}`);
    for (const c of metaChunks) {
      lines.push(`  ⚠️  ${c.type}`);
    }
  }
  return lines.join('\n') + '\n';
}

function renderCompareTerminal(a, b, fileA, fileB) {
  const lines = [];
  lines.push('┌─────────────────────┬─────────────────────┐');
  lines.push(`│ Source: ${fileA.padEnd(12)}│ Target: ${fileB.padEnd(12)}│`);
  lines.push(`│ Size:   ${formatBytes(a.bytes).padEnd(12)}│ Size:   ${formatBytes(b.bytes).padEnd(12)}│`);
  lines.push(`│ Format: ${(a.format || '').toUpperCase().padEnd(12)}│ Format: ${(b.format || '').toUpperCase().padEnd(12)}│`);
  lines.push('├─────────────────────┴─────────────────────┤');
  const delta = Math.round(((b.bytes - a.bytes) / a.bytes) * 100);
  lines.push(`│ Byte reduction: ${delta <= 0 ? `${delta}%` : `+${delta}%`}                     │`);
  lines.push(`│ Transparency:   ${b.hasAlpha ? 'preserved ✅' : 'opaque / flattened'}              │`);
  lines.push(`│ Dimensions:     ${a.width || '?'}×${a.height || '?'} → ${b.width || '?'}×${b.height || '?'}     │`);
  lines.push('└───────────────────────────────────────────┘');
  return lines.join('\n') + '\n';
}

module.exports = {
  formatBytes,
  renderInspectTerminal,
  renderCompareTerminal,
};
