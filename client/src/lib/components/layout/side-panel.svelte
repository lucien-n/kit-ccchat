<script lang="ts">
  import MembersPanel from "$lib/components/members/members-panel.svelte";
  import SearchPanel from "$lib/components/search/search-panel.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { Button } from "&/button";
  import * as Resizable from "&/resizable";
  import * as Sheet from "&/sheet";
  import { X } from "@lucide/svelte";

  const chat = getChatContext();

  const searching = $derived(chat.panel === "search");
  const title = $derived(searching ? "Search" : "Members");
</script>

{#snippet body()}
  {#if searching}
    <SearchPanel />
  {:else}
    <MembersPanel />
  {/if}
{/snippet}

{#if chat && chat.isDesktop}
  {#if chat.panel}
    <Resizable.Handle />

    <Resizable.Pane
      defaultSize={24}
      minSize={16}
      maxSize={40}
      class="bg-background flex min-h-0 flex-col border-l"
    >
      <div class="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <span class="font-semibold">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          title="Close {title.toLowerCase()}"
          onclick={() => (chat.panel = "")}
        >
          <X class="size-4" />
        </Button>
      </div>
      {@render body()}
    </Resizable.Pane>
  {/if}
{:else}
  <Sheet.Root
    open={chat.panel !== ""}
    onOpenChange={(v) => {
      if (!v) chat.panel = "";
    }}
  >
    <Sheet.Content
      side="right"
      class="flex flex-col gap-0 p-0 {searching ? 'w-full' : 'w-80'}"
    >
      <Sheet.Header>
        <Sheet.Title>{title}</Sheet.Title>
      </Sheet.Header>
      {@render body()}
    </Sheet.Content>
  </Sheet.Root>
{/if}
