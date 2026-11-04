import { ZapErrorInfo, ShowErrorOptions } from '../errors';

export declare function zapDropzone(node: HTMLElement, options?: any): { destroy: () => void };
export declare function showError(codeOrError: string | Error, context?: Record<string, any>, options?: ShowErrorOptions): any;
export declare function dismissAllErrors(): void;
export declare function resolveError(code: string | Error, context?: Record<string, any>): ZapErrorInfo;

export declare const ZapToast: any;
export declare const ZapBanner: any;
export declare const ZapModal: any;
export declare const ZapErrorCard: any;
export declare const ZapDropzone: any;
export declare const ZapUploadButton: any;
export declare const ZapUploadProgress: any;

