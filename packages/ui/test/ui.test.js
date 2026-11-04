'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ui = require('../src');

test('UI Tokens: CSS token files exist and define required root variables', () => {
  const primitivesCss = fs.readFileSync(path.join(__dirname, '../src/tokens/primitives.css'), 'utf8');
  assert.match(primitivesCss, /--bg:\s*#f7f7f4/);
  assert.match(primitivesCss, /--green-primary:\s*#8dc63f/);
  assert.match(primitivesCss, /--error:\s*#cf222e/);

  const semanticCss = fs.readFileSync(path.join(__dirname, '../src/tokens/semantic.css'), 'utf8');
  assert.match(semanticCss, /--color-accent:\s*var\(--green-primary\)/);
  assert.match(semanticCss, /--color-surface:\s*var\(--bg\)/);
  assert.match(semanticCss, /--color-danger:\s*var\(--error\)/);

  const typographyCss = fs.readFileSync(path.join(__dirname, '../src/tokens/typography.css'), 'utf8');
  assert.match(typographyCss, /--step-0:\s*clamp/);
  assert.match(typographyCss, /--step-5:\s*clamp/);

  const spacingCss = fs.readFileSync(path.join(__dirname, '../src/tokens/spacing.css'), 'utf8');
  assert.match(spacingCss, /--space-1:/);
  assert.match(spacingCss, /--radius-md:/);
});

test('UI Motion: exports standard durations, easings, and reducedMotion query', () => {
  assert.equal(ui.duration.instant, '80ms');
  assert.equal(ui.duration.fast, '150ms');
  assert.equal(ui.duration.base, '220ms');
  assert.equal(ui.easing.standard, 'cubic-bezier(0.2, 0, 0, 1)');
  assert.equal(ui.easing.spring, 'cubic-bezier(0.34, 1.56, 0.64, 1)');
  assert.equal(ui.reducedMotion, '@media (prefers-reduced-motion: reduce)');
});

test('UI Primitives: renders all 12 primitives with accessible markup', () => {
  // 1. Button
  const btn = ui.renderButton({ label: 'Convert', variant: 'primary', size: 'md' });
  assert.match(btn, /class="zap-btn zap-btn-primary zap-btn-md"/);
  assert.match(btn, />Convert<\/button>/);

  // 2. IconButton
  const iconBtn = ui.renderIconButton({ iconSvg: '<svg></svg>', ariaLabel: 'Batch convert' });
  assert.match(iconBtn, /aria-label="Batch convert"/);

  // 3. Input
  const input = ui.renderInput({ id: 'test-in', placeholder: 'Enter width', error: 'Invalid width' });
  assert.match(input, /id="test-in"/);
  assert.match(input, /aria-describedby="test-in-error"/);
  assert.match(input, /role="alert">Invalid width/);

  // 4. Switch
  const sw = ui.renderSwitch({ id: 'clean-switch', checked: true, label: 'Clean Mode' });
  assert.match(sw, /role="switch"/);
  assert.match(sw, /aria-checked="true"/);

  // 5. Badge
  const badge = ui.renderBadge({ text: 'Alpha Safe', variant: 'success' });
  assert.match(badge, /class="zap-badge zap-badge-success"/);

  // 6. Card
  const card = ui.renderCard({ content: 'Card content', variant: 'raised' });
  assert.match(card, /class="zap-card zap-card-raised"/);

  // 7. Dropzone
  const dropzone = ui.renderDropzone({ state: 'dragging', content: '<div class="idle-glyph"></div>' });
  assert.match(dropzone, /class="zap-dropzone is-dragging"/);
  assert.match(dropzone, /role="button"/);

  // 8. Progress
  const progress = ui.renderProgress({ value: 50, max: 100 });
  assert.match(progress, /role="progressbar"/);
  assert.match(progress, /aria-valuenow="50"/);

  // 9. Dialog
  const dialog = ui.renderDialog({ id: 'pairing-modal', title: 'Device Pairing', content: '<p>QR</p>' });
  assert.match(dialog, /<dialog id="pairing-modal"/);
  assert.match(dialog, /Device Pairing/);

  // 10. Toast
  const toast = ui.renderToast({ message: 'Converted successfully', variant: 'success' });
  assert.match(toast, /role="status"/);
  assert.match(toast, /Converted successfully/);

  // 11. Skeleton
  const skeleton = ui.renderSkeleton({ variant: 'circle', width: '40px', height: '40px' });
  assert.match(skeleton, /zap-skeleton-circle/);

  // 12. Tooltip
  const tooltip = ui.renderTooltip({ id: 'tt-1', text: 'Lossless quality' });
  assert.match(tooltip, /role="tooltip"/);
  assert.match(tooltip, /Lossless quality/);
});

test('UI Preset: exports theme configuration extending colors and timing functions', () => {
  assert.ok(ui.zapPreset.theme);
  assert.equal(ui.zapPreset.theme.extend.colors.accent.DEFAULT, 'var(--color-accent)');
  assert.equal(ui.zapPreset.theme.extend.colors.surface.DEFAULT, 'var(--color-surface)');
  assert.equal(ui.zapPreset.theme.extend.transitionTimingFunction.snap, 'cubic-bezier(0.2, 0, 0, 1)');
});

test('UI Errors: formatBytes correctly formats human readable sizes', () => {
  assert.equal(ui.formatBytes(0), '0 B');
  assert.equal(ui.formatBytes(512), '512 B');
  assert.equal(ui.formatBytes(1024), '1 KB');
  assert.equal(ui.formatBytes(5242880), '5 MB');
  assert.equal(ui.formatBytes(10485760), '10 MB');
});

test('UI Errors: resolveError maps all Zapwebp codes to human messages and targets', () => {
  // 1. E_UNSAFE_SVG
  const unsafe = ui.resolveError('E_UNSAFE_SVG');
  assert.equal(unsafe.component, 'modal');
  assert.equal(unsafe.severity, 'error');
  assert.match(unsafe.title, /Unsafe SVG/);
  assert.match(unsafe.fix, /--allow-unsafe/);

  // 2. E_TOO_LARGE
  const tooLarge = ui.resolveError('E_TOO_LARGE', { maxBytes: 5242880 });
  assert.equal(tooLarge.component, 'banner');
  assert.equal(tooLarge.severity, 'warning');
  assert.match(tooLarge.message, /5 MB/);

  // 3. E_OUTPUT_TOO_LARGE (retryable)
  const outputTooLarge = ui.resolveError('E_OUTPUT_TOO_LARGE', { actualBytes: 780000, maxBytes: 500000 });
  assert.equal(outputTooLarge.retryable, true);
  assert.equal(outputTooLarge.suggestedRetry.quality, 70);

  // 4. E_ALPHA_NOT_REPRESENTABLE (retryable)
  const alphaErr = ui.resolveError('E_ALPHA_NOT_REPRESENTABLE');
  assert.equal(alphaErr.component, 'modal');
  assert.equal(alphaErr.retryable, true);
  assert.equal(alphaErr.suggestedRetry.background, '#ffffff');

  // 5. E_UNSUPPORTED_FORMAT
  const unsup = ui.resolveError('E_UNSUPPORTED_FORMAT', { detected: 'bmp' });
  assert.equal(unsup.component, 'toast');
  assert.match(unsup.message, /"bmp"/);

  // 6. E_CORRUPT_HEADER
  const corrupt = ui.resolveError('E_CORRUPT_HEADER');
  assert.equal(corrupt.component, 'card');
  assert.equal(corrupt.severity, 'error');

  // 7. Unknown fallback
  const unknown = ui.resolveError(new Error('Unknown problem'));
  assert.equal(unknown.code, 'E_UNKNOWN');
  assert.match(unknown.message, /Unknown problem/);
});

test('UI Primitives: renders new Error & Upload components', () => {
  // Toast
  const toastHtml = ui.renderZapToast({ title: 'Converted', message: '3 files ready', type: 'success' });
  assert.match(toastHtml, /class="zap-toast type-success/);
  assert.match(toastHtml, /Converted/);
  assert.match(toastHtml, /role="status"/);

  // Banner
  const bannerHtml = ui.renderZapBanner({ title: 'Warning', message: 'File is big', type: 'warning' });
  assert.match(bannerHtml, /class="zap-banner type-warning/);
  assert.match(bannerHtml, /role="region"/);

  // Modal
  const modalHtml = ui.renderZapModal({ title: 'Security Alert', message: 'Bad SVG', fix: 'Remove tag' });
  assert.match(modalHtml, /role="dialog"/);
  assert.match(modalHtml, /Security Alert/);
  assert.match(modalHtml, /Remove tag/);

  // Error Card
  const cardHtml = ui.renderZapErrorCard({ code: 'E_UNSAFE_SVG', title: 'Unsafe SVG', message: 'Contains script', fix: 'Strip scripts' });
  assert.match(cardHtml, /role="alert"/);
  assert.match(cardHtml, /E_UNSAFE_SVG/);
  assert.match(cardHtml, /Strip scripts/);

  // Dropzone
  const dropzoneHtml = ui.renderZapDropzone({ accept: 'image/png,image/webp', title: 'Drop images' });
  assert.match(dropzoneHtml, /role="button"/);
  assert.match(dropzoneHtml, /Drop images/);
  assert.match(dropzoneHtml, /accept="image\/png,image\/webp"/);

  // Upload Button
  const buttonHtml = ui.renderZapUploadButton({ label: 'Select Images' });
  assert.match(buttonHtml, /Select Images/);
  assert.match(buttonHtml, /<input type="file"/);

  // Upload Progress
  const progressHtml = ui.renderZapUploadProgress({ total: 10, completed: 7, failed: 1 });
  assert.match(progressHtml, /role="progressbar"/);
  assert.match(progressHtml, /aria-valuenow="80"/);
  assert.match(progressHtml, /7 of 10 completed \(1 failed\)/);
});

test('UI State: createZapStore transitions states and tracks conversions', async () => {
  const store = ui.createZapStore({ targetFormat: 'webp' });
  assert.equal(store.status, 'idle');
  assert.equal(store.progress, 0);
  assert.deepEqual(store.errors, []);

  let notifyCount = 0;
  const unsubscribe = store.subscribe(() => {
    notifyCount++;
  });

  const mockFiles = [{ name: 'logo.svg', size: 1024 }];
  const res = await store.upload(mockFiles);
  assert.ok(notifyCount >= 2);
  assert.equal(store.status, 'done');
  assert.equal(store.progress, 100);
  assert.equal(store.lastResult.length, 1);
  assert.equal(store.lastResult[0].name, 'logo.svg');

  // Reset
  store.reset();
  assert.equal(store.status, 'idle');
  assert.equal(store.progress, 0);

  // Error handling in store
  const failingStore = ui.createZapStore({
    uploader: async () => {
      const err = new Error('File exceeds limit');
      err.code = 'E_TOO_LARGE';
      throw err;
    },
  });

  await assert.rejects(async () => {
    await failingStore.upload(mockFiles);
  }, /File exceeds limit/);

  assert.equal(failingStore.status, 'error');
  assert.equal(failingStore.errors.length, 1);
  assert.equal(failingStore.errors[0].code, 'E_TOO_LARGE');

  unsubscribe();
});

test('UI Frameworks: React, Vue, Svelte, and Blade adapters export correctly', () => {
  const react = require('../src/frameworks/react');
  assert.ok(typeof react.useZapError === 'function');
  assert.ok(typeof react.useZapStore === 'function');
  assert.ok(typeof react.ZapDropzone === 'function');

  const vue = require('../src/frameworks/vue');
  assert.ok(typeof vue.useZapError === 'function');
  assert.ok(vue.ZapDropzone.name === 'ZapDropzone');

  const svelte = require('../src/frameworks/svelte');
  assert.ok(typeof svelte.zapDropzone === 'function');

  const blade = require('../src/frameworks/blade');
  assert.ok(blade.BLADE_COMPONENTS.includes('dropzone'));
  assert.ok(blade.BLADE_COMPONENTS.includes('toast'));
  assert.ok(blade.BLADE_COMPONENTS.includes('modal'));
  const dropzoneTmpl = blade.getBladeTemplate('dropzone');
  assert.match(dropzoneTmpl, /<zap-dropzone/);
});
