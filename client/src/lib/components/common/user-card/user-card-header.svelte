<script lang="ts">
  import { api, bannerUrl } from "$lib/api";
  import { refreshMemberColors } from "$lib/app";
  import { getUserContext } from "$lib/context/user.svelte";
  import { apiErrorMessage, attempt } from "$lib/forms";
  import { isRejectedAtLimit, shakeAtLimit } from "$lib/length";
  import { resizeBanner, resizeImage } from "$lib/image";
  import { appearance, session, ui } from "$lib/stores";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import { Textarea } from "&/textarea";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import { BIO_MAX_LEN } from "@motus/shared";
  import { toast } from "svelte-sonner";
  import UserAvatar from "../user-avatar.svelte";

  interface Props {
    editable?: boolean;
    onClose?: () => void;
  }
  const { editable = false, onClose }: Props = $props();

  const ctx = getUserContext();
  const isMine = $derived(session.user?.id === ctx.userId);

  let bannerInput: HTMLInputElement | null = $state(null);
  let avatarInput: HTMLInputElement | null = $state(null);

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

  // Seed the editable drafts once per profile so an unrelated live update (a
  // color preview reassigning ctx.profile) never clobbers what's being typed.
  let nameDraft = $state("");
  let bioDraft = $state("");
  let seededFor: string | null = $state(null);

  $effect(() => {
    const p = ctx.profile;
    if (p && seededFor !== p.id) {
      nameDraft = p.displayName;
      bioDraft = p.bio ?? "";
      seededFor = p.id;
    }
  });

  async function commitProfile(
    patch: { displayName: string } | { bio: string },
    fallback: string,
  ) {
    try {
      const { user } = await api.users.updateMe(patch);
      session.patchUser(user);
      if (ctx.profile) ctx.profile = { ...ctx.profile, ...user };
      return user;
    } catch (err) {
      toast.error(apiErrorMessage(err, fallback));
      return null;
    }
  }

  async function saveName() {
    const displayName = nameDraft.trim();
    if (!displayName || displayName === ctx.profile?.displayName) {
      nameDraft = ctx.profile?.displayName ?? "";
      return;
    }
    const user = await commitProfile({ displayName }, "failed to save name");
    nameDraft = user?.displayName ?? ctx.profile?.displayName ?? "";
  }

  async function saveBio() {
    const bio = bioDraft.trim();
    if (bio === (ctx.profile?.bio ?? "")) return;
    const user = await commitProfile({ bio }, "failed to save bio");
    bioDraft = user?.bio ?? ctx.profile?.bio ?? "";
  }

  let bioCountEl: HTMLElement | null = $state(null);
  const bioAtMax = $derived(bioDraft.length >= BIO_MAX_LEN);

  function onBioKeydown(e: KeyboardEvent) {
    if (isRejectedAtLimit(e, bioAtMax))
      shakeAtLimit(bioCountEl, appearance.motionReduced);
  }

  function handleOpenSettings() {
    onClose?.();

    ui.openSettings();
  }

  async function onAvatarFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await attempt(
      async () => {
        const dataUrl = await resizeImage(file, 256);
        const { avatarVersion } = await api.users.setAvatar(dataUrl);
        session.patchUser({ avatarVersion });
        await ctx.loadProfile();
      },
      { error: "upload failed" },
    );
    input.value = "";
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
    await attempt(
      async () => {
        const dataUrl = await resizeBanner(file);
        const { bannerVersion } = await api.users.setBanner(dataUrl);
        session.patchUser({ bannerVersion });
        await ctx.loadProfile();
      },
      { error: "upload failed" },
    );
    input.value = "";
  }

  async function removeBanner() {
    await api.users.removeBanner().catch(() => {});
    session.patchUser({ bannerVersion: null });
    await ctx.loadProfile();
  }
</script>

{#if ctx.profile}
  {@const banner = bannerUrl(ctx.profile.id, ctx.profile.bannerVersion)}
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
      <div class="flex flex-col gap-1">
        {#if editable}
          <Input
            bind:value={nameDraft}
            maxlength={32}
            class="h-8 text-lg font-semibold"
            onblur={saveName}
            onkeydown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Display name"
          />
        {:else}
          <p
            class="truncate text-lg font-semibold"
            style={appearance.nameStyle(ctx.profile.color)}
          >
            {ctx.profile.displayName}
          </p>
        {/if}
        <div class="text-muted-foreground flex items-center gap-1">
          <p class="truncate text-xs">@{ctx.profile.username}</p>
          <span>·</span>
          <p class="text-[9px] uppercase">
            {ctx.permissionLabel}
          </p>
        </div>
      </div>

      {#if editable}
        <div class="relative">
          <Textarea
            bind:value={bioDraft}
            maxlength={BIO_MAX_LEN}
            rows={3}
            placeholder="a little about you"
            class="resize-none pb-6"
            onblur={saveBio}
            onkeydown={onBioKeydown}
            aria-label="Bio"
          />
          <span
            bind:this={bioCountEl}
            class={[
              "pointer-events-none absolute right-2 bottom-2 text-[10px] tabular-nums",
              bioAtMax ? "text-destructive" : "text-muted-foreground",
            ]}
          >
            {bioDraft.length}/{BIO_MAX_LEN}
          </span>
        </div>

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
        {#if ctx.profile.bio}
          <p class="text-muted-foreground text-sm wrap-break-word whitespace-pre-wrap">
            {ctx.profile.bio}
          </p>
        {/if}
        {#if isMine}
          <Button onclick={handleOpenSettings} class="w-full">
            <PencilIcon />
            Edit Profile
          </Button>
        {/if}
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
{/if}
