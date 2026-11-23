import { toUtm31n, type Position } from '@fita/geo';

/** ETRS89 UTM 31N easting and northing of a WGS84 position, rounded to the metre. */
export function utmMetres(lonLat: Position): { x: string; y: string } {
  const [x, y] = toUtm31n(lonLat);
  return { x: Math.round(x).toString(), y: Math.round(y).toString() };
}
