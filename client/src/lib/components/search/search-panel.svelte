<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import MessageSkeleton from "$lib/components/chat/message-skeleton.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { parseQuery } from "$lib/search-query";
  import { channels, members, search } from "$lib/stores";
  import { Button } from "&/button";
  import * as Empty from "&/empty";
  import { ScrollArea } from "&/scroll-area";
  import * as ToggleGroup from "&/toggle-group";
  import { SearchSort } from "@motus/shared";
  import SearchIcon from "@lucide/svelte/icons/search";
  import SearchXIcon from "@lucide/svelte/icons/search-x";
  import SearchInput from "./search-input.svelte";
  import SearchResult from "./search-result.svelte";

  const chat = getChatContext();

  const parsed = $derived(parseQuery(search.raw));

  const channelId = $derived(
    parsed.in
      ? channels.list.find((c) => c.name.toLowerCase() === parsed.in!.toLowerCase())?.id
      : undefined,
  );
  const authorId = $derived(
    parsed.from
      ? members.list.find(
          (m) =>
            m.username.toLowerCase() === parsed.from!.toLowerCase() ||
            m.displayName.toLowerCase() === parsed.from!.toLowerCase(),
        )?.id
      : undefined,
  );

  // A filter naming something that does not exist would otherwise be dropped and
  // silently widen the search to everything.
  const unknownIn = $derived(parsed.in !== null && !channelId);
  const unknownFrom = $derived(parsed.from !== null && !authorId);

  // Nothing to rank or highlight without text, so those results are newest-first
  // whatever the toggle says.
  const rankable = $derived(parsed.text.trim().length >= 2);

  $effect(() => {
    if (unknownIn || unknownFrom) return;
    search.schedule({ q: parsed.text, channelId, authorId });
  });
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex flex-col gap-2 border-b p-3">
    <SearchInput />

    <div class="flex items-center justify-between gap-2">
      <span class="text-muted-foreground text-xs">
        {#if search.ran}
          {search.total === 1
            ? m.search_result_one({ count: search.total })
            : m.search_result_many({ count: search.total })}
        {/if}
      </span>
      <ToggleGroup.Root
        type="single"
        size="sm"
        disabled={!rankable}
        value={rankable ? search.sort : SearchSort.Newest}
        onValueChange={(v) => {
          if (v) search.sort = v as SearchSort;
        }}
      >
        <ToggleGroup.Item value={SearchSort.Newest} class="text-xs">
          {m.search_sort_newest()}
        </ToggleGroup.Item>
        <ToggleGroup.Item value={SearchSort.Relevance} class="text-xs">
          {m.search_sort_relevance()}
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class="flex flex-col gap-1 p-2">
      {#if unknownIn}
        <p class="text-muted-foreground p-2 text-sm">
          {m.search_no_channel({ name: parsed.in ?? "" })}
        </p>
      {:else if unknownFrom}
        <p class="text-muted-foreground p-2 text-sm">
          {m.search_no_author({ name: `@${parsed.from ?? ""}` })}
        </p>
      {:else if search.loading && search.hits.length === 0}
        <MessageSkeleton count={5} />
      {:else if !search.ran}
        <Empty.Root class="py-10">
          <Empty.Header>
            <Empty.Media variant="icon">
              <SearchIcon />
            </Empty.Media>
            <Empty.Title>{m.search_empty_title()}</Empty.Title>
            <Empty.Description>{m.search_empty_description()}</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else if search.hits.length === 0}
        <Empty.Root class="py-10">
          <Empty.Header>
            <Empty.Media variant="icon">
              <SearchXIcon />
            </Empty.Media>
            <Empty.Title>{m.search_none_title()}</Empty.Title>
            <Empty.Description>{m.search_none_description()}</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else}
        {#each search.hits as hit (hit.message.id)}
          <SearchResult
            {hit}
            onJump={() => chat.jumpToHit(hit.message.channelId, hit.message.id)}
          />
        {/each}
        {#if search.hasMore}
          <Button
            variant="ghost"
            size="sm"
            class="mt-1"
            disabled={search.loading}
            onclick={() => search.more()}
          >
            {search.loading ? m.common_loading() : m.search_load_more()}
          </Button>
        {/if}
      {/if}
    </div>
  </ScrollArea>
</div>
