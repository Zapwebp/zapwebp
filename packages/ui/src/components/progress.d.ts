export interface ZapUploadProgressOptions {
  total?: number;
  completed?: number;
  failed?: number;
  showMeta?: boolean;
}

export declare class ZapUploadProgress {
  constructor(options?: ZapUploadProgressOptions);
  readonly percentage: number;
  mount(targetContainer?: HTMLElement): this;
  update(options: { total?: number; completed?: number; failed?: number }): void;
  destroy(): void;
}

export declare function renderZapUploadProgress(options?: ZapUploadProgressOptions & { className?: string }): string;

