export interface ZapToastOptions {
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'top' | 'bottom';
  code?: string;
  retryable?: boolean;
  suggestedRetry?: Record<string, any>;
  onRetry?: (suggested?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export declare class ZapToast {
  constructor(options?: ZapToastOptions);
  mount(targetContainer?: HTMLElement): this;
  dismiss(): void;
  static show(options: ZapToastOptions): ZapToast;
  static success(message: string, options?: Partial<ZapToastOptions>): ZapToast;
  static error(message: string, options?: Partial<ZapToastOptions>): ZapToast;
  static warning(message: string, options?: Partial<ZapToastOptions>): ZapToast;
  static info(message: string, options?: Partial<ZapToastOptions>): ZapToast;
}

export declare function renderZapToast(options?: ZapToastOptions & { className?: string }): string;

