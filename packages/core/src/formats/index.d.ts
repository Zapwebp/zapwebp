import type { RawImage, ConvertOptions, InputFormat, OutputFormat } from '../index';

export interface FormatHandler<TOptions = ConvertOptions> {
  readonly name: string;
  readonly mimeTypes: readonly string[];
  readonly extensions: readonly string[];
  readonly supportsAlpha: boolean;
  readonly isInput: boolean;
  readonly isOutput: boolean;
  detect(bytes: Uint8Array | Buffer): boolean;
  decode(bytes: Uint8Array | Buffer, options?: object): Promise<RawImage>;
  encode(image: RawImage, options?: TOptions): Promise<Buffer | Uint8Array>;
}

export class FormatRegistry {
  register(handler: FormatHandler): void;
  getByName(name: string): FormatHandler | undefined;
  getByMime(mime: string): FormatHandler | undefined;
  getByExtension(ext: string): FormatHandler | undefined;
  detect(bytes: Uint8Array | Buffer): FormatHandler | null;
  getAll(): FormatHandler[];
  getSupportedInputs(): string[];
  getSupportedOutputs(): string[];
}

export const registry: FormatRegistry;
export function registerFormat(handler: FormatHandler): void;
export function getHandlerByName(name: string): FormatHandler | undefined;
export function getHandlerByMime(mime: string): FormatHandler | undefined;
export function getHandlerByExtension(ext: string): FormatHandler | undefined;
export function detectFormatHandler(bytes: Uint8Array | Buffer): FormatHandler | null;
export function getAllHandlers(): FormatHandler[];

export const svgHandler: FormatHandler;
export const pngHandler: FormatHandler;
export const jpegHandler: FormatHandler;
export const webpHandler: FormatHandler;
export const avifHandler: FormatHandler;
export const gifHandler: FormatHandler;
export const tiffHandler: FormatHandler;
