<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost';
    /** Renders a toggle button (`aria-pressed`) when set. */
    pressed?: boolean;
    children: Snippet;
  }

  let { variant = 'secondary', pressed, type = 'button', children, ...rest }: Props = $props();
</script>

<button {type} class="button {variant}" aria-pressed={pressed} {...rest}>
  {@render children()}
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--control-height);
    padding: 0 var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    font-weight: var(--weight-bold);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .primary:hover:not(:disabled) {
    background: var(--color-primary-strong);
  }

  .secondary {
    background: var(--color-surface);
    color: var(--color-primary-strong);
    border-color: var(--color-border);
  }

  .secondary:hover:not(:disabled) {
    background: var(--color-primary-soft);
  }

  .secondary[aria-pressed='true'] {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-on-primary);
  }

  .secondary[aria-pressed='true']:hover:not(:disabled) {
    background: var(--color-primary-strong);
  }

  .ghost {
    background: transparent;
    color: var(--color-text-muted);
    padding: 0 var(--space-2);
  }

  .ghost:hover:not(:disabled) {
    color: var(--color-text);
    background: var(--color-surface-muted);
  }
</style>
