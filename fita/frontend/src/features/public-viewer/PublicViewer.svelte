<script lang="ts">
  import type { ViewerConfig } from '@fita/contracts';
  import { onMount } from 'svelte';
  import Button from '../../design-system/Button.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import RadioGroup from '../../design-system/RadioGroup.svelte';
  import CursorPosition from './CursorPosition.svelte';
  import { loadViewerConfig } from '../../map/load-viewer-config.ts';
  import { createViewerMap, type ViewerMap } from '../../map/viewer-map.ts';

  const VIEWER_ID = 'public';
  const TILTED_PITCH = 60;

  type Load =
    { status: 'loading' } | { status: 'error' } | { status: 'ready'; config: ViewerConfig };

  let load = $state<Load>({ status: 'loading' });
  let basemapId = $state('');
  let tilted = $state(false);
  let container: HTMLDivElement;
  let viewer = $state.raw<ViewerMap>();

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    const controller = new AbortController();

    loadViewerConfig(VIEWER_ID, controller.signal).then(
      (config) => {
        const first = config.basemaps[0];
        if (!first) throw new Error('A validated config always has a basemap');
        basemapId = first.id;
        viewer = createViewerMap({ container, config, view: config.initialView, basemapId });
        viewer.map.on('pitchend', () => {
          tilted = (viewer?.map.getPitch() ?? 0) > 0;
        });
        tilted = config.initialView.pitch > 0;
        load = { status: 'ready', config };
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        load = { status: 'error' };
      },
    );

    return () => {
      controller.abort();
      viewer?.destroy();
    };
  });

  $effect(() => {
    const id = basemapId;
    viewer?.setBasemap(id);
  });

  function toggleTilt() {
    viewer?.map.easeTo({
      pitch: tilted ? 0 : TILTED_PITCH,
      duration: reducedMotion() ? 0 : 600,
    });
  }
</script>

<div class="viewer">
  <div class="map" bind:this={container}></div>

  {#if load.status === 'loading'}
    <div class="overlay top-left"><Notice>Carregant el visor…</Notice></div>
  {:else if load.status === 'error'}
    <div class="overlay top-left">
      <Notice tone="error">No s'ha pogut carregar el visor. Torna-ho a provar més tard.</Notice>
    </div>
  {:else}
    <header class="overlay top-left brand">
      <h1>{load.config.title}</h1>
    </header>

    <div class="overlay bottom-left">
      {#if viewer}
        <CursorPosition map={viewer.map} />
      {/if}
      <div class="controls">
        <RadioGroup
          legend="Capa base"
          name="basemap"
          hideLegend
          options={load.config.basemaps.map((b) => ({ value: b.id, label: b.label }))}
          bind:value={basemapId}
        />
        {#if load.config.terrain}
          <Button pressed={tilted} onclick={toggleTilt} aria-label="Vista inclinada en 3D">
            3D
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer {
    position: fixed;
    inset: 0;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .overlay {
    position: absolute;
    z-index: var(--layer-overlay);
  }

  .top-left {
    top: var(--space-3);
    left: var(--space-3);
    max-width: calc(100% - 5rem);
  }

  .bottom-left {
    bottom: var(--space-4);
    left: var(--space-3);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  /* On narrow screens the attribution takes the full width, so controls sit above it. */
  @media (max-width: 639px) {
    .bottom-left {
      bottom: 5.5rem;
    }
  }

  .brand h1 {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-md);
    background: var(--color-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
  }

  .controls {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }

  .controls :global(.radio-group),
  .controls :global(.button) {
    box-shadow: var(--shadow-overlay);
  }
</style>
