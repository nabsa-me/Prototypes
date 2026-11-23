import { describe, expect, it } from 'vitest';
import { DatasetFeatureCollectionSchema, DatasetFeaturesQuerySchema } from './dataset.ts';

describe('DatasetFeaturesQuerySchema', () => {
  it('requires a bbox', () => {
    expect(DatasetFeaturesQuerySchema.safeParse({}).success).toBe(false);
    expect(DatasetFeaturesQuerySchema.parse({ bbox: '2,41,3,42' })).toEqual({
      bbox: [2, 41, 3, 42],
    });
  });
});

describe('DatasetFeatureCollectionSchema', () => {
  it('accepts points, lines and nested collections', () => {
    const collection = {
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
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              {
                type: 'LineString',
                coordinates: [
                  [2, 41],
                  [2.1, 41.1],
                ],
              },
            ],
          },
          properties: null,
        },
      ],
    };

    expect(DatasetFeatureCollectionSchema.parse(collection)).toEqual(collection);
  });

  it.each([
    ['a feature without geometry', { type: 'Feature', geometry: null, properties: null }],
    [
      'a LineString of one position',
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[2, 41]] },
        properties: null,
      },
    ],
    [
      'an extra member',
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [2, 41] },
        properties: null,
        crs: {},
      },
    ],
  ])('rejects %s', (_label, feature) => {
    expect(
      DatasetFeatureCollectionSchema.safeParse({ type: 'FeatureCollection', features: [feature] })
        .success,
    ).toBe(false);
  });
});
