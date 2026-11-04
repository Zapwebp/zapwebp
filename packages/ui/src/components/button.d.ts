export interface ZapUploadButtonOptions {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
}

export declare class ZapUploadButton {
  constructor(options?: ZapUploadButtonOptions);
  mount(targetContainer?: HTMLElement): this;
  destroy(): void;
}

export declare function renderZapUploadButton(options?: ZapUploadButtonOptions & { className?: string }): string;

