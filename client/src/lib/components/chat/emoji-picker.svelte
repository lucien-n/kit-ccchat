<script lang="ts">
  import {
    emojiLabel,
    loadEmoji,
    searchEmoji,
    type EmojiEntry,
    type EmojiIndex,
  } from "$lib/emoji";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import * as Popover from "&/popover";
  import { ScrollArea } from "&/scroll-area";
  import SmilePlusIcon from "@lucide/svelte/icons/smile-plus";

  interface Props {
    onpick: (emoji: string) => void;
    disabled?: boolean;
    class?: string;
  }
  const { onpick, disabled = false, class: className }: Props = $props();

  let open = $state(false);
  let index = $state<EmojiIndex | null>(null);
  let query = $state("");
  let group = $state(0);

  $effect(() => {
    if (open && !index) void loadEmoji().then((i) => (index = i));
  });

  const shown = $derived(index ? index.groups.filter((g) => !g.hidden) : []);

  const results = $derived.by((): readonly EmojiEntry[] => {
    if (!index) return [];
    if (query.trim()) return searchEmoji(index, query, 96);
    return shown[group]?.emojis ?? [];
  });

  function pick(emoji: string) {
    onpick(emoji);
    open = false;
    query = "";
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        title="Emoji"
        {disabled}
        class={className}
      >
        <SmilePlusIcon class="size-4" />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content align="end" side="top" class="w-80 gap-2 p-2">
    <Input bind:value={query} placeholder="Search emoji" autocomplete="off" />

    {#if !index}
      <div class="text-muted-foreground py-8 text-center text-sm">Loading emoji...</div>
    {:else}
      {#if !query.trim()}
        <div class="flex gap-0.5 border-b pb-2">
          {#each shown as g, i (g.name)}
            <Button
              variant={i === group ? "secondary" : "ghost"}
              size="icon"
              class="size-7 text-base"
              title={g.name}
              onclick={() => (group = i)}
            >
              {g.emojis[0][0]}
            </Button>
          {/each}
        </div>
      {/if}

      <ScrollArea class="h-56">
        {#if results.length}
          <div class="grid grid-cols-8 gap-0.5 pr-2">
            {#each results as [emoji, shortcode] (emoji)}
              <button
                type="button"
                class="hover:bg-accent rounded-2xl p-1 text-xl leading-none"
                title=":{shortcode}:"
                aria-label={emojiLabel(shortcode)}
                onclick={() => pick(emoji)}
              >
                {emoji}
              </button>
            {/each}
          </div>
        {:else}
          <div class="text-muted-foreground py-8 text-center text-sm">
            No emoji matches "{query.trim()}"
          </div>
        {/if}
      </ScrollArea>
    {/if}
  </Popover.Content>
</Popover.Root>
