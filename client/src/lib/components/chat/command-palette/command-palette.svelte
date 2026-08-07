<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { getChatContext } from "$lib/context/chat.svelte";
  import * as Command from "&/command";
  import * as Dialog from "&/dialog";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import { providers } from "./providers.svelte";
  import type { PaletteContext } from "./types";

  const chat = getChatContext();

  let isOpen = $state(false);
  let query = $state("");

  const ctx: PaletteContext = {
    close: () => (isOpen = false),
    jumpToMessage: (channelId, messageId) => void chat.jumpToHit(channelId, messageId),
  };

  $effect(() => {
    if (isOpen) {
      for (const provider of providers) {
        provider.open?.();
      }
    } else {
      query = "";
      for (const provider of providers) {
        provider.close?.();
      }
    }
  });

  $effect(() => {
    for (const provider of providers) {
      provider.sync?.(query);
    }
  });

  const sections = $derived(
    providers
      .map((provider) => ({
        group: provider.group,
        results: provider.results(query, ctx),
      }))
      .filter((search) => search.results.length),
  );
  const isLoading = $derived(providers.some((provider) => provider.loading));

  function handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "k" && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      isOpen = !isOpen;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<Dialog.Root bind:open={isOpen}>
  <Dialog.Content class="bg-transparent shadow-none ring-0" showCloseButton={false}>
    <Command.Root shouldFilter={false}>
      <Command.Input placeholder={m.palette_search_placeholder()} bind:value={query} />
      <Command.List>
        {#if !isLoading}
          <Command.Empty>{m.palette_no_results()}</Command.Empty>
        {/if}
        {#each sections as section (section.group)}
          <Command.Group heading={section.group}>
            {#each section.results as result (result.id)}
              {@const Icon = result.icon}
              <Command.Item value={result.id} onSelect={result.onSelect}>
                <Icon class="size-4 shrink-0" />
                <div class="flex min-w-0 flex-col">
                  <span class="truncate">{result.label}</span>
                  {#if result.subtitle}
                    <span class="text-muted-foreground truncate text-xs">
                      {result.subtitle}
                    </span>
                  {/if}
                </div>
              </Command.Item>
            {/each}
          </Command.Group>
        {/each}
        {#if isLoading}
          <Command.Loading>
            <div
              class="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm"
            >
              <LoaderCircleIcon class="size-4 animate-spin" />
              {m.palette_searching()}
            </div>
          </Command.Loading>
        {/if}
      </Command.List>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>
