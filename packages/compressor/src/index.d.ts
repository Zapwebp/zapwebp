import {
  RawImage,
  CompressOptions,
  CompressionResult,
  CompressionBestAttempt,
  CompressionHandler,
} from '@zapwebp/plugin-sdk';

export function parseTargetBytes(val: number | string): number;

export function binarySearchQuality(
  image: RawImage,
  targetBytes: number,
  minQuality: number,
  maxQuality: number,
  options?: Partial<CompressOptions>,
  encodeFn?: (image: RawImage, options: Record<string, any>) => Promise<Buffer | Uint8Array>
): Promise<{
  bestCandidate: { data: Buffer | Uint8Array; bytes: number; quality: number; width: number; height: number } | null;
  bestAttempt: { data: Buffer | Uint8Array; bytes: number; quality: number; width: number; height: number } | null;
  iterations: number;
}>;

export function downscaleRawImage(
  image: RawImage,
  newWidth: number,
  newHeight: number
): Promise<RawImage>;

export function compress(
  image: RawImage,
  options: CompressOptions
): Promise<CompressionResult>;

export function defaultEncodeFn(
  image: RawImage,
  options?: Record<string, any>
): Promise<Buffer>;

export const compressor: CompressionHandler;

export {
  RawImage,
  CompressOptions,
  CompressionResult,
  CompressionBestAttempt,
  CompressionHandler,
};
