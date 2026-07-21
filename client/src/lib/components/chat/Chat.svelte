<script lang="ts">
  import CreateChannelDialog from "$lib/components/channel/CreateChannelDialog.svelte";
  import CommunitySettings from "$lib/components/community/CommunitySettings.svelte";
  import MembersSidebar from "$lib/components/layout/MembersSidebar.svelte";
  import SearchSidebar from "$lib/components/layout/SearchSidebar.svelte";
  import Sidebar from "$lib/components/layout/sidebar";
  import Settings from "$lib/components/settings/Settings.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Resizable from "$lib/components/ui/resizable";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as Sheet from "$lib/components/ui/sheet";
  import VoiceBar from "$lib/components/voice/VoiceBar.svelte";
  import { setChatContext } from "$lib/context/chat.svelte";
  import { setBaseTitle, setTitleBadge } from "$lib/notify";
  import { channels } from "$lib/stores/channels.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { messages } from "$lib/stores/messages.svelte";
  import { prefs } from "$lib/stores/prefs.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { search } from "$lib/stores/search.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { unread } from "$lib/stores/unread.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { ChannelType } from "@ccchat/shared";
  import { Bell, BellOff, Hash, Menu, Users } from "@lucide/svelte";
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import Message from "./Message.svelte";
  import MessageComposer from "./MessageComposer.svelte";
  import MessageSkeleton from "./MessageSkeleton.svelte";

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
    void messages.list.length;
    if (chat.stick) chat.toBottom();
  });

  const onScroll = () => {
    const el = chat.scroller;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    chat.stick = !messages.hasMoreAfter && fromBottom < 80;
    if (el.scrollTop < 150) void loadOlder();
    if (fromBottom < 150) void messages.loadNewer();
  };

  $effect(() => {
    const el = chat.scroller;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  });

  async function loadOlder() {
    const el = chat.scroller;
    if (!el || messages.loadingOlder || !messages.hasMoreBefore) return;
    const fromBottom = el.scrollHeight - el.scrollTop;
    const holdReadersSpot = () => {
      el.scrollTop = el.scrollHeight - fromBottom;
    };
    const page = messages.loadOlder();
    await tick();
    holdReadersSpot();
    await page;
    await tick();
    holdReadersSpot();
  }

  $effect(() => {
    void channels.currentId;
    chat.replyTo = null;
    chat.stick = true;
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
          onclick={() => (ui.nav = true)}
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
        <Button
          variant={search.open ? "secondary" : "outline"}
          size="icon"
          title="Search messages"
          onclick={() => chat.toggleSearch()}
        >
          <SearchIcon class="size-4" />
        </Button>
        <Button
          variant={chat.showMembers ? "secondary" : "outline"}
          size="icon"
          title="Members"
          onclick={() => (chat.showMembers = !chat.showMembers)}
        >
          <Users class="size-4" />
        </Button>
      </div>
    </header>

    <ScrollArea class="min-h-0 flex-1" bind:viewportRef={chat.scroller}>
      <div class="flex flex-col gap-0.5 p-2 sm:p-4">
        {#if messages.loading}
          <MessageSkeleton count={6} />
        {:else if messages.list.length === 0}
          <div class="text-muted-foreground m-auto">No messages yet. Say hi 👋</div>
        {:else}
          {#if messages.loadingOlder}
            <MessageSkeleton />
          {/if}
          {#each messages.list as message (message.id)}
            <Message {message} />
          {/each}
        {/if}
      </div>
    </ScrollArea>

    {#if messages.hasMoreAfter}
      <div class="flex justify-center border-t px-2 py-1.5">
        <Button variant="secondary" size="sm" onclick={() => chat.backToPresent()}>
          <ArrowDownIcon data-icon="inline-start" />
          Jump to present
        </Button>
      </div>
    {/if}

    {#if voice.inCall}
      <div class="sm:hidden">
        <VoiceBar />
      </div>
    {/if}

    <MessageComposer
      bind:this={chat.composer}
      placeholder={`Message #${channels.current?.name ?? ""}`}
      disabled={channels.current?.type !== ChannelType.Text}
      onsend={(text) => chat.send(text)}
      replyingTo={chat.replyTo}
      oncancelreply={() => (chat.replyTo = null)}
    />
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

      <MembersSidebar />
      <SearchSidebar />
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

  <MembersSidebar />
  <SearchSidebar />
{/if}

<CommunitySettings bind:open={ui.communitySettings} />
<Settings bind:open={ui.settings} />
<CreateChannelDialog bind:open={ui.createChannel} initialType={ui.createChannelType} />
