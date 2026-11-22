export interface BatchBarProps {
  fileCount?: number;
  totalOriginal?: string;
  totalOutput?: string;
  savingsPct?: number;
  format?: string;
  view?: 'grid' | 'list';
  id?: string;
  className?: string;
  add?: (e: Event) => void;
  'download-all'?: (e: Event) => void;
  'delete-all'?: (e: Event) => void;
  onViewChange?: (view: 'grid' | 'list', e: Event) => void;
}

export function renderZapBatchBar(props?: BatchBarProps): string;

export class ZapBatchBar {
  constructor(options?: BatchBarProps);
  render(): string;
  mount(container: HTMLElement): this;
}
