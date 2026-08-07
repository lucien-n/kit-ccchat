<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { attempt } from "$lib/forms";
  import { messages, session } from "$lib/stores";
  import LinkEmbed from "./link-embed.svelte";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  // Author or admin, same gate as deleting the message.
  const canRemove = $derived(message.author?.id === session.user?.id || session.isAdmin);

  function remove(embedId: string) {
    attempt(() => messages.removeEmbed(message.id, embedId), {
      error: "failed to remove embed",
    });
  }
</script>

{#if message.embeds.length > 0}
  <div class="mt-1 flex flex-col gap-1.5">
    {#each message.embeds as embed (embed.id)}
      <LinkEmbed {embed} onremove={canRemove ? () => remove(embed.id) : undefined} />
    {/each}
  </div>
{/if}
