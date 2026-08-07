<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { voice } from "$lib/stores";
  import type { ButtonVariant } from "&/button";
  import { Button } from "&/button";
  import PhoneIcon from "@lucide/svelte/icons/phone";

  interface Props {
    variant?: ButtonVariant;
  }
  const { variant = "destructive" }: Props = $props();
</script>

<Button {variant} size="icon" onclick={() => voice.leave()} title={m.voice_disconnect()}>
  <PhoneIcon class="size-4 rotate-135" />
  <span class="sr-only">{m.voice_leave()}</span>
</Button>
