import type { DatasetSource } from '@fita/contracts';
import {
  CATALONIA_BBOX,
  containsPosition,
  fromUtm31n,
  geometryBbox,
  mapPositions,
  validateFeatureCollection,
  type BBox,
  type Feature,
  type Geometry,
} from '@fita/geo';

/**
 * How far outside Catalonia's bounding box a feature may reach (about 20 km). Wide enough
 * for a route that crosses a border, narrow enough to catch coordinates in the wrong CRS,
 * which land hundreds of kilometres away.
 */
export const DATASET_EXTENT_MARGIN_DEGREES = 0.2;

const ALLOWED_EXTENT: BBox = [
  CATALONIA_BBOX[0] - DATASET_EXTENT_MARGIN_DEGREES,
  CATALONIA_BBOX[1] - DATASET_EXTENT_MARGIN_DEGREES,
  CATALONIA_BBOX[2] + DATASET_EXTENT_MARGIN_DEGREES,
  CATALONIA_BBOX[3] + DATASET_EXTENT_MARGIN_DEGREES,
];

/** A feature ready to store: geometry in EPSG:4326 and its bounding box. */
export interface PreparedFeature {
  feature: Feature & { geometry: Geometry };
  bbox: BBox;
}

export class InvalidDatasetError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid dataset:\n${problems.join('\n')}`);
    this.name = 'InvalidDatasetError';
  }
}

/**
 * Validates a client dataset (RFC 7946), reprojects it to EPSG:4326 and bounds each
 * feature. Rejects features without geometry or outside Catalonia once read in the
 * declared CRS: the usual sign of data in another CRS. Nothing is repaired.
 */
export function prepareDataset(raw: unknown, crs: DatasetSource['crs']): PreparedFeature[] {
  const validation = validateFeatureCollection(raw);
  if (!validation.valid) throw new InvalidDatasetError(validation.errors);

  const problems: string[] = [];
  const prepared: PreparedFeature[] = [];
  validation.value.features.forEach((feature, index) => {
    const path = `$.features[${index}]`;
    if (feature.geometry === null) {
      problems.push(`${path}.geometry: every feature needs a geometry to be shown on the map`);
      return;
    }
    const geometry =
      crs === 'EPSG:25831' ? mapPositions(feature.geometry, fromUtm31n) : feature.geometry;
    const bbox = geometryBbox(geometry);
    if (!bbox) {
      problems.push(`${path}.geometry: has no positions`);
      return;
    }
    const inside =
      containsPosition(ALLOWED_EXTENT, [bbox[0], bbox[1]]) &&
      containsPosition(ALLOWED_EXTENT, [bbox[2], bbox[3]]);
    if (!inside) {
      problems.push(
        `${path}: lies outside Catalonia when read as ${crs}; is the file in another CRS?`,
      );
      return;
    }
    prepared.push({
      feature: {
        type: 'Feature',
        ...(feature.id === undefined ? {} : { id: feature.id }),
        geometry,
        properties: feature.properties,
      },
      bbox,
    });
  });

  if (problems.length > 0) throw new InvalidDatasetError(problems);
  return prepared;
}
