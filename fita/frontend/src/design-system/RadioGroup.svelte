<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    legend: string;
    name: string;
    options: readonly Option[];
    value: string;
    /** Hides the legend visually while keeping it for assistive technology. */
    hideLegend?: boolean;
  }

  let { legend, name, options, value = $bindable(), hideLegend = false }: Props = $props();
</script>

<fieldset class="radio-group">
  <legend class:visually-hidden={hideLegend}>{legend}</legend>
  <div class="options">
    {#each options as option (option.value)}
      <label class="option">
        <input type="radio" {name} value={option.value} bind:group={value} />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .radio-group {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  legend {
    padding: 0;
    margin-bottom: var(--space-1);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  .options {
    display: inline-flex;
    padding: var(--space-1);
    gap: var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .option {
    position: relative;
    display: inline-flex;
  }

  /* The native radio stays in the accessibility tree and keyboard order. */
  .option input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .option span {
    display: inline-flex;
    align-items: center;
    min-height: calc(var(--control-height) - 2 * var(--space-1) - 2px);
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    color: var(--color-primary-strong);
  }

  .option input:checked + span {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .option input:focus-visible + span {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
