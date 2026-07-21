<script lang="ts">
  import { externalLink } from "$lib/stores/externalLink.svelte";
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
      <Dialog.Title>Open this link?</Dialog.Title>
      <Dialog.Description>
        This takes you to a site outside the chat. Have a look at the address before you
        go, since the text of a link does not have to match where it leads.
      </Dialog.Description>
    </Dialog.Header>

    {#if parts}
      <p class="bg-muted rounded-md p-3 font-mono text-xs wrap-break-word">
        <span class="text-muted-foreground">{parts.scheme}</span><span
          class="text-foreground font-semibold">{parts.host}</span
        ><span class="text-muted-foreground">{parts.rest}</span>
      </p>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={() => externalLink.dismiss()}>Cancel</Button>
      <Button onclick={() => externalLink.visit()}>
        Visit site <ExternalLinkIcon />
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
