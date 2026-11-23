import type { BBox } from '@fita/geo';
import type { Map as MapLibreMap } from 'maplibre-gl';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The visible area as [west, south, east, north], clamped to valid WGS84 ranges: at low
 * zoom MapLibre reports longitudes beyond ±180, which the API rightly rejects.
 */
export function clampBounds(west: number, south: number, east: number, north: number): BBox {
  return [
    clamp(west, -180, 180),
    clamp(south, -90, 90),
    clamp(east, -180, 180),
    clamp(north, -90, 90),
  ];
}

export function visibleBounds(map: MapLibreMap): BBox {
  const bounds = map.getBounds();
  return clampBounds(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());
}
