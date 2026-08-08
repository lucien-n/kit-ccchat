<script lang="ts">
  import { setChannelContext } from "$lib/context/channel.svelte";
  import { fly } from "$lib/motion";
  import { channelTypeSpecs } from "$lib/specs";
  import {
    channels,
    presence,
    session,
    unread,
    voice,
    VOICE_DRAG_MIME,
  } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Badge } from "&/badge";
  import { buttonVariants } from "&/button";
  import HomeIcon from "@lucide/svelte/icons/home";
  import { ChannelType, type Channel } from "@motus/shared";
  import ChannelContextMenu from "./channel-context-menu.svelte";
  import SingleVoiceParticipant from "./single-voice-participant.svelte";

  interface Props {
    channel: Channel;
    onSelect: () => void;
    onMouseEnterParticipant?: () => void;
    onMouseLeaveParticipant?: () => void;
    onVoiceDragStart?: () => void;
    onVoiceDragEnd?: () => void;
  }

  const {
    channel,
    onSelect,
    onMouseEnterParticipant,
    onMouseLeaveParticipant,
    onVoiceDragStart,
    onVoiceDragEnd,
  }: Props = $props();

  setChannelContext(() => channel);

  const isVoiceChannel = $derived(channel.type === ChannelType.Voice);
  const Icon = $derived(channel.isMain ? HomeIcon : channelTypeSpecs[channel.type].icon);
  const members = $derived(presence.voice[channel.id] ?? []);

  let dragOver = $state(false);

  function acceptsDrag(e: DragEvent) {
    return isVoiceChannel && !!e.dataTransfer?.types.includes(VOICE_DRAG_MIME);
  }

  function handleDragOver(ev: DragEvent) {
    if (!acceptsDrag(ev)) return;

    ev.preventDefault();
    ev.stopPropagation();

    ev.dataTransfer!.dropEffect = "move";
    dragOver = true;
  }

  function handleDragLeave(ev: DragEvent) {
    if (!acceptsDrag(ev)) return;

    const current = ev.currentTarget as HTMLElement;
    const related = ev.relatedTarget as Node | null;

    if (related && current.contains(related)) return;

    dragOver = false;
  }

  function handleDrop(ev: DragEvent) {
    if (!acceptsDrag(ev)) return;

    ev.preventDefault();
    ev.stopPropagation();

    dragOver = false;

    const userId = ev.dataTransfer!.getData(VOICE_DRAG_MIME);
    if (!userId) return;

    if (userId === session.user?.id) {
      void voice.join({
        id: channel.id,
        name: channel.name,
      });
    } else {
      voice.moveMember(userId, channel.id);
    }
  }
</script>

<ChannelContextMenu>
  <div
    class={cn(
      "flex flex-col rounded-2xl",
      dragOver && "ring-primary bg-primary/10 ring-2",
    )}
    role={isVoiceChannel ? "group" : undefined}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <div
      role="button"
      tabindex="0"
      class={cn(
        buttonVariants({ variant: "ghost" }),
        "text-muted-foreground h-10 w-full justify-start gap-2 px-2 font-normal sm:h-8",
        channel.id === channels.currentId &&
          "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
      onclick={onSelect}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
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
    </div>

    {#if isVoiceChannel && members.length}
      <div class="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5">
        {#each members.toSorted((a, b) => a.id.localeCompare(b.id)) as member (member.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            transition:fly={{ x: -10, duration: 100 }}
            onmouseenter={onMouseEnterParticipant}
            onmouseleave={onMouseLeaveParticipant}
          >
            <SingleVoiceParticipant
              {member}
              {channel}
              {onVoiceDragStart}
              {onVoiceDragEnd}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</ChannelContextMenu>
