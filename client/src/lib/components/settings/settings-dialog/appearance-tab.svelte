<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import Select from "$lib/components/common/select/select.svelte";
  import {
    appearance,
    locale,
    locales,
    Theme,
    ThemeMode,
    type Locale,
  } from "$lib/stores";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import { Label } from "&/label";
  import { Switch } from "&/switch";
  import MonitorIcon from "@lucide/svelte/icons/monitor";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import PaletteIcon from "@lucide/svelte/icons/palette";
  import SunIcon from "@lucide/svelte/icons/sun";
  import { themeRadius } from "@motus/shared";

  // $derived so the labels recompute when the locale changes (m.*() reads it).
  const modes = $derived([
    { value: ThemeMode.Light, label: m.appearance_mode_light(), icon: SunIcon },
    { value: ThemeMode.Dark, label: m.appearance_mode_dark(), icon: MoonIcon },
    { value: ThemeMode.System, label: m.appearance_mode_system(), icon: MonitorIcon },
  ]);

  const themes = $derived([
    { value: Theme.Default, label: m.appearance_theme_default() },
    { value: Theme.Tangerine, label: m.appearance_theme_tangerine() },
    { value: Theme.Notebook, label: m.appearance_theme_notebook() },
    { value: Theme.Whatsapp, label: m.appearance_theme_whatsapp() },
    { value: Theme.Neobrutalism, label: m.appearance_theme_neobrutalism() },
    { value: Theme.Custom, label: m.appearance_theme_custom() },
  ]);

  // Language names in their own language (endonyms); these are not translated.
  const LANGUAGE_NAMES: Record<Locale, string> = {
    en: "English",
    fr: "Français",
  };
  const languageOptions = locales.map((value) => ({
    value,
    label: LANGUAGE_NAMES[value],
  }));
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <Label>{m.appearance_mode_heading()}</Label>

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
    <Label>{m.appearance_theme_heading()}</Label>

    <div class="grid grid-cols-3 gap-2">
      {#each themes as theme (theme)}
        <Button
          variant={appearance.theme === theme.value ? "default" : "outline"}
          onclick={() => appearance.setTheme(theme.value)}
        >
          <PaletteIcon class="mr-2 size-4" />
          {theme.label}
        </Button>
      {/each}
    </div>
  </div>

  <div class="space-y-2">
    <Label>{m.appearance_language_heading()}</Label>

    <Select
      bind:value={() => locale.current, (value) => value && locale.set(value)}
      options={languageOptions}
      triggerProps={{ class: "w-full" }}
    />
  </div>

  {#if appearance.theme === Theme.Custom}
    <div class="space-y-4 rounded-lg border p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="w-full">
          <Label>{m.appearance_custom_primary()}</Label>
          <p class="text-muted-foreground text-xs">
            {m.appearance_custom_primary_desc()}
          </p>
        </div>
        <Input
          type="color"
          class="size-7 w-10"
          value={appearance.effectiveTheme.primary}
          oninput={(e) => appearance.setCustomPrimary(e.currentTarget.value)}
          aria-label={m.appearance_custom_primary_aria()}
        />
      </div>

      <div class="flex w-full items-center justify-between gap-3">
        <div class="w-full">
          <Label>{m.appearance_custom_background()}</Label>
          <p class="text-muted-foreground text-xs">
            {m.appearance_custom_background_desc()}
          </p>
        </div>
        <Input
          type="color"
          class="size-7 w-10"
          value={appearance.effectiveTheme.background}
          oninput={(e) => appearance.setCustomBackground(e.currentTarget.value)}
          aria-label={m.appearance_custom_background_aria()}
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>{m.appearance_custom_radius()}</Label>
          <span class="text-muted-foreground text-xs tabular-nums">
            {appearance.effectiveTheme.radius.toFixed(2)}rem
          </span>
        </div>
        <input
          type="range"
          class="accent-primary w-full cursor-pointer"
          min={themeRadius.minValue}
          max={themeRadius.maxValue}
          step="0.1"
          value={appearance.effectiveTheme.radius}
          oninput={(e) => appearance.setCustomRadius(Number(e.currentTarget.value))}
          aria-label={m.appearance_custom_radius_aria()}
        />
      </div>
    </div>
  {/if}

  <div class="flex items-center justify-between">
    <div>
      <Label>{m.appearance_reduced_motion()}</Label>
      <p class="text-muted-foreground text-xs">{m.appearance_reduced_motion_desc()}</p>
    </div>

    <Switch
      checked={appearance.reducedMotion}
      onCheckedChange={(v) => appearance.setReducedMotion(v)}
    />
  </div>
</div>
