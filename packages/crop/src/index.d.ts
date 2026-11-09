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

export type CropMode = 'auto' | 'manual' | 'body' | 'object' | 'subject';

export type BodyPreset = 'head' | 'head-shoulders' | 'upper-body' | 'full-body';

export type SmartStrategy = 'attention' | 'entropy';

export interface DetectionMetadata {
  model?: string;
  strategy?: SmartStrategy;
  confidence: number;
  preset?: BodyPreset;
  keypointsDetected?: number;
  class?: string;
  count?: number;
}

export interface FallbackMetadata {
  fallback: string;
  reason: string;
}

export interface CropOptions {
  mode?: CropMode;
  aspectRatio?: AspectRatio;
  targetAspectRatio?: AspectRatio;
  gravity?: CropGravity;
  fit?: CropFit;
  background?: string;
  padding?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  bodyPreset?: BodyPreset;
  strategy?: SmartStrategy;
  objectClasses?: string[];
  minConfidence?: number;
  selectLargest?: boolean;
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
  detection?: DetectionMetadata;
  fallback?: FallbackMetadata;
}

export interface CroppedImage extends RawImage {
  metadata?: {
    mode: CropMode;
    bounds: { x: number; y: number; width: number; height: number };
    detection?: DetectionMetadata | null;
    fallback?: FallbackMetadata | null;
  };
}

export declare const CROP_PRESETS: Readonly<{
  avatar: Readonly<CropOptions>;
  thumbnail: Readonly<CropOptions>;
  banner: Readonly<CropOptions>;
  product: Readonly<CropOptions>;
  story: Readonly<CropOptions>;
}>;

export declare const BODY_PRESETS: Readonly<Record<BodyPreset, readonly string[]>>;

export declare function parseAspectRatio(ratio: AspectRatio): number;

export declare function padBounds(
  bounds: { x: number; y: number; width: number; height: number },
  padding: number,
  imgW: number,
  imgH: number
): { x: number; y: number; width: number; height: number };

export declare function computeCropRect(
  bounds: { x: number; y: number; width: number; height: number },
  targetRatio: number,
  imgW: number,
  imgH: number
): { x: number; y: number; width: number; height: number };

export declare function detectFaceBounds(
  image: RawImage
): Promise<{ x: number; y: number; width: number; height: number } | null>;

export declare function detectSubject(
  image: RawImage,
  strategy?: SmartStrategy,
  targetAspectRatio?: number
): Promise<{ bounds: { x: number; y: number; width: number; height: number }; strategy: SmartStrategy; confidence: number }>;

export declare function detectBody(
  image: RawImage,
  preset?: BodyPreset
): Promise<{ bounds: { x: number; y: number; width: number; height: number }; detection: DetectionMetadata } | null>;

export declare function detectObject(
  image: RawImage,
  options?: { objectClasses?: string[]; minConfidence?: number; selectLargest?: boolean }
): Promise<{ bounds: { x: number; y: number; width: number; height: number }; detection: DetectionMetadata } | null>;

export declare function calculateCropBox(
  inputWidth: number,
  inputHeight: number,
  options?: CropOptions | string
): Promise<CropBox>;

export declare function cropImage(
  image: RawImage,
  options?: CropOptions | string
): Promise<CroppedImage>;

export declare function cropTransform(
  options?: CropOptions | string
): TransformStep;
