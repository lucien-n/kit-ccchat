export type SelectOptionValue = string;

export interface SelectOption<OptionValue extends SelectOptionValue> {
  label: string;
  value: OptionValue;
}
