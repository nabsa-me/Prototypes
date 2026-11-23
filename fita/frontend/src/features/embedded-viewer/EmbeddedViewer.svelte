<script lang="ts">
  import type { ViewerConfig } from '@fita/contracts';
  import { Popup, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';
  import { onMount } from 'svelte';
  import Notice from '../../design-system/Notice.svelte';
  import { ApiRequestError } from '../../http.ts';
  import { visibleBounds } from '../../map/bounds.ts';
  import { loadViewerConfig } from '../../map/load-viewer-config.ts';
  import { createViewerMap, type ViewerMap } from '../../map/viewer-map.ts';
  import {
    CLUSTERS_LAYER,
    LINES_LAYER,
    POINTS_LAYER,
    POINTS_SOURCE,
    addDatasetLayers,
    popupContent,
    showDataset,
  } from './dataset-layer.ts';
  import { fetchDatasetFeatures } from './features-client.ts';

  let { viewerId }: { viewerId: string } = $props();

  let container: HTMLDivElement;
  let config = $state<ViewerConfig>();
  let failure = $state<'not-found' | 'error' | 'data'>();
  let viewer: ViewerMap | undefined;

  const brandColor = $derived(config?.branding?.primaryColor);

  function popupElement(title: string, description: string | undefined): HTMLElement {
    // Built with text nodes: dataset text is never interpreted as HTML.
    const element = document.createElement('div');
    element.className = 'fita-popup';
    const heading = document.createElement('strong');
    heading.textContent = title;
    element.append(heading);
    if (description) {
      const text = document.createElement('p');
      text.textContent = description;
      element.append(text);
    }
    return element;
  }

  function start(loaded: ViewerConfig) {
    config = loaded;
    const created = createViewerMap({
      container,
      config: loaded,
      view: loaded.initialView,
      basemapId: loaded.basemaps[0]?.id ?? '',
    });
    viewer = created;
    const map = created.map;
    const color =
      loaded.branding?.primaryColor ??
      getComputedStyle(container).getPropertyValue('--color-primary').trim();

    let request: AbortController | undefined;
    const loadVisible = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      fetchDatasetFeatures(viewerId, visibleBounds(map), controller.signal).then(
        (collection) => {
          if (request === controller) showDataset(map, collection);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          console.error(error);
          failure = 'data';
        },
      );
    };

    map.once('style.load', () => {
      addDatasetLayers(map, color);
      loadVisible();
    });
    map.on('moveend', loadVisible);

    map.on('click', CLUSTERS_LAYER, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId: unknown = feature?.properties['cluster_id'];
      if (!feature || typeof clusterId !== 'number' || feature.geometry.type !== 'Point') return;
      const [lon = 0, lat = 0] = feature.geometry.coordinates;
      void map
        .getSource<GeoJSONSource>(POINTS_SOURCE)
        ?.getClusterExpansionZoom(clusterId)
        .then((zoom) => map.easeTo({ center: [lon, lat], zoom }));
    });

    const openPopup = (event: MapLayerMouseEvent) => {
      const content = popupContent(event.features?.[0]?.properties);
      if (!content) return;
      new Popup({ maxWidth: '18rem' })
        .setLngLat(event.lngLat)
        .setDOMContent(popupElement(content.title, content.description))
        .addTo(map);
    };
    map.on('click', POINTS_LAYER, openPopup);
    map.on('click', LINES_LAYER, openPopup);

    for (const layer of [CLUSTERS_LAYER, POINTS_LAYER, LINES_LAYER]) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
    }
  }

  onMount(() => {
    const controller = new AbortController();
    loadViewerConfig(viewerId, controller.signal)
      .then(start)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        failure = error instanceof ApiRequestError && error.status === 404 ? 'not-found' : 'error';
      });
    return () => {
      controller.abort();
      viewer?.destroy();
    };
  });
</script>

<svelte:head>
  {#if config}<title>{config.title}</title>{/if}
</svelte:head>

<div class="embed" style:--brand={brandColor}>
  <div class="map" bind:this={container}></div>

  {#if config?.branding}
    <header class="brand">{config.branding.brandText}</header>
  {/if}

  {#if failure}
    <div class="status">
      {#if failure === 'not-found'}
        <Notice tone="error">Aquest visor no existeix.</Notice>
      {:else if failure === 'data'}
        <Notice tone="error">No s'han pogut carregar les dades del visor.</Notice>
      {:else}
        <Notice tone="error">No s'ha pogut carregar el visor.</Notice>
      {/if}
    </div>
  {/if}
</div>

<style>
  .embed {
    position: fixed;
    inset: 0;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .brand {
    position: absolute;
    z-index: var(--layer-overlay);
    top: var(--space-3);
    left: var(--space-3);
    max-width: calc(100% - 5rem);
    padding: var(--space-2) var(--space-3);
    font-weight: var(--weight-bold);
    font-size: var(--text-sm);
    color: var(--color-on-primary);
    background: var(--brand, var(--color-primary));
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
  }

  .status {
    position: absolute;
    z-index: var(--layer-overlay);
    bottom: var(--space-6);
    left: var(--space-3);
    right: var(--space-3);
  }

  :global(.fita-popup) {
    display: grid;
    gap: var(--space-1);
    font-family: var(--font-sans);
  }

  :global(.fita-popup p) {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
</style>
