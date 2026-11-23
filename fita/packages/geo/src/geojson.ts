import type { BBox } from './bbox.ts';

/** [x, y] or [x, y, z]. */
export type GeoJsonPosition = readonly number[];

export type Geometry =
  | { type: 'Point'; coordinates: GeoJsonPosition }
  | { type: 'MultiPoint'; coordinates: readonly GeoJsonPosition[] }
  | { type: 'LineString'; coordinates: readonly GeoJsonPosition[] }
  | { type: 'MultiLineString'; coordinates: readonly (readonly GeoJsonPosition[])[] }
  | { type: 'Polygon'; coordinates: readonly (readonly GeoJsonPosition[])[] }
  | { type: 'MultiPolygon'; coordinates: readonly (readonly (readonly GeoJsonPosition[])[])[] }
  | { type: 'GeometryCollection'; geometries: readonly Geometry[] };

export interface Feature {
  type: 'Feature';
  id?: string | number;
  geometry: Geometry | null;
  properties: Record<string, unknown> | null;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

export type GeoJsonValidation =
  { valid: true; value: FeatureCollection } | { valid: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks a FeatureCollection against RFC 7946: member types, positions of 2 or 3 finite
 * numbers, LineStrings of 2+ positions, closed rings of 4+ positions. The `crs` member,
 * removed by RFC 7946, is rejected: the CRS has to be declared outside the document.
 * Ring orientation is not enforced (the RFC says parsers should not reject on it).
 * Every problem is reported with its path; nothing is repaired.
 */
export function validateFeatureCollection(input: unknown): GeoJsonValidation {
  const errors: string[] = [];

  if (!isRecord(input)) return { valid: false, errors: ['$: must be an object'] };
  if (input['type'] !== 'FeatureCollection') errors.push('$.type: must be "FeatureCollection"');
  if ('crs' in input) {
    errors.push('$.crs: not allowed by RFC 7946; declare the CRS outside the document');
  }
  checkBbox(input, '$', errors);

  const features = input['features'];
  if (!Array.isArray(features)) {
    errors.push('$.features: must be an array');
  } else {
    features.forEach((feature, index) => checkFeature(feature, `$.features[${index}]`, errors));
  }

  return errors.length === 0
    ? { valid: true, value: input as unknown as FeatureCollection }
    : { valid: false, errors };
}

function checkFeature(feature: unknown, path: string, errors: string[]): void {
  if (!isRecord(feature)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  if (feature['type'] !== 'Feature') errors.push(`${path}.type: must be "Feature"`);
  const id = feature['id'];
  if (id !== undefined && typeof id !== 'string' && typeof id !== 'number') {
    errors.push(`${path}.id: must be a string or a number`);
  }
  if (!('properties' in feature)) {
    errors.push(`${path}.properties: is required (an object or null)`);
  } else if (feature['properties'] !== null && !isRecord(feature['properties'])) {
    errors.push(`${path}.properties: must be an object or null`);
  }
  if (!('geometry' in feature)) {
    errors.push(`${path}.geometry: is required (a geometry or null)`);
  } else if (feature['geometry'] !== null) {
    checkGeometry(feature['geometry'], `${path}.geometry`, errors);
  }
  checkBbox(feature, path, errors);
}

function checkGeometry(geometry: unknown, path: string, errors: string[]): void {
  if (!isRecord(geometry)) {
    errors.push(`${path}: must be an object or null`);
    return;
  }
  const coordinates = geometry['coordinates'];
  const at = `${path}.coordinates`;
  switch (geometry['type']) {
    case 'Point':
      checkPosition(coordinates, at, errors);
      break;
    case 'MultiPoint':
      checkArray(coordinates, at, errors, (position, p) => checkPosition(position, p, errors));
      break;
    case 'LineString':
      checkLine(coordinates, at, errors);
      break;
    case 'MultiLineString':
      checkArray(coordinates, at, errors, (line, p) => checkLine(line, p, errors));
      break;
    case 'Polygon':
      checkPolygon(coordinates, at, errors);
      break;
    case 'MultiPolygon':
      checkArray(coordinates, at, errors, (polygon, p) => checkPolygon(polygon, p, errors));
      break;
    case 'GeometryCollection':
      checkArray(geometry['geometries'], `${path}.geometries`, errors, (member, p) =>
        checkGeometry(member, p, errors),
      );
      break;
    default:
      errors.push(`${path}.type: unknown geometry type ${JSON.stringify(geometry['type'])}`);
  }
  checkBbox(geometry, path, errors);
}

function checkArray(
  value: unknown,
  path: string,
  errors: string[],
  each: (item: unknown, path: string) => void,
): value is unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be an array`);
    return false;
  }
  value.forEach((item, index) => each(item, `${path}[${index}]`));
  return true;
}

function checkPosition(value: unknown, path: string, errors: string[]): boolean {
  const ok =
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n));
  if (!ok) errors.push(`${path}: must be a position of 2 or 3 finite numbers`);
  return ok;
}

function checkLine(value: unknown, path: string, errors: string[]): void {
  if (!checkArray(value, path, errors, (position, p) => checkPosition(position, p, errors))) return;
  if (value.length < 2) errors.push(`${path}: a LineString needs at least 2 positions`);
}

function checkPolygon(value: unknown, path: string, errors: string[]): void {
  checkArray(value, path, errors, (ring, p) => checkRing(ring, p, errors));
}

function checkRing(value: unknown, path: string, errors: string[]): void {
  const before = errors.length;
  if (!checkArray(value, path, errors, (position, p) => checkPosition(position, p, errors))) return;
  if (errors.length > before) return;
  const ring = value as number[][];
  if (ring.length < 4) {
    errors.push(`${path}: a linear ring needs at least 4 positions`);
    return;
  }
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  if (first.length !== last.length || first.some((n, i) => n !== last[i])) {
    errors.push(`${path}: the ring is not closed (first and last positions differ)`);
  }
}

function checkBbox(member: Record<string, unknown>, path: string, errors: string[]): void {
  if (!('bbox' in member)) return;
  const bbox = member['bbox'];
  const ok =
    Array.isArray(bbox) &&
    (bbox.length === 4 || bbox.length === 6) &&
    bbox.every((n) => typeof n === 'number' && Number.isFinite(n));
  if (!ok) errors.push(`${path}.bbox: must be 4 or 6 finite numbers`);
}

/** Every position of a geometry, in document order. */
export function positionsOf(geometry: Geometry): GeoJsonPosition[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return [...geometry.coordinates];
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(positionsOf);
  }
}

/** 2D bounding box of a geometry, or `undefined` when it has no positions. */
export function geometryBbox(geometry: Geometry): BBox | undefined {
  const positions = positionsOf(geometry);
  if (positions.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  // Positions passed validation: each has at least x and y.
  for (const position of positions) {
    const x = position[0] as number;
    const y = position[1] as number;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

/** True when two boxes share at least a point (touching edges count). */
export function bboxIntersects(
  [aMinX, aMinY, aMaxX, aMaxY]: BBox,
  [bMinX, bMinY, bMaxX, bMaxY]: BBox,
): boolean {
  return aMinX <= bMaxX && bMinX <= aMaxX && aMinY <= bMaxY && bMinY <= aMaxY;
}

/** A copy of the geometry with `transform` applied to every [x, y]; a z value is kept. */
export function mapPositions(
  geometry: Geometry,
  transform: (xy: readonly [number, number]) => readonly [number, number],
): Geometry {
  const map = (position: GeoJsonPosition): GeoJsonPosition => {
    return [...transform([position[0] as number, position[1] as number]), ...position.slice(2)];
  };
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: map(geometry.coordinates) };
    case 'MultiPoint':
      return { type: 'MultiPoint', coordinates: geometry.coordinates.map(map) };
    case 'LineString':
      return { type: 'LineString', coordinates: geometry.coordinates.map(map) };
    case 'MultiLineString':
      return { type: 'MultiLineString', coordinates: geometry.coordinates.map((l) => l.map(map)) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: geometry.coordinates.map((r) => r.map(map)) };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((p) => p.map((r) => r.map(map))),
      };
    case 'GeometryCollection':
      return {
        type: 'GeometryCollection',
        geometries: geometry.geometries.map((g) => mapPositions(g, transform)),
      };
  }
}
