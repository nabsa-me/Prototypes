<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'info' | 'error';
    children: Snippet;
  }

  let { tone = 'info', children }: Props = $props();
</script>

<!-- Errors interrupt (alert); progress and information do not (status). -->
<p class="notice {tone}" role={tone === 'error' ? 'alert' : 'status'}>
  {@render children()}
</p>

<style>
  .notice {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .error {
    background: var(--color-danger-soft);
    border-color: var(--color-danger);
    color: var(--color-danger);
  }
</style>
