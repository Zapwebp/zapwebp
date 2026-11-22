export function useZapError(): {
  showError: (codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>) => any;
  dismissAll: () => void;
  resolveError: (code: string, context?: Record<string, any>) => any;
};

export function useZapStore(customStore?: any): any;
export function showError(codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>): any;
export function dismissAllErrors(): void;

export const ZapToast: (props?: any) => any;
export const ZapBanner: (props?: any) => any;
export const ZapModal: (props?: any) => any;
export const ZapErrorCard: (props?: any) => any;
export const ZapDropzone: (props?: any) => any;
export const ZapUploadButton: (props?: any) => any;
export const ZapUploadProgress: (props?: any) => any;
export const ZapFormatSelector: (props?: any) => any;
export const ZapQualitySlider: (props?: any) => any;
export const ZapDiffViewer: (props?: any) => any;
export const ZapFileCard: (props?: any) => any;
export const ZapBatchBar: (props?: any) => any;
