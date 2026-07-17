<script lang="ts">
  import { isEmojiOnly, render } from "$lib/markdown";
  import { externalLink } from "$lib/stores/externalLink.svelte";

  let { content, class: className = "" }: { content: string; class?: string } = $props();

  const html = $derived(render(content));
  const jumbo = $derived(isEmojiOnly(content));

  // {@html} output cannot carry Svelte handlers, so reveal is delegated.
  function reveal(e: Event) {
    (e.target as HTMLElement).closest(".spoiler")?.classList.add("revealed");
  }

  // The anchor resolves its own href, so origin and protocol need no parsing.
  function confirmLink(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a || a.origin === location.origin) return;
    if (a.protocol !== "http:" && a.protocol !== "https:") return;
    e.preventDefault();
    externalLink.ask(a.href);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="md min-w-0 wrap-break-word {className}"
  class:jumbo
  onclick={(e) => {
    confirmLink(e);
    reveal(e);
  }}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") reveal(e);
  }}
>
  <!-- Safe because the renderer is built with html:false, which escapes every
       tag in the message, and markdown-it rejects javascript:/data: hrefs. The
       only tags here are ones markdown-it emitted. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>

<style>
  .md :global(p) {
    margin: 0;
  }
  .md :global(* + *) {
    margin-top: 0.25rem;
  }
  .md.jumbo {
    font-size: 1.875rem;
    line-height: 1.2;
  }
  .md :global(a) {
    color: var(--primary);
    word-break: break-all;
  }
  .md :global(a:hover) {
    text-decoration: underline;
  }
  .md :global(h1) {
    font-size: 1.25rem;
    font-weight: 700;
  }
  .md :global(h2) {
    font-size: 1.125rem;
    font-weight: 700;
  }
  .md :global(h3) {
    font-size: 1rem;
    font-weight: 700;
  }
  .md :global(h4),
  .md :global(h5),
  .md :global(h6) {
    font-size: 0.875rem;
    font-weight: 700;
  }
  .md :global(strong) {
    font-weight: 600;
  }
  .md :global(em) {
    font-style: italic;
  }
  .md :global(blockquote) {
    border-left: 4px solid color-mix(in oklab, var(--muted-foreground) 40%, transparent);
    padding-left: 0.75rem;
  }
  .md :global(ul),
  .md :global(ol) {
    padding-left: 1.5rem;
  }
  .md :global(ul) {
    list-style: disc;
  }
  .md :global(ol) {
    list-style: decimal;
  }
  .md :global(li) {
    display: list-item;
  }
  .md :global(code) {
    background: var(--muted);
    border-radius: 0.25rem;
    padding: 0.1rem 0.25rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
  }
  .md :global(pre) {
    background: var(--muted);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    padding: 0.5rem;
    overflow-x: auto;
  }
  .md :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.8125rem;
  }
  .md :global(hr) {
    border-color: var(--border);
  }
  .md :global(img) {
    max-width: 100%;
  }
  .md :global(table) {
    border-collapse: collapse;
  }
  .md :global(th),
  .md :global(td) {
    border: 1px solid var(--border);
    padding: 0.25rem 0.5rem;
  }
  .md :global(.spoiler) {
    background: color-mix(in oklab, var(--foreground) 85%, transparent);
    color: transparent;
    border-radius: 0.25rem;
    padding: 0 0.125rem;
    cursor: pointer;
    user-select: none;
  }
  .md :global(.spoiler *) {
    visibility: hidden;
  }
  .md :global(.spoiler.revealed) {
    background: color-mix(in oklab, var(--muted) 60%, transparent);
    color: inherit;
    cursor: auto;
    user-select: auto;
  }
  .md :global(.spoiler.revealed *) {
    visibility: visible;
  }
</style>
