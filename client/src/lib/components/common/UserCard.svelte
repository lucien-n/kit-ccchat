<script lang="ts">
  import { api, type Member, type Role } from "$lib/api";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import * as Popover from "$lib/components/ui/popover";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { apiErrorMessage } from "$lib/forms";
  import { members } from "$lib/stores/members.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { roles as rolesStore } from "$lib/stores/roles.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import BanIcon from "@lucide/svelte/icons/ban";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import UserIcon from "@lucide/svelte/icons/user";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";
  import type { Snippet } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    userId: string;
    children: Snippet;
    class?: string;
  }
  let { userId, children, class: className }: Props = $props();

  let open = $state(false);
  let user = $state<Member | null>(null);
  let assigned = $state<Role[]>([]);
  let busyId = $state<string | null>(null);

  const assignedIds = $derived(new Set(assigned.map((r) => r.id)));
  const canManage = $derived(
    session.isAdmin && (session.isOwner || !user?.isOwner) && user !== null,
  );
  const permissionLabel = $derived(
    user?.isOwner ? "owner" : user?.isAdmin ? "admin" : "member",
  );

  const target = $derived(members.byId(userId));
  const isSelf = $derived(userId === session.user?.id);
  const canModerate = $derived(
    session.isAdmin && !isSelf && !!target && (session.isOwner || !target.isOwner),
  );

  // Blockout: the menu structure and gating are real, the actions are not wired
  // to api.mod() yet. Ban and mute still need a confirm step and a duration picker.
  function todo(action: string) {
    toast.info(`${action} is not wired up yet`);
  }

  async function copyId() {
    await navigator.clipboard.writeText(userId);
    toast.success("user id copied");
  }

  async function loadProfile() {
    if (!session.token) return;
    try {
      const res = await api.userProfile(session.token, userId);
      user = res.user;
      assigned = res.roles;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to load profile"));
    }
  }

  $effect(() => {
    if (!open) return;
    loadProfile();
    if (session.isAdmin) rolesStore.load();
  });

  async function toggle(roleId: string) {
    if (!session.token || !user) return;
    const next = assignedIds.has(roleId)
      ? [...assignedIds].filter((id) => id !== roleId)
      : [...assignedIds, roleId];
    busyId = roleId;
    try {
      await members.setRoles(user.id, next);
      await loadProfile();
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to update roles"));
    } finally {
      busyId = null;
    }
  }
</script>

<ContextMenu.Root>
  <!-- display:contents so the wrapper stays invisible to the parent's layout and
       every existing `class` on UserCard keeps landing on the same element. -->
  <ContextMenu.Trigger class="contents">
    <Popover.Root bind:open>
      <Popover.Trigger class={cn("cursor-pointer text-left", className)}>
        {@render children()}
      </Popover.Trigger>
      <Popover.Content class="w-72 p-0" align="start">
        {#if user}
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
                {permissionLabel}
              </div>
            </div>
          </div>

          <div class="border-t p-3">
            <div class="text-muted-foreground mb-2 text-xs font-medium">Roles</div>

            {#if canManage}
              {#if rolesStore.list.length}
                <ScrollArea class="max-h-52">
                  <div class="space-y-0.5 pr-2">
                    {#each rolesStore.list as role (role.id)}
                      {@const on = assignedIds.has(role.id)}
                      <button
                        type="button"
                        class="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm disabled:opacity-50"
                        disabled={busyId !== null}
                        onclick={() => toggle(role.id)}
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
            {:else if assigned.length}
              <div class="flex flex-wrap gap-1">
                {#each assigned as role (role.id)}
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
  </ContextMenu.Trigger>

  <ContextMenu.Content class="w-52">
    <ContextMenu.Group>
      <ContextMenu.Item onSelect={() => (open = true)}>
        <UserIcon />
        View profile
      </ContextMenu.Item>
      <ContextMenu.Item onSelect={copyId}>
        <CopyIcon />
        Copy user id
      </ContextMenu.Item>
    </ContextMenu.Group>

    {#if canModerate}
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.GroupHeading>Moderation</ContextMenu.GroupHeading>
        {#if target?.mutedUntil}
          <ContextMenu.Item onSelect={() => todo("unmute")}>
            <Volume2Icon />
            Unmute
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Item onSelect={() => todo("mute")}>
            <VolumeXIcon />
            Mute
          </ContextMenu.Item>
        {/if}
        <ContextMenu.Item onSelect={() => todo("kick")}>
          <LogOutIcon />
          Kick
        </ContextMenu.Item>
        {#if target?.banned}
          <ContextMenu.Item onSelect={() => todo("unban")}>
            <BanIcon />
            Unban
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Item variant="destructive" onSelect={() => todo("ban")}>
            <BanIcon />
            Ban
          </ContextMenu.Item>
        {/if}
      </ContextMenu.Group>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>
