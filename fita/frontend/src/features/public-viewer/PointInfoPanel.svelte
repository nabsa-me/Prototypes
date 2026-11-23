<script lang="ts">
  import type { PointInfo, Terrain } from '@fita/contracts';
  import { containsPosition, type Position } from '@fita/geo';
  import { Marker, type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
  import DescriptionList from '../../design-system/DescriptionList.svelte';
  import Notice from '../../design-system/Notice.svelte';
  import Panel from '../../design-system/Panel.svelte';
  import { approximateElevation } from '../../map/elevation.ts';
  import { TERRAIN_EXAGGERATION, TERRAIN_SOURCE } from '../../map/viewer-map.ts';
  import { fetchPointInfo } from './point-info-client.ts';
  import { pointInfoRows, type Elevation } from './point-info-rows.ts';

  interface Props {
    map: MapLibreMap;
    terrain: Terrain | undefined;
    /** Lets the viewer adapt its own layout while the panel is open. */
    onopenchange?: (open: boolean) => void;
  }

  let { map, terrain, onopenchange }: Props = $props();

  type Selection = {
    elevation: Elevation;
    info: { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: PointInfo };
  };

  let selection = $state<Selection>();
  let request: AbortController | undefined;
  let marker: Marker | undefined;

  /**
   * MapLibre answers 0 where its DEM tiles have not loaded yet, which would read as sea
   * level, so the altitude is measured once the terrain source has loaded.
   */
  function measureElevation(lonLat: Position, controller: AbortController) {
    const covered = terrain ? containsPosition(terrain.bounds, lonLat) : false;
    const measure = () =>
      approximateElevation(
        map.queryTerrainElevation([lonLat[0], lonLat[1]]),
        TERRAIN_EXAGGERATION,
        covered,
      );

    if (!covered || map.isSourceLoaded(TERRAIN_SOURCE)) return measure();
    map.once('idle', () => {
      if (selection && request === controller) selection.elevation = measure();
    });
    return 'pending';
  }

  function select(lonLat: Position) {
    request?.abort();
    const controller = new AbortController();
    request = controller;

    marker ??= new Marker({
      color: getComputedStyle(map.getContainer()).getPropertyValue('--color-primary'),
    });
    marker.setLngLat([lonLat[0], lonLat[1]]).addTo(map);

    selection = { elevation: 'pending', info: { status: 'loading' } };
    selection.elevation = measureElevation(lonLat, controller);
    onopenchange?.(true);

    fetchPointInfo(lonLat, controller.signal).then(
      (data) => {
        if (selection && request === controller) selection.info = { status: 'ready', data };
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        if (selection) selection.info = { status: 'error' };
      },
    );
  }

  function close() {
    request?.abort();
    marker?.remove();
    selection = undefined;
    onopenchange?.(false);
    map.getCanvas().focus();
  }

  $effect(() => {
    const onClick = (event: MapMouseEvent) => select([event.lngLat.lng, event.lngLat.lat]);
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
      request?.abort();
      marker?.remove();
    };
  });
</script>

{#if selection}
  <Panel title="Informació del punt" onclose={close}>
    {#if selection.info.status === 'loading'}
      <Notice>Consultant els serveis de l'ICGC…</Notice>
    {:else if selection.info.status === 'error'}
      <Notice tone="error">No s'ha pogut obtenir la informació del punt. Torna-ho a provar.</Notice>
    {:else}
      <DescriptionList items={pointInfoRows(selection.info.data, selection.elevation)} />
    {/if}
  </Panel>
{/if}
