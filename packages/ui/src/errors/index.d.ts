export interface ZapErrorInfo {
  code: string;
  title: string;
  message: string;
  fix: string;
  component: 'modal' | 'banner' | 'toast' | 'card';
  severity: 'error' | 'warning' | 'info';
  retryable: boolean;
  suggestedRetry?: Record<string, any>;
}

export interface ShowErrorOptions {
  container?: HTMLElement;
  onRetry?: (suggested?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function resolveError(codeOrError: string | Error, context?: Record<string, any>): ZapErrorInfo;
export declare function showError(codeOrError: string | Error, context?: Record<string, any>, options?: ShowErrorOptions): any;
export declare function dismissAllErrors(): void;

export declare const ERROR_MAP: Record<string, {
  title: string;
  message: string | ((ctx?: any) => string);
  fix: string;
  component: 'modal' | 'banner' | 'toast' | 'card';
  severity: 'error' | 'warning' | 'info';
  retryable: boolean;
  suggestedRetry?: Record<string, any>;
}>;

