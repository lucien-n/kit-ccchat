<script lang="ts">
  import { avatarUrl, type MessageView } from "$lib/api";
  import Markdown from "$lib/components/markdown/Markdown.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
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
  import { Bell, BellOff, Hash, Link2, Menu, Reply, Trash2, Users } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import Invites from "./Invites.svelte";
  import Members from "./Members.svelte";
  import MessageComposer from "./MessageComposer.svelte";
  import Settings from "./Settings.svelte";
  import Sidebar from "./Sidebar.svelte";
  import VoiceBar from "./VoiceBar.svelte";

  let showMembers = $state(false);
  let showSettings = $state(false);
  let showInvites = $state(false);
  let showNav = $state(false);
  let scroller: HTMLElement | null = $state(null);
  let composer = $state<MessageComposer | null>(null);
  let replyTo = $state<MessageView | null>(null);
  let flashId = $state<string | null>(null);
  let flashTimer: ReturnType<typeof setTimeout>;

  $effect(() => {
    void messages.list.length;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  // A draft reply belongs to the channel it was started in; the server would
  // drop the reference anyway once it points across channels.
  $effect(() => {
    void channels.currentId;
    replyTo = null;
  });

  $effect(() => {
    setBaseTitle(community.name);
    setTitleBadge(unread.total);
  });

  // Voice failures used to sit in a banner above the composer until dismissed.
  // They're transient and belong to no field, so they toast and clear.
  $effect(() => {
    if (!voice.error) return;
    toast.error(voice.error);
    voice.error = "";
  });

  // voice.micError deliberately stays out of here: it's durable status for the
  // length of the call ("you're listening only"), which VoiceBar shows inline.
  // Toasting it would mean clearing it, and the indicator would vanish.

  function sendDraft(text: string) {
    const channelId = channels.currentId;
    if (!channelId) return false;
    // Keep the draft if the socket is down, rather than clearing the box for a
    // message that went nowhere.
    if (!messages.send(channelId, text, replyTo?.id)) {
      toast.error("Not connected, your message wasn't sent.");
      return false;
    }
    replyTo = null;
    return true;
  }

  function startReply(m: MessageView) {
    replyTo = m;
    composer?.focus();
  }

  /** Only messages already on screen can be reached: history stops at the first
   *  page, so an older original has nothing to scroll to. */
  function jumpTo(id: string) {
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

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const canDelete = (authorId: string | undefined) =>
    session.isAdmin || authorId === session.user?.id;
  const initial = (name: string | undefined) => (name ?? "?")[0]?.toUpperCase() ?? "?";
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

  <main class="bg-background flex min-h-0 min-w-0 flex-col">
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

    <ScrollArea class="min-h-0 flex-1" bind:viewportRef={scroller}>
      <div class="flex flex-col gap-0.5 p-2 sm:p-4">
        {#each messages.list as m (m.id)}
          {@const av = m.author ? avatarUrl(m.author.id, m.author.avatarVersion) : null}
          <div
            id="msg-{m.id}"
            class="group hover:bg-muted/40 relative flex gap-3 rounded-md px-2 py-1 transition-colors duration-700 {flashId ===
            m.id
              ? 'bg-primary/15'
              : ''}"
          >
            <Avatar.Root class="mt-0.5 size-9">
              {#if av}<Avatar.Image src={av} alt="" />{/if}
              <Avatar.Fallback class="bg-primary text-primary-foreground text-sm">
                {initial(m.author?.displayName)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="min-w-0">
              {#if m.replyTo}
                {@const r = m.replyTo}
                {@const rav = r.author
                  ? avatarUrl(r.author.id, r.author.avatarVersion)
                  : null}
                {#if r.deleted}
                  <div
                    class="text-muted-foreground flex items-center gap-1.5 text-xs italic"
                  >
                    <Reply class="size-3 shrink-0" />
                    Original message was deleted
                  </div>
                {:else}
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-1.5 text-left text-xs"
                    onclick={() => jumpTo(r.id)}
                  >
                    <Reply class="size-3 shrink-0" />
                    <Avatar.Root class="size-4 shrink-0">
                      {#if rav}<Avatar.Image src={rav} alt="" />{/if}
                      <Avatar.Fallback
                        class="bg-primary text-primary-foreground text-[0.5rem]"
                      >
                        {initial(r.author?.displayName)}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span class="shrink-0 font-medium">
                      {r.author?.displayName ?? "unknown"}
                    </span>
                    <span class="text-foreground truncate">{r.content}</span>
                  </button>
                {/if}
              {/if}
              <div class="flex items-baseline gap-2">
                <span class="font-semibold">{m.author?.displayName ?? "unknown"}</span>
                <span class="text-muted-foreground text-xs">{fmtTime(m.createdAt)}</span>
              </div>
              <Markdown content={m.content} />
            </div>
            <div
              class="absolute top-1 right-2 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                title="Reply"
                onclick={() => startReply(m)}
              >
                <Reply class="size-4" />
              </Button>
              {#if canDelete(m.author?.id)}
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-7"
                  title="Delete"
                  onclick={() => messages.delete(m.id)}
                >
                  <Trash2 class="size-4" />
                </Button>
              {/if}
            </div>
          </div>
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
      disabled={channels.current?.type !== "text"}
      onsend={sendDraft}
      replyingTo={replyTo}
      oncancelreply={() => (replyTo = null)}
    />
  </main>

  <Invites bind:open={showInvites} />
  <Members bind:open={showMembers} />
  <Settings bind:open={showSettings} />
</div>
