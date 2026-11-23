export { containsPosition, type BBox } from './bbox.ts';
export { CATALONIA_BBOX, isInsideCatalonia } from './catalonia.ts';
export {
  isInMultiPolygon,
  isInPolygon,
  isInRing,
  type MultiPolygonCoordinates,
  type PolygonCoordinates,
  type RingCoordinates,
} from './point-in-polygon.ts';
export { ETRS89_UTM31N, WGS84, fromUtm31n, toUtm31n, type Position } from './projection.ts';
