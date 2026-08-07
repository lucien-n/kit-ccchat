<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { externalLink } from "$lib/stores";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  const url = $derived(externalLink.url);
  const parts = $derived.by(() => {
    if (!url) return null;
    const u = new URL(url);
    return {
      scheme: `${u.protocol}//`,
      host: u.host,
      rest: `${u.pathname}${u.search}${u.hash}`,
    };
  });
</script>

<Dialog.Root bind:open={() => url !== null, (open) => !open && externalLink.dismiss()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{m.external_link_title()}</Dialog.Title>
      <Dialog.Description>{m.external_link_description()}</Dialog.Description>
    </Dialog.Header>

    {#if parts}
      <p class="bg-muted rounded-2xl p-3 font-mono text-xs wrap-break-word">
        <span class="text-muted-foreground">{parts.scheme}</span><span
          class="text-foreground font-semibold">{parts.host}</span
        ><span class="text-muted-foreground">{parts.rest}</span>
      </p>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={() => externalLink.dismiss()}>
        {m.common_cancel()}
      </Button>
      <Button onclick={() => externalLink.visit()}>
        {m.external_link_visit()}
        <ExternalLinkIcon />
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
