<script lang="ts">
  import { getUserContext } from "$lib/context/user.svelte";
  import { roles } from "$lib/stores/roles.svelte";
  import { cn } from "$lib/utils";
  import { ScrollArea } from "&/scroll-area";
  import CheckIcon from "@lucide/svelte/icons/check";

  const ctx = getUserContext();
</script>

<div class="border-t p-3">
  <div class="text-muted-foreground mb-2 text-xs font-medium">Roles</div>

  {#if ctx.canManageRoles}
    {#if roles.list.length}
      <ScrollArea class="max-h-52">
        <div class="space-y-0.5 pr-2">
          {#each roles.list as role (role.id)}
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
              <CheckIcon class={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")} />
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
