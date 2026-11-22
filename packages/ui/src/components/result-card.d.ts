export interface FileCardProps {
  id?: string;
  filename?: string;
  originalSize?: string;
  outputSize?: string;
  savingsPct?: number;
  format?: string;
  thumbnailSrc?: string;
  status?: 'converting' | 'ready' | 'error';
  errorMessage?: string;
  className?: string;
  preview?: (item: FileCardProps, e: Event) => void;
  crop?: (item: FileCardProps, e: Event) => void;
  download?: (item: FileCardProps, e: Event) => void;
  delete?: (item: FileCardProps, e: Event) => void;
}

export function renderZapFileCard(props?: FileCardProps): string;

export class ZapFileCard {
  constructor(options?: FileCardProps);
  render(): string;
  mount(container: HTMLElement): this;
}
