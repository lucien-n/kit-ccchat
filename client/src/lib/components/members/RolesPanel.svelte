<script lang="ts">
  import { api, type ModeratedMember } from "$lib/api";
  import { Select } from "$lib/components/common/select";
  import MemberIdentity from "$lib/components/common/MemberIdentity.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { apiErrorMessage } from "$lib/forms";
  import { permissionSpecs } from "$lib/specs";
  import { members } from "$lib/stores/members.svelte";
  import { roles as rolesStore } from "$lib/stores/roles.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { Permission } from "@ccchat/shared";
  import CheckIcon from "@lucide/svelte/icons/check";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  let selectedId = $state<string | null>(null);
  let memberSearch = $state("");
  let busy = $state(false);

  let name = $state("");
  let color = $state("#5865f2");
  let permission = $state<Permission>(Permission.Member);

  const selected = $derived(rolesStore.list.find((r) => r.id === selectedId) ?? null);

  const shownMembers = $derived.by(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.list
      .filter((m) => !m.banned)
      .filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  const countFor = (roleId: string) =>
    members.list.filter((m) => m.roleIds.includes(roleId)).length;

  const canEdit = (m: ModeratedMember) => session.isOwner || !m.isOwner;

  onMount(() => {
    rolesStore.load();
    members.load();
  });

  async function create() {
    if (!session.token || !name.trim()) return;
    busy = true;
    try {
      const { role } = await api.createRole(session.token, {
        name: name.trim(),
        color,
        permission,
      });
      name = "";
      await rolesStore.load(true);
      selectedId = role.id;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to create role"));
    } finally {
      busy = false;
    }
  }

  async function remove(id: string) {
    if (!session.token) return;
    try {
      await api.deleteRole(session.token, id);
      if (selectedId === id) selectedId = null;
      await rolesStore.load(true);
      await members.load(true);
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to delete role"));
    }
  }

  async function toggleMember(member: ModeratedMember, roleId: string) {
    const has = member.roleIds.includes(roleId);
    const next = has
      ? member.roleIds.filter((id) => id !== roleId)
      : [...member.roleIds, roleId];
    busy = true;
    try {
      await members.setRoles(member.id, next);
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to update roles"));
    } finally {
      busy = false;
    }
  }
</script>

<div class="grid h-full grid-cols-2 gap-4">
  <div class="flex w-full flex-col gap-3">
    <div class="space-y-2">
      <Label>New role</Label>
      <Input placeholder="Role name" bind:value={name} class="w-full" />
      <div class="flex items-center gap-2">
        <Input type="color" bind:value={color} aria-label="Role color" />
        <Select
          bind:value={permission}
          options={Object.values(permissionSpecs)}
          triggerProps={{
            class: "min-w-32",
          }}
        />
        <Button onclick={create} disabled={busy || !name.trim()}>Create</Button>
      </div>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-0.5 pr-2">
        {#each rolesStore.list as role (role.id)}
          <div
            class={cn(
              "group flex items-center gap-2 rounded-md p-2",
              selectedId === role.id ? "bg-muted" : "hover:bg-muted/50",
            )}
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              onclick={() => (selectedId = role.id)}
            >
              <span
                class="size-3 rounded-full border"
                style={role.color ? `background:${role.color}` : undefined}
              ></span>
              <span
                class="flex-1 truncate text-sm font-medium"
                style={role.color ? `color:${role.color}` : undefined}
              >
                {role.name}
              </span>
              <span class="text-muted-foreground text-[10px] uppercase">
                {role.permission}
              </span>
              <span class="text-muted-foreground text-xs">{countFor(role.id)}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 opacity-0 group-hover:opacity-100"
              title="Delete role"
              onclick={() => remove(role.id)}
            >
              <Trash2Icon class="size-4" />
            </Button>
          </div>
        {:else}
          <p class="text-muted-foreground py-8 text-center text-sm">
            No roles yet. Create one.
          </p>
        {/each}
      </div>
    </ScrollArea>
  </div>

  <div class="flex min-h-0 w-full flex-col border-l pl-4">
    {#if selected}
      <div class="flex items-center gap-2 pb-3">
        <span
          class="size-3 rounded-full border"
          style={selected.color ? `background:${selected.color}` : undefined}
        ></span>
        <span
          class="font-medium"
          style={selected.color ? `color:${selected.color}` : undefined}
        >
          {selected.name}
        </span>
        <span class="text-muted-foreground text-[10px] uppercase"
          >{selected.permission}</span
        >
      </div>

      <Input placeholder="Search members" bind:value={memberSearch} class="mb-2" />

      <ScrollArea class="h-full">
        <div class="space-y-0.5 pr-2">
          {#each shownMembers as member (member.id)}
            {@const on = member.roleIds.includes(selected.id)}
            <button
              type="button"
              class="hover:bg-muted flex w-full items-center gap-2 rounded-md p-2 text-left disabled:opacity-50"
              disabled={busy || !canEdit(member)}
              onclick={() => toggleMember(member, selected.id)}
            >
              <MemberIdentity {member}>
                <CheckIcon
                  class={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")}
                />
              </MemberIdentity>
            </button>
          {:else}
            <p class="text-muted-foreground py-8 text-center text-sm">No members found</p>
          {/each}
        </div>
      </ScrollArea>
    {:else}
      <div class="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Select a role to manage its members.
      </div>
    {/if}
  </div>
</div>
