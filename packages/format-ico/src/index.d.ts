import type { FormatHandler, RawImage, ZapPlugin } from '@zapwebp/plugin-sdk';

export interface IcoConfig {
  sizes: number[];
  format: 'png' | 'bmp' | ((size: number) => 'png' | 'bmp');
  compressionLevel: number;
  colorType: 'rgba' | 'rgb' | 'palette';
  paletteSize: number;
  fit: 'contain' | 'cover' | 'fill';
  background: string;
  clean: boolean;
  type: 'ico' | 'cur';
  maxEntries: number;
  maxImageBytes: number;
  maxTotalBytes: number;
}

export type IcoPresetName = 'default' | 'favicon' | 'windows' | 'high-res' | 'legacy' | 'app-icon' | 'cursor';

export interface IcoOptions extends Partial<IcoConfig> {
  preset?: IcoPresetName;
  customSizes?: number[];
  extract?: number;
  size?: number;
  extractAll?: boolean;
}

export interface IcoEntry {
  width: number;
  height: number;
  colorCount: number;
  planes: number;
  bitCount: number;
  bytesInRes: number;
  imageOffset: number;
  format: 'png' | 'bmp';
  data: Buffer;
}

export interface ParsedIco {
  type: 'ico' | 'cur';
  count: number;
  entries: IcoEntry[];
}

export interface FaviconSuiteOptions {
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  sizes?: number[];
  prefix?: string;
  clean?: boolean;
  preset?: IcoPresetName;
}

export interface FaviconSuiteResult {
  files: Record<string, Buffer | string>;
  html: string;
  manifest: Record<string, any>;
}

export declare class IcoFormatHandler implements FormatHandler {
  name: 'ico';
  mimeTypes: readonly string[];
  extensions: readonly string[];
  supportsAlpha: true;
  isInput: true;
  isOutput: true;
  constructor(config?: Partial<IcoConfig>);
  detect(bytes: Uint8Array | Buffer): boolean;
  decode(bytes: Uint8Array | Buffer, options?: IcoOptions): Promise<RawImage>;
  encode(image: Buffer | RawImage, options?: IcoOptions): Promise<Buffer>;
}

export declare const icoHandler: IcoFormatHandler;
export declare const plugin: ZapPlugin;

export declare const DEFAULT_CONFIG: IcoConfig;
export declare const PRESETS: Record<IcoPresetName, Partial<IcoConfig>>;
export declare function validateConfig(config: IcoConfig): void;
export declare function loadFromEnv(): Partial<IcoConfig>;
export declare function loadFromConfigFile(searchDir?: string): Partial<IcoConfig>;
export declare function resolveIcoConfig(overrides?: IcoOptions, cwd?: string): IcoConfig;

export declare function parseIco(input: Buffer | Uint8Array): ParsedIco;
export declare function decodeIco(input: Buffer | Uint8Array, options?: IcoOptions): Promise<RawImage | RawImage[]>;
export declare function decodeBmpDib(dibBuffer: Buffer, expectedWidth: number, expectedHeight: number): RawImage;
export declare function encodeBmpDib(rgba: Uint8ClampedArray | Buffer, width: number, height: number): Buffer;

export declare function writeIco(source: Buffer | RawImage, options?: IcoOptions): Promise<Buffer>;
export declare function encodeIco(source: Buffer | RawImage, options?: IcoOptions): Promise<Buffer>;
export declare function buildIcoContainer(
  images: Array<{ width: number; height: number; data: Buffer; bitCount?: number; hotspotX?: number; hotspotY?: number }>,
  options?: { type?: 'ico' | 'cur' }
): Buffer;

export declare function generateFaviconSuite(input: Buffer | string, options?: FaviconSuiteOptions): Promise<FaviconSuiteResult>;
export declare function normalizeSizes(sizesInput?: number[] | string): number[];

export declare const DEFAULT_ICO_SIZES: number[];
export declare const MAX_ICO_ENTRIES: number;
export declare const PNG_MAGIC: Buffer;
