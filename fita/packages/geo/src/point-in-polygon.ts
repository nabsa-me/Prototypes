import type { Position } from './projection.ts';

/** A closed ring: the first and last positions are equal. */
export type RingCoordinates = readonly Position[];
/** Outer ring first, then holes. */
export type PolygonCoordinates = readonly RingCoordinates[];
export type MultiPolygonCoordinates = readonly PolygonCoordinates[];

/**
 * Even-odd rule: a horizontal ray from the point crosses the ring an odd number of times
 * when the point is inside. Each edge counts as half-open in y, so a ray through a vertex
 * is counted once. Points exactly on an edge may fall on either side.
 */
export function isInRing([x, y]: Position, ring: RingCoordinates): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as Position;
    const [xj, yj] = ring[j] as Position;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside every hole: the even-odd rule over all rings. */
export function isInPolygon(point: Position, polygon: PolygonCoordinates): boolean {
  return polygon.reduce((inside, ring) => (isInRing(point, ring) ? !inside : inside), false);
}

export function isInMultiPolygon(point: Position, multiPolygon: MultiPolygonCoordinates): boolean {
  return multiPolygon.some((polygon) => isInPolygon(point, polygon));
}
