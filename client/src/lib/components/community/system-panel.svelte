<script lang="ts">
  import { api, type SystemStats } from "$lib/api";
  import ConfirmDialog from "$lib/components/common/confirm-dialog.svelte";
  import {
    formatBytes,
    formatDateTime,
    formatDuration,
    formatRelative,
  } from "$lib/format";
  import { apiErrorMessage } from "$lib/forms";
  import * as Accordion from "&/accordion";
  import { Button } from "&/button";
  import * as Card from "&/card";
  import { ScrollArea } from "&/scroll-area";
  import * as Tooltip from "&/tooltip";
  import { DiskItem } from "@motus/shared";
  import DatabaseBackupIcon from "@lucide/svelte/icons/database-backup";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import Sparkline from "./sparkline.svelte";

  let stats = $state<SystemStats | null>(null);
  let failed = $state(false);

  let backupBusy = $state(false);
  let deleteBusy = $state(false);
  let pendingDelete = $state<string | null>(null);
  const confirmOpen = $derived(pendingDelete !== null);

  async function load() {
    try {
      stats = (await api.system.stats()).stats;
      failed = false;
    } catch (e) {
      if (!failed) toast.error(apiErrorMessage(e, "failed to load system stats"));
      failed = true;
    }
  }

  async function runBackup() {
    backupBusy = true;
    try {
      await api.system.backup();
      await load();
      toast.success("Backup created");
    } catch (e) {
      toast.error(apiErrorMessage(e, "backup failed"));
    } finally {
      backupBusy = false;
    }
  }

  async function download(name: string) {
    try {
      const blob = await api.system.downloadBackup(name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiErrorMessage(e, "couldn't download that backup"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    deleteBusy = true;
    try {
      await api.system.deleteBackup(pendingDelete);
      await load();
      pendingDelete = null;
    } catch (e) {
      toast.error(apiErrorMessage(e, "couldn't delete that backup"));
    } finally {
      deleteBusy = false;
    }
  }

  onMount(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  });

  const DISK_ITEM_SPECS: Record<DiskItem, { label: string; color: string }> = {
    [DiskItem.AvatarDir]: { label: "Avatars", color: "bg-sky-500" },
    [DiskItem.ImagesDir]: { label: "Images", color: "bg-violet-500" },
    [DiskItem.SoundsDir]: { label: "Sounds", color: "bg-amber-500" },
    [DiskItem.DatabaseFile]: { label: "Database", color: "bg-emerald-500" },
    [DiskItem.BackupsDir]: { label: "Backups", color: "bg-rose-500" },
  };

  function otherColor(usedPct: number) {
    if (usedPct >= 90) return "bg-destructive";
    if (usedPct >= 75) return "bg-amber-500";
    return "bg-muted-foreground/40";
  }

  // True proportions; a 4px min-width (applied in the markup) keeps a thin item
  // from vanishing, and the legend gives its exact size. `pct` is a share of the
  // whole volume.
  const segments = $derived.by(() => {
    const disk = stats?.disk;
    if (!disk || disk.totalBytes <= 0) return [];

    const usedPct = (disk.usedBytes / disk.totalBytes) * 100;
    const items = Object.values(DiskItem).flatMap((item) => {
      const bytes = disk.usedByItem[item];
      if (bytes <= 0) return [];
      return {
        key: item as string,
        ...DISK_ITEM_SPECS[item],
        bytes,
        pct: (bytes / disk.totalBytes) * 100,
      };
    });

    const claimed = items.reduce((total, item) => total + item.bytes, 0);
    const otherBytes = Math.max(0, disk.usedBytes - claimed);

    return [
      ...items,
      ...(otherBytes > 0
        ? [
            {
              key: "other",
              label: "Everything else on the volume",
              color: otherColor(usedPct),
              bytes: otherBytes,
              pct: (otherBytes / disk.totalBytes) * 100,
            },
          ]
        : []),
    ];
  });
</script>

<ScrollArea class="min-h-0 flex-1">
  <div class="space-y-4 px-1 pr-3">
    {#if stats}
      {@const windowMin = Math.round(
        (stats.history.length * stats.sampleIntervalSec) / 60,
      )}
      <div class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span class="text-foreground font-medium">{stats.hostname}</span>
        <span>{stats.platform}/{stats.arch}</span>
        <span>up {formatDuration(stats.uptimeSec)}</span>
      </div>

      <Card.Root>
        <Card.Content class="space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-medium">CPU</span>
            <span class="text-sm tabular-nums">{stats.cpu.usagePct}%</span>
          </div>
          <Sparkline points={stats.history.map((h) => h.cpuPct)} />
          <div class="text-muted-foreground flex justify-between gap-2 text-xs">
            <span
              >{stats.cpu.cores} cores · load {stats.cpu.loadAvg
                .map((l) => l.toFixed(2))
                .join(" ")}</span
            >
            <span class="truncate">{stats.cpu.model}</span>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="space-y-2">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-sm font-medium">Memory</span>
            <span class="text-muted-foreground text-xs tabular-nums">
              {formatBytes(stats.memory.usedBytes)} / {formatBytes(
                stats.memory.totalBytes,
              )}
            </span>
          </div>
          <Sparkline points={stats.history.map((h) => h.memPct)} />
        </Card.Content>
      </Card.Root>

      <Card.Root class="gap-0 py-0">
        <Accordion.Root type="single" class="rounded-none border-0">
          <Accordion.Item value="disk" class="border-b-0 data-open:bg-transparent">
            <Accordion.Trigger class="hover:bg-muted/50 hover:no-underline">
              <span class="flex flex-1 items-baseline justify-between gap-2">
                <span class="text-sm font-medium">Disk (data dir volume)</span>
                <span class="text-muted-foreground text-xs font-normal">
                  {stats.disk.totalBytes > 0
                    ? `${formatBytes(stats.disk.usedBytes)} / ${formatBytes(stats.disk.totalBytes)} · ${formatBytes(stats.disk.freeBytes)} free`
                    : "unavailable"}
                </span>
              </span>
            </Accordion.Trigger>

            <Tooltip.Provider delayDuration={80}>
              <div class="px-4 pb-4">
                <div class="bg-secondary flex h-2 w-full overflow-hidden rounded-full">
                  {#each segments as segment (segment.key)}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        class="{segment.color} h-full min-w-1 cursor-default transition-opacity hover:opacity-75"
                        style="width: {segment.pct}%"
                        aria-label="{segment.label}: {formatBytes(segment.bytes)}"
                      />
                      <Tooltip.Content>
                        <span class="{segment.color} size-2 shrink-0 rounded-full"></span>
                        <span>{segment.label}</span>
                        <span class="tabular-nums opacity-70">
                          {formatBytes(segment.bytes)}
                        </span>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {/each}
                </div>
              </div>
            </Tooltip.Provider>

            <Accordion.Content>
              <ul class="flex flex-col gap-1.5">
                {#each segments as segment (segment.key)}
                  <li class="flex items-center gap-2 text-xs">
                    <span class="{segment.color} size-2 shrink-0 rounded-full"></span>
                    <span class="flex-1 truncate">{segment.label}</span>
                    <span class="text-muted-foreground shrink-0 tabular-nums">
                      {formatBytes(segment.bytes)}
                    </span>
                  </li>
                {/each}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </Card.Root>

      <Card.Root>
        <Card.Content
          class="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
        >
          <span>motus process</span>
          <span
            >{formatBytes(stats.app.rssBytes)} · up {formatDuration(
              stats.app.uptimeSec,
            )}</span
          >
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">Backups</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={backupBusy}
              onclick={runBackup}
            >
              {#if backupBusy}
                <LoaderCircleIcon class="size-4 animate-spin" />
              {:else}
                <DatabaseBackupIcon class="size-4" />
              {/if}
              Back up now
            </Button>
          </div>

          <div
            class="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
          >
            <span>
              {stats.backups.intervalHours > 0
                ? `Every ${stats.backups.intervalHours}h`
                : "Automatic backups off"}
              · {stats.backups.retention > 0
                ? `keep ${stats.backups.retention}`
                : "keep all"}
            </span>
            <span>
              {formatBytes(stats.backups.totalBytes)}
              {#if stats.backups.lastBackupAt}
                · last {formatRelative(stats.backups.lastBackupAt)}
              {/if}
              {#if stats.backups.nextBackupAt}
                · next {formatRelative(stats.backups.nextBackupAt)}
              {/if}
            </span>
          </div>

          {#if stats.backups.items.length}
            <ScrollArea class="max-h-48">
              <ul class="space-y-1 pr-2">
                {#each stats.backups.items as backup (backup.name)}
                  <li
                    class="hover:bg-accent group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="truncate">{formatDateTime(backup.createdAt)}</div>
                      <div class="text-muted-foreground text-xs tabular-nums">
                        {formatBytes(backup.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="hover:text-foreground text-muted-foreground rounded p-1"
                      title="Download"
                      aria-label="Download backup"
                      onclick={() => download(backup.name)}
                    >
                      <DownloadIcon class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-destructive rounded p-1"
                      title="Delete"
                      aria-label="Delete backup"
                      onclick={() => (pendingDelete = backup.name)}
                    >
                      <Trash2Icon class="size-4" />
                    </button>
                  </li>
                {/each}
              </ul>
            </ScrollArea>
          {:else}
            <p class="text-muted-foreground py-2 text-center text-xs">No backups yet.</p>
          {/if}
        </Card.Content>
      </Card.Root>

      <p class="text-muted-foreground text-xs">
        Polled every {stats.sampleIntervalSec}s{windowMin > 0
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
</ScrollArea>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={(v) => {
    if (!v) pendingDelete = null;
  }}
  title="Delete this backup?"
  description="This removes the snapshot file for good. Other backups are untouched."
  confirmLabel="Delete"
  confirmVariant="destructive"
  busy={deleteBusy}
  onConfirm={confirmDelete}
/>
