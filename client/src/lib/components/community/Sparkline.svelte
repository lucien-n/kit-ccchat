<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    points: number[];
    class?: string;
  }
  let { points, class: className }: Props = $props();

  const W = 100;
  const H = 32;

  const shape = $derived.by(() => {
    if (points.length < 2) return null;
    const n = points.length;
    const coords = points.map((v, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - (Math.max(0, Math.min(100, v)) / 100) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = "M" + coords.join(" L");
    return { line, area: `${line} L${W},${H} L0,${H} Z` };
  });
</script>

{#if shape}
  <svg
    viewBox="0 0 {W} {H}"
    preserveAspectRatio="none"
    class={cn("h-16 w-full", className)}
    aria-hidden="true"
  >
    <path d={shape.area} class="fill-primary/10" />
    <path
      d={shape.line}
      class="stroke-primary"
      fill="none"
      stroke-width="1.5"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
{:else}
  <div class="text-muted-foreground flex h-16 items-center justify-center text-xs">
    gathering data…
  </div>
{/if}
