export type InputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'tiff';
export type OutputFormat = 'webp' | 'png' | 'jpeg' | 'avif';
export type FitMode = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export interface ConvertOptions {
  to?: OutputFormat | OutputFormat[];
  width?: number;
  height?: number;
  fit?: FitMode;
  quality?: number;
  lossless?: boolean;
  effort?: number;
  background?: string;
  stripMetadata?: boolean;
}

export interface ConvertResult {
  data: Buffer;
  format: OutputFormat;
  width: number;
  height: number;
  size: number;
  alphaPreserved: boolean;
}

export interface ImageInspection {
  format: InputFormat;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  recommendedTargets: Array<{ to: OutputFormat; reason: string }>;
}

export interface OptimizeTarget {
  to: OutputFormat;
  quality?: number;
  width?: number;
}

export interface OptimizeResult {
  totalBytesBefore: number;
  totalBytesAfter: number;
  savedPercent: number;
  files: Array<{
    input: string;
    inputBytes: number;
    outputs: Array<{
      format: OutputFormat;
      bytes: number;
      width: number;
      height: number;
      alphaPreserved: boolean;
    }>;
    savedPercent: number;
  }>;
}

export interface ZapClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class Zap {
  constructor(options?: ZapClientOptions);
  apiKey: string | null;
  baseUrl: string | null;
  isOffline: boolean;

  convert(input: Buffer | Uint8Array | string, options?: ConvertOptions & { to?: OutputFormat }): Promise<Buffer & ConvertResult>;
  convert(input: Buffer | Uint8Array | string, options: ConvertOptions & { to: OutputFormat[] }): Promise<ConvertResult[]>;
  inspect(input: Buffer | Uint8Array | string): Promise<ImageInspection>;
  batch(inputs: Array<Buffer | Uint8Array | string>, options?: ConvertOptions): Promise<Array<Buffer & ConvertResult>>;
  optimize(options: { files?: Array<string | Buffer>; targets?: OptimizeTarget[] }): Promise<OptimizeResult>;

  static verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
}

export function createZapClient(options?: ZapClientOptions): Zap;

export const INPUT_FORMATS: readonly InputFormat[];
export const OUTPUT_FORMATS: readonly OutputFormat[];

