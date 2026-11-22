export interface DiffViewerProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  splitPercent?: number;
  mode?: 'split' | 'side-by-side';
  id?: string;
  className?: string;
}

export function renderZapDiffViewer(props: DiffViewerProps): string;

export class ZapDiffViewer {
  constructor(options: DiffViewerProps);
  splitPercent: number;
  render(): string;
  mount(container: HTMLElement): this;
  setSplit(percent: number): void;
}
