import type { ConversionPolicy } from '@zapwebp/shared';

export type InputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'tiff';
export type OutputFormat = 'webp' | 'png' | 'jpeg' | 'avif';
export type FitMode = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface TransformStep {
  name: string;
  apply: (image: RawImage, options?: Record<string, any>) => Promise<RawImage> | RawImage;
  metadata?: Record<string, any>;
  getMetadata?: () => Record<string, any>;
}

export interface ConvertOptions {
  to?: OutputFormat;
  width?: number;
  height?: number;
  fit?: FitMode;
  quality?: number;
  lossless?: boolean;
  effort?: number;
  background?: string;
  svgBackground?: string;
  stripMetadata?: boolean;
  clean?: boolean;
  verify?: boolean;
  assertAlpha?: boolean;
  report?: boolean;
  transforms?: TransformStep[];
  policy?: Partial<ConversionPolicy>;
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

export interface ImageInspection {
  format: InputFormat;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  metadata?: MetadataReport;
}

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
export function convert(input: Buffer | Uint8Array | string, options?: ConvertOptions): Promise<Buffer & ConvertResult>;
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

export * from './formats/index';

export const MAX_WIDTH: number;
export const INPUT_FORMATS: readonly InputFormat[];
export const OUTPUT_FORMATS: readonly OutputFormat[];
export const FIT_MODES: readonly FitMode[];
