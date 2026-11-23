import { toUtm31n, type Position } from '@fita/geo';

/** ETRS89 UTM 31N easting and northing of a WGS84 position, rounded to the metre. */
export function utmMetres(lonLat: Position): { x: string; y: string } {
  const [x, y] = toUtm31n(lonLat);
  return { x: Math.round(x).toString(), y: Math.round(y).toString() };
}

/** WGS84 longitude and latitude with 6 decimals (about 10 cm). */
export function wgs84Degrees([lon, lat]: Position): { lon: string; lat: string } {
  return { lon: lon.toFixed(6), lat: lat.toFixed(6) };
}
