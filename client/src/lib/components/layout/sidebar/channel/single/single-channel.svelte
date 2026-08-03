<script lang="ts">
  import { setChannelContext } from "$lib/context/channel.svelte";
  import { channelTypeSpecs } from "$lib/specs";
  import { channels, presence, unread } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Badge } from "&/badge";
  import { Button } from "&/button";
  import { ChannelType, type Channel } from "@ccchat/shared";
  import HomeIcon from "@lucide/svelte/icons/home";
  import { fly } from "svelte/transition";
  import ChannelContextMenu from "./channel-context-menu.svelte";
  import SingleVoiceParticipant from "./single-voice-participant.svelte";

  interface Props {
    channel: Channel;
    onSelect: () => void;
  }
  const { channel, onSelect }: Props = $props();

  setChannelContext(() => channel);

  const isVoiceChannel = $derived(channel.type === ChannelType.Voice);
  const Icon = $derived(channel.isMain ? HomeIcon : channelTypeSpecs[channel.type].icon);
  const members = $derived(presence.voice[channel.id]);
</script>

<ChannelContextMenu>
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
        {@const mentioned = (unread.mentions[channel.id] ?? 0) > 0}
        <Badge
          variant={mentioned ? "destructive" : "secondary"}
          class="ml-auto h-5 min-w-5 justify-center px-1.5"
          title={mentioned ? "You were mentioned" : undefined}
        >
          {mentioned ? unread.mentions[channel.id] : unread.counts[channel.id]}
        </Badge>
      {/if}
    </Button>

    {#if isVoiceChannel}
      <div class="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5">
        {#each members as member (member.id)}
          <div transition:fly={{ x: -10, duration: 100 }}>
            <SingleVoiceParticipant {member} {channel} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</ChannelContextMenu>
