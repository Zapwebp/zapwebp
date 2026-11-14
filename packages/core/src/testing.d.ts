export interface MockSvgOptions {
  width?: number;
  height?: number;
  transparent?: boolean;
  fill?: string;
  withMetadata?: boolean;
}

export interface MockImageOptions {
  format?: 'svg' | 'png' | 'webp' | 'jpeg' | 'avif';
  width?: number;
  height?: number;
  transparent?: boolean;
  withMetadata?: boolean;
}

export function createMockSvg(options?: MockSvgOptions): Buffer;
export function createMockImage(options?: MockImageOptions): Promise<Buffer>;
