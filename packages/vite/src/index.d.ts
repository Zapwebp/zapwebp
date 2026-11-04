/**
 * Options for the Zapwebp Vite plugin.
 */
export interface ZapwebpPluginOptions {
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
   * Output directory relative to Vite project root where WebPs land.
   * @default 'public/icons'
   */
  outDir?: string;

  /**
   * Write zapwebp.manifest.json in the output directory.
   * @default true
   */
  emitManifest?: boolean;

  /**
   * Whether to write directly to public directory or emit as Vite build assets.
   * @default true
   */
  emitToPublic?: boolean;

  /**
   * Conflict resolution strategy when target file already exists.
   * @default 'overwrite'
   */
  onConflict?: 'overwrite' | 'skip' | 'error';

  /**
   * Glob patterns of SVG files to include.
   * @default ['**\/*.svg']
   */
  include?: string[];

  /**
   * Glob patterns of SVG files to exclude.
   * @default ['node_modules/**', 'dist/**', '.git/**']
   */
  exclude?: string[];
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

export interface VitePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  apply?: 'build' | 'serve' | ((this: void, config: any, env: any) => boolean);
  configResolved?: (config: any) => void | Promise<void>;
  buildStart?: () => void | Promise<void>;
  transform?: (code: string, id: string) => { code: string; map?: null } | null | Promise<{ code: string; map?: null } | null>;
  generateBundle?: (options: any, bundle: any) => void | Promise<void>;
  closeBundle?: () => void | Promise<void>;
}

/**
 * Creates the Zapwebp Vite plugin.
 * @param options Plugin configuration options.
 * @returns Vite plugin instance.
 */
export function zapwebp(options?: ZapwebpPluginOptions): VitePlugin;

export default zapwebp;

