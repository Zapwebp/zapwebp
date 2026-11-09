import {
  StorageAdapter,
  StorageConfig,
  WriteOptions,
  WriteResult,
  ZapwebpStorageOptions,
  UploadSourceInfo,
  UploadOutputInfo,
  UploadReport,
  BatchSummary,
  BatchUploadReport,
  BatchUploadFile,
  ZapwebpStorageInstance,
} from './types';

export {
  StorageAdapter,
  StorageConfig,
  WriteOptions,
  WriteResult,
  ZapwebpStorageOptions,
  UploadSourceInfo,
  UploadOutputInfo,
  UploadReport,
  BatchSummary,
  BatchUploadReport,
  BatchUploadFile,
  ZapwebpStorageInstance,
};

export declare const DEFAULT_OPTIONS: Readonly<Required<ZapwebpStorageOptions>>;

export declare function resolveOptions(userOptions?: ZapwebpStorageOptions): Required<ZapwebpStorageOptions>;

export declare function validateStorageConfig(config: StorageConfig): { valid: boolean; errors: string[] };

export declare function validateAdapterContract(adapter: any): { valid: boolean; errors: string[] };

export declare function validateStoragePath(filePath: string): string;

export declare function stripCredentials(input: string | Error): string;

export declare function withZapwebp(adapter: StorageAdapter, options?: ZapwebpStorageOptions): ZapwebpStorageInstance;

export declare function writeWithRetry(
  adapter: StorageAdapter,
  bucket: string,
  targetPath: string,
  data: Uint8Array | Buffer,
  writeOpts: WriteOptions,
  maxRetries?: number
): Promise<WriteResult>;

export declare function supabaseAdapter(client: any): StorageAdapter;

export declare const SUPABASE_RLS_TEMPLATES: {
  readonly AUTHENTICATED_ONLY: string;
  readonly PUBLIC_READ_ONLY: string;
};

export declare function firebaseAdapter(storage: any, sdk?: any): StorageAdapter;

export declare function firebaseAdminAdapter(storage: any): StorageAdapter;

export declare const FIREBASE_RULES_TEMPLATES: {
  readonly AUTHENTICATED_ONLY: string;
};

export declare function neocitiesAdapter(opts: { user: string; password: string; site?: string }): StorageAdapter;
