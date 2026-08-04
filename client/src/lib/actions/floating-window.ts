interface Options {
  minWidth?: number;
  maxWidth?: number;
}

/** Free-drag a fixed element around the viewport, and resize it from a corner
 *  handle (any child marked `data-resize`). Both switch the element off its CSS
 *  anchor to absolute left/top on first use, then clamp to the visible area so
 *  it can never be pushed off-screen. Width is what resizes; the aspect-locked
 *  video sizes the height. Presses on controls or the handle never start a drag. */
export function floatingWindow(node: HTMLElement, opts: Options = {}) {
  const minWidth = opts.minWidth ?? 200;
  const maxWidth = opts.maxWidth ?? 640;
  const MARGIN = 8;

  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let startWidth = 0;
  let mode: "drag" | "resize" | null = null;

  const anchor = () => {
    const r = node.getBoundingClientRect();
    node.style.left = `${r.left}px`;
    node.style.top = `${r.top}px`;
    node.style.right = "auto";
    node.style.bottom = "auto";
  };

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize]")) {
      anchor();
      mode = "resize";
      startX = e.clientX;
      startWidth = node.getBoundingClientRect().width;
    } else if (!target.closest("button, a, input")) {
      anchor();
      mode = "drag";
      startX = e.clientX;
      startY = e.clientY;
      originLeft = parseFloat(node.style.left);
      originTop = parseFloat(node.style.top);
      node.style.cursor = "grabbing";
    } else {
      return;
    }
    node.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (mode === "resize") {
      const left = parseFloat(node.style.left);
      const top = parseFloat(node.style.top);
      // Never let a corner grow past the viewport, width or height (height is
      // width * 9/16 through the aspect-locked video).
      const cap = Math.min(
        maxWidth,
        window.innerWidth - left - MARGIN,
        ((window.innerHeight - top - MARGIN) * 16) / 9,
      );
      const wanted = startWidth + (e.clientX - startX);
      node.style.width = `${Math.min(Math.max(minWidth, wanted), Math.max(minWidth, cap))}px`;
    } else if (mode === "drag") {
      const r = node.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - r.width);
      const maxTop = Math.max(0, window.innerHeight - r.height);
      node.style.left = `${Math.min(Math.max(0, originLeft + e.clientX - startX), maxLeft)}px`;
      node.style.top = `${Math.min(Math.max(0, originTop + e.clientY - startY), maxTop)}px`;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    mode = null;
    node.releasePointerCapture?.(e.pointerId);
    node.style.cursor = "";
  };

  node.style.touchAction = "none";
  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);

  return {
    destroy() {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
    },
  };
}
