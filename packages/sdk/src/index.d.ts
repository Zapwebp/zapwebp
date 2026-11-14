import type { ZapwebpError } from '@zapwebp/shared';
export { ZapwebpError };

export type ImageInput = Uint8Array | Buffer | ArrayBuffer | Blob | string;

export interface NextAction {
  tool: string;
  arguments: Record<string, unknown>;
  reason: string;
}

export interface ConvertOptions {
  input?: ImageInput;
  to?: 'webp' | 'avif' | 'png' | 'jpeg' | string | string[];
  format?: 'webp' | 'avif' | 'png' | 'jpeg' | string;
  quality?: number;
  width?: number;
  height?: number;
  clean?: boolean;
  lossless?: boolean;
  background?: string;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  maxOutputBytes?: number;
  [key: string]: any;
}

export interface ConvertResult {
  data: Buffer;
  output: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  bytes: number;
  alphaPreserved: boolean;
  metadataRemoved?: string[];
  nextAction?: NextAction;
}

export interface BatchConvertOptions {
  inputs?: ImageInput[];
  files?: ImageInput[];
  to?: string;
  quality?: number;
  clean?: boolean;
  [key: string]: any;
}

export interface BatchConvertResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{ success: boolean; output?: ConvertResult; error?: any }>;
  nextAction?: NextAction;
}

export interface InspectOptions {
  input?: ImageInput;
}

export interface InspectResult {
  format: string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  chunks?: any[];
  metadataChunks?: any[];
  recommendedTargets: Array<{ to: string; reason: string }>;
  nextAction?: NextAction;
}

export interface VerifyResult {
  clean: boolean;
  metadataChunks: string[];
  certificate?: any;
  nextAction?: NextAction;
}

export interface VerifyAlphaResult {
  hasAlpha: boolean;
  transparentPixelsCount: number;
  cornerPixelsAlpha: number[];
  nextAction?: NextAction;
}

export interface SuggestResult {
  useCase: string;
  recommendedFormat: string;
  quality: number;
  lossless: boolean;
  reason: string;
  nextAction?: NextAction;
}

export interface AuditResult {
  safe: boolean;
  tool: string;
  warnings: string[];
  zapEquivalent: string;
  nextAction?: NextAction;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface UsageStats {
  mode: 'offline' | 'remote';
  inMemory?: boolean;
  operations?: number;
  bytesProcessed?: number;
  heapUsedMb?: number;
  [key: string]: any;
}

export class Zapwebp {
  readonly apiKey: string | null;
  readonly baseUrl: string | null;
  readonly isOffline: boolean;

  constructor(options?: { apiKey?: string; baseUrl?: string });

  convert(opts: ConvertOptions): Promise<Buffer & ConvertResult>;
  convert(input: ImageInput, options?: ConvertOptions): Promise<Buffer & ConvertResult>;

  convertBatch(opts: BatchConvertOptions): Promise<BatchConvertResult>;
  convertBatch(inputs: ImageInput[], options?: ConvertOptions): Promise<BatchConvertResult>;
  batch(inputs: ImageInput[], options?: ConvertOptions): Promise<BatchConvertResult>;

  convertUrl(opts: { url: string; to?: string; quality?: number; [key: string]: any }): Promise<Buffer & ConvertResult>;
  convertUrl(url: string, options?: ConvertOptions): Promise<Buffer & ConvertResult>;

  inspect(opts: InspectOptions): Promise<InspectResult>;
  inspect(input: ImageInput): Promise<InspectResult>;

  inspectUrl(opts: { url: string }): Promise<InspectResult>;
  inspectUrl(url: string): Promise<InspectResult>;

  verifyClean(opts: { input: ImageInput }): Promise<VerifyResult>;
  verifyClean(input: ImageInput): Promise<VerifyResult>;

  verifyAlpha(opts: { input: ImageInput }): Promise<VerifyAlphaResult>;
  verifyAlpha(input: ImageInput): Promise<VerifyAlphaResult>;

  suggestConversion(opts: { input: ImageInput; useCase?: 'icon' | 'hero' | 'thumbnail' | 'photo' | 'general' }): Promise<SuggestResult>;

  auditCommand(opts: { command: string }): Promise<AuditResult>;
  auditCommand(command: string): Promise<AuditResult>;

  listTools(): Promise<McpToolDefinition[]>;
  getAgentManifest(): Promise<Record<string, any>>;
  getUsage(): Promise<UsageStats>;

  optimize(options?: { files?: ImageInput[]; targets?: Array<{ to: string; quality?: number }> }): Promise<any>;

  static verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
}

export const Zap: typeof Zapwebp;
export function createZapClient(options?: { apiKey?: string; baseUrl?: string }): Zapwebp;
export function listTools(): McpToolDefinition[];
export const INPUT_FORMATS: readonly string[];
export const OUTPUT_FORMATS: readonly string[];
export function resolveInput(input: ImageInput): Promise<{ buffer: Buffer; filename: string }>;
