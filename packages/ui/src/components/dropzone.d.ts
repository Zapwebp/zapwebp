export interface ZapDropzoneOptions {
  accept?: string;
  maxBytes?: number;
  multiple?: boolean;
  title?: string;
  hint?: string;
  onFilesSelected?: (files: File[]) => void;
}

export declare class ZapDropzone {
  constructor(options?: ZapDropzoneOptions);
  mount(targetContainer?: HTMLElement): this;
  destroy(): void;
}

export declare function renderZapDropzone(options?: ZapDropzoneOptions & { className?: string }): string;

