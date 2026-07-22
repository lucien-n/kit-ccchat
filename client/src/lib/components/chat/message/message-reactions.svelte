<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { apiErrorMessage } from "$lib/forms";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import { toast } from "svelte-sonner";
  import { elasticInOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  const getIsReactionMine = (userIds: string[]) =>
    !!session.user && userIds.includes(session.user.id);

  async function toggleReaction(emoji: string, reacted: boolean) {
    try {
      if (reacted) {
        await messages.unreact(message.id, emoji);
      } else {
        await messages.react(message.id, emoji);
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to react"));
    }
  }
</script>

{#if message.reactions.length > 0}
  <div class="mt-1 mb-1 flex gap-1">
    {#each message.reactions as reaction (reaction.emoji)}
      {@const reacted = getIsReactionMine(reaction.userIds)}

      <div transition:fly={{ y: 30, duration: 50, easing: elasticInOut }}>
        <Button
          class={cn(
            "size-7 w-fit px-1.5 text-center text-base transition-all",
            reacted && "bg-primary/50 border-primary hover:bg-primary/30 border",
          )}
          variant="secondary"
          onclick={() => toggleReaction(reaction.emoji, reacted)}
        >
          {reaction.emoji}
          {#if reaction.userIds.length > 1}
            <span class="pr-0.5 text-sm">
              {reaction.userIds.length}
            </span>
          {/if}
        </Button>
      </div>
    {/each}
  </div>
{/if}
