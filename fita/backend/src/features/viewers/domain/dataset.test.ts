import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InvalidDatasetError, prepareDataset } from './dataset.ts';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));

function problemsOf(run: () => unknown): readonly string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof InvalidDatasetError) return error.problems;
    throw error;
  }
  throw new Error('Expected an InvalidDatasetError');
}

const utmPoint = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'mirador-01',
      // PROJ 9.5.1: EPSG:4326 (2.38, 41.765) -> EPSG:25831 (448464.5, 4623870.7), rounded to 0.1 m
      geometry: { type: 'Point', coordinates: [448464.5, 4623870.7, 1210] },
      properties: { name: 'Mirador' },
    },
  ],
};

describe('prepareDataset', () => {
  it('reprojects EPSG:25831 to EPSG:4326, keeps z, id and properties, and bounds the feature', () => {
    const [prepared] = prepareDataset(utmPoint, 'EPSG:25831');

    if (!prepared || prepared.feature.geometry.type !== 'Point')
      throw new Error('Expected a point');
    const [lon, lat, z] = prepared.feature.geometry.coordinates;
    // 0.1 m is about 1.3e-6 degrees of longitude here.
    expect(Math.abs((lon ?? 0) - 2.38)).toBeLessThan(2e-6);
    expect(Math.abs((lat ?? 0) - 41.765)).toBeLessThan(2e-6);
    expect(z).toBe(1210);
    expect(prepared.feature).toMatchObject({
      type: 'Feature',
      id: 'mirador-01',
      properties: { name: 'Mirador' },
    });
    expect(prepared.bbox).toEqual([lon, lat, lon, lat]);
  });

  it('keeps EPSG:4326 data as it is', () => {
    const wgs84 = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.38, 41.76],
              [2.4, 41.77],
            ],
          },
          properties: null,
        },
      ],
    };

    expect(prepareDataset(wgs84, 'EPSG:4326')).toEqual([
      {
        feature: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.38, 41.76],
              [2.4, 41.77],
            ],
          },
          properties: null,
        },
        bbox: [2.38, 41.76, 2.4, 41.77],
      },
    ]);
  });

  it('rejects a ring that is not closed', () => {
    expect(
      problemsOf(() => prepareDataset(fixture('unclosed-ring.geojson'), 'EPSG:25831')),
    ).toEqual([
      '$.features[0].geometry.coordinates[0]: the ring is not closed (first and last positions differ)',
    ]);
  });

  it('rejects coordinates outside Catalonia for the declared CRS (WGS84 numbers declared as UTM)', () => {
    expect(problemsOf(() => prepareDataset(fixture('wrong-crs.geojson'), 'EPSG:25831'))).toEqual([
      '$.features[0]: lies outside Catalonia when read as EPSG:25831; is the file in another CRS?',
    ]);
  });

  it('rejects UTM numbers declared as WGS84', () => {
    expect(problemsOf(() => prepareDataset(utmPoint, 'EPSG:4326'))).toEqual([
      '$.features[0]: lies outside Catalonia when read as EPSG:4326; is the file in another CRS?',
    ]);
  });

  it('rejects malformed geometries and lists every problem', () => {
    const problems = problemsOf(() =>
      prepareDataset(fixture('malformed-geometry.geojson'), 'EPSG:25831'),
    );

    expect(problems).toEqual([
      '$.features[0].geometry.coordinates: a LineString needs at least 2 positions',
      '$.features[1].geometry.coordinates: must be a position of 2 or 3 finite numbers',
    ]);
  });

  it.each([
    ['no geometry', { type: 'Feature', geometry: null, properties: {} }, 'needs a geometry'],
    [
      'an empty geometry',
      { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [] }, properties: {} },
      'has no positions',
    ],
  ])('rejects a feature with %s', (_label, feature, message) => {
    const problems = problemsOf(() =>
      prepareDataset({ type: 'FeatureCollection', features: [feature] }, 'EPSG:4326'),
    );

    expect(problems.join('\n')).toContain(message);
  });
});
