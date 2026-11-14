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
