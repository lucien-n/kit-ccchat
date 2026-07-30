import type { Component } from "svelte";

export type LucideIconType = Component;

type ValidIconType = LucideIconType;

export type SpecsRecord<
  Value extends string,
  IconType extends ValidIconType | undefined = undefined,
> = Record<
  Value,
  { label: string; value: Value } & (IconType extends ValidIconType
    ? { icon: IconType }
    : { icon?: never })
>;
