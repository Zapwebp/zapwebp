export interface StorageAdapter {
  readonly name: string;

  /** Write bytes to the bucket. */
  write(bucket: string, path: string, bytes: Uint8Array, opts: WriteOptions): Promise<WriteResult>;

  /** Read bytes from the bucket. */
  read(bucket: string, path: string): Promise<Uint8Array>;

  /** Delete a file from the bucket. */
  delete(bucket: string, path: string): Promise<void>;

  /** Check if a file exists. Optional — for idempotency. */
  exists?(bucket: string, path: string): Promise<boolean>;

  /** List files under a prefix. Optional — for sync + cleanup. */
  list?(bucket: string, prefix: string): Promise<string[]>;
}

export interface WriteOptions {
  contentType: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface WriteResult {
  path: string;
  bytes: number;
  publicUrl?: string;
}

export interface ZapwebpStorageOptions {
  /** Width multipliers to generate (e.g. [1, 2, 3]). Default: [1] */
  scale?: number[];
  /** Base width for 1x multiplier. Default: 512 */
  baseWidth?: number;
  /** WebP lossy compression quality (1-100). Default: 85 */
  quality?: number;
  /** Encode lossless WebP. Default: false */
  lossless?: boolean;
  /** Strip metadata (EXIF/XMP/C2PA) and provenance. Default: true */
  clean?: boolean;
  /** Max source file size in bytes. Default: 5MB (5242880) */
  maxBytes?: number;
  /** Whether to upload the source file alongside converted WebPs. Default: false */
  keepOriginal?: boolean;
  /** Optional directory prefix for outputs in bucket. */
  outPrefix?: string;
  /** Handling when destination asset exists: 'overwrite' | 'skip' | 'error'. Default: 'skip' */
  onConflict?: 'overwrite' | 'skip' | 'error';
  /** Whether to emit manifest for responsive srcset and delete cascades. Default: true */
  emitManifest?: boolean;
  /** Background hex color (required when converting transparent source to JPEG). */
  background?: string;
  /** Concurrency level for batch uploads (1-16). Default: 4 */
  concurrency?: number;
  /** Target format for locked outputs. Default: 'webp' */
  targetFormat?: string;
  /** Strict conversion enforcement. Default: true */
  strict?: boolean;
  /** Custom transforms pipeline */
  transforms?: any[];
  /** Unified conversion policy */
  policy?: any;
}

export interface StorageConfig {
  provider: 'supabase' | 'firebase' | 'neocities' | 'custom';
  bucket: string;
  credentials?: {
    user?: string;
    password?: string;
    site?: string;
  };
  client?: any;
  options?: ZapwebpStorageOptions;
  concurrency?: number;
  retry?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
}

export interface UploadSourceInfo {
  path: string;
  bytes: number;
  format: string;
}

export interface UploadOutputInfo extends WriteResult {
  scale: number;
  width: number;
  sha256?: string;
}

export interface UploadReport {
  source: UploadSourceInfo;
  outputs: UploadOutputInfo[];
  manifest?: any;
  skipped?: boolean;
  targetFormat?: string;
  targetLockEnforced?: boolean;
  targetLockBypassed?: boolean;
}

export interface BatchSummary {
  files: number;
  bytesIn: number;
  bytesOut: number;
  savedBytes: number;
  saved: number;
}

export interface BatchUploadReport {
  summary: BatchSummary;
  reports: UploadReport[];
  manifest?: any;
}

export interface BatchUploadFile {
  path: string;
  bytes: Uint8Array | Buffer | string;
}

export interface ZapwebpStorageInstance {
  readonly adapter: StorageAdapter;
  readonly options: Required<ZapwebpStorageOptions>;
  upload(bucket: string, path: string, bytes: Uint8Array | Buffer | string): Promise<UploadReport>;
  uploadMany(bucket: string, files: BatchUploadFile[], options?: { concurrency?: number }): Promise<BatchUploadReport>;
  remove(bucket: string, path: string): Promise<void>;
}
