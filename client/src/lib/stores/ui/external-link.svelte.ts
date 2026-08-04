/** The destination of an external link the user clicked, held while they
 *  confirm they want to leave. One dialog serves every message on screen. */
class ExternalLink {
  url = $state<string | null>(null);

  ask(url: string) {
    this.url = url;
  }

  dismiss() {
    this.url = null;
  }

  visit() {
    const url = this.url;
    this.url = null;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const externalLink = new ExternalLink();
