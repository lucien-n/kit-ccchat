<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { api, type SystemStats } from "$lib/api";
  import ConfirmDialog from "$lib/components/common/confirm-dialog.svelte";
  import { formatBytes, formatDate, formatDuration, formatRelative } from "$lib/format";
  import { apiErrorMessage } from "$lib/forms";
  import * as Accordion from "&/accordion";
  import { Button } from "&/button";
  import * as Card from "&/card";
  import { ScrollArea } from "&/scroll-area";
  import * as Tooltip from "&/tooltip";
  import DatabaseBackupIcon from "@lucide/svelte/icons/database-backup";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { DiskItem } from "@motus/shared";
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
      if (!failed) toast.error(apiErrorMessage(e, m.system_stats_failed()));
      failed = true;
    }
  }

  async function runBackup() {
    backupBusy = true;
    try {
      await api.system.backup();
      await load();
      toast.success(m.system_backup_created());
    } catch (e) {
      toast.error(apiErrorMessage(e, m.system_backup_failed()));
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
      toast.error(apiErrorMessage(e, m.system_download_failed()));
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
      toast.error(apiErrorMessage(e, m.system_delete_backup_failed()));
    } finally {
      deleteBusy = false;
    }
  }

  onMount(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  });

  const DISK_ITEM_SPECS = $derived<Record<DiskItem, { label: string; color: string }>>({
    [DiskItem.AvatarDir]: { label: m.system_disk_avatars(), color: "bg-sky-500" },
    [DiskItem.AttachmentsDir]: {
      label: m.system_disk_attachments(),
      color: "bg-violet-500",
    },
    [DiskItem.SoundsDir]: { label: m.system_disk_sounds(), color: "bg-amber-500" },
    [DiskItem.DatabaseFile]: { label: m.system_disk_database(), color: "bg-emerald-500" },
    [DiskItem.BackupsDir]: { label: m.system_disk_backups(), color: "bg-rose-500" },
  });

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
              label: m.system_disk_other(),
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
        <span>{m.system_uptime({ duration: formatDuration(stats.uptimeSec) })}</span>
      </div>

      <Card.Root>
        <Card.Content class="space-y-2">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-medium">CPU</span>
            <span class="text-sm tabular-nums">{stats.cpu.usagePct}%</span>
          </div>
          <Sparkline points={stats.history.map((h) => h.cpuPct)} />
          <div class="text-muted-foreground flex justify-between gap-2 text-xs">
            <span>
              {m.system_cpu_cores_load({
                cores: stats.cpu.cores,
                load: stats.cpu.loadAvg.map((l) => l.toFixed(2)).join(" "),
              })}
            </span>
            <span class="truncate">{stats.cpu.model}</span>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="space-y-2">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-sm font-medium">{m.system_memory()}</span>
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
                <span class="text-sm font-medium">{m.system_disk_title()}</span>
                <span class="text-muted-foreground text-xs font-normal">
                  {stats.disk.totalBytes > 0
                    ? m.system_disk_usage({
                        used: formatBytes(stats.disk.usedBytes),
                        total: formatBytes(stats.disk.totalBytes),
                        free: formatBytes(stats.disk.freeBytes),
                      })
                    : m.common_unavailable()}
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
          <span>{m.system_process()}</span>
          <span>
            {formatBytes(stats.app.rssBytes)} · {m.system_uptime({
              duration: formatDuration(stats.app.uptimeSec),
            })}
          </span>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">{m.system_backups()}</span>
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
              {m.system_backup_now()}
            </Button>
          </div>

          <div
            class="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
          >
            <span>
              {stats.backups.intervalHours > 0
                ? m.system_backup_every({ hours: stats.backups.intervalHours })
                : m.system_backup_off()}
              · {stats.backups.retention > 0
                ? m.system_backup_keep({ count: stats.backups.retention })
                : m.system_backup_keep_all()}
            </span>
            <span>
              {formatBytes(stats.backups.totalBytes)}
              {#if stats.backups.lastBackupAt}
                · {m.system_backup_last({
                  when: formatRelative(stats.backups.lastBackupAt),
                })}
              {/if}
              {#if stats.backups.nextBackupAt}
                · {m.system_backup_next({
                  when: formatRelative(stats.backups.nextBackupAt),
                })}
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
                      <div class="truncate">{formatDate(backup.createdAt, true)}</div>
                      <div class="text-muted-foreground text-xs tabular-nums">
                        {formatBytes(backup.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="hover:text-foreground text-muted-foreground rounded p-1"
                      title={m.common_download()}
                      aria-label={m.system_download_backup_aria()}
                      onclick={() => download(backup.name)}
                    >
                      <DownloadIcon class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-destructive rounded p-1"
                      title={m.common_delete()}
                      aria-label={m.system_delete_backup_aria()}
                      onclick={() => (pendingDelete = backup.name)}
                    >
                      <Trash2Icon class="size-4" />
                    </button>
                  </li>
                {/each}
              </ul>
            </ScrollArea>
          {:else}
            <p class="text-muted-foreground py-2 text-center text-xs">
              {m.system_no_backups()}
            </p>
          {/if}
        </Card.Content>
      </Card.Root>

      <p class="text-muted-foreground text-xs">
        {m.system_polled({ seconds: stats.sampleIntervalSec })}{windowMin > 0
          ? m.system_graph_span({ minutes: windowMin })
          : ""}.
      </p>
    {:else if failed}
      <p class="text-muted-foreground py-8 text-center text-sm">
        {m.system_unreachable()}
      </p>
    {:else}
      <p class="text-muted-foreground py-8 text-center text-sm">{m.common_loading()}</p>
    {/if}
  </div>
</ScrollArea>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={(v) => {
    if (!v) pendingDelete = null;
  }}
  title={m.system_delete_backup_title()}
  description={m.system_delete_backup_desc()}
  confirmLabel={m.common_delete()}
  confirmVariant="destructive"
  busy={deleteBusy}
  onConfirm={confirmDelete}
/>
