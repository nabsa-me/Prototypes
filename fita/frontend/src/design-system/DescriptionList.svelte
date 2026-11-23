<script module lang="ts">
  export interface DescriptionItem {
    term: string;
    value: string;
    /** Marks a value that explains an absence ("not available", "none nearby"). */
    muted?: boolean;
  }
</script>

<script lang="ts">
  let { items }: { items: readonly DescriptionItem[] } = $props();
</script>

<dl class="description-list">
  {#each items as item (item.term)}
    <div class="row">
      <dt>{item.term}</dt>
      <dd class:muted={item.muted}>{item.value}</dd>
    </div>
  {/each}
</dl>

<style>
  .description-list {
    margin: 0;
    display: grid;
    gap: var(--space-3);
  }

  .row {
    display: grid;
  }

  dt {
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-size: var(--text-sm);
  }

  .muted {
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
