<script lang="ts">
  import type { SearchHit } from "$lib/api";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { channels } from "$lib/stores/channels.svelte";
  import { MATCH_CLOSE, MATCH_OPEN } from "@ccchat/shared";
  import HashIcon from "@lucide/svelte/icons/hash";

  interface Props {
    hit: SearchHit;
    onJump: () => void;
  }
  const { hit, onJump }: Props = $props();

  const channelName = $derived(
    channels.list.find((c) => c.id === hit.message.channelId)?.name ?? "unknown",
  );

  type Segment = { text: string; match: boolean };

  function segments(snippet: string): Segment[] {
    const out: Segment[] = [];
    for (const chunk of snippet.split(MATCH_OPEN)) {
      const [matched, ...rest] = chunk.split(MATCH_CLOSE);
      if (rest.length === 0) out.push({ text: chunk, match: false });
      else {
        out.push({ text: matched, match: true });
        out.push({ text: rest.join(MATCH_CLOSE), match: false });
      }
    }
    return out.filter((s) => s.text.length > 0);
  }

  function fmtDate(ts: number) {
    return new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
</script>

<button
  type="button"
  class="hover:bg-muted/60 focus-visible:ring-ring flex w-full flex-col gap-1 rounded-2xl p-2 text-left focus-visible:ring-2 focus-visible:outline-none"
  onclick={onJump}
>
  <div class="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
    <HashIcon class="size-3 shrink-0" />
    <span class="truncate font-medium">{channelName}</span>
    <span class="shrink-0">·</span>
    <span class="shrink-0">{fmtDate(hit.message.createdAt)}</span>
  </div>

  <div class="flex min-w-0 gap-2">
    <UserAvatar
      user={hit.message.author}
      class="mt-0.5 size-6 shrink-0"
      fallbackClass="text-[0.6rem]"
    />
    <div class="min-w-0 flex-1">
      <div
        class="text-sm font-semibold"
        style={hit.message.author?.color
          ? `color:${hit.message.author.color}`
          : undefined}
      >
        {hit.message.author?.displayName ?? "unknown"}
      </div>
      <p class="text-muted-foreground text-sm wrap-break-word whitespace-pre-wrap">
        {#each segments(hit.snippet) as segment, i (i)}
          {#if segment.match}
            <mark class="bg-primary/25 text-foreground rounded-sm px-0.5"
              >{segment.text}</mark
            >
          {:else}{segment.text}{/if}
        {/each}
      </p>
    </div>
  </div>
</button>
