import { apiBase } from './api';

/** The link you actually send people: https://your.server/invite/<code>
 *
 *  That route funnels into the main page with ?invite=<code>, which pre-fills
 *  the register form — so a friend clicks once instead of copying a code into a
 *  field they have to find first. */
export function inviteLink(code: string): string {
  const origin = apiBase() || (typeof location !== 'undefined' ? location.origin : '');
  return `${origin}/invite/${encodeURIComponent(code)}`;
}

/** Read the code the /invite/<code> route handed us. */
export function readInviteFromUrl(): string {
  if (typeof location === 'undefined') return '';
  return new URLSearchParams(location.search).get('invite')?.trim() ?? '';
}

/** Drop ?invite= from the address bar once we've read it: the form holds the
 *  code now, and leaving it in the URL means it survives in history and gets
 *  re-shared by anyone who copies the address afterwards. */
export function clearInviteFromUrl() {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const url = new URL(location.href);
  if (!url.searchParams.has('invite')) return;
  url.searchParams.delete('invite');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
