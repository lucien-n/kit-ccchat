<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { formatDate } from "$lib/format";
  import { canPin, togglePin } from "$lib/pins";
  import { appearance, channels, pins } from "$lib/stores";
  import { Button } from "&/button";
  import * as Popover from "&/popover";
  import { ScrollArea } from "&/scroll-area";
  import PinIcon from "@lucide/svelte/icons/pin";
  import PinOffIcon from "@lucide/svelte/icons/pin-off";

  const chat = getChatContext();

  let open = $state(false);

  // Reload whenever the popover opens, and follow a channel switch made while
  // it's still open, so the list never shows a stale channel's pins.
  $effect(() => {
    if (open && channels.currentId) void pins.load(channels.currentId);
  });

  async function jump(id: string) {
    open = false;
    await chat.jumpTo(id);
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" title={m.pins_title()}>
        <PinIcon class="size-4" />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content align="end" side="bottom" class="w-80 gap-0 p-0">
    <div class="flex items-center gap-1.5 border-b px-3 py-2 text-sm font-semibold">
      <PinIcon class="size-4" />
      {m.pins_title()}
    </div>

    {#if pins.loading && pins.list.length === 0}
      <div class="text-muted-foreground py-8 text-center text-sm">{m.pins_loading()}</div>
    {:else if pins.list.length === 0}
      <div class="text-muted-foreground px-4 py-8 text-center text-sm">
        {m.pins_empty()}
      </div>
    {:else}
      <ScrollArea class="max-h-96">
        <div class="flex flex-col gap-0.5 p-1">
          {#each pins.list as message (message.id)}
            <div class="group/pin hover:bg-muted/60 relative rounded-2xl">
              <button
                type="button"
                class="focus-visible:ring-ring flex w-full flex-col gap-1 rounded-2xl p-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                onclick={() => jump(message.id)}
              >
                <div class="flex min-w-0 gap-2">
                  <UserAvatar
                    user={message.author}
                    class="mt-0.5 size-6 shrink-0"
                    fallbackClass="text-[0.6rem]"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-1.5">
                      <span
                        class="truncate text-sm font-semibold"
                        style={appearance.nameStyle(message.author?.color ?? null)}
                      >
                        {message.author?.displayName ?? m.common_unknown()}
                      </span>
                      <span class="text-muted-foreground shrink-0 text-xs">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p
                      class="text-muted-foreground line-clamp-3 text-sm wrap-break-word whitespace-pre-wrap"
                    >
                      {message.content || m.message_no_text()}
                    </p>
                  </div>
                </div>
              </button>
              {#if canPin(message)}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={m.pins_unpin()}
                  class="absolute top-1.5 right-1.5 opacity-0 group-hover/pin:opacity-100 focus-visible:opacity-100"
                  onclick={() => togglePin(message)}
                >
                  <PinOffIcon class="size-4" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      </ScrollArea>
    {/if}
  </Popover.Content>
</Popover.Root>
