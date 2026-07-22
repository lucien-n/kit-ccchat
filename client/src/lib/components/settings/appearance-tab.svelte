<script lang="ts">
  import { appearance, Theme, ThemeMode } from "$lib/stores/appearance.svelte";
  import { Button } from "&/button";
  import { Label } from "&/label";
  import { Switch } from "&/switch";
  import { Monitor, Moon, Palette, Sun } from "@lucide/svelte";

  const modes = [
    { value: ThemeMode.Light, label: "Light", icon: Sun },
    { value: ThemeMode.Dark, label: "Dark", icon: Moon },
    { value: ThemeMode.System, label: "System", icon: Monitor },
  ] satisfies { value: ThemeMode; label: string; icon: typeof Sun }[];

  const themes = [
    { value: Theme.Default, label: "Default" },
    { value: Theme.Tangerine, label: "Tangerine" },
    { value: Theme.Notebook, label: "Notebook" },
    { value: Theme.Whatsapp, label: "Whatsapp" },
    { value: Theme.Neobrutalism, label: "Neobrutalism" },
  ] satisfies { value: Theme; label: string }[];
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label>Appearance</Label>

    <div class="grid grid-cols-3 gap-2">
      {#each modes as mode (mode)}
        {@const Icon = mode.icon}

        <Button
          variant={appearance.mode === mode.value ? "default" : "outline"}
          class="h-auto flex-col gap-1 py-3"
          onclick={() => appearance.setMode(mode.value)}
        >
          <Icon class="size-5" />
          <span class="text-xs">{mode.label}</span>
        </Button>
      {/each}
    </div>
  </div>

  <div class="space-y-2">
    <Label>Theme</Label>

    <div class="grid grid-cols-3 gap-2">
      {#each themes as theme (theme)}
        <Button
          variant={appearance.theme === theme.value ? "default" : "outline"}
          onclick={() => appearance.setTheme(theme.value)}
        >
          <Palette class="mr-2 size-4" />
          {theme.label}
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
</div>
