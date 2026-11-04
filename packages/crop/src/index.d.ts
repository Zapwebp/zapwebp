import { RawImage, TransformStep } from '@zapwebp/plugin-sdk';

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '4:5'
  | '3:2'
  | '9:16'
  | '21:9'
  | string
  | number
  | { width: number; height: number };

export type CropGravity =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'face'
  | { x: number; y: number };

export type CropFit = 'cover' | 'contain';

export type CropMode = 'auto' | 'manual';

export interface CropOptions {
  mode?: CropMode;
  aspectRatio?: AspectRatio;
  gravity?: CropGravity;
  fit?: CropFit;
  background?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  faceBounds?: { x: number; y: number; width: number; height: number } | null;
}

export interface CropBox {
  mode: CropMode;
  fit: CropFit;
  x: number;
  y: number;
  width: number;
  height: number;
  outWidth?: number;
  outHeight?: number;
  aspectRatio?: number;
  gravity?: string;
  background?: string;
}

export declare const CROP_PRESETS: Readonly<{
  avatar: Readonly<CropOptions>;
  thumbnail: Readonly<CropOptions>;
  banner: Readonly<CropOptions>;
  product: Readonly<CropOptions>;
  story: Readonly<CropOptions>;
}>;

export declare function parseAspectRatio(ratio: AspectRatio): number;

export declare function detectFaceBounds(
  image: RawImage
): Promise<{ x: number; y: number; width: number; height: number } | null>;

export declare function calculateCropBox(
  inputWidth: number,
  inputHeight: number,
  options?: CropOptions | string
): Promise<CropBox>;

export declare function cropImage(
  image: RawImage,
  options?: CropOptions | string
): Promise<RawImage>;

export declare function cropTransform(
  options?: CropOptions | string
): TransformStep;
