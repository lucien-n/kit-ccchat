<script lang="ts">
  import SidePanel from "$lib/components/layout/side-panel.svelte";
  import Sidebar from "$lib/components/layout/sidebar";
  import RoomView from "$lib/components/voice/room-view.svelte";
  import StreamView from "$lib/components/voice/stream-view.svelte";
  import { setChatContext } from "$lib/context/chat.svelte";
  import { setBaseTitle, setTitleBadge } from "$lib/notify";
  import { channels, community, prefs, ui, unread, voice } from "$lib/stores";
  import * as Resizable from "&/resizable";
  import * as Sheet from "&/sheet";
  import { ChannelType } from "@ccchat/shared";
  import { toast } from "svelte-sonner";
  import ChatDialogs from "./chat-dialogs.svelte";
  import ChatView from "./chat-view.svelte";

  const desktopNow =
    typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;

  const chat = setChatContext(desktopNow, desktopNow && prefs.membersPanel);

  $effect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => (chat.isDesktop = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  });

  $effect(() => {
    if (chat.isDesktop) prefs.setMembersPanel(chat.showMembers);
  });

  $effect(() => {
    void channels.currentId;
    chat.replyTo = null;
    chat.stick = true;
  });

  $effect(() => {
    setBaseTitle(community.name);
    setTitleBadge(unread.total);
  });

  // A hard join failure is transient and tied to no field, so it toasts and
  // clears; listen-only (denied mic) is durable status VoiceBar shows instead.
  $effect(() => {
    if (!voice.error) return;
    toast.error(voice.error);
    voice.error = "";
  });
</script>

{#snippet mainView()}
  <main class="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
    {#if voice.watching}
      <StreamView />
    {:else if channels.current?.type === ChannelType.Voice}
      <RoomView channel={channels.current} />
    {:else}
      <ChatView />
    {/if}
  </main>
{/snippet}

{#if chat.isDesktop}
  <div class="h-dvh">
    <Resizable.PaneGroup direction="horizontal" autoSaveId="app-layout">
      <Resizable.Pane
        defaultSize={18}
        minSize={12}
        maxSize={28}
        class="bg-sidebar text-sidebar-foreground flex min-h-0 flex-col border-r"
      >
        <Sidebar withVoice />
      </Resizable.Pane>

      <Resizable.Handle />

      <Resizable.Pane minSize={30} class="flex min-w-0 flex-col">
        {@render mainView()}
      </Resizable.Pane>

      <SidePanel />
    </Resizable.PaneGroup>
  </div>
{:else}
  <div class="flex h-dvh flex-col">
    {@render mainView()}
  </div>

  <Sheet.Root bind:open={ui.nav}>
    <Sheet.Content
      side="left"
      class="bg-sidebar text-sidebar-foreground flex w-72 flex-col p-0 sm:max-w-xs"
    >
      <Sidebar />
    </Sheet.Content>
  </Sheet.Root>

  <SidePanel />
{/if}

<ChatDialogs />
