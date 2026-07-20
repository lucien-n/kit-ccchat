/** The bundled icon, captured before we ever overwrite it so removing the
 *  community icon can put it back. */
let bundled: string | null = null;

/** Point the tab icon at `href`, or back at the bundled favicon when null. */
export function setFavicon(href: string | null) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  bundled ??= link.href;
  link.href = href ?? bundled;
}
