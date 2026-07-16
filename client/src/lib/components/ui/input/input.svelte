<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import EyeClosedIcon from "@lucide/svelte/icons/eye-closed";
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
  import { Button } from "../button";

  type InputType = Exclude<HTMLInputTypeAttribute, "file">;

  type Props = WithElementRef<
    Omit<HTMLInputAttributes, "type"> &
      ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
  >;

  let {
    ref = $bindable(null),
    value = $bindable(),
    type,
    files = $bindable(),
    class: className,
    "data-slot": dataSlot = "input",
    ...restProps
  }: Props = $props();

  let isPasswordVisible = $state(false);
</script>

{#if type === "file"}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      "bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 file:text-foreground placeholder:text-muted-foreground h-8 w-full min-w-0 rounded-2xl border border-transparent px-2.5 py-1 text-base transition-[color,box-shadow] duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
      className,
    )}
    type="file"
    bind:files
    bind:value
    {...restProps}
  />
{:else}
  <div class="relative flex-1">
    <input
      bind:this={ref}
      data-slot={dataSlot}
      class={cn(
        "bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 file:text-foreground placeholder:text-muted-foreground h-8 w-full min-w-0 rounded-2xl border border-transparent px-2.5 py-1 text-base transition-[color,box-shadow] duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        type === "password" && "pr-8",
        className,
      )}
      type={type === "password" && isPasswordVisible ? "text" : type}
      bind:value
      {...restProps}
    />
    {#if type === "password"}
      <Button
        class="absolute right-0"
        onclick={() => (isPasswordVisible = !isPasswordVisible)}
        variant="ghost"
        size="icon"
      >
        {#if isPasswordVisible}
          <EyeIcon />
        {:else}
          <EyeClosedIcon />
        {/if}
      </Button>
    {/if}
  </div>
{/if}
