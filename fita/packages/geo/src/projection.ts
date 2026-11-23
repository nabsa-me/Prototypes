import proj4 from 'proj4';

/** A coordinate pair: [lon, lat] in EPSG:4326 or [x, y] in EPSG:25831. */
export type Position = readonly [number, number];

export const WGS84 = 'EPSG:4326';
export const ETRS89_UTM31N = 'EPSG:25831';

// ETRS89 / UTM zone 31N. ETRS89 and WGS84 differ by less than a metre in Catalonia and
// EPSG's default transformation between them is the null one, hence towgs84=0.
proj4.defs(
  ETRS89_UTM31N,
  '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
);

const converter = proj4(WGS84, ETRS89_UTM31N);

export function toUtm31n([lon, lat]: Position): Position {
  const [x, y] = converter.forward([lon, lat]);
  return [x, y] as const;
}

export function fromUtm31n([x, y]: Position): Position {
  const [lon, lat] = converter.inverse([x, y]);
  return [lon, lat] as const;
}
