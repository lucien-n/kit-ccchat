<script lang="ts">
  import { appearance, type ThemeMode } from "$lib/appearance.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { Monitor, Moon, Sun } from "@lucide/svelte";

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
</script>

<div class="space-y-2">
  <Label>Theme</Label>
  <div class="grid grid-cols-3 gap-2">
    {#each modes as m (m.value)}
      {@const Icon = m.icon}
      <Button
        variant={appearance.mode === m.value ? "default" : "outline"}
        class="h-auto flex-col gap-1 py-3"
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
