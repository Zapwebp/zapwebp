import type { ConversionPolicy } from '@zapwebp/shared';

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
  transforms?: TransformStep[];
  policy?: Partial<ConversionPolicy>;
  keepOriginal?: boolean;
  cleanupDelay?: 'immediate' | 'session' | 'manual';
  inputPath?: string;
  backupPath?: string;
  originalDeleted?: boolean;
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

export interface ConvertResult {
  data: Buffer;
  format: OutputFormat;
  width: number;
  height: number;
  size: number;
  alphaPreserved: boolean;
  alphaVerified: boolean;
  clean: boolean;
  removedMetadata: string[];
  certificate?: CleanCertificate;
  transforms?: Array<Record<string, any>>;
  policy?: Record<string, any>;
  lifecycle?: LifecycleMetadata;
  targetLockEnforced?: boolean;
  targetLockBypassed?: boolean;
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

export interface InspectResult {
  format: InputFormat | string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  metadata?: MetadataReport;
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
export function getVersion(): string;
export function getFormats(): string[];

// ==========================================
// Compatibility and Auxiliary Functions
// ==========================================
export function detectFormat(input: Buffer | Uint8Array | string): InputFormat;
export function detectMetadata(input: Buffer | Uint8Array | string): MetadataReport;
export function generateCleanCertificate(output: Buffer | Uint8Array): CleanCertificate;
export function verifyAlpha(input: Buffer | Uint8Array | string): Promise<{ hasAlpha: boolean; alphaPreserved: boolean; cornerAlpha: number[] }>;
export function auditConversionCommand(command: string): AuditReport;
export function explainBlackBackground(context?: object): BlackBackgroundExplanation;
export function validateSvg(input: Buffer | Uint8Array | string): string;
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
export function checkPolicyInput(inputBytes: number, format: InputFormat, policy: ConversionPolicy): void;
export function evaluateQuality(format: OutputFormat, inputFormat: InputFormat, policy: ConversionPolicy): { quality: number; lossless: boolean; mode: string };
export function getTransforms(): TransformStep[];

export * from './formats/index';

export const MAX_WIDTH: number;
export const INPUT_FORMATS: readonly InputFormat[];
export const OUTPUT_FORMATS: readonly OutputFormat[];
export const FIT_MODES: readonly FitMode[];
