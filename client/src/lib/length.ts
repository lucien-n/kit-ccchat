/** Horizontal shake to signal a keystroke the length cap just swallowed. No-ops
 *  when motion is reduced. Uses the Web Animations API so it replays on every
 *  call, regardless of any in-flight animation. */
export function shakeAtLimit(el: Element | null, motionReduced: boolean) {
  if (!el || motionReduced) return;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 300, easing: "ease-in-out" },
  );
}

/** True when a keydown on an at-capacity field would add a character the
 *  maxlength silently drops: a printable key, no shortcut modifier, and not
 *  replacing a selection. Navigation, Backspace and shortcuts return false. */
export function isRejectedAtLimit(e: KeyboardEvent, atMax: boolean): boolean {
  if (!atMax) return false;

  const el = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
  const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
  const replacingSelection = el.selectionStart !== el.selectionEnd;

  return printable && !replacingSelection;
}
