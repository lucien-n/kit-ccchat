<script lang="ts">
  import MembersPanel from "$lib/components/members/MembersPanel.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Resizable from "$lib/components/ui/resizable";
  import * as Sheet from "$lib/components/ui/sheet";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { X } from "@lucide/svelte";

  const chat = getChatContext();
</script>

{#if chat.isDesktop}
  {#if chat.showMembers}
    <Resizable.Handle />

    <Resizable.Pane
      defaultSize={20}
      minSize={14}
      maxSize={32}
      class="bg-background flex min-h-0 flex-col border-l"
    >
      <div class="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <span class="font-semibold">Members</span>
        <Button
          variant="ghost"
          size="icon"
          title="Close members"
          onclick={() => (chat.showMembers = false)}
        >
          <X class="size-4" />
        </Button>
      </div>
      <MembersPanel />
    </Resizable.Pane>
  {/if}
{:else}
  <Sheet.Root bind:open={chat.showMembers}>
    <Sheet.Content side="right" class="flex w-80 flex-col gap-0 p-0 sm:max-w-sm">
      <Sheet.Header>
        <Sheet.Title>Members</Sheet.Title>
      </Sheet.Header>
      <MembersPanel />
    </Sheet.Content>
  </Sheet.Root>
{/if}
