<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { reactedByMe, toggleReaction } from "$lib/reactions";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import { elasticInOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();
</script>

{#if message.reactions.length > 0}
  <div class="mt-1 mb-1 flex flex-wrap gap-1">
    {#each message.reactions as reaction (reaction.emoji)}
      {@const reacted = reactedByMe(reaction.userIds)}

      <div transition:fly={{ y: 30, duration: 50, easing: elasticInOut }}>
        <Button
          size="icon-sm"
          class={cn(
            "w-fit gap-1.5 px-2 text-center text-lg transition-all",
            reacted && "bg-primary/50 border-primary hover:bg-primary/30 border",
          )}
          variant="secondary"
          onclick={() => toggleReaction(message, reaction.emoji)}
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
