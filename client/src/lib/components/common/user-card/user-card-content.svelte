<script lang="ts">
  import { api, bannerUrl } from "$lib/api";
  import { refreshMemberColors } from "$lib/app";
  import { setUserContext } from "$lib/context/user.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeBanner, resizeImage } from "$lib/image";
  import { appearance } from "$lib/stores/appearance.svelte";
  import { roles } from "$lib/stores/roles.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import { ScrollArea } from "&/scroll-area";
  import CheckIcon from "@lucide/svelte/icons/check";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import { toast } from "svelte-sonner";
  import UserAvatar from "../user-avatar.svelte";
  import { Input } from "&/input";

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

  function resolveColor(accentColor: string | null): string | null {
    const roleColor = ctx.assigned
      .filter((role) => role.color)
      .sort((a, b) => b.position - a.position)[0]?.color;
    return roleColor ?? accentColor ?? null;
  }

  function previewAccent(accentColor: string | null) {
    if (!ctx.profile) return;
    ctx.profile = { ...ctx.profile, accentColor, color: resolveColor(accentColor) };
  }

  async function saveAccent(accentColor: string | null) {
    previewAccent(accentColor);
    try {
      const { user } = await api.users.updateMe({ accentColor });
      session.patchUser({ accentColor, color: user.color });
      if (ctx.profile) ctx.profile = { ...ctx.profile, accentColor, color: user.color };
      await refreshMemberColors();
    } catch (err) {
      toast.error(apiErrorMessage(err, "failed to save color"));
      await ctx.loadProfile();
    }
  }

  function handleOpenSettings() {
    onClose?.();

    ui.openSettings();
  }

  let bannerInput: HTMLInputElement | null = $state(null);
  let avatarInput: HTMLInputElement | null = $state(null);

  async function onAvatarFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256);
      const { avatarVersion } = await api.users.setAvatar(dataUrl);
      session.patchUser({ avatarVersion });
      await ctx.loadProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err, "upload failed"));
    } finally {
      input.value = "";
    }
  }

  async function removeAvatar() {
    await api.users.removeAvatar().catch(() => {});
    session.patchUser({ avatarVersion: null });
    await ctx.loadProfile();
  }

  async function onBannerFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeBanner(file);
      const { bannerVersion } = await api.users.setBanner(dataUrl);
      session.patchUser({ bannerVersion });
      await ctx.loadProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err, "upload failed"));
    } finally {
      input.value = "";
    }
  }

  async function removeBanner() {
    await api.users.removeBanner().catch(() => {});
    session.patchUser({ bannerVersion: null });
    await ctx.loadProfile();
  }
</script>

{#if ctx.profile}
  {@const banner = bannerUrl(ctx.profile.id, ctx.profile.bannerVersion)}
  <div class="space-y-5">
    <div class="relative flex flex-col gap-4">
      {#if editable}
        <button
          type="button"
          onclick={() => bannerInput?.click()}
          class="group absolute inset-x-0 top-0 h-20 cursor-pointer overflow-hidden rounded-t-2xl"
        >
          {#if banner}
            <img class="h-full w-full object-cover" src={banner} alt="banner" />
          {:else}
            <div
              class="bg-primary/30 h-full w-full"
              style={ctx.profile.color ? `background:${ctx.profile.color}` : undefined}
            ></div>
          {/if}
          <div
            class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <UploadIcon class="size-4" />
            <span class="text-sm font-medium">Change banner</span>
          </div>
        </button>
        {#if ctx.profile.bannerVersion}
          <Button
            variant="secondary"
            size="icon-sm"
            class="absolute top-2 right-2 z-30"
            onclick={removeBanner}
          >
            <Trash2Icon class="size-4" />
          </Button>
        {/if}
      {:else if banner}
        <img
          class="absolute h-20 w-full rounded-t-2xl object-cover"
          src={banner}
          alt="banner"
        />
      {:else}
        <div
          class="bg-primary/30 absolute h-20 w-full rounded-t-2xl"
          style={ctx.profile.color ? `background:${ctx.profile.color}` : undefined}
        ></div>
      {/if}

      {#if editable}
        <div class="absolute top-13 left-4 z-20 size-14">
          <button
            type="button"
            onclick={() => avatarInput?.click()}
            class="group ring-popover block size-14 cursor-pointer overflow-hidden rounded-full ring-4"
          >
            <UserAvatar user={ctx.profile} class="size-14" />
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <UploadIcon class="size-4" />
            </div>
          </button>
          {#if ctx.profile.avatarVersion}
            <Button
              variant="secondary"
              size="icon-sm"
              class="absolute -right-1 -bottom-1 size-6 rounded-full"
              onclick={removeAvatar}
            >
              <Trash2Icon class="size-3" />
            </Button>
          {/if}
        </div>
      {:else}
        <UserAvatar
          user={ctx.profile}
          class="ring-popover absolute top-13 left-4 size-14 ring-4"
          showPresenceDot
        />
      {/if}
      <div class="mt-30 flex w-full flex-col gap-3 px-4">
        <div class="flex flex-col">
          <p
            class="truncate text-lg font-semibold"
            style={appearance.nameStyle(ctx.profile.color)}
          >
            {ctx.profile.displayName}
          </p>
          <div class="text-muted-foreground flex items-center gap-1">
            <p class="truncate text-xs">@{ctx.profile.username}</p>
            <span>·</span>
            <p class="text-[9px] uppercase">
              {ctx.permissionLabel}
            </p>
          </div>
        </div>

        {#if editable}
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground flex-1 text-xs font-medium">
              Accent color
            </span>
            <div class="flex gap-1">
              <Input
                type="color"
                class="size-7 w-10"
                value={ctx.profile.accentColor}
                onchange={(e) => saveAccent(e.currentTarget.value)}
                oninput={(e) => previewAccent(e.currentTarget.value)}
                aria-label="Accent color"
              />
              {#if ctx.profile.accentColor}
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onclick={() => saveAccent(null)}
                  aria-label="Clear accent color"
                >
                  <Trash2Icon class="size-3" />
                </Button>
              {/if}
            </div>
          </div>
        {:else}
          <Button onclick={handleOpenSettings} class="w-full">
            <PencilIcon />
            Edit Profile
          </Button>
        {/if}
      </div>
    </div>

    {#if editable}
      <input
        bind:this={bannerInput}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={onBannerFile}
      />
      <input
        bind:this={avatarInput}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={onAvatarFile}
      />
    {/if}

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
  </div>
{:else}
  <div class="text-muted-foreground p-4 text-sm">Loading…</div>
{/if}
