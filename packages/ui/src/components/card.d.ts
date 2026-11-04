export interface ZapErrorCardOptions {
  title?: string;
  message?: string;
  fix?: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
  retryable?: boolean;
  suggestedRetry?: Record<string, any>;
  onRetry?: (suggested?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export declare class ZapErrorCard {
  constructor(options?: ZapErrorCardOptions);
  mount(targetContainer?: HTMLElement): this;
  dismiss(): void;
}

export declare function renderZapErrorCard(options?: ZapErrorCardOptions & { className?: string }): string;

