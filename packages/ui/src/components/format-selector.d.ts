export interface FormatItem {
  id: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface FormatSelectorProps {
  formats?: Array<string | FormatItem>;
  selected?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  showBadges?: boolean;
  onChange?: (format: string) => void;
}

export function renderZapFormatSelector(props?: FormatSelectorProps): string;

export class ZapFormatSelector {
  constructor(options?: FormatSelectorProps);
  selected: string;
  render(): string;
  mount(container: HTMLElement): this;
  setSelected(format: string): void;
}
