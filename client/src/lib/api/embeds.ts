import { apiBase } from "./http";

// Server-proxied thumbnail (keeps the reader's IP off the linked site); keyed by
// the unguessable embed id, no auth.
export function embedImageUrl(id: string): string {
  return `${apiBase()}/api/embeds/${id}/image`;
}
