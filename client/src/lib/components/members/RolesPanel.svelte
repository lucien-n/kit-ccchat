<script lang="ts">
  import { api, type Role } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { apiErrorMessage } from "$lib/forms";
  import { session } from "$lib/stores/session.svelte";
  import { Permission } from "@ccchat/shared";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  let roles = $state<Role[]>([]);
  let search = $state("");
  let busy = $state(false);

  // Draft for the "new role" form.
  let name = $state("");
  let color = $state("#5865f2");
  let permission = $state<Permission>(Permission.Member);

  const shown = $derived(
    roles.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  onMount(load);

  async function load() {
    if (!session.token) return;
    try {
      roles = (await api.roles(session.token)).roles;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to load roles"));
    }
  }

  async function create() {
    if (!session.token || !name.trim()) return;
    busy = true;
    try {
      await api.createRole(session.token, { name: name.trim(), color, permission });
      name = "";
      await load();
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
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to delete role"));
    }
  }

  // TODO(you): inline edit (name/color/permission) -> api.updateRole
  // TODO(you): reorder roles (position) -> api.updateRole({ position })
  // TODO(you): assign roles to a member -> api.setUserRoles (likely in the members UI)
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex gap-2 pb-2">
    <Input placeholder="Search roles" bind:value={search} class="flex-1" />
  </div>

  <!-- New role -->
  <div class="space-y-2 border-b pb-4">
    <Label>New role</Label>
    <div class="flex items-end gap-2">
      <Input placeholder="Role name" bind:value={name} class="flex-1" />
      <input
        type="color"
        bind:value={color}
        aria-label="Role color"
        class="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent"
      />
      <select
        bind:value={permission}
        class="border-input bg-background h-9 rounded-md border px-2 text-sm"
      >
        <option value={Permission.Member}>member</option>
        <option value={Permission.Admin}>admin</option>
      </select>
      <Button onclick={create} disabled={busy || !name.trim()}>Create</Button>
    </div>
  </div>

  <!-- Role list -->
  <div class="min-h-0 flex-1 space-y-1 overflow-y-auto pt-2">
    {#each shown as role (role.id)}
      <div class="hover:bg-muted/50 flex items-center gap-2 rounded-md p-2">
        <span
          class="size-3 shrink-0 rounded-full border"
          style={role.color ? `background:${role.color}` : undefined}
        ></span>
        <span
          class="flex-1 truncate text-sm font-medium"
          style={role.color ? `color:${role.color}` : undefined}
        >
          {role.name}
        </span>
        <span class="text-muted-foreground text-[10px] uppercase">{role.permission}</span>
        <Button variant="ghost" size="sm" class="h-7" onclick={() => remove(role.id)}
          >delete</Button
        >
      </div>
    {:else}
      <p class="text-muted-foreground py-8 text-center text-sm">
        No roles yet. Create one above.
      </p>
    {/each}
  </div>
</div>
