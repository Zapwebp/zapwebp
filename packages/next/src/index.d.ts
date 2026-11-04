/**
 * Options for the Zapwebp Next.js plugin.
 */
export interface ZapwebpNextOptions {
  /**
   * Scale multipliers to render.
   * @default [1]
   */
  scale?: number[];

  /**
   * Base width for 1x multiplier in pixels.
   * @default 512
   */
  baseWidth?: number;

  /**
   * WebP compression quality from 1 to 100.
   * @default 85
   */
  quality?: number;

  /**
   * Enable lossless pixel-perfect encoding.
   * @default false
   */
  lossless?: boolean;

  /**
   * Strip EXIF, XMP, C2PA, and text metadata chunks.
   * @default true
   */
  clean?: boolean;

  /**
   * Source directories to scan for SVGs.
   * @default ['public', 'src/assets', 'app']
   */
  sourceDirs?: string[];

  /**
   * Output directory relative to Next.js project root where WebPs land.
   * @default 'public/icons'
   */
  outDir?: string;

  /**
   * Write zapwebp.manifest.json in the output directory.
   * @default true
   */
  emitManifest?: boolean;

  /**
   * Whether to auto-register converted images in next/image formats pipeline.
   * @default true
   */
  respectNextImage?: boolean;

  /**
   * Conflict resolution strategy when target file already exists.
   * @default 'overwrite'
   */
  onConflict?: 'overwrite' | 'skip' | 'error';
}

export interface NextConfig {
  webpack?: (config: any, context: { dev: boolean; isServer: boolean; defaultLoaders: any; nextRuntime?: string }) => any;
  images?: {
    formats?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ZapwebpConversionOutput {
  name: string;
  relativePath: string;
  scale: number;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  alphaPreserved: boolean;
  clean: boolean;
  data: Buffer;
  sha256: string;
  sourcePath: string;
}

export interface ZapwebpManifest {
  generatedBy: string;
  generatedAt: string;
  totals: {
    inputFiles: number;
    outputFiles: number;
    inputBytes: number;
    outputBytes: number;
    bytesSaved: number;
    savingsPercent: number;
  };
  options: {
    scales: number[];
    baseWidth: number;
    quality: number;
    lossless: boolean;
    clean: boolean;
  };
  files: Array<{
    source: string;
    target: string;
    scale: number;
    width: number;
    height: number;
    bytes: number;
    alphaPreserved: boolean;
    sha256: string;
  }>;
}

/**
 * Higher-order Next.js configuration wrapper.
 * @param options Plugin configuration options.
 * @returns Function accepting Next.js config and returning augmented Next.js config.
 */
export function withZapwebp(options?: ZapwebpNextOptions): (nextConfig?: NextConfig) => NextConfig;

export default withZapwebp;

