<script lang="ts">
  import {
    completeToken,
    parseQuery,
    partialToken,
    withoutFilter,
    type FilterKey,
  } from "$lib/search-query";
  import { channels } from "$lib/stores/channels.svelte";
  import { members } from "$lib/stores/members.svelte";
  import { search } from "$lib/stores/search.svelte";
  import { Badge } from "&/badge";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import { ChannelType } from "@ccchat/shared";
  import AtSignIcon from "@lucide/svelte/icons/at-sign";
  import HashIcon from "@lucide/svelte/icons/hash";
  import SearchIcon from "@lucide/svelte/icons/search";
  import XIcon from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";

  let input = $state<HTMLInputElement | null>(null);

  const parsed = $derived(parseQuery(search.raw));
  const typing = $derived(partialToken(search.raw));

  const textChannels = $derived(channels.list.filter((c) => c.type === ChannelType.Text));

  const suggestions = $derived.by(() => {
    if (!typing) return [];
    const needle = typing.value.toLowerCase();
    if (typing.key === "in")
      return textChannels
        .filter((c) => c.name.toLowerCase().includes(needle))
        .slice(0, 6)
        .map((c) => ({ value: c.name, label: c.name, hint: "" }));
    return members.list
      .filter(
        (m) =>
          m.username.toLowerCase().includes(needle) ||
          m.displayName.toLowerCase().includes(needle),
      )
      .slice(0, 6)
      .map((m) => ({ value: m.username, label: m.displayName, hint: m.username }));
  });

  onMount(() => input?.focus());

  function choose(value: string) {
    if (!typing) return;
    search.raw = completeToken(search.raw, typing.key, value);
    input?.focus();
  }

  function insert(key: FilterKey) {
    search.raw = search.raw.trimEnd() + (search.raw.trim() ? " " : "") + `${key}:`;
    input?.focus();
  }

  function drop(key: FilterKey) {
    search.raw = withoutFilter(search.raw, key);
    input?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (typing) search.raw = search.raw.replace(/\s*\S+$/, "");
      else search.close();
    }
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      choose(suggestions[0].value);
    }
  }
</script>

<div class="relative flex flex-col gap-2">
  <div class="relative">
    <SearchIcon
      class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
    />
    <Input
      bind:ref={input}
      bind:value={search.raw}
      placeholder="Search messages"
      class="pl-8"
      autocomplete="off"
      spellcheck={false}
      onkeydown={onKeydown}
    />
  </div>

  <div class="flex flex-wrap items-center gap-1">
    {#if parsed.in}
      <Badge variant="secondary" class="gap-1">
        <HashIcon />
        {parsed.in}
        <button type="button" title="Clear channel filter" onclick={() => drop("in")}>
          <XIcon class="size-3" />
        </button>
      </Badge>
    {:else}
      <Button variant="ghost" size="sm" class="h-6 px-2" onclick={() => insert("in")}>
        <HashIcon data-icon="inline-start" />
        Channel
      </Button>
    {/if}

    {#if parsed.from}
      <Badge variant="secondary" class="gap-1">
        <AtSignIcon />
        {parsed.from}
        <button type="button" title="Clear author filter" onclick={() => drop("from")}>
          <XIcon class="size-3" />
        </button>
      </Badge>
    {:else}
      <Button variant="ghost" size="sm" class="h-6 px-2" onclick={() => insert("from")}>
        <AtSignIcon data-icon="inline-start" />
        Author
      </Button>
    {/if}
  </div>

  {#if typing && suggestions.length > 0}
    <ul
      class="bg-popover text-popover-foreground absolute top-11 z-20 w-full overflow-hidden rounded-md border shadow-md"
    >
      {#each suggestions as suggestion (suggestion.value)}
        <li>
          <button
            type="button"
            class="hover:bg-accent flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm"
            onclick={() => choose(suggestion.value)}
          >
            {#if typing.key === "in"}<HashIcon
                class="text-muted-foreground size-3.5"
              />{:else}<AtSignIcon class="text-muted-foreground size-3.5" />{/if}
            <span class="truncate">{suggestion.label}</span>
            {#if suggestion.hint && suggestion.hint !== suggestion.label}
              <span class="text-muted-foreground truncate text-xs">
                {suggestion.hint}
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
