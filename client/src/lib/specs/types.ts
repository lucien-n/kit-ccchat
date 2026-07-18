export type SpecsRecord<Value extends string> = Record<
  Value,
  { label: string; value: Value }
>;
