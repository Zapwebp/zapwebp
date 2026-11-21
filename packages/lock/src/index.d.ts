export interface LockData {
  version: string;
  inputSha256: string;
  optionsSha256: string;
  engineVersion: string;
  convertedAt: string;
  optionsSummary?: {
    to: string;
    quality: number;
    clean?: boolean;
    lossless?: boolean;
    width?: number;
    height?: number;
    background?: string;
  };
}

export interface LockPluginOptions {
  /**
   * Enable the lock. Default: true.
   */
  enabled?: boolean;

  /**
   * Force re-conversion even if the lock matches. Default: false.
   */
  force?: boolean;

  /**
   * Invalidate the lock if the engine version differs. Default: true.
   */
  invalidateOnEngineChange?: boolean;

  /**
   * Active engine version to lock against.
   */
  engineVersion?: string;

  /**
   * The metadata format to write the lock in. Default: 'container'.
   */
  metadataFormat?: 'container' | 'xmp' | 'exif';
}

export interface LockVerificationResult {
  enabled: boolean;
  detected: boolean;
  match: boolean;
  skipped: boolean;
  reason:
    | 'options_hash_match'
    | 'options_hash_mismatch'
    | 'input_hash_mismatch'
    | 'engine_version_mismatch'
    | 'no_lock_present'
    | 'no_existing_file'
    | 'forced';
  inputSha256?: string;
  optionsSha256?: string;
  engineVersion?: string;
  convertedAt?: string;
  optionsSummary?: Record<string, unknown>;
  storedOptionsHash?: string;
  currentOptionsHash?: string;
  storedInputHash?: string;
  currentInputHash?: string;
  storedEngineVersion?: string;
  currentEngineVersion?: string;
  lock?: LockData;
}

export const LOCK_VERSION: string;
export const ENGINE_VERSION: string;
export const LOCK_KEYWORD: string;

export function computeOptionsHash(options?: Record<string, unknown>): string;
export function createLockFingerprint(params: {
  input: Buffer | Uint8Array;
  options?: Record<string, unknown>;
  engineVersion?: string;
}): { 'zapwebp:lock': LockData };
export function writeLock(buffer: Buffer | Uint8Array, format: string, lockData: object): Buffer;
export function readLock(buffer: Buffer | Uint8Array, format?: string): LockData | null;
export function verifyLock(
  existingBuffer: Buffer | Uint8Array,
  currentInputBuffer?: Buffer | Uint8Array,
  currentOptions?: Record<string, unknown>,
  lockOptions?: LockPluginOptions
): LockVerificationResult;
export function createLockPlugin(pluginOptions?: LockPluginOptions): {
  name: string;
  version: string;
  hooks: {
    beforeConvert(context: Record<string, unknown>): Promise<Record<string, unknown>>;
    afterConvert(context: Record<string, unknown>, outputs: any): Promise<any>;
  };
};

export const lockPlugin: typeof createLockPlugin;
export default createLockPlugin;
