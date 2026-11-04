export interface ZapModalOptions {
  title?: string;
  message?: string;
  fix?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  code?: string;
  retryable?: boolean;
  suggestedRetry?: Record<string, any>;
  onRetry?: (suggested?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export declare class ZapModal {
  constructor(options?: ZapModalOptions);
  show(targetContainer?: HTMLElement): this;
  close(): void;
}

export declare function renderZapModal(options?: ZapModalOptions & { id?: string, open?: boolean, className?: string }): string;

