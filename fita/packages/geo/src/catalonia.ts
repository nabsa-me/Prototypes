import { containsPosition, type BBox } from './bbox.ts';
import { CATALONIA_BOUNDARY } from './catalonia-boundary.ts';
import { isInMultiPolygon } from './point-in-polygon.ts';
import type { Position } from './projection.ts';

/** Bounding box of the simplified boundary; rejects far-away points without the full test. */
export const CATALONIA_BBOX: BBox = (() => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of CATALONIA_BOUNDARY) {
    // Holes lie inside their outer ring, so including them does not change the box.
    for (const [x, y] of polygon.flat()) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return [minX, minY, maxX, maxY] as const;
})();

/** True when a WGS84 position falls inside Catalonia (simplified boundary, see its source). */
export function isInsideCatalonia(lonLat: Position): boolean {
  return containsPosition(CATALONIA_BBOX, lonLat) && isInMultiPolygon(lonLat, CATALONIA_BOUNDARY);
}
