<script lang="ts">
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { UserCard } from "$lib/components/common/user-card";
  import { voice } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import type { Channel, VoiceMember } from "@ccchat/shared";
  import { HeadphoneOff, MicOff, MonitorPlay } from "@lucide/svelte";

  interface Props {
    member: VoiceMember;
    channel: Channel;
  }
  const { member, channel }: Props = $props();

  const participant = $derived(
    channel.id === voice.channelId
      ? voice.participants.find((p) => p.identity === member.id)
      : undefined,
  );
  const isMuted = $derived(participant?.muted ?? member.muted);
</script>

<div class="flex min-w-0 items-center gap-0.5">
  <UserCard
    userId={member.id}
    class="hover:bg-sidebar-accent min-w-0 flex-1 rounded-2xl px-1.5 py-1"
  >
    <div class="flex min-w-0 items-center gap-2">
      <UserAvatar
        user={member}
        class={cn("size-5 shrink-0", participant?.speaking && "ring-2 ring-green-500")}
        fallbackClass="bg-primary/70 text-[9px]"
      />
      <span class="text-muted-foreground truncate text-xs">
        {member.displayName}
      </span>
    </div>
  </UserCard>

  {#if isMuted}
    <MicOff
      class="text-muted-foreground/70 size-3.5 shrink-0"
      aria-label="{member.displayName} is muted"
    />
  {/if}

  {#if member.deafened}
    <HeadphoneOff
      class="text-muted-foreground/70 size-3.5 shrink-0"
      aria-label="{member.displayName} is deafened"
    />
  {/if}

  {#if member.sharing}
    <Button
      variant="ghost"
      size="icon-xs"
      class="shrink-0 text-red-500 hover:text-red-500"
      title="{member.displayName} is streaming - click to watch"
      onclick={() => voice.watch(channel, member.id)}
    >
      <MonitorPlay class="size-3.5" />
      <span class="sr-only">Watch {member.displayName}'s stream</span>
    </Button>
  {/if}
</div>
