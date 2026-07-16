<script lang="ts">
  import { avatarUrl } from "$lib/api";
  import { chat } from "$lib/chat.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Sheet from "$lib/components/ui/sheet";
  import { setBaseTitle, setTitleBadge } from "$lib/notify";
  import { voice } from "$lib/voice.svelte";
  import {
    Bell,
    BellOff,
    Hash,
    Link2,
    Menu,
    Send,
    Trash2,
    TriangleAlert,
    Users,
  } from "@lucide/svelte";
  import Invites from "./Invites.svelte";
  import Members from "./Members.svelte";
  import Settings from "./Settings.svelte";
  import Sidebar from "./Sidebar.svelte";
  import VoiceBar from "./VoiceBar.svelte";

  let draft = $state("");
  let showMembers = $state(false);
  let showSettings = $state(false);
  let showInvites = $state(false);
  let showNav = $state(false);
  let scroller: HTMLDivElement | null = $state(null);

  $effect(() => {
    void chat.messages.length;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  $effect(() => {
    setBaseTitle(chat.serverName);
    setTitleBadge(chat.totalUnread);
  });

  function sendDraft(e: Event) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    chat.send(text);
    draft = "";
  }

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const canDelete = (authorId: string | undefined) =>
    chat.isAdmin || authorId === chat.user?.id;
  const initial = (name: string | undefined) =>
    (name ?? "?")[0]?.toUpperCase() ?? "?";
</script>

<div class="grid h-dvh grid-cols-1 sm:grid-cols-[248px_1fr]">
  <aside
    class="bg-sidebar text-sidebar-foreground hidden min-h-0 flex-col border-r sm:flex"
  >
    <Sidebar withVoice onOpenSettings={() => (showSettings = true)} />
  </aside>

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
      />
    </Sheet.Content>
  </Sheet.Root>

  <main class="bg-background flex min-w-0 flex-col">
    <header
      class="flex h-12 items-center justify-between gap-2 border-b px-2 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-1.5 font-semibold">
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 sm:hidden"
          title="Channels"
          onclick={() => (showNav = true)}
        >
          <Menu class="size-5" />
          {#if chat.totalUnread > 0}
            <span
              class="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full"
            ></span>
          {/if}
        </Button>
        <Hash class="text-muted-foreground size-5 shrink-0" />
        <span class="truncate">{chat.currentChannel?.name ?? "no channel"}</span
        >
      </div>
      <div class="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          title={chat.soundEnabled
            ? "Mute notification sound"
            : "Unmute notification sound"}
          onclick={() => chat.toggleSound()}
        >
          {#if chat.soundEnabled}<Bell class="size-4" />{:else}<BellOff
              class="size-4"
            />{/if}
        </Button>
        <span class="text-muted-foreground hidden text-sm sm:inline"
          >{chat.online.size} online</span
        >
        {#if chat.isAdmin}
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
            variant="outline"
            size="sm"
            class="hidden sm:inline-flex"
            onclick={() => (showMembers = true)}
          >
            <Users class="size-4" /> Members
          </Button>
        {/if}
      </div>
    </header>

    {#if voice.error}
      <Alert.Root variant="destructive" class="m-3 w-auto">
        <TriangleAlert class="size-4" />
        <Alert.Description class="flex items-center justify-between gap-3">
          <span>{voice.error}</span>
          <Button variant="ghost" size="sm" onclick={() => (voice.error = "")}
            >dismiss</Button
          >
        </Alert.Description>
      </Alert.Root>
    {/if}

    <div
      bind:this={scroller}
      class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 sm:p-4"
    >
      {#each chat.messages as m (m.id)}
        {@const av = m.author
          ? avatarUrl(m.author.id, m.author.avatarVersion)
          : null}
        <div
          class="group hover:bg-muted/40 relative flex gap-3 rounded-md px-2 py-1"
        >
          <Avatar.Root class="mt-0.5 size-9">
            {#if av}<Avatar.Image src={av} alt="" />{/if}
            <Avatar.Fallback class="bg-primary text-primary-foreground text-sm">
              {initial(m.author?.displayName)}
            </Avatar.Fallback>
          </Avatar.Root>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold"
                >{m.author?.displayName ?? "unknown"}</span
              >
              <span class="text-muted-foreground text-xs"
                >{fmtTime(m.createdAt)}</span
              >
            </div>
            <div class="wrap-break-word whitespace-pre-wrap">{m.content}</div>
          </div>
          {#if canDelete(m.author?.id)}
            <Button
              variant="ghost"
              size="icon"
              class="absolute top-1 right-2 size-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Delete"
              onclick={() => chat.deleteMessage(m.id)}
            >
              <Trash2 class="size-4" />
            </Button>
          {/if}
        </div>
      {:else}
        <div class="text-muted-foreground m-auto">
          No messages yet. Say hi 👋
        </div>
      {/each}
    </div>

    {#if voice.inCall}
      <div class="sm:hidden">
        <VoiceBar compact />
      </div>
    {/if}

    <form class="flex gap-2 p-2 sm:p-4" onsubmit={sendDraft}>
      <Input
        bind:value={draft}
        placeholder={`Message #${chat.currentChannel?.name ?? ""}`}
        disabled={chat.currentChannel?.type !== "text"}
        class="flex-1"
      />
      <Button type="submit" size="icon"><Send class="size-4" /></Button>
    </form>
  </main>

  <Invites bind:open={showInvites} />
  <Members bind:open={showMembers} />
  <Settings bind:open={showSettings} />
</div>
