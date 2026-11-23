<script module lang="ts">
  export type BadgeTone = 'warning' | 'info' | 'success' | 'neutral';
</script>

<script lang="ts">
  let { tone, label }: { tone: BadgeTone; label: string } = $props();
</script>

<span class="badge {tone}">{label}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    white-space: nowrap;
  }

  .warning {
    color: var(--color-warning);
    background: var(--color-warning-soft);
  }

  .info {
    color: var(--color-info);
    background: var(--color-info-soft);
  }

  .success {
    color: var(--color-success);
    background: var(--color-success-soft);
  }

  .neutral {
    color: var(--color-neutral);
    background: var(--color-neutral-soft);
  }
</style>
