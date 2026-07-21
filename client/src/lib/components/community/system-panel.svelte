<script lang="ts">
  import { api, type SystemStats } from "$lib/api";
  import { apiErrorMessage } from "$lib/forms";
  import { formatBytes, formatDuration } from "$lib/format";
  import { Progress } from "$lib/components/ui/progress";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import Sparkline from "./sparkline.svelte";

  let stats = $state<SystemStats | null>(null);
  let failed = $state(false);

  async function load() {
    try {
      stats = (await api.system.stats()).stats;
      failed = false;
    } catch (e) {
      if (!failed) toast.error(apiErrorMessage(e, "failed to load system stats"));
      failed = true;
    }
  }

  onMount(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  });

  const pct = (used: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const barTint = (p: number) =>
    p >= 90
      ? "*:data-[slot=progress-indicator]:bg-destructive"
      : p >= 75
        ? "*:data-[slot=progress-indicator]:bg-amber-500"
        : "";
</script>

<div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
  {#if stats}
    {@const s = stats}
    {@const windowMin = Math.round((s.history.length * s.sampleIntervalSec) / 60)}
    <div class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <span class="text-foreground font-medium">{s.hostname}</span>
      <span>{s.platform}/{s.arch}</span>
      <span>up {formatDuration(s.uptimeSec)}</span>
    </div>

    <div class="space-y-2 rounded-lg border p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-sm font-medium">CPU</span>
        <span class="text-sm tabular-nums">{s.cpu.usagePct}%</span>
      </div>
      <Sparkline points={s.history.map((h) => h.cpuPct)} />
      <div class="text-muted-foreground flex justify-between gap-2 text-xs">
        <span
          >{s.cpu.cores} cores · load {s.cpu.loadAvg
            .map((l) => l.toFixed(2))
            .join(" ")}</span
        >
        <span class="truncate">{s.cpu.model}</span>
      </div>
    </div>

    <div class="space-y-2 rounded-lg border p-4">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-medium">Memory</span>
        <span class="text-muted-foreground text-xs tabular-nums">
          {formatBytes(s.memory.usedBytes)} / {formatBytes(s.memory.totalBytes)}
        </span>
      </div>
      <Sparkline points={s.history.map((h) => h.memPct)} />
    </div>

    <div class="rounded-lg border p-4">
      <div class="mb-1.5 flex items-baseline justify-between gap-2">
        <span class="text-sm font-medium">Disk (data volume)</span>
        <span class="text-muted-foreground text-xs">
          {s.disk.totalBytes > 0
            ? `${formatBytes(s.disk.usedBytes)} / ${formatBytes(s.disk.totalBytes)} · ${formatBytes(s.disk.freeBytes)} free`
            : "unavailable"}
        </span>
      </div>
      <Progress
        value={pct(s.disk.usedBytes, s.disk.totalBytes)}
        class={barTint(pct(s.disk.usedBytes, s.disk.totalBytes))}
      />
    </div>

    <div
      class="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-lg border p-4 text-xs"
    >
      <span>ccchat process</span>
      <span>{formatBytes(s.app.rssBytes)} · up {formatDuration(s.app.uptimeSec)}</span>
    </div>

    <p class="text-muted-foreground text-xs">
      Polled every {s.sampleIntervalSec}s{windowMin > 0
        ? `; graphs span the last ~${windowMin} min`
        : ""}.
    </p>
  {:else if failed}
    <p class="text-muted-foreground py-8 text-center text-sm">
      Couldn't reach the server for stats.
    </p>
  {:else}
    <p class="text-muted-foreground py-8 text-center text-sm">Loading…</p>
  {/if}
</div>
