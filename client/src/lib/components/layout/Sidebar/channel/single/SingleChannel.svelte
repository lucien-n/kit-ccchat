<script lang="ts">
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { UserCard } from "$lib/components/common/UserCard";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { channels } from "$lib/stores/channels.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { unread } from "$lib/stores/unread.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { cn } from "$lib/utils";
  import { ChannelType, type Channel } from "@ccchat/shared";
  import { CHANNEL_TYPE_ICON } from "../helpers";
  import ChannelContextMenu from "./ChannelContextMenu.svelte";

  interface Props {
    channel: Channel;
    onSelect: () => void;
  }
  const { channel, onSelect }: Props = $props();

  const isVoiceChannel = $derived(channel.type === ChannelType.Voice);
  const Icon = $derived(CHANNEL_TYPE_ICON[channel.type]);
  const members = $derived(presence.voice[channel.id]);
</script>

<ChannelContextMenu {channel}>
  <div class="flex flex-col">
    <Button
      variant="ghost"
      class={cn(
        "text-muted-foreground h-10 w-full justify-start gap-2 px-2 font-normal sm:h-8",
        channel.id === channels.currentId &&
          "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
      onclick={onSelect}
      title={isVoiceChannel ? "Join voice" : undefined}
    >
      <Icon class="size-4 shrink-0" />
      <span class="truncate">{channel.name}</span>
      {#if (unread.counts[channel.id] ?? 0) > 0}
        <Badge variant="destructive" class="ml-auto h-5 min-w-5 justify-center px-1.5">
          {unread.counts[channel.id]}
        </Badge>
      {/if}
    </Button>

    {#if isVoiceChannel && members}
      <div class="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5">
        {#each members as member (member.id)}
          {@const speaking =
            channel.id === voice.channelId &&
            voice.participants.find((p) => p.identity === member.id)?.speaking}
          <UserCard
            userId={member.id}
            class="hover:bg-sidebar-accent w-full min-w-0 rounded-2xl px-1.5 py-1"
          >
            <div class="flex min-w-0 items-center gap-2">
              <UserAvatar
                user={member}
                class={cn("size-5 shrink-0", speaking && "ring-2 ring-green-500")}
                fallbackClass="bg-primary/70 text-[9px]"
              />
              <span class="text-muted-foreground truncate text-xs">
                {member.displayName}
              </span>
            </div>
          </UserCard>
        {/each}
      </div>
    {/if}
  </div>
</ChannelContextMenu>
