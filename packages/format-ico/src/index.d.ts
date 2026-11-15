import type { FormatHandler, RawImage, ZapPlugin } from '@zapwebp/plugin-sdk';

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

export interface IcoDecodeOptions {
  size?: number;
}

export interface IcoEncodeOptions {
  sizes?: number[] | string;
  background?: string;
  format?: 'png' | 'bmp';
}

export interface FaviconSuiteOptions {
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  sizes?: number[];
  prefix?: string;
  clean?: boolean;
}

export interface FaviconSuiteResult {
  files: Record<string, Buffer | string>;
  html: string;
  manifest: Record<string, any>;
}

export declare const icoHandler: FormatHandler & {
  name: 'ico';
  mimeTypes: readonly string[];
  extensions: readonly string[];
  supportsAlpha: true;
  isInput: true;
  isOutput: true;
  detect(bytes: Uint8Array | Buffer): boolean;
  decode(bytes: Uint8Array | Buffer, options?: IcoDecodeOptions): Promise<RawImage>;
  encode(image: Buffer | RawImage, options?: IcoEncodeOptions): Promise<Buffer>;
};

export declare const plugin: ZapPlugin;

export declare function parseIco(input: Buffer | Uint8Array): ParsedIco;

export declare function decodeIco(input: Buffer | Uint8Array, options?: IcoDecodeOptions): Promise<RawImage>;

export declare function decodeBmpDib(
  dibBuffer: Buffer,
  expectedWidth: number,
  expectedHeight: number
): RawImage;

export declare function encodeIco(
  source: Buffer | RawImage,
  options?: IcoEncodeOptions
): Promise<Buffer>;

export declare function buildIcoContainer(
  images: Array<{ width: number; height: number; data: Buffer; bitCount?: number }>
): Buffer;

export declare function generateFaviconSuite(
  input: Buffer | string,
  options?: FaviconSuiteOptions
): Promise<FaviconSuiteResult>;

export declare function normalizeSizes(sizesInput?: number[] | string): number[];

export declare const DEFAULT_ICO_SIZES: number[];
export declare const MAX_ICO_ENTRIES: number;
export declare const PNG_MAGIC: Buffer;
