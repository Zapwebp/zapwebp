import type { ConversionPolicy, ZapwebpError } from '@zapwebp/shared';
export { ZapwebpError };

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export function listTools(): McpToolDefinition[];
export function getAgentManifest(): Record<string, any>;
export function createMockSvg(options?: { width?: number; height?: number; transparent?: boolean; fill?: string; withMetadata?: boolean }): Buffer;
export function createMockImage(options?: { format?: 'svg' | 'png' | 'webp' | 'jpeg' | 'avif'; width?: number; height?: number; transparent?: boolean; withMetadata?: boolean }): Promise<Buffer>;

export interface CacheStats {
  size: number;
  totalBytes: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export class ConversionCache {
  constructor(options?: { maxEntries?: number; maxBytes?: number });
  get(key: string): any;
  set(key: string, result: any): void;
  clear(): void;
  stats(): CacheStats;
}

export const defaultCache: ConversionCache;
export function computeCacheKey(input: Buffer | Uint8Array, options?: object, engineVersion?: string): string;

export class ConversionPool {
  constructor(options?: { concurrency?: number });
  processBatch(inputs: any[], options: any, convertFn: Function): Promise<any[]>;
}

export const defaultPool: ConversionPool;
export function parallelMap<T, R>(items: T[], concurrency: number, workerFn: (item: T, index: number) => Promise<R>): Promise<R[]>;

export const testing: {
  createMockSvg: typeof createMockSvg;
  createMockImage: typeof createMockImage;
};

export type InputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'tiff';
export type OutputFormat = 'webp' | 'png' | 'jpeg' | 'avif';
export type FitMode = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export interface RawImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  channels?: 4;
  hasAlpha?: boolean;
  format?: string;
}

export interface TransformStep {
  name: string;
  apply: (image: RawImage, options?: Record<string, any>) => Promise<RawImage> | RawImage;
  metadata?: Record<string, any>;
  getMetadata?: () => Record<string, any>;
}

export interface FormatHandler {
  name: string;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  supportsAlpha: boolean;
  isInput?: boolean;
  isOutput?: boolean;
  detect(bytes: Uint8Array | Buffer): boolean;
  decode(bytes: Uint8Array | Buffer, options?: any): Promise<RawImage>;
  encode(image: RawImage, options?: any): Promise<Uint8Array | Buffer>;
}

export interface MetadataHandler {
  name: string;
  inspect(bytes: Uint8Array | Buffer): Promise<any[]>;
  strip(bytes: Uint8Array | Buffer, options?: any): Promise<Uint8Array | Buffer>;
}

export interface ConvertOptions {
  to?: OutputFormat | string;
  format?: OutputFormat | string;
  width?: number;
  height?: number;
  fit?: FitMode;
  quality?: number;
  lossless?: boolean;
  effort?: number;
  background?: string;
  defaultBackground?: string;
  svgBackground?: string;
  stripMetadata?: boolean;
  clean?: boolean;
  verify?: boolean;
  assertAlpha?: boolean;
  report?: boolean;
  allowUnsafe?: boolean;
  maxBytes?: number;
  maxInputBytes?: number;
  maxOutputBytes?: number;
  minInputBytes?: number;
  minOutputBytes?: number;
  sameFormat?: 'passthrough' | 'reencode' | 'reject';
  sizeMode?: 'strict' | 'compress' | 'flexible';
  targetBytes?: number | string;
  minQuality?: number;
  allowDownscale?: boolean;
  downscaleStep?: number;
  maxDownscaleAttempts?: number;
  compressor?: any;
  transforms?: TransformStep[];
  policy?: Partial<ConversionPolicy>;
  keepOriginal?: boolean;
  cleanupDelay?: 'immediate' | 'session' | 'manual';
  inputPath?: string;
  backupPath?: string;
  originalDeleted?: boolean;
  customMetadata?: Record<string, string | number | boolean>;
}

export interface LifecycleMetadata {
  keepOriginal: boolean;
  originalPath?: string;
  originalDeleted: boolean;
  backupPath?: string;
  cleanupDelay: 'immediate' | 'session' | 'manual';
}

export interface CleanCertificate {
  sha256: string;
  chunks: string[];
  metadataChunks: number;
  verified: boolean;
  verifiedAt: string;
  tool: string;
}

export interface SourceQuality {
  estimated: 'high' | 'medium' | 'low';
  reason: string;
}

export interface SizeImpact {
  lossyEstimate: number;
  losslessActual: number;
  ratio: number;
  note: string;
}

export interface ConvertResult {
  data: Buffer;
  format: OutputFormat;
  width: number;
  height: number;
  size: number;
  alphaPreserved: boolean;
  alphaVerified: boolean;
  clean: boolean;
  lossless?: boolean;
  losslessVerified?: boolean;
  sourceQuality?: SourceQuality;
  sizeImpact?: SizeImpact;
  removedMetadata: string[];
  certificate?: CleanCertificate;
  transforms?: Array<Record<string, any>>;
  policy?: Record<string, any>;
  lifecycle?: LifecycleMetadata;
  targetLockEnforced?: boolean;
  targetLockBypassed?: boolean;
  passedThrough?: boolean;
  quality?: number;
  warnings?: string[];
  ingestion?: {
    stage: 'passthrough' | 'converted';
    action: string;
    detectedFormat: string;
    targetFormat: string;
    sizeMode: 'strict' | 'compress' | 'flexible';
    inputBytes: number;
    outputBytes: number;
    iterations?: number;
    reason?: string;
  };
}

export interface MetadataReport {
  hasMetadata: boolean;
  exif: boolean;
  xmp: boolean;
  c2pa: boolean;
  comments: boolean;
  chunks: string[];
  summary: string[];
}

export interface ContentSignals {
  edgeDensity: number;
  colorCount: number;
  sharpness: number;
  luminanceMean: number;
  luminanceVariance: number;
  transparencyCoverage: number;
  estimatedType: 'photo' | 'icon' | 'screenshot' | 'logo' | 'diagram' | 'text';
  estimatedTypeConfidence: number;
}

export interface PaletteInfo {
  dominant: string;
  colors: Array<{ hex: string; percentage: number }>;
}

export type UseCase = 'icon' | 'photo' | 'hero' | 'thumbnail' | 'logo' | 'banner' | 'general';

export interface Suggestion {
  to: OutputFormat | string;
  quality: number;
  lossless: boolean;
  reason: string;
  expectedBytes: number;
  expectedSavings: number;
}

export interface InspectResult {
  format: InputFormat | string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  metadata?: MetadataReport & { custom?: Record<string, any> };
  content?: ContentSignals;
  palette?: PaletteInfo;
  suggestions?: Suggestion[];
}

export type ImageInspection = InspectResult;

export interface AuditReport {
  safe: boolean;
  issues: string[];
  recommendedCommand: string;
}

export interface BlackBackgroundExplanation {
  cause: string;
  technicalDetails: string[];
  remedy: string;
  zapSolution: string;
}

// ==========================================
// Seven Frozen Canonical Core Functions
// ==========================================
export function convert(input: Buffer | Uint8Array | string, options?: ConvertOptions): Promise<Buffer & ConvertResult>;
export function inspect(input: Buffer | Uint8Array | string): Promise<InspectResult>;
export function registerFormat(handler: FormatHandler): void;
export function registerMetadataHandler(handler: MetadataHandler): void;
export function registerTransform(transform: TransformStep): void;
export function registerCompressor(compressor: any): void;
export function getCompressor(name?: string): any;
export function getCompressors(): any[];
export function getVersion(): string;
export function getFormats(): string[];
export function suggest(info: InspectResult, useCase?: UseCase): Suggestion[];

// ==========================================
// Compatibility and Auxiliary Functions
// ==========================================
export function detectFormat(input: Buffer | Uint8Array | string): InputFormat;
export function detectMetadata(input: Buffer | Uint8Array | string): MetadataReport;
export function cleanBytes(input: Buffer | Uint8Array, options?: object): Promise<{ output: Buffer; removed: Array<{ type: string; key: string; value: string }>; kept: Array<{ type: string; key: string; value: string }> }>;
export function cleanMetadata(input: Buffer | Uint8Array, options?: object): Promise<Buffer>;
export function generateCleanCertificate(output: Buffer | Uint8Array): CleanCertificate;
export function verifyAlpha(input: Buffer | Uint8Array | string): Promise<{ hasAlpha: boolean; alphaPreserved: boolean; cornerAlpha: number[] }>;
export function auditConversionCommand(command: string): AuditReport;
export function explainBlackBackground(context?: object): BlackBackgroundExplanation;
export function validateSvg(input: Buffer | Uint8Array | string): string;
export function validateImageBytes(input: Buffer | Uint8Array): void;
export function checkSvgSafety(input: Buffer | Uint8Array | string, options?: object): { safe: boolean; reason?: string; detail?: string };
export function inspectImage(input: Buffer | Uint8Array | string): Promise<ImageInspection>;
export function convertImage(input: Buffer | Uint8Array | string, options?: ConvertOptions): Promise<ConvertResult>;
export function convertSvgToWebp(input: Buffer | Uint8Array | string, options?: ConvertOptions): Promise<ConvertResult>;
export function decodeToRgba(input: Buffer | Uint8Array | string, format?: InputFormat): Promise<RawImage>;
export function encodeFromRgba(image: RawImage, options?: ConvertOptions): Promise<Buffer>;
export function normalizeOptions(options?: object): Required<ConvertOptions>;
export function parseScales(scaleInput?: number[] | string): number[];
export function scaleSuffix(scale: number): string;
export function outputName(inputPath: string, format?: OutputFormat, scale?: number): string;
export function generateSrcset(baseFile: string, scales?: number[], format?: OutputFormat, alt?: string): string;
export function resolvePolicy(customPolicy?: Partial<ConversionPolicy> | null): ConversionPolicy;
export function checkPolicyInput(params: {
  policy: ConversionPolicy;
  data: Buffer;
  detectedFormat: string;
}): void;
export function evaluateQuality(params: {
  policy: ConversionPolicy;
  inputFormat: string;
  inputBytes?: number;
  hasAlpha?: boolean;
  targetFormat?: string;
}): {
  quality: number;
  lossless: boolean;
  mode: string;
  targetQuality: number;
};
export function getTransforms(): TransformStep[];
export function parallelMap<T, R>(
  items: T[],
  concurrency?: number | ((item: T, index: number) => Promise<R>),
  workerFn?: (item: T, index: number) => Promise<R>,
  options?: { signal?: AbortSignal }
): Promise<R[]>;

export * from './formats/index';

export interface PerformanceReport {
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalFiles: number;
  originalBytes: number;
  originalFormatted: string;
  optimizedBytes: number;
  optimizedFormatted: string;
  savedBytes: number;
  savedFormatted: string;
  savedPercentage: number;
  avgLatencyMs: number;
  topSavings: Array<{
    fileName: string;
    path: string;
    inputPath: string;
    originalBytes: number;
    optimizedBytes: number;
    savedBytes: number;
    savedPercent: number;
    format: string;
    durationMs: number;
    timestamp: string;
  }>;
  byFormat: Array<{
    format: string;
    count: number;
    savedBytes: number;
    originalBytes: number;
    optimizedBytes: number;
    savedFormatted: string;
  }>;
  bySource: Array<{
    source: string;
    count: number;
    savedBytes: number;
    savedFormatted: string;
  }>;
  carbon: {
    gbSaved: number;
    kwh: number;
    wh: number;
    co2Kg: number;
  };
  items: Array<any>;
}

export function computePerformanceReport(transactions?: any[], options?: { since?: string | number | Date; path?: string; topN?: number }): PerformanceReport;
export function formatPerformanceReport(report: PerformanceReport, format?: 'table' | 'json' | 'csv' | 'markdown'): string;

export interface SmartRecommendation {
  detectedType: string;
  signals: Record<string, any>;
  recommendation: {
    format: string;
    quality: number;
    lossless: boolean;
    fallbackFormat: string | null;
    reason: string;
    explanation: string;
  };
}

export function analyzeSmart(buffer: Buffer | Uint8Array, meta: Record<string, any>, getSharp: () => any): Promise<SmartRecommendation>;
export function classifyContentType(signals: Record<string, any>): string;
export function extractSmartSignals(rawData: Buffer | Uint8Array, width: number, height: number, meta?: Record<string, any>): Record<string, any>;
export const RECOMMENDATION_PROFILES: Record<string, any>;

export const DEFAULT_TEAM_POLICY_TEMPLATE: Record<string, any>;
export function validateTeamPolicy(policy: any): { valid: boolean; errors: string[] };
export function evaluateFilePolicy(policyConfig: any, fileItem: { path: string; format?: string; size?: number }, conversionOptions?: Record<string, any>, context?: Record<string, any>): { allowed: boolean; violations: string[]; exceptionApplied?: any };
export function checkExceptionsStatus(policyConfig: any): { active: any[]; expired: any[] };
export function formatPolicyStatus(policyConfig: any): string;

export const MAX_WIDTH: number;
export const INPUT_FORMATS: readonly InputFormat[];
export const OUTPUT_FORMATS: readonly OutputFormat[];
export const FIT_MODES: readonly FitMode[];
