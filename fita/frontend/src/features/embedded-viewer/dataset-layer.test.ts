import type { DatasetFeatureCollection } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import {
  CLUSTERS_LAYER,
  LINES_LAYER,
  POINTS_LAYER,
  POINTS_SOURCE,
  SHAPES_SOURCE,
  datasetLayers,
  popupContent,
  splitByGeometry,
} from './dataset-layer.ts';

const collection: DatasetFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'a',
      geometry: { type: 'Point', coordinates: [2.38, 41.76] },
      properties: { name: 'A' },
    },
    {
      type: 'Feature',
      id: 'route',
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.38, 41.76],
          [2.4, 41.77],
        ],
      },
      properties: null,
    },
    {
      type: 'Feature',
      id: 'b',
      geometry: { type: 'Point', coordinates: [2.4, 41.77] },
      properties: { name: 'B' },
    },
  ],
};

describe('splitByGeometry', () => {
  it('sends points to the clustered source and the rest to the plain one, keeping order', () => {
    const { points, shapes } = splitByGeometry(collection);

    expect(points.features.map((f) => f.id)).toEqual(['a', 'b']);
    expect(shapes.features.map((f) => f.id)).toEqual(['route']);
  });
});

describe('datasetLayers', () => {
  it('paints every layer with the brand colour and draws lines below points', () => {
    const layers = datasetLayers('#b4462b');

    expect(layers.map((layer) => layer.id)).toEqual([
      LINES_LAYER,
      CLUSTERS_LAYER,
      'fita-dataset-cluster-count',
      POINTS_LAYER,
    ]);
    expect(JSON.stringify(layers)).not.toContain('#000000');
    expect(
      layers
        .filter((l) => l.type === 'circle')
        .every((l) => JSON.stringify(l.paint).includes('#b4462b')),
    ).toBe(true);
  });

  it('separates clusters from single points on the clustered source', () => {
    const [lines, clusters, , points] = datasetLayers('#b4462b');

    expect(lines).toMatchObject({ source: SHAPES_SOURCE });
    expect(clusters).toMatchObject({ source: POINTS_SOURCE, filter: ['has', 'point_count'] });
    expect(points).toMatchObject({ source: POINTS_SOURCE, filter: ['!', ['has', 'point_count']] });
  });
});

describe('popupContent', () => {
  it('uses the name as title and the description as text', () => {
    expect(popupContent({ name: 'Mirador', description: 'Vista', kind: 'viewpoint' })).toEqual({
      title: 'Mirador',
      description: 'Vista',
    });
  });

  it('leaves out a description that is not text', () => {
    expect(popupContent({ name: 'Mirador', description: 42 })).toEqual({
      title: 'Mirador',
      description: undefined,
    });
  });

  it.each([
    ['no properties', null],
    ['no name', { description: 'Vista' }],
    ['an empty name', { name: '' }],
    ['a name that is not text', { name: 7 }],
  ])('has no popup for %s', (_label, properties) => {
    expect(popupContent(properties)).toBeUndefined();
  });
});
