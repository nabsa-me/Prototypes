/**
 * Turns `map.queryTerrainElevation()` into an approximate altitude in metres.
 *
 * MapLibre multiplies the elevation by the terrain exaggeration and answers 0, not null,
 * where it has no DEM data. Outside the DEM bounds the 0 would read as sea level, so the
 * caller says whether the point is covered and no altitude is given when it is not.
 */
export function approximateElevation(
  queried: number | null,
  exaggeration: number,
  coveredByDem: boolean,
): number | null {
  if (queried === null || !coveredByDem) return null;
  return Math.round(queried / exaggeration);
}
