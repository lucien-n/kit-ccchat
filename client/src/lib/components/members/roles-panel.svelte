<script lang="ts">
  import { api, type ModeratedMember, type Role } from "$lib/api";
  import MemberIdentity from "$lib/components/common/member-identity.svelte";
  import { Select } from "$lib/components/common/select";
  import { attempt } from "$lib/forms";
  import { permissionSpecs } from "$lib/specs";
  import { members, roles as rolesStore, session } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import { Label } from "&/label";
  import { ScrollArea } from "&/scroll-area";
  import { Permission } from "@motus/shared";
  import CheckIcon from "@lucide/svelte/icons/check";
  import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { onMount } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "$lib/motion";

  const DEFAULT_COLOR = "#5865f2";

  let selectedId = $state<string | null>(null);
  let memberSearch = $state("");
  let busy = $state(false);

  type RoleFields = { name: string; color: string; permission: Permission };
  const blankFields = (): RoleFields => ({
    name: "",
    color: DEFAULT_COLOR,
    permission: Permission.Member,
  });

  const draft = $state<RoleFields>(blankFields());

  // Selected role's editable fields, populated on select() so an in-flight edit
  // isn't clobbered by a background roles refresh.
  const edit = $state<RoleFields>(blankFields());

  const selected = $derived(rolesStore.list.find((r) => r.id === selectedId) ?? null);
  const dirty = $derived(
    !!selected &&
      (edit.name.trim() !== selected.name ||
        edit.color !== (selected.color ?? DEFAULT_COLOR) ||
        edit.permission !== selected.permission),
  );

  function select(role: Role) {
    selectedId = role.id;
    edit.name = role.name;
    edit.color = role.color ?? DEFAULT_COLOR;
    edit.permission = role.permission;
  }

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
    if (!draft.name.trim()) return;
    busy = true;
    await attempt(
      async () => {
        const { role } = await api.roles.create({
          name: draft.name.trim(),
          color: draft.color,
          permission: draft.permission,
        });
        draft.name = "";
        await rolesStore.load(true);
        select(role);
      },
      { error: "failed to create role" },
    );
    busy = false;
  }

  async function saveEdit() {
    if (!selected || !edit.name.trim()) return;
    busy = true;
    await attempt(
      async () => {
        await api.roles.update(selected.id, {
          name: edit.name.trim(),
          color: edit.color,
          permission: edit.permission,
        });
        await rolesStore.load(true);
      },
      { error: "failed to update role" },
    );
    busy = false;
  }

  // Local mirror the dnd zone can reorder live; kept in sync with the store
  // except while a drag is in flight.
  let ordered = $state<Role[]>([]);
  let dragging = $state(false);
  $effect(() => {
    if (!dragging) ordered = rolesStore.list;
  });

  function consider(e: CustomEvent<DndEvent<Role>>) {
    dragging = true;
    ordered = e.detail.items;
  }

  async function finalize(e: CustomEvent<DndEvent<Role>>) {
    ordered = e.detail.items;
    dragging = false;
    const order = ordered.map((r) => r.id);
    if (order.every((id, i) => id === rolesStore.list[i]?.id)) return;
    busy = true;
    await attempt(
      async () => {
        await api.roles.reorder(order);
        await rolesStore.load(true);
      },
      { error: "failed to reorder roles" },
    );
    busy = false;
  }

  async function remove(id: string) {
    await attempt(
      async () => {
        await api.roles.delete(id);
        if (selectedId === id) selectedId = null;
        await rolesStore.load(true);
        await members.load(true);
      },
      { error: "failed to delete role" },
    );
  }

  async function toggleMember(member: ModeratedMember, roleId: string) {
    const has = member.roleIds.includes(roleId);
    const next = has
      ? member.roleIds.filter((id) => id !== roleId)
      : [...member.roleIds, roleId];
    busy = true;
    await attempt(() => members.setRoles(member.id, next), {
      error: "failed to update roles",
    });
    busy = false;
  }
</script>

{#snippet roleFields(
  model: RoleFields,
  label: string,
  onsubmit: () => void,
  submitLabel: string,
  disabled: boolean,
)}
  <Label>{label}</Label>
  <Input placeholder="Role name" bind:value={model.name} class="w-full" />
  <div class="flex flex-wrap items-center gap-2">
    <Input type="color" bind:value={model.color} aria-label="Role color" class="w-8" />
    <Select
      bind:value={model.permission}
      options={Object.values(permissionSpecs)}
      triggerProps={{ class: "min-w-32" }}
    />
    <Button onclick={onsubmit} {disabled}>{submitLabel}</Button>
  </div>
{/snippet}

<div class="flex h-full min-h-0 flex-col gap-4 sm:grid sm:grid-cols-2">
  <div class="flex min-h-0 w-full flex-1 flex-col gap-3">
    <div class="space-y-2">
      {@render roleFields(
        draft,
        "New role",
        create,
        "Create",
        busy || !draft.name.trim(),
      )}
    </div>

    <ScrollArea class="min-h-0 flex-1">
      {#if ordered.length === 0}
        <p class="text-muted-foreground py-8 text-center text-sm">
          No roles yet. Create one.
        </p>
      {/if}
      <div
        class="flex flex-col gap-0.5 pr-2"
        use:dndzone={{
          items: ordered,
          flipDurationMs: 150,
          dropTargetStyle: {},
          dragDisabled: busy,
        }}
        onconsider={consider}
        onfinalize={finalize}
      >
        {#each ordered as role (role.id)}
          <div
            animate:flip={{ duration: 150 }}
            class={cn(
              "group flex items-center gap-1 rounded-2xl p-2",
              selectedId === role.id ? "bg-muted" : "hover:bg-muted/50",
            )}
          >
            <span
              class="text-muted-foreground/60 hover:text-muted-foreground -ml-1 cursor-grab"
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              <GripVerticalIcon class="size-4" />
            </span>
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              onclick={() => select(role)}
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
              class="size-7 opacity-0 group-hover:opacity-100 max-sm:opacity-100"
              title="Delete role"
              onclick={() => remove(role.id)}
            >
              <Trash2Icon class="size-4" />
            </Button>
          </div>
        {/each}
      </div>
    </ScrollArea>
  </div>

  <div
    class={cn(
      "flex min-h-0 w-full flex-col sm:border-l sm:pl-4",
      selected ? "max-sm:flex-1 max-sm:border-t max-sm:pt-4" : "max-sm:hidden",
    )}
  >
    {#if selected}
      <div class="space-y-2 pb-3">
        {@render roleFields(
          edit,
          "Edit role",
          saveEdit,
          "Save",
          busy || !edit.name.trim() || !dirty,
        )}
      </div>

      <Input placeholder="Search members" bind:value={memberSearch} class="mb-2" />

      <ScrollArea class="h-full">
        <div class="space-y-0.5 pr-2">
          {#each shownMembers as member (member.id)}
            {@const on = member.roleIds.includes(selected.id)}
            <button
              type="button"
              class="hover:bg-muted flex w-full items-center gap-2 rounded-2xl p-2 text-left disabled:opacity-50"
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
