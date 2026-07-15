<script lang="ts">
  import { chat } from '$lib/chat.svelte';
  import { appearance, type ThemeMode } from '$lib/appearance.svelte';
  import { api, avatarUrl } from '$lib/api';
  import { resizeImage } from '$lib/image';
  import { cn } from '$lib/utils';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Switch } from '$lib/components/ui/switch';
  import { Sun, Moon, Monitor, Upload, Trash2 } from '@lucide/svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let displayName = $state(chat.user?.displayName ?? '');
  let currentPassword = $state('');
  let newPassword = $state('');
  let communityName = $state(chat.serverName);
  let profileMsg = $state('');
  let passwordMsg = $state('');
  let avatarMsg = $state('');
  let communityMsg = $state('');
  let busy = $state(false);
  let fileInput: HTMLInputElement | null = $state(null);

  // The community name is stored server-side, so only the owner can change it.
  const isOwner = $derived(chat.user?.role === 'owner');

  // Reset transient state whenever the dialog opens.
  $effect(() => {
    if (open) {
      displayName = chat.user?.displayName ?? '';
      communityName = chat.serverName;
      currentPassword = newPassword = '';
      profileMsg = passwordMsg = avatarMsg = communityMsg = '';
    }
  });

  async function saveCommunity(e: Event) {
    e.preventDefault();
    if (!chat.token) return;
    busy = true;
    communityMsg = '';
    try {
      await api.renameCommunity(chat.token, communityName.trim());
      communityMsg = 'Saved.'; // the server broadcasts the new name to everyone
    } catch (err: any) {
      communityMsg = err?.message ?? 'failed to save';
    } finally {
      busy = false;
    }
  }

  const initial = (chat.user?.displayName ?? '?')[0]?.toUpperCase() ?? '?';
  const avatar = $derived(avatarUrl(chat.user?.id ?? '', chat.user?.avatarVersion));

  async function saveName(e: Event) {
    e.preventDefault();
    if (!chat.token) return;
    busy = true;
    profileMsg = '';
    try {
      const { user } = await api.updateProfile(chat.token, { displayName: displayName.trim() });
      chat.patchUser({ displayName: user.displayName });
      profileMsg = 'Saved.';
    } catch (err: any) {
      profileMsg = err?.message ?? 'failed to save';
    } finally {
      busy = false;
    }
  }

  async function savePassword(e: Event) {
    e.preventDefault();
    if (!chat.token) return;
    busy = true;
    passwordMsg = '';
    try {
      await api.changePassword(chat.token, { currentPassword, newPassword });
      passwordMsg = 'Password changed.';
      currentPassword = newPassword = '';
    } catch (err: any) {
      passwordMsg = err?.message ?? 'failed to change password';
    } finally {
      busy = false;
    }
  }

  async function onAvatarFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !chat.token) return;
    avatarMsg = '';
    try {
      const dataUrl = await resizeImage(file, 256);
      const { avatarVersion } = await api.uploadAvatar(chat.token, dataUrl);
      chat.patchUser({ avatarVersion });
    } catch (err: any) {
      avatarMsg = err?.message ?? 'upload failed';
    } finally {
      if (fileInput) fileInput.value = '';
    }
  }

  async function removeAvatar() {
    if (!chat.token) return;
    await api.removeAvatar(chat.token).catch(() => {});
    chat.patchUser({ avatarVersion: null });
  }

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value="profile" class="w-full">
      <Tabs.List class={cn('grid w-full', isOwner ? 'grid-cols-3' : 'grid-cols-2')}>
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
        {#if isOwner}
          <Tabs.Trigger value="community">Community</Tabs.Trigger>
        {/if}
      </Tabs.List>

      <!-- Profile -->
      <Tabs.Content value="profile" class="space-y-6 pt-4">
        <div class="flex items-center gap-4">
          <Avatar.Root class="size-20">
            {#if avatar}<Avatar.Image src={avatar} alt="avatar" />{/if}
            <Avatar.Fallback class="bg-primary text-primary-foreground text-xl">{initial}</Avatar.Fallback>
          </Avatar.Root>
          <div class="space-y-2">
            <div class="flex gap-2">
              <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>
                <Upload class="size-4" /> Upload
              </Button>
              {#if chat.user?.avatarVersion}
                <Button variant="ghost" size="sm" onclick={removeAvatar}>
                  <Trash2 class="size-4" /> Remove
                </Button>
              {/if}
            </div>
            <p class="text-muted-foreground text-xs">JPG, PNG, GIF or WebP. Square looks best.</p>
            {#if avatarMsg}<p class="text-destructive text-xs">{avatarMsg}</p>{/if}
          </div>
          <input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={onAvatarFile} />
        </div>

        <form class="space-y-2" onsubmit={saveName}>
          <Label for="dn">Display name</Label>
          <div class="flex gap-2">
            <Input id="dn" bind:value={displayName} maxlength={32} class="flex-1" />
            <Button type="submit" disabled={busy}>Save</Button>
          </div>
          {#if profileMsg}<p class="text-muted-foreground text-xs">{profileMsg}</p>{/if}
        </form>

        <form class="space-y-2" onsubmit={savePassword}>
          <Label>Change password</Label>
          <Input type="password" placeholder="current password" bind:value={currentPassword} autocomplete="current-password" />
          <Input type="password" placeholder="new password (min 8)" bind:value={newPassword} autocomplete="new-password" />
          <Button type="submit" variant="secondary" disabled={busy || !currentPassword || !newPassword}>
            Update password
          </Button>
          {#if passwordMsg}<p class="text-muted-foreground text-xs">{passwordMsg}</p>{/if}
        </form>
      </Tabs.Content>

      <!-- Appearance -->
      <Tabs.Content value="appearance" class="space-y-6 pt-4">
        <div class="space-y-2">
          <Label>Theme</Label>
          <div class="grid grid-cols-3 gap-2">
            {#each modes as m (m.value)}
              {@const Icon = m.icon}
              <Button
                variant={appearance.mode === m.value ? 'default' : 'outline'}
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
            <p class="text-muted-foreground text-xs">Minimize animations and transitions.</p>
          </div>
          <Switch
            checked={appearance.reducedMotion}
            onCheckedChange={(v) => appearance.setReducedMotion(v)}
          />
        </div>
      </Tabs.Content>

      <!-- Community (owner only) -->
      {#if isOwner}
        <Tabs.Content value="community" class="space-y-6 pt-4">
          <form class="space-y-2" onsubmit={saveCommunity}>
            <Label for="cn">Community name</Label>
            <div class="flex gap-2">
              <Input id="cn" bind:value={communityName} maxlength={60} class="flex-1" />
              <Button type="submit" disabled={busy || !communityName.trim()}>Save</Button>
            </div>
            <p class="text-muted-foreground text-xs">
              Shown on the login screen and in the header. Everyone sees the change immediately.
            </p>
            {#if communityMsg}<p class="text-muted-foreground text-xs">{communityMsg}</p>{/if}
          </form>
        </Tabs.Content>
      {/if}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
