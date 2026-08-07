<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { kindOfAttachment } from "@motus/shared";
  import AudioEmbed from "./audio-embed.svelte";
  import FileEmbed from "./file-embed.svelte";
  import ImageGallery from "./image-gallery.svelte";
  import VideoEmbed from "./video-embed.svelte";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  const { images, audios, videos, files } = $derived(
    message.attachments.reduce<{ [key: string]: MessageView["attachments"] }>(
      (acc, a) => {
        switch (kindOfAttachment(a)) {
          case "image":
            acc.images.push(a);
            break;
          case "audio":
            acc.audios.push(a);
            break;
          case "video":
            acc.videos.push(a);
            break;
          case "file":
            acc.files.push(a);
            break;
        }
        return acc;
      },
      {
        images: [],
        audios: [],
        videos: [],
        files: [],
      },
    ),
  );
</script>

{#if images.length > 0}
  <ImageGallery {images} />
{/if}

{#if audios.length > 0}
  <div class="mt-1 flex flex-col gap-1.5">
    {#each audios as audio (audio.id)}
      <AudioEmbed attachment={audio} />
    {/each}
  </div>
{/if}

{#if videos.length > 0}
  <div class="mt-1 flex flex-col gap-1.5">
    {#each videos as video (video.id)}
      <VideoEmbed attachment={video} />
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
