'use strict';

/**
 * 12 Core UI Primitives for Zapwebp
 * Accessible, token-compliant primitives designed for SSR, React, and Vanilla Web.
 */

function cx(...args) {
  return args.flat().filter(Boolean).join(' ').trim();
}

/**
 * 1. Button
 * Variants: 'primary', 'secondary', 'ghost', 'danger'
 * Sizes: 'sm', 'md', 'lg'
 */
function renderButton({
  label = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  ariaLabel,
  className = '',
  iconLeft = '',
  iconRight = '',
} = {}) {
  const classes = cx('zap-btn', `zap-btn-${variant}`, `zap-btn-${size}`, className);
  const ariaAttr = ariaLabel ? ` aria-label="${ariaLabel}"` : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const leftHtml = iconLeft ? `<span class="zap-btn-icon-left" aria-hidden="true">${iconLeft}</span>` : '';
  const rightHtml = iconRight ? `<span class="zap-btn-icon-right" aria-hidden="true">${iconRight}</span>` : '';
  return `<button type="${type}" class="${classes}"${ariaAttr}${disabledAttr}>${leftHtml}${label}${rightHtml}</button>`;
}

/**
 * 2. IconButton
 * Variants: 'rounded', 'ghost'
 */
function renderIconButton({
  iconSvg = '',
  ariaLabel = '',
  variant = 'rounded',
  size = 'md',
  disabled = false,
  className = '',
  id = '',
} = {}) {
  const idAttr = id ? ` id="${id}"` : '';
  const classes = cx('zap-icon-btn', `zap-icon-btn-${variant}`, `zap-icon-btn-${size}`, className);
  const disabledAttr = disabled ? ' disabled' : '';
  return `<button type="button"${idAttr} class="${classes}" aria-label="${ariaLabel}"${disabledAttr}>${iconSvg}</button>`;
}

/**
 * 3. Input
 */
function renderInput({
  id = '',
  name = '',
  type = 'text',
  value = '',
  placeholder = '',
  error = '',
  hint = '',
  disabled = false,
  className = '',
} = {}) {
  const inputClass = cx('zap-input', error && 'is-invalid', className);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : '';
  const describedAttr = describedBy ? ` aria-describedby="${describedBy}"` : '';
  const disabledAttr = disabled ? ' disabled' : '';
  const hintHtml = hint ? `<span id="${id}-hint" class="zap-input-hint">${hint}</span>` : '';
  const errorHtml = error ? `<span id="${id}-error" class="zap-input-error" role="alert">${error}</span>` : '';

  return `
<div class="zap-input-wrapper">
  <input id="${id}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" class="${inputClass}"${describedAttr}${disabledAttr} />
  ${hintHtml}
  ${errorHtml}
</div>`.trim();
}

/**
 * 4. Switch
 */
function renderSwitch({
  id = '',
  checked = false,
  label = '',
  disabled = false,
  className = '',
} = {}) {
  const switchClass = cx('zap-switch', checked && 'is-checked', className);
  const checkedAttr = checked ? ' aria-checked="true"' : ' aria-checked="false"';
  const disabledAttr = disabled ? ' disabled' : '';
  return `
<button id="${id}" type="button" role="switch"${checkedAttr}${disabledAttr} class="${switchClass}" aria-label="${label}">
  <span class="zap-switch-thumb" aria-hidden="true"></span>
</button>`.trim();
}

/**
 * 5. Badge
 * Variants: 'neutral', 'success', 'warning', 'danger'
 */
function renderBadge({
  text = '',
  variant = 'neutral',
  className = '',
} = {}) {
  const classes = cx('zap-badge', `zap-badge-${variant}`, className);
  return `<span class="${classes}">${text}</span>`.trim();
}

/**
 * 6. Card
 * Variants: 'default', 'raised', 'interactive'
 */
function renderCard({
  content = '',
  variant = 'default',
  className = '',
} = {}) {
  const classes = cx('zap-card', `zap-card-${variant}`, className);
  return `<div class="${classes}">${content}</div>`.trim();
}

/**
 * 7. Dropzone
 * States: 'idle', 'hover', 'dragging', 'converting', 'done'
 */
function renderDropzone({
  id = 'dropzone',
  state = 'idle',
  content = '',
  ariaLabel = 'Drop images here to convert',
  className = '',
} = {}) {
  const classes = cx('zap-dropzone', state !== 'idle' && `is-${state}`, className);
  return `<section id="${id}" class="${classes}" tabindex="0" role="button" aria-label="${ariaLabel}">${content}</section>`.trim();
}

/**
 * 8. Progress
 * Variants: 'linear', 'ring'
 */
function renderProgress({
  value = 0,
  max = 100,
  variant = 'linear',
  indeterminate = false,
  className = '',
} = {}) {
  if (variant === 'ring') {
    const ringClass = cx('zap-progress-ring', className);
    return `<div class="${ringClass}" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}"></div>`;
  }
  const fillWidth = indeterminate ? '30%' : `${Math.round((value / max) * 100)}%`;
  const trackClass = cx('zap-progress-track', className);
  const fillClass = cx('zap-progress-fill', indeterminate && 'is-indeterminate');
  return `
<div class="${trackClass}" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}">
  <div class="${fillClass}" style="width: ${fillWidth};"></div>
</div>`.trim();
}

/**
 * 9. Dialog (native <dialog>)
 */
function renderDialog({
  id = '',
  title = '',
  content = '',
  className = '',
} = {}) {
  const dialogClass = cx('zap-dialog', className);
  return `
<dialog id="${id}" class="${dialogClass}">
  <div class="zap-dialog-header">
    <h2 class="zap-dialog-title">${title}</h2>
  </div>
  <div class="zap-dialog-body">${content}</div>
</dialog>`.trim();
}

/**
 * 10. Toast
 * Variants: 'success', 'error', 'info'
 */
function renderToast({
  message = '',
  variant = 'info',
  id = '',
  className = '',
} = {}) {
  const idAttr = id ? ` id="${id}"` : '';
  const toastClass = cx('zap-toast', `zap-toast-${variant}`, className);
  return `<div${idAttr} class="${toastClass}" role="status" aria-live="polite">${message}</div>`.trim();
}

/**
 * 11. Skeleton
 * Variants: 'text', 'block', 'circle'
 */
function renderSkeleton({
  variant = 'block',
  width = '100%',
  height = '1rem',
  className = '',
} = {}) {
  const skeletonClass = cx('zap-skeleton', `zap-skeleton-${variant}`, className);
  return `<div class="${skeletonClass}" style="width: ${width}; height: ${height};" aria-hidden="true"></div>`.trim();
}

/**
 * 12. Tooltip
 */
function renderTooltip({
  id = '',
  text = '',
  className = '',
} = {}) {
  const tooltipClass = cx('zap-tooltip', className);
  return `<div id="${id}" role="tooltip" class="${tooltipClass}">${text}</div>`.trim();
}

module.exports = {
  renderButton,
  renderIconButton,
  renderInput,
  renderSwitch,
  renderBadge,
  renderCard,
  renderDropzone,
  renderProgress,
  renderDialog,
  renderToast,
  renderSkeleton,
  renderTooltip,
};
