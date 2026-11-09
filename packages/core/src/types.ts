export interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
  hasAlpha: boolean;
  format?: string;
}

export interface ConvertOptions {
  to?: string;
  format?: string;
  width?: number;
  height?: number;
  quality?: number;
  lossless?: boolean;
  clean?: boolean;
  stripMetadata?: boolean;
  background?: string;
  defaultBackground?: string;
  allowUnsafe?: boolean;
  maxBytes?: number;
  maxInputBytes?: number;
  maxOutputBytes?: number;
  transforms?: TransformStep[];
  policy?: any;
}

export interface InspectMetadataSummary {
  hasExif?: boolean;
  hasXmp?: boolean;
  hasC2pa?: boolean;
  summary?: string[];
}

export interface InspectResult {
  format: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  bytes: number;
  metadata?: InspectMetadataSummary;
}

export interface FormatHandler {
  name: string;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  supportsAlpha: boolean;
  isInput?: boolean;
  isOutput?: boolean;
  detect(bytes: Uint8Array): boolean;
  decode(bytes: Uint8Array, options?: any): Promise<RawImage>;
  encode(image: RawImage, options?: any): Promise<Uint8Array>;
}

export interface MetadataHandler {
  name: string;
  inspect(bytes: Uint8Array): Promise<any[]>;
  strip(bytes: Uint8Array, options?: any): Promise<Uint8Array>;
}

export interface TransformStep {
  name: string;
  apply(image: RawImage, options?: any): Promise<RawImage>;
  getMetadata?(): any;
}

