import { toUtm31n, type Position } from '@fita/geo';

const roundToCentimetre = (metres: number) => Math.round(metres * 100) / 100;

/** A WGS84 point and its ETRS89 UTM 31N equivalent, rounded to the centimetre. */
export function describePosition(lonLat: Position): {
  wgs84: [number, number];
  utm31n: [number, number];
} {
  const [x, y] = toUtm31n(lonLat);
  return {
    wgs84: [lonLat[0], lonLat[1]],
    utm31n: [roundToCentimetre(x), roundToCentimetre(y)],
  };
}
