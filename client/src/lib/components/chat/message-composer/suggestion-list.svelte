<script lang="ts">
  import { emojiLabel } from "$lib/emoji";
  import { appearance } from "$lib/stores";
  import { SuggestionKind, type Suggestion } from "./composer.types";

  interface Props {
    matches: readonly Suggestion[];
    active: number;
    onhover: (index: number) => void;
    onaccept: (match: Suggestion) => void;
  }
  const { matches, active, onhover, onaccept }: Props = $props();
</script>

<div
  class="bg-popover text-popover-foreground ring-foreground/10 absolute bottom-full left-2 z-20 mb-1 w-72 overflow-hidden rounded-xl shadow-lg ring-1 sm:left-4"
  role="listbox"
  aria-label="Suggestions"
>
  {#each matches as match, i (match.kind === SuggestionKind.Emoji ? match.entry[1] : match.entry.key)}
    <button
      type="button"
      role="option"
      aria-selected={i === active}
      class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm {i === active
        ? 'bg-accent text-accent-foreground'
        : ''}"
      onmousemove={() => onhover(i)}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => onaccept(match)}
    >
      {#if match.kind === SuggestionKind.Emoji}
        <span class="text-lg leading-none">{match.entry[0]}</span>
        <span class="truncate">:{match.entry[1]}:</span>
        <span class="text-muted-foreground ml-auto truncate text-xs">
          {emojiLabel(match.entry[1])}
        </span>
      {:else}
        <span
          class="size-2 shrink-0 rounded-full"
          style="background:{match.entry.color ?? 'var(--muted-foreground)'}"
        ></span>
        <span
          class="truncate font-medium"
          style={appearance.nameStyle(match.entry.color)}
        >
          {match.entry.label}
        </span>
        <span class="text-muted-foreground ml-auto truncate text-xs">
          {match.entry.detail}
        </span>
      {/if}
    </button>
  {/each}
</div>
