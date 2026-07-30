<script lang="ts">
  import { appearance, Theme, ThemeMode } from "$lib/stores/appearance.svelte";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import { Label } from "&/label";
  import { Switch } from "&/switch";
  import { themeRadius } from "@ccchat/shared";
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
    { value: Theme.Custom, label: "Custom" },
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

  {#if appearance.theme === Theme.Custom}
    <div class="space-y-4 rounded-lg border p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="w-full">
          <Label>Primary</Label>
          <p class="text-muted-foreground text-xs">Buttons, links and accents.</p>
        </div>
        <Input
          type="color"
          class="size-7 w-10"
          value={appearance.effectivePrimary}
          oninput={(e) => appearance.setCustomPrimary(e.currentTarget.value)}
          aria-label="Primary color"
        />
      </div>

      <div class="flex w-full items-center justify-between gap-3">
        <div class="w-full">
          <Label>Background</Label>
          <p class="text-muted-foreground text-xs">
            Sets the surface tone; light or dark follows from it.
          </p>
        </div>
        <Input
          type="color"
          class="size-7 w-10"
          value={appearance.effectiveBackground}
          oninput={(e) => appearance.setCustomBackground(e.currentTarget.value)}
          aria-label="Background color"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Corner radius</Label>
          <span class="text-muted-foreground text-xs tabular-nums">
            {appearance.effectiveRadius.toFixed(2)}rem
          </span>
        </div>
        <input
          type="range"
          class="accent-primary w-full cursor-pointer"
          min={themeRadius.minValue}
          max={themeRadius.maxValue}
          step="0.1"
          value={appearance.effectiveRadius}
          oninput={(e) => appearance.setCustomRadius(Number(e.currentTarget.value))}
          aria-label="Corner radius"
        />
      </div>
    </div>
  {/if}

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
