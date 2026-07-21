<script lang="ts">
  import SearchPanel from "$lib/components/search/SearchPanel.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Resizable from "$lib/components/ui/resizable";
  import * as Sheet from "$lib/components/ui/sheet";
  import { search } from "$lib/stores/search.svelte";
  import { X } from "@lucide/svelte";

  interface Props {
    isDesktop?: boolean;
    onJump: (channelId: string, messageId: string) => void;
  }

  const { isDesktop = false, onJump }: Props = $props();
</script>

{#if isDesktop}
  {#if search.open}
    <Resizable.Handle />

    <Resizable.Pane
      defaultSize={26}
      minSize={18}
      maxSize={40}
      class="bg-background flex min-h-0 flex-col border-l"
    >
      <div class="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <span class="font-semibold">Search</span>
        <Button
          variant="ghost"
          size="icon"
          title="Close search"
          onclick={() => search.close()}
        >
          <X class="size-4" />
        </Button>
      </div>
      <SearchPanel {onJump} />
    </Resizable.Pane>
  {/if}
{:else}
  <Sheet.Root
    open={search.open}
    onOpenChange={(v) => {
      if (!v) search.close();
    }}
  >
    <Sheet.Content side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <Sheet.Header>
        <Sheet.Title>Search</Sheet.Title>
      </Sheet.Header>
      <SearchPanel {onJump} />
    </Sheet.Content>
  </Sheet.Root>
{/if}
