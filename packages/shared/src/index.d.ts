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
}

export interface ConversionPolicy {
  quality: {
    mode: 'lossy' | 'lossless' | 'auto';
    default: number;
    perFormat?: Record<string, number>;
  };
  limits: {
    maxInputBytes: number;
    maxOutputBytes?: number;
    targetOutputBytes?: number;
  };
  formats: {
    accept: string[];
    reject: string[];
  };
  advanced?: {
    effort: number;
    stripMetadata: boolean;
    preserveColorProfile: boolean;
  };
}

export const DEFAULT_OPTIONS: ZapwebpOptions;
export const DEFAULT_CONVERSION_POLICY: ConversionPolicy;

export const ERROR_CATALOG: Record<string, { code: string; message: string }>;

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
