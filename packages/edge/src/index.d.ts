export interface ZapEdgeConfig {
  /** Forced canonical target format (default: 'webp') */
  targetFormat?: 'webp' | 'png' | 'avif' | 'jpeg';
  /** Alias for targetFormat */
  lockTarget?: 'webp' | 'png' | 'avif' | 'jpeg';
  /** If true, rejects unconvertible inputs; if false, passes through (default: true) */
  strict?: boolean;
  /** Source URL prefix or custom async resolver function */
  source?: string | ((request: Request) => Promise<Uint8Array | Buffer | Response>);
  /** Compression quality between 1 and 100 (default: 85) */
  quality?: number;
  /** Strip EXIF and container metadata (default: true) */
  clean?: boolean;
}

export function createZapHandler(config?: ZapEdgeConfig): (request: Request) => Promise<Response>;

