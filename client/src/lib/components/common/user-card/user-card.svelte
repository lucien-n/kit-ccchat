<script lang="ts">
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { setUserContext } from "$lib/context/user.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { roles as rolesStore } from "$lib/stores/roles.svelte";
  import { cn } from "$lib/utils";
  import CheckIcon from "@lucide/svelte/icons/check";
  import type { Snippet } from "svelte";
  import UserCardActions from "./user-card-actions.svelte";

  interface Props {
    userId: string;
    children: Snippet;
    class?: string;
  }
  const { userId, children, class: className }: Props = $props();

  const ctx = setUserContext(() => userId);

  $effect(() => {
    if (!ctx.open) return;
    ctx.loadProfile();
    ctx.loadRoles();
  });
</script>

<UserCardActions>
  <Popover.Root bind:open={ctx.open}>
    <Popover.Trigger class={cn("cursor-pointer text-left", className)}>
      {@render children()}
    </Popover.Trigger>
    <Popover.Content class="w-72 p-0" align="start">
      {#if ctx.profile}
        {@const user = ctx.profile}
        <div class="flex items-center gap-3 p-4">
          <div class="relative shrink-0">
            <UserAvatar {user} class="size-12" />
            <span
              class={cn(
                "border-background absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2",
                presence.online.has(user.id) ? "bg-green-500" : "bg-muted-foreground",
              )}
            ></span>
          </div>
          <div class="min-w-0">
            <div
              class="truncate font-semibold"
              style={user.color ? `color:${user.color}` : undefined}
            >
              {user.displayName}
            </div>
            <div class="text-muted-foreground truncate text-xs">@{user.username}</div>
            <div class="text-muted-foreground text-[10px] uppercase">
              {ctx.permissionLabel}
            </div>
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
                      class="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
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
