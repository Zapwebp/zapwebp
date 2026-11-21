export interface ZapwebpLimits {
  maxFilesPerRequest: number | null;
  maxFilesPerSession: number | null;
  maxFilesPerUser: number | null;
  maxBytesPerRequest: number | null;
  maxConcurrent: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  } | null;
}

export interface LimitsMetadata {
  filesProcessed: number;
  filesRemaining: number | null;
  bytesProcessed: number;
  bytesRemaining: number | null;
  maxFilesPerRequest: number | null;
  usedFiles: number;
  remainingFiles: number | null;
  maxBytesPerRequest: number | null;
  usedBytes: number;
  remainingBytes: number | null;
  maxConcurrent: number;
  rateLimit?: {
    remaining: number;
    resetIn: number;
  };
  session: {
    maxFilesPerSession: number | null;
    usedFiles: number;
    remainingFiles: number | null;
  };
}

export const DEFAULT_LIMITS: Readonly<ZapwebpLimits>;
export function resolveLimits(userLimits?: Partial<ZapwebpLimits> | Record<string, any>): ZapwebpLimits;
export function formatBytes(bytes: number, decimals?: number): string;
export function evaluateLimits(params: {
  filesCount?: number;
  totalBytes?: number;
  sessionCount?: number;
  userCount?: number;
  limits?: ZapwebpLimits | Record<string, any>;
}): void;
export function createLimitsMetadata(params?: {
  filesCount?: number;
  totalBytes?: number;
  sessionCount?: number;
  limits?: ZapwebpLimits | Record<string, any>;
}): LimitsMetadata;

export class RateLimiter {
  constructor(options?: { maxRequests?: number; windowMs?: number });
  check(key?: string): boolean;
  record(key?: string, count?: number): void;
  remaining(key?: string): number;
  resetIn(key?: string): number;
}

export const APP_ORIGIN: string;
export const DEFAULT_PORT: number;
export const DEFAULT_TIMEOUT_MS: number;
export const MAX_DIMENSION: number;
export const MAX_PIXELS: number;
export const MAX_SVG_DEPTH: number;
export const MAX_DATA_URI_BYTES: number;
export const DEFAULT_CACHE_CONTROL: string;
export const ZAPWEBP_USER_AGENT: string;

export interface ZapwebpOptions {
  scale: readonly number[];
  baseWidth: number;
  quality: number;
  effort: number;
  lossless: boolean;
  clean: boolean;
  stripMetadata: boolean;
  outDir: string;
  maxBytes: number;
  onConflict: 'skip' | 'overwrite' | 'fail';
  emitManifest: boolean;
  fit: string;
  to: string;
  keepOriginal: boolean;
  deleteOnDownload: boolean;
  cleanupDelay: 'immediate' | 'session' | 'manual';
  sameFormat?: 'passthrough' | 'reencode' | 'reject';
  sizeMode?: 'strict' | 'compress' | 'flexible';
  minInputBytes?: number;
  minOutputBytes?: number;
  maxOutputBytes?: number;
}

export interface ConversionPolicy {
  quality: {
    mode: 'lossy' | 'lossless' | 'auto';
    default: number;
    perFormat?: Record<string, number>;
  };
  limits: {
    minInputBytes?: number;
    maxInputBytes: number;
    minOutputBytes?: number;
    maxOutputBytes?: number;
    targetOutputBytes?: number;
  };
  formats: {
    accept: string[];
    reject: string[];
    sameFormat?: 'passthrough' | 'reencode' | 'reject';
  };
  size?: {
    mode: 'strict' | 'compress' | 'flexible';
  };
  advanced?: {
    effort: number;
    stripMetadata: boolean;
    preserveColorProfile: boolean;
  };
}

export const DEFAULT_OPTIONS: ZapwebpOptions;
export const DEFAULT_CONVERSION_POLICY: ConversionPolicy;

export class ZapwebpError extends Error {
  readonly code: string;
  readonly fix: string;
  readonly docs: string;
  readonly exitCode: number;
  readonly retryable: boolean;
  readonly input?: any;
  readonly target?: string;
  readonly suggestedFix?: Record<string, unknown>;

  constructor(opts: {
    code: string;
    message: string;
    fix?: string;
    docs?: string;
    exitCode?: number;
    input?: any;
    target?: string;
    suggestedFix?: Record<string, unknown>;
    retryable?: boolean;
    [key: string]: any;
  });

  toJSON(): Record<string, any>;
}

export const ERROR_CATALOG: Record<string, { code: string; message: string; fix?: string; suggestedFix?: Record<string, unknown> }>;

export const INPUT_FORMATS: readonly string[];
export const OUTPUT_FORMATS: readonly string[];
export const ALPHA_FORMATS: readonly string[];

export const MIME_MAP: Readonly<Record<string, string>>;
export const EXT_MAP: Readonly<Record<string, readonly string[]>>;

export interface ConversionPair {
  from: string;
  to: string;
  slug: string;
}

export const supportedPairs: readonly ConversionPair[];
export function getSupportedPairs(): readonly ConversionPair[];
export function supportsAlpha(format: string): boolean;
export function getMimeType(format: string): string;
export function getCanonicalUrl(routePath?: string): string;

export interface ReliabilityMetric {
  id: string;
  name: string;
  pkg: string;
  uptimePct: number;
  totalRuns: number;
  failures: number;
  soakCycles: number;
  memoryStability: string;
  adversarialRejection: string;
  status: string;
}

export namespace reliability {
  export const GOLDEN_CASES: readonly any[];
  export const SVG_SAMPLE: string;
  export const PNG_TRANSPARENT_SAMPLE: Buffer;
  export const JPEG_OPAQUE_SAMPLE: Buffer;
  export const WEBP_SAMPLE: Buffer;
  export function hashBuffer(data: Buffer | Uint8Array): string;
  export function verifyGoldenCase(goldenCase: any, convertFn: (input: any, opts: any) => Promise<any>): Promise<any>;
  export const ADVERSARIAL_FIXTURES: Readonly<Record<string, any>>;
  export function verifyAdversarialRejection(key: string, runnerFn: (data: Buffer, name: string) => Promise<any>): Promise<any>;
  export function runSoakTest(runnerFn: (iteration: number) => Promise<any>, options?: { iterations?: number; maxRssGrowthMb?: number; name?: string }): Promise<any>;
  export const RELIABILITY_METRICS: readonly ReliabilityMetric[];
  export function getReliabilitySummary(): { totalIntegrations: number; totalRuns: number; averageUptime: number; activeIncidents: number; allPassing: boolean };
  export function formatReliabilityTable(): string;
}

export interface LimitsConfig {
  maxFilesPerRequest?: number | null | 'unlimited';
  maxFilesPerSession?: number | null | 'unlimited';
  maxFilesPerUser?: number | null | 'unlimited';
  maxBytesPerRequest?: number | null | 'unlimited';
  maxConcurrent?: number | null | 'unlimited';
  concurrency?: {
    perRequest?: number | null | 'unlimited';
    perUser?: number | null | 'unlimited';
    global?: number | null | 'unlimited';
  };
  rateLimit?: {
    maxRequests?: number;
    windowMs?: number;
  } | null | 'unlimited' | false;
}

export interface ResolvedLimits {
  maxFilesPerRequest: number | null;
  maxFilesPerSession: number | null;
  maxFilesPerUser: number | null;
  maxBytesPerRequest: number | null;
  maxConcurrent: number;
  concurrency: {
    perRequest: number;
    perUser: number | null;
    global: number | null;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  } | null;
}

export const DEFAULT_LIMITS: ResolvedLimits;
export function resolveLimits(userLimits?: LimitsConfig): ResolvedLimits;
export function formatBytes(bytes: number, decimals?: number): string;
export function evaluateLimits(params: {
  filesCount: number;
  totalBytes?: number;
  sessionCount?: number;
  userCount?: number;
  limits?: LimitsConfig | ResolvedLimits;
}): void;

export function createLimitsMetadata(params: {
  filesCount?: number;
  totalBytes?: number;
  sessionCount?: number;
  limits?: LimitsConfig | ResolvedLimits;
  rateLimit?: any;
  concurrencyStatus?: any;
}): Record<string, any>;

export abstract class RateLimitStore {
  abstract get(key: string, windowMs: number): { count: number; windowStart: number } | null | Promise<{ count: number; windowStart: number } | null>;
  abstract increment(key: string, count: number, windowMs: number): { count: number; windowStart: number } | Promise<{ count: number; windowStart: number }>;
  abstract clear(key?: string): void | Promise<void>;
}

export class MemoryRateLimitStore extends RateLimitStore {
  get(key: string, windowMs: number): { count: number; windowStart: number } | null;
  increment(key: string, count: number, windowMs: number): { count: number; windowStart: number };
  clear(key?: string): void;
}

export class FileRateLimitStore extends RateLimitStore {
  constructor(options?: { filePath?: string });
  get(key: string, windowMs: number): { count: number; windowStart: number } | null;
  increment(key: string, count: number, windowMs: number): { count: number; windowStart: number };
  clear(key?: string): void;
}

export class RateLimiter {
  constructor(options?: {
    maxRequests?: number;
    windowMs?: number;
    store?: RateLimitStore;
    keyPrefix?: string;
  });
  check(key?: string): boolean;
  checkAsync(key?: string): Promise<boolean>;
  record(key?: string, count?: number): void;
  recordAsync(key?: string, count?: number): Promise<void>;
  remaining(key?: string): number;
  remainingAsync(key?: string): Promise<number>;
  resetIn(key?: string): number;
  resetInAsync(key?: string): Promise<number>;
  clear(key?: string): void;
  clearAsync(key?: string): Promise<void>;
}

export class ConcurrencyLimiter {
  constructor(options?: {
    perRequest?: number | null;
    perUser?: number | null;
    global?: number | null;
    concurrency?: {
      perRequest?: number | null;
      perUser?: number | null;
      global?: number | null;
    };
  });
  acquire(params?: { userId?: string; count?: number }): { release: () => void };
  release(params?: { userId?: string; count?: number }): void;
  run<T>(taskFn: () => Promise<T>, params?: { userId?: string; count?: number }): Promise<T>;
  getStatus(params?: { userId?: string }): {
    activeGlobal: number;
    maxGlobal: number | null;
    activeUser: number;
    maxUser: number | null;
    perRequest: number;
  };
}

export function generateSessionId(): string;

export class SessionState {
  sessionId: string;
  surface: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  filesProcessed: number;
  bytesProcessed: number;
  requestsCount: number;
  constructor(params?: Partial<SessionState>);
  toJSON(): Record<string, any>;
}

export class MemorySessionStore {
  load(): SessionState | null;
  save(session: SessionState): void;
  clear(): void;
}

export class FileSessionStore {
  constructor(options?: { filePath?: string });
  load(): SessionState | null;
  save(session: SessionState): void;
  clear(): void;
}

export class WebSessionStore {
  constructor(options?: { storageKey?: string });
  load(): SessionState | null;
  save(session: SessionState): void;
  clear(): void;
}

export class SessionManager {
  constructor(options?: {
    surface?: string;
    store?: any;
    ttlMs?: number | null;
  });
  getSession(): SessionState;
  canProcess(count?: number, maxFilesPerSession?: number | null): boolean;
  record(params?: { filesCount?: number; bytesCount?: number; maxFilesPerSession?: number | null }): SessionState;
  reset(): SessionState;
}
