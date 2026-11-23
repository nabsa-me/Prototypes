<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    onclose: () => void;
    children: Snippet;
  }

  let { title, onclose, children }: Props = $props();
  const headingId = $props.id();
  let heading: HTMLHeadingElement;
  let panel: HTMLElement;

  // Moves focus to the panel when it opens, so keyboard and screen reader users land on it.
  $effect(() => {
    heading.focus();
  });

  // Escape closes the panel while focus is inside it.
  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && event.target instanceof Node && panel.contains(event.target)) {
      onclose();
    }
  }
</script>

<svelte:document {onkeydown} />

<!-- Side panel on wide screens, bottom sheet below 640px. -->
<aside class="panel" aria-labelledby={headingId} bind:this={panel}>
  <header class="header">
    <h2 id={headingId} tabindex="-1" bind:this={heading}>{title}</h2>
    <Button variant="ghost" onclick={onclose} aria-label="Tanca el panell">✕</Button>
  </header>
  <div class="body">
    {@render children()}
  </div>
</aside>

<style>
  .panel {
    position: absolute;
    z-index: var(--layer-panel);
    top: var(--space-3);
    right: calc(var(--space-3) + 2.75rem);
    width: var(--panel-width);
    max-height: calc(100% - 2 * var(--space-3) - 3rem);
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-3) var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  h2 {
    font-size: var(--text-md);
  }

  h2:focus {
    outline: none;
  }

  h2:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .body {
    padding: var(--space-3) var(--space-4) var(--space-4);
    overflow-y: auto;
  }

  @media (max-width: 639px) {
    /*
     * Stays under MapLibre's controls (z-index 2) so the map attribution remains visible
     * on top of the sheet; the bottom padding keeps content clear of it.
     */
    .panel {
      z-index: 1;
      top: auto;
      right: 0;
      bottom: 0;
      left: 0;
      width: auto;
      max-height: 60%;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .body {
      padding-bottom: 5.5rem;
    }
  }
</style>
