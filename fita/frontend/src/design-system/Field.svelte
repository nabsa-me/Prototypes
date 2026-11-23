<script lang="ts">
  import type { Snippet } from 'svelte';

  /** What the control needs to be labelled and described. */
  export interface FieldControl {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }

  interface Props {
    label: string;
    hint?: string;
    error?: string | undefined;
    /** Renders the control (input, select, textarea) with the given ids and state. */
    control: Snippet<[FieldControl]>;
  }

  let { label, hint, error, control }: Props = $props();
  const id = $props.id();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = $derived(
    [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  );
</script>

<div class="field">
  <label for={id}>{label}</label>
  {@render control({ id, describedBy, invalid: Boolean(error) })}
  {#if hint}<p id={hintId} class="hint">{hint}</p>{/if}
  {#if error}<p id={errorId} class="error">{error}</p>{/if}
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-1);
  }

  label {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .error {
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-danger);
  }
</style>
