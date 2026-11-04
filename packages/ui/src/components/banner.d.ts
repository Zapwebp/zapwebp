export interface ZapBannerOptions {
  title?: string;
  message?: string;
  fix?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  position?: 'inline' | 'top' | 'bottom';
  layout?: 'horizontal' | 'vertical';
  actions?: string[] | string;
  code?: string;
  retryable?: boolean;
  suggestedRetry?: Record<string, any>;
  onRetry?: (suggested?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export declare class ZapBanner {
  constructor(options?: ZapBannerOptions);
  mount(targetContainer?: HTMLElement): this;
  dismiss(): void;
}

export declare function renderZapBanner(options?: ZapBannerOptions & { className?: string, showActions?: boolean }): string;

