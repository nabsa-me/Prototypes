import type { DatasetFeature, DatasetFeatureCollection } from '@fita/contracts';
import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';

export const POINTS_SOURCE = 'fita-dataset-points';
export const SHAPES_SOURCE = 'fita-dataset-shapes';
export const CLUSTERS_LAYER = 'fita-dataset-clusters';
export const CLUSTER_COUNT_LAYER = 'fita-dataset-cluster-count';
export const POINTS_LAYER = 'fita-dataset-points';
export const LINES_LAYER = 'fita-dataset-lines';

/** A bold font the ICGC ContextMaps glyph server provides. */
const LABEL_FONT = ['FiraSans-Bold'];

/**
 * MapLibre clusters only the points of a GeoJSON source, so points go to a clustered
 * source and every other geometry to a plain one.
 */
export function splitByGeometry(collection: DatasetFeatureCollection): {
  points: DatasetFeatureCollection;
  shapes: DatasetFeatureCollection;
} {
  const isPoint = (feature: DatasetFeature) => feature.geometry.type === 'Point';
  return {
    points: { type: 'FeatureCollection', features: collection.features.filter(isPoint) },
    shapes: { type: 'FeatureCollection', features: collection.features.filter((f) => !isPoint(f)) },
  };
}

/** Layers in drawing order: route lines, clusters with their count, single points. */
export function datasetLayers(color: string): LayerSpecification[] {
  return [
    {
      id: LINES_LAYER,
      type: 'line',
      source: SHAPES_SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 3, 'line-dasharray': [2, 1.5] },
    },
    {
      id: CLUSTERS_LAYER,
      type: 'circle',
      source: POINTS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': color,
        'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    },
    {
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: POINTS_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': LABEL_FONT,
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    },
    {
      id: POINTS_LAYER,
      type: 'circle',
      source: POINTS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': color,
        'circle-radius': 7,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    },
  ];
}

export function addDatasetLayers(map: MapLibreMap, color: string): void {
  const empty: DatasetFeatureCollection = { type: 'FeatureCollection', features: [] };
  map.addSource(SHAPES_SOURCE, { type: 'geojson', data: empty });
  map.addSource(POINTS_SOURCE, {
    type: 'geojson',
    data: empty,
    cluster: true,
    clusterRadius: 45,
    clusterMaxZoom: 14,
  });
  for (const layer of datasetLayers(color)) map.addLayer(layer);
}

export function showDataset(map: MapLibreMap, collection: DatasetFeatureCollection): void {
  const { points, shapes } = splitByGeometry(collection);
  map.getSource<GeoJSONSource>(POINTS_SOURCE)?.setData(points);
  map.getSource<GeoJSONSource>(SHAPES_SOURCE)?.setData(shapes);
}

/** Title and text for a feature popup, from its `name` and `description` when they are text. */
export function popupContent(
  properties: Record<string, unknown> | null | undefined,
): { title: string; description: string | undefined } | undefined {
  const name = properties?.['name'];
  if (typeof name !== 'string' || name.length === 0) return undefined;
  const description = properties?.['description'];
  return { title: name, description: typeof description === 'string' ? description : undefined };
}
