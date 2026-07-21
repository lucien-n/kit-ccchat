<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton";

  interface Props {
    count?: number;
  }
  const { count = 3 }: Props = $props();

  const shapes = [
    { name: "w-24", body: ["w-3/5"] },
    { name: "w-16", body: ["w-4/5", "w-2/5"] },
    { name: "w-28", body: ["w-2/5"] },
    { name: "w-20", body: ["w-3/4", "w-1/3"] },
  ];
</script>

<div class="flex flex-col gap-0.5" role="status" aria-label="Loading messages">
  {#each { length: count }, i}
    {@const shape = shapes[i % shapes.length]}
    <div class="flex gap-3 px-2 py-1">
      <Skeleton class="mt-0.5 size-9 shrink-0 rounded-full" />
      <div class="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <Skeleton class="h-3 rounded-sm {shape.name}" />
        {#each shape.body as width (width)}
          <Skeleton class="h-3.5 rounded-sm {width}" />
        {/each}
      </div>
    </div>
  {/each}
</div>
