<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { isAudioType } from "@motus/shared";
  import AudioEmbed from "./audio-embed.svelte";
  import FileEmbed from "./file-embed.svelte";
  import ImageGallery from "./image-gallery.svelte";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  // Images render inline as a gallery, audio as an inline player, and everything
  // else as a download card - each partition delegated to its own embed.
  const images = $derived(message.attachments.filter((a) => a.image));
  const audio = $derived(
    message.attachments.filter((a) => !a.image && isAudioType(a.mime)),
  );
  const files = $derived(
    message.attachments.filter((a) => !a.image && !isAudioType(a.mime)),
  );
</script>

{#if images.length > 0}
  <ImageGallery {images} />
{/if}

{#if audio.length > 0}
  <div class="mt-1 flex flex-col gap-1.5">
    {#each audio as clip (clip.id)}
      <AudioEmbed attachment={clip} />
    {/each}
  </div>
{/if}

{#if files.length > 0}
  <div class="mt-1 flex flex-col gap-1.5">
    {#each files as file (file.id)}
      <FileEmbed attachment={file} />
    {/each}
  </div>
{/if}
