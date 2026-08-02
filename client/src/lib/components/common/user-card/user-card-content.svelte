<script lang="ts">
  import { setUserContext } from "$lib/context/user.svelte";
  import UserCardHeader from "./user-card-header.svelte";
  import UserCardRoles from "./user-card-roles.svelte";

  interface Props {
    userId: string;
    onClose?: () => void;
    editable?: boolean;
  }
  const { userId, onClose, editable = false }: Props = $props();

  const ctx = setUserContext(() => userId);
  $effect(() => {
    void userId;

    ctx.loadProfile();
    ctx.loadRoles();
  });
</script>

{#if ctx.profile}
  <div class="space-y-5">
    <UserCardHeader {editable} {onClose} />
    <UserCardRoles />
  </div>
{:else}
  <div class="text-muted-foreground p-4 text-sm">Loading…</div>
{/if}
