<script lang="ts">
  import * as AlertDialog from "&/alert-dialog";
  import type { ButtonVariant } from "&/button";
  import type { Snippet } from "svelte";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: ButtonVariant;
    busy?: boolean;
    onConfirm: () => void;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant,
    busy = false,
    onConfirm,
    children,
  }: Props = $props();
</script>

<AlertDialog.Root bind:open {onOpenChange}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      {#if description}
        <AlertDialog.Description>{description}</AlertDialog.Description>
      {/if}
    </AlertDialog.Header>
    {@render children?.()}
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={busy}>{cancelLabel}</AlertDialog.Cancel>
      <AlertDialog.Action disabled={busy} variant={confirmVariant} onclick={onConfirm}>
        {confirmLabel}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
