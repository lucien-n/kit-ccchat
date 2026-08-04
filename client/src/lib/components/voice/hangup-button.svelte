<script>
  import { voice } from "$lib/stores";
  import { Button } from "&/button";
  import PhoneIcon from "@lucide/svelte/icons/phone";
</script>

<Button variant="secondary" size="icon" onclick={() => voice.leave()} title="Disconnect">
  <PhoneIcon class="size-4 rotate-135" />
  <span class="sr-only">Leave</span>
</Button>
