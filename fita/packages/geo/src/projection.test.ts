import { describe, expect, it } from 'vitest';
import { fromUtm31n, toUtm31n, type Position } from './projection.ts';

// Reference values computed with PROJ 9.5.1 (pyproj 3.7.2):
// EPSG:4326 -> EPSG:25831, "Inverse of ETRS89 to WGS 84 (1) + UTM zone 31N".
const forward: Array<{ lonLat: Position; utm: Position }> = [
  { lonLat: [1.8377, 41.5933], utm: [403129.7818, 4605274.6984] },
  { lonLat: [2.16687, 41.385965], utm: [430342.5061, 4581939.1126] },
  { lonLat: [0.62, 41.6176], utm: [301711.5591, 4610056.2651] },
  { lonLat: [3.0, 42.0], utm: [500000.0, 4649776.2247] },
];

// EPSG:25831 -> EPSG:4326 with the same PROJ version.
const inverse: Array<{ utm: Position; lonLat: Position }> = [
  { utm: [403130.0, 4605276.0], lonLat: [1.837702408, 41.593311748] },
  { utm: [430010.51, 4583601.92], lonLat: [2.16270744, 41.400912521] },
];

const ONE_CM = 0.01;
// One centimetre expressed in degrees of latitude (1 degree ~ 111 km).
const ONE_CM_IN_DEGREES = ONE_CM / 111_000;

describe('toUtm31n', () => {
  it.each(forward)('projects $lonLat to ETRS89 UTM 31N within 1 cm', ({ lonLat, utm }) => {
    const [x, y] = toUtm31n(lonLat);

    expect(Math.abs(x - utm[0])).toBeLessThan(ONE_CM);
    expect(Math.abs(y - utm[1])).toBeLessThan(ONE_CM);
  });
});

describe('fromUtm31n', () => {
  it.each(inverse)('unprojects $utm to WGS84 within 1 cm', ({ utm, lonLat }) => {
    const [lon, lat] = fromUtm31n(utm);

    expect(Math.abs(lon - lonLat[0])).toBeLessThan(ONE_CM_IN_DEGREES);
    expect(Math.abs(lat - lonLat[1])).toBeLessThan(ONE_CM_IN_DEGREES);
  });

  it('round-trips a position without drifting', () => {
    const [x, y] = toUtm31n(fromUtm31n([420000, 4600000]));

    expect(Math.abs(x - 420000)).toBeLessThan(ONE_CM);
    expect(Math.abs(y - 4600000)).toBeLessThan(ONE_CM);
  });
});
