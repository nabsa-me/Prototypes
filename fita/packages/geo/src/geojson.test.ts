import { describe, expect, it } from 'vitest';
import {
  bboxIntersects,
  geometryBbox,
  mapPositions,
  positionsOf,
  validateFeatureCollection,
  type Geometry,
} from './geojson.ts';

const point = { type: 'Point', coordinates: [448464.5, 4623870.7] };
const feature = (geometry: unknown, extra: Record<string, unknown> = {}) => ({
  type: 'Feature',
  geometry,
  properties: { name: 'x' },
  ...extra,
});
const collection = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

function errorsOf(input: unknown): string[] {
  const result = validateFeatureCollection(input);
  return result.valid ? [] : result.errors;
}

describe('validateFeatureCollection', () => {
  it('accepts every geometry type, 3D positions, null geometry and null properties', () => {
    const square = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    const input = collection(
      feature(point, { id: 'p' }),
      feature(
        {
          type: 'MultiPoint',
          coordinates: [
            [1, 2],
            [3, 4, 5],
          ],
        },
        { id: 7 },
      ),
      feature({
        type: 'LineString',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      }),
      feature({
        type: 'MultiLineString',
        coordinates: [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      }),
      feature({ type: 'Polygon', coordinates: [square] }),
      feature({ type: 'MultiPolygon', coordinates: [[square]] }),
      feature({ type: 'GeometryCollection', geometries: [point] }),
      { type: 'Feature', geometry: null, properties: null, bbox: [0, 0, 1, 1] },
    );

    const result = validateFeatureCollection(input);

    expect(result).toEqual({ valid: true, value: input });
  });

  it('reports a ring that is not closed, with its path', () => {
    const open = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(
      errorsOf(collection(feature({ type: 'Polygon', coordinates: [[...open, [0, 0.5]]] }))),
    ).toEqual([
      '$.features[0].geometry.coordinates[0]: the ring is not closed (first and last positions differ)',
    ]);
  });

  it('reports a ring with fewer than 4 positions', () => {
    expect(
      errorsOf(
        collection(
          feature({
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          }),
        ),
      ),
    ).toEqual(['$.features[0].geometry.coordinates[0]: a linear ring needs at least 4 positions']);
  });

  it.each([
    [
      'a LineString of one position',
      { type: 'LineString', coordinates: [[1, 2]] },
      'needs at least 2 positions',
    ],
    [
      'a position of one number',
      { type: 'Point', coordinates: [1] },
      'position of 2 or 3 finite numbers',
    ],
    [
      'a position of four numbers',
      { type: 'Point', coordinates: [1, 2, 3, 4] },
      'position of 2 or 3',
    ],
    ['a position with text', { type: 'Point', coordinates: ['1', 2] }, 'position of 2 or 3'],
    ['a non-finite number', { type: 'Point', coordinates: [Infinity, 2] }, 'finite numbers'],
    [
      'coordinates that are not an array',
      { type: 'LineString', coordinates: 'a,b' },
      'must be an array',
    ],
    [
      'an unknown geometry type',
      { type: 'Circle', coordinates: [1, 2] },
      'unknown geometry type "Circle"',
    ],
    ['a geometry that is not an object', 'POINT(1 2)', 'must be an object or null'],
    ['a malformed bbox', { ...point, bbox: [0, 0, 1] }, 'bbox: must be 4 or 6 finite numbers'],
  ])('reports %s', (_label, geometry, message) => {
    const errors = errorsOf(collection(feature(geometry)));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(message);
  });

  it.each([
    ['not an object', 'text', '$: must be an object'],
    ['a wrong type', { type: 'Feature', features: [] }, '$.type: must be "FeatureCollection"'],
    [
      'features that are not an array',
      { type: 'FeatureCollection', features: {} },
      '$.features: must be an array',
    ],
    ['a crs member', { ...collection(), crs: { type: 'name' } }, '$.crs: not allowed by RFC 7946'],
    ['a feature that is not an object', collection(3), '$.features[0]: must be an object'],
    [
      'a feature with a wrong type',
      collection({ ...feature(point), type: 'Point' }),
      '$.features[0].type',
    ],
    [
      'a feature without geometry member',
      collection({ type: 'Feature', properties: {} }),
      'geometry: is required',
    ],
    [
      'a feature without properties member',
      collection({ type: 'Feature', geometry: point }),
      'properties: is required',
    ],
    [
      'properties that are not an object',
      collection(feature(point, { properties: [1] })),
      'properties: must be an object or null',
    ],
    [
      'an id that is an object',
      collection(feature(point, { id: { a: 1 } })),
      'id: must be a string or a number',
    ],
  ])('reports %s', (_label, input, message) => {
    expect(errorsOf(input).join('\n')).toContain(message);
  });

  it('collects every problem instead of stopping at the first', () => {
    const errors = errorsOf(
      collection(
        feature({ type: 'Point', coordinates: [1] }),
        feature({ type: 'LineString', coordinates: [[1, 2]] }),
      ),
    );

    expect(errors).toHaveLength(2);
  });
});

describe('positionsOf and geometryBbox', () => {
  const geometries: Array<[string, Geometry, [number, number, number, number]]> = [
    ['Point', { type: 'Point', coordinates: [2, 3] }, [2, 3, 2, 3]],
    [
      'LineString',
      {
        type: 'LineString',
        coordinates: [
          [0, 5],
          [4, -1],
        ],
      },
      [0, -1, 4, 5],
    ],
    [
      'MultiPolygon',
      {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [9, 0],
              [9, 2],
              [0, 0],
            ],
          ],
        ],
      },
      [0, 0, 9, 2],
    ],
    [
      'GeometryCollection',
      {
        type: 'GeometryCollection',
        geometries: [
          { type: 'MultiPoint', coordinates: [[-1, 1]] },
          {
            type: 'MultiLineString',
            coordinates: [
              [
                [3, 7],
                [2, 2],
              ],
            ],
          },
          {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        ],
      },
      [-1, 0, 3, 7],
    ],
  ];

  it.each(geometries)('bounds a %s', (_label, geometry, expected) => {
    expect(geometryBbox(geometry)).toEqual(expected);
  });

  it('has no bounds for a geometry without positions', () => {
    expect(geometryBbox({ type: 'MultiPoint', coordinates: [] })).toBeUndefined();
  });

  it('lists positions in document order', () => {
    expect(
      positionsOf({
        type: 'LineString',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});

describe('bboxIntersects', () => {
  const box = [0, 0, 10, 10] as const;

  it.each([
    ['overlapping', [5, 5, 15, 15], true],
    ['contained', [2, 2, 3, 3], true],
    ['touching an edge', [10, 0, 20, 10], true],
    ['to the right', [11, 0, 20, 10], false],
    ['above', [0, 11, 10, 20], false],
    ['to the left', [-5, 0, -1, 10], false],
    ['below', [0, -5, 10, -1], false],
  ] as const)('%s -> %s', (_label, other, expected) => {
    expect(bboxIntersects(box, other)).toBe(expected);
  });
});

describe('mapPositions', () => {
  const double = ([x, y]: readonly [number, number]) => [x * 2, y * 2] as const;

  it.each<[string, Geometry, Geometry]>([
    [
      'Point, keeping z',
      { type: 'Point', coordinates: [1, 2, 300] },
      { type: 'Point', coordinates: [2, 4, 300] },
    ],
    [
      'MultiPoint',
      { type: 'MultiPoint', coordinates: [[1, 1]] },
      { type: 'MultiPoint', coordinates: [[2, 2]] },
    ],
    [
      'LineString',
      {
        type: 'LineString',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
      {
        type: 'LineString',
        coordinates: [
          [2, 4],
          [6, 8],
        ],
      },
    ],
    [
      'MultiLineString',
      {
        type: 'MultiLineString',
        coordinates: [
          [
            [1, 1],
            [2, 2],
          ],
        ],
      },
      {
        type: 'MultiLineString',
        coordinates: [
          [
            [2, 2],
            [4, 4],
          ],
        ],
      },
    ],
    [
      'Polygon',
      {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
      {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 0],
          ],
        ],
      },
    ],
    [
      'MultiPolygon',
      {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [1, 1],
              [1, 2],
              [2, 2],
              [1, 1],
            ],
          ],
        ],
      },
      {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [2, 2],
              [2, 4],
              [4, 4],
              [2, 2],
            ],
          ],
        ],
      },
    ],
    [
      'GeometryCollection',
      { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [1, 1] }] },
      { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [2, 2] }] },
    ],
  ])('transforms a %s', (_label, input, expected) => {
    expect(mapPositions(input, double)).toEqual(expected);
  });
});
