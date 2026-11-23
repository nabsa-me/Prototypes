<script lang="ts">
  import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
  import { utmMetres } from './coordinates.ts';

  interface Props {
    map: MapLibreMap;
  }

  let { map }: Props = $props();
  let position = $state<{ x: string; y: string }>();

  $effect(() => {
    const move = (event: MapMouseEvent) => {
      position = utmMetres([event.lngLat.lng, event.lngLat.lat]);
    };
    const leave = () => {
      position = undefined;
    };
    map.on('mousemove', move);
    map.on('mouseout', leave);
    return () => {
      map.off('mousemove', move);
      map.off('mouseout', leave);
    };
  });
</script>

<!-- Pointer-only readout: touch screens have no hover, so it is hidden there. -->
<p class="cursor-position" aria-hidden="true">
  <span class="crs">ETRS89 UTM 31N</span>
  {#if position}
    <span>X {position.x} m</span>
    <span>Y {position.y} m</span>
  {:else}
    <span>Passa el cursor pel mapa</span>
  {/if}
</p>

<style>
  .cursor-position {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
    font-variant-numeric: tabular-nums;
  }

  .crs {
    font-family: var(--font-sans);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  @media (hover: none) {
    .cursor-position {
      display: none;
    }
  }
</style>
