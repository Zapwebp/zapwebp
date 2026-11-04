import { ZapErrorInfo } from '../errors';

export interface ZapState {
  status: 'idle' | 'uploading' | 'converting' | 'done' | 'error';
  progress: number;
  errors: ZapErrorInfo[];
  lastResult: any;
  files: File[];
  targetFormat?: string;
}

export interface ZapStoreConfig {
  targetFormat?: string;
  initialState?: Partial<ZapState>;
  uploader?: (files: File[], options?: any) => Promise<any>;
}

export interface ZapStore {
  getState: () => ZapState;
  setState: (updates: Partial<ZapState>) => void;
  subscribe: (fn: (state: ZapState) => void) => () => void;
  upload: (files: File[] | FileList, options?: any) => Promise<any>;
  reset: () => void;
  clearErrors: () => void;
  dismissError: (index: number) => void;
  readonly status: ZapState['status'];
  readonly progress: number;
  readonly errors: ZapErrorInfo[];
  readonly lastResult: any;
  readonly files: File[];
}

export declare function createZapStore(config?: ZapStoreConfig): ZapStore;
export declare function useZapStore(config?: ZapStoreConfig): ZapStore;

