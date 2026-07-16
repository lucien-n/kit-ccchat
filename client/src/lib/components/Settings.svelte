<script lang="ts">
  import { api, avatarUrl } from "$lib/api";
  import { appearance, type ThemeMode } from "$lib/appearance.svelte";
  import { chat } from "$lib/chat.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import * as Tabs from "$lib/components/ui/tabs";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeImage } from "$lib/image";
  import { cn } from "$lib/utils";
  import {
    changePasswordBody,
    renameCommunityBody,
    updateProfileBody,
  } from "@ccchat/shared";
  import { Monitor, Moon, Sun, Trash2, Upload } from "@lucide/svelte";
  import {
    defaults,
    setError,
    setMessage,
    superForm,
  } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  const isOwner = $derived(chat.user?.role === "owner");

  let avatarMsg = $state("");
  let fileInput: HTMLInputElement | null = $state(null);

  const profileForm = superForm(
    defaults(
      { displayName: chat.user?.displayName ?? "" },
      zod4(updateProfileBody),
    ),
    {
      SPA: true,
      validators: zod4Client(updateProfileBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          const { user } = await api.updateProfile(chat.token, form.data);
          chat.patchUser({ displayName: user.displayName });
          setMessage(form, "Saved.");
        } catch (err) {
          setError(form, "displayName", apiErrorMessage(err, "failed to save"));
        }
      },
    },
  );
  const {
    form: profileData,
    enhance: profileEnhance,
    submitting: profileBusy,
    message: profileMsg,
  } = profileForm;

  const passwordForm = superForm(
    defaults(
      { currentPassword: "", newPassword: "" },
      zod4(changePasswordBody),
    ),
    {
      SPA: true,
      validators: zod4Client(changePasswordBody),
      resetForm: true,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          await api.changePassword(chat.token, form.data);
          setMessage(form, "Password changed.");
        } catch (err) {
          setError(
            form,
            "currentPassword",
            apiErrorMessage(err, "failed to change password"),
          );
        }
      },
    },
  );
  const {
    form: passwordData,
    enhance: passwordEnhance,
    submitting: passwordBusy,
    message: passwordMsg,
  } = passwordForm;

  const communityForm = superForm(
    defaults({ communityName: chat.serverName }, zod4(renameCommunityBody)),
    {
      SPA: true,
      validators: zod4Client(renameCommunityBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          await api.renameCommunity(chat.token, form.data.communityName);
          setMessage(form, "Saved.");
        } catch (err) {
          setError(
            form,
            "communityName",
            apiErrorMessage(err, "failed to save"),
          );
        }
      },
    },
  );
  const {
    form: communityData,
    enhance: communityEnhance,
    submitting: communityBusy,
    message: communityMsg,
  } = communityForm;

  $effect(() => {
    if (open) {
      profileForm.reset({
        newState: { displayName: chat.user?.displayName ?? "" },
      });
      communityForm.reset({ newState: { communityName: chat.serverName } });
      passwordForm.reset();
      avatarMsg = "";
    }
  });

  const initial = (chat.user?.displayName ?? "?")[0]?.toUpperCase() ?? "?";
  const avatar = $derived(
    avatarUrl(chat.user?.id ?? "", chat.user?.avatarVersion),
  );

  async function onAvatarFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !chat.token) return;
    avatarMsg = "";
    try {
      const dataUrl = await resizeImage(file, 256);
      const { avatarVersion } = await api.uploadAvatar(chat.token, dataUrl);
      chat.patchUser({ avatarVersion });
    } catch (err) {
      avatarMsg = apiErrorMessage(err, "upload failed");
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  async function removeAvatar() {
    if (!chat.token) return;
    await api.removeAvatar(chat.token).catch(() => {});
    chat.patchUser({ avatarVersion: null });
  }

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value="profile" class="w-full">
      <Tabs.List
        class={cn("grid w-full", isOwner ? "grid-cols-3" : "grid-cols-2")}
      >
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
        {#if isOwner}
          <Tabs.Trigger value="community">Community</Tabs.Trigger>
        {/if}
      </Tabs.List>

      <Tabs.Content value="profile" class="space-y-6 pt-4">
        <div class="flex items-center gap-4">
          <Avatar.Root class="size-20">
            {#if avatar}<Avatar.Image src={avatar} alt="avatar" />{/if}
            <Avatar.Fallback class="bg-primary text-primary-foreground text-xl"
              >{initial}</Avatar.Fallback
            >
          </Avatar.Root>
          <div class="space-y-2">
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onclick={() => fileInput?.click()}
              >
                <Upload class="size-4" /> Upload
              </Button>
              {#if chat.user?.avatarVersion}
                <Button variant="ghost" size="sm" onclick={removeAvatar}>
                  <Trash2 class="size-4" /> Remove
                </Button>
              {/if}
            </div>
            <p class="text-muted-foreground text-xs">
              JPG, PNG, GIF or WebP. Square looks best.
            </p>
            {#if avatarMsg}<p class="text-destructive text-xs">
                {avatarMsg}
              </p>{/if}
          </div>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/*"
            class="hidden"
            onchange={onAvatarFile}
          />
        </div>

        <form method="POST" use:profileEnhance>
          <Form.Field form={profileForm} name="displayName">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Display name</Form.Label>
                <div class="flex gap-2">
                  <Input
                    {...props}
                    bind:value={$profileData.displayName}
                    maxlength={32}
                    class="flex-1"
                  />
                  <Form.Button disabled={$profileBusy}>Save</Form.Button>
                </div>
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
          {#if $profileMsg}
            <p class="text-muted-foreground text-xs">{$profileMsg}</p>
          {/if}
        </form>

        <form method="POST" use:passwordEnhance class="space-y-2">
          <Label>Change password</Label>
          <Form.Field form={passwordForm} name="currentPassword">
            <Form.Control>
              {#snippet children({ props })}
                <Input
                  {...props}
                  type="password"
                  placeholder="current password"
                  bind:value={$passwordData.currentPassword}
                  autocomplete="current-password"
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          <Form.Field form={passwordForm} name="newPassword">
            <Form.Control>
              {#snippet children({ props })}
                <Input
                  {...props}
                  type="password"
                  placeholder="new password (min 8)"
                  bind:value={$passwordData.newPassword}
                  autocomplete="new-password"
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          <Form.Button variant="secondary" disabled={$passwordBusy}>
            Update password
          </Form.Button>
          {#if $passwordMsg}
            <p class="text-muted-foreground text-xs">{$passwordMsg}</p>
          {/if}
        </form>
      </Tabs.Content>

      <Tabs.Content value="appearance" class="space-y-6 pt-4">
        <div class="space-y-2">
          <Label>Theme</Label>
          <div class="grid grid-cols-3 gap-2">
            {#each modes as m (m.value)}
              {@const Icon = m.icon}
              <Button
                variant={appearance.mode === m.value ? "default" : "outline"}
                class="flex-col gap-1 h-auto py-3"
                onclick={() => appearance.setMode(m.value)}
              >
                <Icon class="size-5" />
                <span class="text-xs">{m.label}</span>
              </Button>
            {/each}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <Label>Reduced motion</Label>
            <p class="text-muted-foreground text-xs">
              Minimize animations and transitions.
            </p>
          </div>
          <Switch
            checked={appearance.reducedMotion}
            onCheckedChange={(v) => appearance.setReducedMotion(v)}
          />
        </div>
      </Tabs.Content>

      {#if isOwner}
        <Tabs.Content value="community" class="space-y-6 pt-4">
          <form method="POST" use:communityEnhance>
            <Form.Field form={communityForm} name="communityName">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Community name</Form.Label>
                  <div class="flex gap-2">
                    <Input
                      {...props}
                      bind:value={$communityData.communityName}
                      maxlength={60}
                      class="flex-1"
                    />
                    <Form.Button disabled={$communityBusy}>Save</Form.Button>
                  </div>
                {/snippet}
              </Form.Control>
              <Form.Description>
                Shown on the login screen and in the header. Everyone sees the
                change immediately.
              </Form.Description>
              <Form.FieldErrors />
            </Form.Field>
            {#if $communityMsg}
              <p class="text-muted-foreground text-xs">{$communityMsg}</p>
            {/if}
          </form>
        </Tabs.Content>
      {/if}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
