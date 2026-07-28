<script lang="ts">
  import { bannerUrl } from "$lib/api";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { setUserContext } from "$lib/context/user.svelte";
  import { roles as rolesStore } from "$lib/stores/roles.svelte";
  import { cn } from "$lib/utils";
  import * as Popover from "&/popover";
  import { ScrollArea } from "&/scroll-area";
  import CheckIcon from "@lucide/svelte/icons/check";
  import type { Snippet } from "svelte";
  import UserCardActions from "./user-card-actions.svelte";
  import { Button } from "&/button";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import { ui } from "$lib/stores/ui.svelte";

  interface Props {
    userId: string;
    /** Omitted when the card has no trigger of its own and is positioned with
     *  `anchor` instead, e.g. opened from a mention inside markdown output. */
    children?: Snippet;
    anchor?: HTMLElement | null;
    open?: boolean;
    class?: string;
  }
  let {
    userId,
    children,
    anchor = null,
    open = $bindable(false),
    class: className,
  }: Props = $props();

  const ctx = setUserContext(() => userId);

  $effect(() => {
    if (!open) return;
    ctx.loadProfile();
    ctx.loadRoles();
  });

  function handleOpenSettings() {
    open = false;

    ui.openSettings();
  }
</script>

<UserCardActions>
  <Popover.Root bind:open>
    {#if children}
      <Popover.Trigger class={cn("cursor-pointer text-left", className)}>
        {@render children()}
      </Popover.Trigger>
    {/if}
    <Popover.Content class="w-72 p-0" align="start" customAnchor={anchor}>
      {#if ctx.profile}
        {@const user = ctx.profile}
        {@const banner = bannerUrl(user.id, user.bannerVersion)}
        <div class="flex flex-col gap-4">
          {#if banner}
            <img
              class="absolute h-20 w-full rounded-t-2xl object-cover"
              src={banner}
              alt="banner"
            />
          {:else}
            <div
              class="bg-primary/30 absolute h-20 w-full rounded-t-2xl"
              style={user.color ? `background:${user.color}` : undefined}
            ></div>
          {/if}
          <UserAvatar
            {user}
            class="ring-popover absolute top-13 left-4 size-14 ring-4"
            showPresenceDot
          />
          <div class="mt-30 flex w-full flex-col gap-3 px-4">
            <div class="flex flex-col">
              <p
                class="truncate text-lg font-semibold"
                style={user.color ? `color:${user.color}` : undefined}
              >
                {user.displayName}
              </p>
              <div class="text-muted-foreground flex items-center gap-1">
                <p class="truncate text-xs">@{user.username}</p>
                <span>·</span>
                <p class="text-[9px] uppercase">
                  {ctx.permissionLabel}
                </p>
              </div>
            </div>

            <Button onclick={handleOpenSettings} class="w-full">
              <PencilIcon />
              Edit Profile
            </Button>
          </div>
        </div>

        <div class="border-t p-3">
          <div class="text-muted-foreground mb-2 text-xs font-medium">Roles</div>

          {#if ctx.canManageRoles}
            {#if rolesStore.list.length}
              <ScrollArea class="max-h-52">
                <div class="space-y-0.5 pr-2">
                  {#each rolesStore.list as role (role.id)}
                    {@const on = ctx.assignedIds.has(role.id)}
                    <button
                      type="button"
                      class="hover:bg-muted flex w-full items-center gap-2 rounded-2xl px-2 py-1.5 text-sm disabled:opacity-50"
                      disabled={ctx.busyRoleId !== null}
                      onclick={() => ctx.toggleRole(role.id)}
                    >
                      <span
                        class="size-3 shrink-0 rounded-full border"
                        style={role.color ? `background:${role.color}` : undefined}
                      ></span>
                      <span class="flex-1 truncate text-left">{role.name}</span>
                      <span class="text-muted-foreground text-[10px] uppercase">
                        {role.permission}
                      </span>
                      <CheckIcon
                        class={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")}
                      />
                    </button>
                  {/each}
                </div>
              </ScrollArea>
            {:else}
              <p class="text-muted-foreground text-xs">
                No roles exist yet. Create some in Community settings.
              </p>
            {/if}
          {:else if ctx.assigned.length}
            <div class="flex flex-wrap gap-1">
              {#each ctx.assigned as role (role.id)}
                <span
                  class="rounded-full border px-2 py-0.5 text-xs"
                  style={role.color
                    ? `color:${role.color};border-color:${role.color}`
                    : undefined}
                >
                  {role.name}
                </span>
              {/each}
            </div>
          {:else}
            <p class="text-muted-foreground text-xs">No roles</p>
          {/if}
        </div>
      {:else}
        <div class="text-muted-foreground p-4 text-sm">Loading…</div>
      {/if}
    </Popover.Content>
  </Popover.Root>
</UserCardActions>
