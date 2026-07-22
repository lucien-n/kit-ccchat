<script lang="ts">
  import { imageUrl, type MessageView } from "$lib/api";
  import * as Dialog from "&/dialog";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  let zoomed = $state<string | null>(null);
</script>

{#if message.images.length > 0}
  <div class="mt-1 flex flex-wrap gap-2">
    {#each message.images as image (image.id)}
      <button
        type="button"
        class="cursor-zoom-in overflow-hidden rounded-xl border"
        onclick={() => (zoomed = image.id)}
      >
        <img
          src={imageUrl(image.id)}
          alt=""
          width={image.width}
          height={image.height}
          loading="lazy"
          class="max-h-80 w-auto max-w-full"
        />
      </button>
    {/each}
  </div>
{/if}

{#if zoomed}
  <Dialog.Root open onOpenChange={() => (zoomed = null)}>
    <Dialog.Content
      class="w-auto max-w-[90vw] bg-transparent p-0 shadow-none ring-0"
      showCloseButton={false}
    >
      <Dialog.Title class="sr-only">Image</Dialog.Title>
      <img src={imageUrl(zoomed)} alt="" class="max-h-[85vh] w-auto rounded-xl" />
    </Dialog.Content>
  </Dialog.Root>
{/if}
