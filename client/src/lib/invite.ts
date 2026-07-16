import { apiBase } from "./api";

/** https://your.server/invite/<code> - that route funnels into the main page
 *  with ?invite=<code>, which pre-fills the register form. */
export function inviteLink(code: string): string {
  const origin = apiBase() || (typeof location !== "undefined" ? location.origin : "");
  return `${origin}/invite/${encodeURIComponent(code)}`;
}

export function readInviteFromUrl(): string {
  if (typeof location === "undefined") return "";
  return new URLSearchParams(location.search).get("invite")?.trim() ?? "";
}

/** Left in the URL, the code survives in history and gets re-shared by anyone
 *  who copies the address afterwards. */
export function clearInviteFromUrl() {
  if (typeof location === "undefined" || typeof history === "undefined") return;
  const url = new URL(location.href);
  if (!url.searchParams.has("invite")) return;
  url.searchParams.delete("invite");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
