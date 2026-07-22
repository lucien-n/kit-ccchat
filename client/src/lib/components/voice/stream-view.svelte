<script lang="ts">
  import { voice } from "$lib/stores/voice.svelte";
  import { Button } from "&/button";
  import { X } from "@lucide/svelte";

  let el = $state<HTMLVideoElement | null>(null);

  const track = $derived(voice.watching ? voice.screens[voice.watching] : null);
  const name = $derived(
    voice.participants.find((p) => p.identity === voice.watching)?.name ?? "someone",
  );

  // adaptiveStream only pulls frames for an attached, visible element, so the
  // stream costs nothing until this mounts.
  $effect(() => {
    const node = el;
    const current = track;
    if (!node || !current) return;
    current.attach(node);
    return () => {
      current.detach(node);
    };
  });
</script>

<div class="bg-background flex min-h-0 flex-1 flex-col">
  <div class="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
    <span class="text-muted-foreground min-w-0 truncate text-xs">
      Watching <span class="text-foreground font-medium">{name}</span>
    </span>
    <Button
      variant="ghost"
      size="icon-xs"
      title="Back to chat"
      onclick={() => voice.stopWatching()}
    >
      <X class="size-4" />
    </Button>
  </div>

  <video
    bind:this={el}
    autoplay
    muted
    playsinline
    class="min-h-0 w-full flex-1 bg-black object-contain"
  ></video>
</div>
