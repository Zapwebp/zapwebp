export interface ConvertContext {
  input: string | Buffer | Uint8Array;
  options: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConvertOutput {
  format: string;
  data: Buffer;
  width: number;
  height: number;
  size: number;
  alphaPreserved: boolean;
  [key: string]: any;
}

export interface StorageAdapter {
  read?: (source: string) => Promise<Buffer> | Buffer;
  write?: (destination: string, data: Buffer) => Promise<void> | void;
  [key: string]: any;
}

export interface ZapPluginHooks {
  beforeConvert?: (ctx: ConvertContext) => Promise<ConvertContext | void> | ConvertContext | void;
  afterConvert?: (ctx: ConvertContext, outputs: ConvertOutput[]) => Promise<ConvertOutput[] | void> | ConvertOutput[] | void;
}

export interface ZapPlugin {
  name: string;
  version: string;
  description?: string;
  hooks?: ZapPluginHooks;
  adapters?: Record<string, StorageAdapter>;
}

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

export interface FormatHandler {
  name: string;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  supportsAlpha: boolean;
  detect?(bytes: Uint8Array | Buffer): boolean;
  decode(bytes: Uint8Array | Buffer, options?: any): Promise<RawImage>;
  encode?(image: RawImage, options?: any): Promise<Buffer | Uint8Array>;
}

export interface MetadataField {
  type: string;
  key: string;
  value: string;
  offset?: number;
}

export interface MetadataHandler {
  name: string;
  inspect(bytes: Uint8Array | Buffer): Promise<MetadataField[]>;
  strip(bytes: Uint8Array | Buffer): Promise<Uint8Array | Buffer>;
}

export function definePlugin(plugin: ZapPlugin): ZapPlugin;
export function defineTransform(step: TransformStep): TransformStep;
export function safeDecode(handler: FormatHandler, bytes: Uint8Array | Buffer, options?: any): Promise<RawImage>;
export function createMockRawImage(width?: number, height?: number): RawImage;
export function validateStorageWrite(destinationPath: string, data: Buffer | Uint8Array): void;
export const MAX_DECODE_BYTES: number;

export class PluginManager {
  constructor();
  use(plugin: ZapPlugin): this;
  has(name: string): boolean;
  getPlugins(): ZapPlugin[];
  executeBeforeConvert(context: ConvertContext): Promise<ConvertContext>;
  executeAfterConvert(context: ConvertContext, outputs: ConvertOutput[]): Promise<ConvertOutput[]>;
  getAdapter(adapterName: string): StorageAdapter | null;
}

