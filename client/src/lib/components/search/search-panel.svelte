<script lang="ts">
  import MessageSkeleton from "$lib/components/chat/message-skeleton.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { parseQuery } from "$lib/search-query";
  import { channels } from "$lib/stores/channels.svelte";
  import { members } from "$lib/stores/members.svelte";
  import { search } from "$lib/stores/search.svelte";
  import { Button } from "&/button";
  import * as Empty from "&/empty";
  import { ScrollArea } from "&/scroll-area";
  import * as ToggleGroup from "&/toggle-group";
  import { SearchSort } from "@ccchat/shared";
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
          {search.total}
          {search.total === 1 ? "result" : "results"}
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
          Newest
        </ToggleGroup.Item>
        <ToggleGroup.Item value={SearchSort.Relevance} class="text-xs">
          Best match
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class="flex flex-col gap-1 p-2">
      {#if unknownIn}
        <p class="text-muted-foreground p-2 text-sm">
          No channel called <span class="text-foreground">#{parsed.in}</span>.
        </p>
      {:else if unknownFrom}
        <p class="text-muted-foreground p-2 text-sm">
          Nobody here called <span class="text-foreground">@{parsed.from}</span>.
        </p>
      {:else if search.loading && search.hits.length === 0}
        <MessageSkeleton count={5} />
      {:else if !search.ran}
        <Empty.Root class="py-10">
          <Empty.Header>
            <Empty.Media variant="icon">
              <SearchIcon />
            </Empty.Media>
            <Empty.Title>Search this community</Empty.Title>
            <Empty.Description>
              Type to search every channel at once, or pick just a channel or an author to
              browse everything they hold.
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else if search.hits.length === 0}
        <Empty.Root class="py-10">
          <Empty.Header>
            <Empty.Media variant="icon">
              <SearchXIcon />
            </Empty.Media>
            <Empty.Title>Nothing found</Empty.Title>
            <Empty.Description>No message matches that search.</Empty.Description>
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
            {search.loading ? "Loading…" : "Load more"}
          </Button>
        {/if}
      {/if}
    </div>
  </ScrollArea>
</div>
