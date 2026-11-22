export function useZapError(): {
  showError: (codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>) => any;
  dismissAll: () => void;
  resolveError: (code: string, context?: Record<string, any>) => any;
};

export function useZapStore(customStore?: any): any;
export function showError(codeOrError: string | Error, context?: Record<string, any>, options?: Record<string, any>): any;
export function dismissAllErrors(): void;

export const ZapToast: any;
export const ZapBanner: any;
export const ZapModal: any;
export const ZapErrorCard: any;
export const ZapDropzone: any;
export const ZapUploadButton: any;
export const ZapUploadProgress: any;
export const ZapFormatSelector: any;
export const ZapQualitySlider: any;
export const ZapDiffViewer: any;
export const ZapFileCard: any;
export const ZapBatchBar: any;
