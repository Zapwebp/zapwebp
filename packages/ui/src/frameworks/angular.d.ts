export class ZapUiService {
  showError: (codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>) => any;
  dismissAll: () => void;
  resolveError: (code: string, context?: Record<string, any>) => any;
  createStore: (options?: Record<string, any>) => any;
  useStore: (customStore?: any) => any;
}

export function provideZapUi(): {
  provide: typeof ZapUiService;
  useClass: typeof ZapUiService;
};

export function defineCustomElements(): void;
export function showError(codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>): any;
export function dismissAllErrors(): void;
export function resolveError(code: string, context?: Record<string, any>): any;
