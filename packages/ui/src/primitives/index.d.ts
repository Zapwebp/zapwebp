export interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  iconLeft?: string;
  iconRight?: string;
}
export function renderButton(props?: ButtonProps): string;

export interface IconButtonProps {
  iconSvg?: string;
  ariaLabel?: string;
  variant?: 'rounded' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  id?: string;
}
export function renderIconButton(props?: IconButtonProps): string;

export interface InputProps {
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}
export function renderInput(props?: InputProps): string;

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
}
export function renderSwitch(props?: SwitchProps): string;

export interface BadgeProps {
  text?: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
}
export function renderBadge(props?: BadgeProps): string;

export interface CardProps {
  content?: string;
  variant?: 'default' | 'raised' | 'interactive';
  className?: string;
}
export function renderCard(props?: CardProps): string;

export interface DropzoneProps {
  id?: string;
  state?: 'idle' | 'hover' | 'dragging' | 'converting' | 'done';
  content?: string;
  ariaLabel?: string;
  className?: string;
}
export function renderDropzone(props?: DropzoneProps): string;

export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: 'linear' | 'ring';
  indeterminate?: boolean;
  className?: string;
}
export function renderProgress(props?: ProgressProps): string;

export interface DialogProps {
  id?: string;
  title?: string;
  content?: string;
  className?: string;
}
export function renderDialog(props?: DialogProps): string;

export interface ToastProps {
  message?: string;
  variant?: 'success' | 'error' | 'info';
  id?: string;
  className?: string;
}
export function renderToast(props?: ToastProps): string;

export interface SkeletonProps {
  variant?: 'text' | 'block' | 'circle';
  width?: string;
  height?: string;
  className?: string;
}
export function renderSkeleton(props?: SkeletonProps): string;

export interface TooltipProps {
  id?: string;
  text?: string;
  className?: string;
}
export function renderTooltip(props?: TooltipProps): string;
