export interface QualitySliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  label?: string;
  className?: string;
  showLosslessBadge?: boolean;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

export function renderZapQualitySlider(props?: QualitySliderProps): string;

export class ZapQualitySlider {
  constructor(options?: QualitySliderProps);
  value: number;
  render(): string;
  mount(container: HTMLElement): this;
  setValue(value: number): void;
}
