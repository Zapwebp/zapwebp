import { ZapErrorInfo, ShowErrorOptions } from '../errors';
import { ZapStore } from '../state';

export declare function useZapError(): {
  showError: (codeOrError: string | Error, context?: Record<string, any>, options?: ShowErrorOptions) => any;
  dismissAll: () => void;
  resolveError: (code: string | Error, context?: Record<string, any>) => ZapErrorInfo;
};

export declare function useZapStore(): ZapStore;

export declare const ZapToast: any;
export declare const ZapBanner: any;
export declare const ZapModal: any;
export declare const ZapErrorCard: any;
export declare const ZapDropzone: any;
export declare const ZapUploadButton: any;
export declare const ZapUploadProgress: any;

