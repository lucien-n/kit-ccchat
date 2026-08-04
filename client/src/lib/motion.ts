import { appearance } from "$lib/stores";
import { flip as flipBase } from "svelte/animate";
import {
  crossfade as crossfadeBase,
  fade as fadeBase,
  fly as flyBase,
  scale as scaleBase,
} from "svelte/transition";

// Svelte 5 plays these through the Web Animations API, so the `.reduce-motion`
// CSS reset cannot reach them. Each wrapper collapses to an instant transition
// when motion is reduced, honouring both the in-app setting and the OS. The same
// `{ duration: 0 }` satisfies both TransitionConfig and AnimationConfig, so one
// combinator covers svelte/transition and svelte/animate alike.
function reduce<Args extends unknown[], C>(fn: (node: Element, ...args: Args) => C) {
  return (node: Element, ...args: Args): C | { duration: 0 } =>
    appearance.motionReduced ? { duration: 0 } : fn(node, ...args);
}

export const fade = reduce(fadeBase);
export const fly = reduce(flyBase);
export const scale = reduce(scaleBase);
export const flip = reduce(flipBase);

export function crossfade(params: Parameters<typeof crossfadeBase>[0]) {
  const [send, receive] = crossfadeBase(params);
  return [reduce(send), reduce(receive)] as const;
}
