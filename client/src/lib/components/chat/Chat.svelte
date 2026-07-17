<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as Sheet from "$lib/components/ui/sheet";
  import { setBaseTitle, setTitleBadge } from "$lib/notify";
  import { channels } from "$lib/stores/channels.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { messages } from "$lib/stores/messages.svelte";
  import { prefs } from "$lib/stores/prefs.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { unread } from "$lib/stores/unread.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { ChannelType } from "@ccchat/shared";
  import { Bell, BellOff, Hash, Link2, Menu, Users, X } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import * as Resizable from "$lib/components/ui/resizable";
  import CreateChannelDialog from "$lib/components/channel/CreateChannelDialog.svelte";
  import Invites from "$lib/components/members/Invites.svelte";
  import MembersPanel from "$lib/components/members/MembersPanel.svelte";
  import Message from "./Message.svelte";
  import MessageComposer from "./MessageComposer.svelte";
  import Settings from "$lib/components/settings/Settings.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import VoiceBar from "$lib/components/voice/VoiceBar.svelte";

  let showMembers = $state(false);
  let showSettings = $state(false);
  let showInvites = $state(false);
  let showNav = $state(false);

  // Docked panes only make sense on a wide viewport; below sm the sidebar and
  // members list are Sheets instead. Initialised synchronously since Chat only
  // mounts client-side, after the parent's onMount gate.
  let isDesktop = $state(
    typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );
  $effect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => (isDesktop = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  });
  let showCreateChannel = $state(false);
  let createChannelType = $state<ChannelType>(ChannelType.Text);
  let scroller: HTMLElement | null = $state(null);
  let composer = $state<MessageComposer | null>(null);
  let replyTo = $state<MessageView | null>(null);
  let flashId = $state<string | null>(null);
  let flashTimer: ReturnType<typeof setTimeout>;

  $effect(() => {
    void messages.list.length;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  // A draft reply belongs to the channel it was started in.
  $effect(() => {
    void channels.currentId;
    replyTo = null;
  });

  $effect(() => {
    setBaseTitle(community.name);
    setTitleBadge(unread.total);
  });

  // Transient and tied to no field, so it toasts and clears. voice.micError
  // stays out: it's durable call-length status that VoiceBar shows inline.
  $effect(() => {
    if (!voice.error) return;
    toast.error(voice.error);
    voice.error = "";
  });

  function sendDraft(text: string) {
    const channelId = channels.currentId;
    if (!channelId) return false;
    // Keep the draft if the socket is down rather than clear it for a message
    // that went nowhere.
    if (!messages.send(channelId, text, replyTo?.id)) {
      toast.error("Not connected, your message wasn't sent.");
      return false;
    }
    replyTo = null;
    return true;
  }

  function handleStartReply(message: MessageView) {
    replyTo = message;
    composer?.focus();
  }

  /** Only messages already on screen: history stops at the first page, so an
   *  older original has nothing to scroll to. */
  function handleJumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      toast.info("That message is too far back to jump to.");
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    flashId = id;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashId = null), 1400);
  }

  function openCreateChannel(type: ChannelType) {
    createChannelType = type;
    showCreateChannel = true;
  }
</script>

{#snippet mainView()}
  <main class="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
    <header class="flex h-12 items-center justify-between gap-2 border-b px-2 sm:px-4">
      <div class="flex min-w-0 items-center gap-1.5 font-semibold">
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 sm:hidden"
          title="Channels"
          onclick={() => (showNav = true)}
        >
          <Menu class="size-5" />
          {#if unread.total > 0}
            <span class="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full"
            ></span>
          {/if}
        </Button>
        <Hash class="text-muted-foreground size-5 shrink-0" />
        <span class="truncate">{channels.current?.name ?? "no channel"}</span>
      </div>
      <div class="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          title={prefs.soundEnabled
            ? "Mute notification sound"
            : "Unmute notification sound"}
          onclick={() => prefs.toggleSound()}
        >
          {#if prefs.soundEnabled}<Bell class="size-4" />{:else}<BellOff
              class="size-4"
            />{/if}
        </Button>
        <span class="text-muted-foreground hidden text-sm sm:inline"
          >{presence.online.size} online</span
        >
        {#if session.isAdmin}
          <Button
            variant="outline"
            size="icon"
            class="sm:hidden"
            title="Invites"
            onclick={() => (showInvites = true)}
          >
            <Link2 class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="hidden sm:inline-flex"
            onclick={() => (showInvites = true)}
          >
            <Link2 class="size-4" /> Invite
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="sm:hidden"
            title="Members"
            onclick={() => (showMembers = true)}
          >
            <Users class="size-4" />
          </Button>
          <Button
            variant={showMembers ? "secondary" : "outline"}
            size="sm"
            class="hidden sm:inline-flex"
            onclick={() => (showMembers = !showMembers)}
          >
            <Users class="size-4" /> Members
          </Button>
        {/if}
      </div>
    </header>

    <ScrollArea class="min-h-0 flex-1" bind:viewportRef={scroller}>
      <div class="flex flex-col gap-0.5 p-2 sm:p-4">
        {#each messages.list as message (message.id)}
          <Message
            {message}
            {flashId}
            onJumpTo={handleJumpTo}
            onStartReply={() => handleStartReply(message)}
          />
        {:else}
          <div class="text-muted-foreground m-auto">No messages yet. Say hi 👋</div>
        {/each}
      </div>
    </ScrollArea>

    {#if voice.inCall}
      <div class="sm:hidden">
        <VoiceBar compact />
      </div>
    {/if}

    <MessageComposer
      bind:this={composer}
      placeholder={`Message #${channels.current?.name ?? ""}`}
      disabled={channels.current?.type !== ChannelType.Text}
      onsend={sendDraft}
      replyingTo={replyTo}
      oncancelreply={() => (replyTo = null)}
    />
  </main>
{/snippet}

{#if isDesktop}
  <!-- paneforge forces the group to height:100% inline, so it needs a parent
       with real viewport height to resolve against. -->
  <div class="h-dvh">
    <Resizable.PaneGroup direction="horizontal">
      <Resizable.Pane
        defaultSize={18}
        minSize={12}
        maxSize={28}
        class="bg-sidebar text-sidebar-foreground flex min-h-0 flex-col border-r"
      >
        <Sidebar
          withVoice
          onOpenSettings={() => (showSettings = true)}
          onCreateChannel={openCreateChannel}
        />
      </Resizable.Pane>

      <Resizable.Handle />

      <Resizable.Pane minSize={30} class="flex min-w-0 flex-col">
        {@render mainView()}
      </Resizable.Pane>

      {#if showMembers}
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
              onclick={() => (showMembers = false)}
            >
              <X class="size-4" />
            </Button>
          </div>
          <MembersPanel />
        </Resizable.Pane>
      {/if}
    </Resizable.PaneGroup>
  </div>
{:else}
  <div class="flex h-dvh flex-col">
    {@render mainView()}
  </div>

  <Sheet.Root bind:open={showNav}>
    <Sheet.Content
      side="left"
      class="bg-sidebar text-sidebar-foreground flex w-72 flex-col p-0 sm:max-w-xs"
    >
      <Sidebar
        onNavigate={() => (showNav = false)}
        onOpenSettings={() => {
          showNav = false;
          showSettings = true;
        }}
        onCreateChannel={openCreateChannel}
      />
    </Sheet.Content>
  </Sheet.Root>

  <Sheet.Root bind:open={showMembers}>
    <Sheet.Content side="right" class="flex w-80 flex-col gap-0 p-0 sm:max-w-sm">
      <Sheet.Header>
        <Sheet.Title>Members</Sheet.Title>
      </Sheet.Header>
      <MembersPanel />
    </Sheet.Content>
  </Sheet.Root>
{/if}

<Invites bind:open={showInvites} />
<Settings bind:open={showSettings} />
<CreateChannelDialog bind:open={showCreateChannel} initialType={createChannelType} />
