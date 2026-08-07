<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { embedImageUrl, type MessageEmbed } from "$lib/api";
  import { Button } from "&/button";
  import { Card } from "&/card";
  import XIcon from "@lucide/svelte/icons/x";

  interface Props {
    embed: MessageEmbed;
    // Present only when the viewer may dismiss the card (author or admin).
    onremove?: () => void;
  }
  const { embed, onremove }: Props = $props();

  // Drop the <img> on load failure rather than show a broken frame.
  let imageBroken = $state(false);

  const host = $derived.by(() => {
    try {
      return new URL(embed.url).host.replace(/^www\./, "");
    } catch {
      return embed.url;
    }
  });
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<Card class="group relative max-w-md gap-0 overflow-hidden p-0 pb-1">
  {#if onremove}
    <Button
      variant="secondary"
      size="icon"
      title={m.embed_remove()}
      onclick={onremove}
      class="absolute top-1.5 right-1.5 z-10 size-6 rounded-full opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"
    >
      <XIcon class="size-3.5" />
    </Button>
  {/if}

  {#if embed.image && !imageBroken}
    <a
      href={embed.url}
      target="_blank"
      rel="noopener noreferrer"
      class="block overflow-hidden"
    >
      <img
        src={embedImageUrl(embed.id)}
        alt={embed.title ?? m.embed_link_preview_alt()}
        loading="lazy"
        class="max-h-80 w-full object-cover"
        onerror={() => (imageBroken = true)}
      />
    </a>
  {/if}

  <div class="flex flex-col gap-1 px-3 py-2">
    <div class="text-muted-foreground truncate text-xs">
      {embed.siteName ?? host}
    </div>

    {#if embed.title}
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground line-clamp-2 text-sm font-semibold hover:underline"
      >
        {embed.title}
      </a>
    {/if}

    {#if embed.description}
      <p class="text-muted-foreground line-clamp-3 text-xs">
        {embed.description}
      </p>
    {/if}
  </div>
</Card>
