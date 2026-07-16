<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import { voice } from "$lib/voice.svelte";
  import { Mic, MicOff, PhoneOff, Volume2, X } from "@lucide/svelte";

  let { compact = false }: { compact?: boolean } = $props();
</script>

<div
  class={cn(
    "bg-sidebar-accent/40 shrink-0 space-y-2 border-t p-2",
    compact && "space-y-1.5",
  )}
>
  <div class="flex items-center gap-2">
    <span
      class={cn(
        "size-2 shrink-0 rounded-full bg-amber-500",
        voice.status === "connected" && "bg-green-500",
      )}
    ></span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1 truncate text-sm font-semibold">
        <Volume2 class="size-3.5 shrink-0" />
        <span class="truncate">{voice.channelName}</span>
      </div>
      <div class="text-xs text-green-500">
        {voice.status === "connected"
          ? `Connected · ${voice.participants.length}`
          : "Connecting…"}
      </div>
    </div>
    {#if !compact}
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        title="Disconnect"
        onclick={() => voice.leave()}
      >
        <X class="size-4" />
      </Button>
    {/if}
  </div>

  {#if voice.micError}
    <p class="text-xs text-amber-500">{voice.micError}</p>
  {/if}

  {#if !compact}
    <div class="max-h-40 space-y-0.5 overflow-y-auto">
      {#each voice.participants as p (p.identity)}
        <div
          class={cn(
            "text-muted-foreground flex items-center gap-2 rounded px-1.5 py-1 text-sm",
            p.speaking && "text-foreground",
          )}
        >
          <span
            class={cn(
              "size-2 shrink-0 rounded-full bg-current opacity-50",
              p.speaking && "bg-green-500 opacity-100 ring-2 ring-green-500/30",
            )}
          ></span>
          <span class="flex-1 truncate">{p.name}{p.isLocal ? " (you)" : ""}</span>
          {#if p.muted}<MicOff class="size-3.5 shrink-0" />{/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="flex gap-1.5">
    <Button
      variant={voice.micMuted || !voice.canPublish ? "secondary" : "default"}
      size={compact ? "default" : "sm"}
      class="flex-1"
      disabled={!voice.canPublish}
      title={!voice.canPublish
        ? "You are muted by a moderator"
        : voice.micMuted
          ? "Unmute"
          : "Mute"}
      onclick={() => voice.toggleMic()}
    >
      {#if !voice.canPublish}
        <MicOff class="size-4" /> Muted by mod
      {:else if voice.micMuted}
        <MicOff class="size-4" /> Muted
      {:else}
        <Mic class="size-4" /> Live
      {/if}
    </Button>
    <Button
      variant="destructive"
      size={compact ? "default" : "sm"}
      onclick={() => voice.leave()}
    >
      <PhoneOff class="size-4" />
      <span class={cn(compact && "sr-only")}>Leave</span>
    </Button>
  </div>
</div>
