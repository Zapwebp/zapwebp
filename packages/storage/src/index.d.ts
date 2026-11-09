import type {
  StorageAdapter,
  WriteOptions,
  WriteResult,
  ZapwebpStorageOptions,
  UploadReport,
  BatchUploadReport,
  BatchUploadFile,
  ZapwebpStorageInstance,
} from './types';

export * from './types';

export function resolveOptions(options?: ZapwebpStorageOptions): Required<ZapwebpStorageOptions>;

export function withZapwebp(
  adapter: StorageAdapter,
  options?: ZapwebpStorageOptions,
): ZapwebpStorageInstance;

export function supabaseAdapter(client: any): StorageAdapter;
export function firebaseAdapter(storage: any, sdk?: any): StorageAdapter;
export function firebaseAdminAdapter(storage: any): StorageAdapter;
export function neocitiesAdapter(options: {
  user: string;
  password: string;
  site?: string;
}): StorageAdapter;
