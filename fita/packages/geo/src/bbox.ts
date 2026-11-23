import type { Position } from './projection.ts';

/** [minX, minY, maxX, maxY]; [west, south, east, north] in EPSG:4326. */
export type BBox = readonly [number, number, number, number];

/** True when `position` lies inside `bbox` or on its edge. */
export function containsPosition([minX, minY, maxX, maxY]: BBox, [x, y]: Position): boolean {
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}
