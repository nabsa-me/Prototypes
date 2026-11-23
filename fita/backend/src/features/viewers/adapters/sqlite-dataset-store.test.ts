import { bboxIntersects, type BBox } from '@fita/geo';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../../shared/test-database.ts';
import type { PreparedFeature } from '../domain/dataset.ts';
import { createSqliteDatasetStore } from './sqlite-dataset-store.ts';

function point(id: string, lon: number, lat: number): PreparedFeature {
  return {
    feature: {
      type: 'Feature',
      id,
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { name: id },
    },
    bbox: [lon, lat, lon, lat],
  };
}

const line: PreparedFeature = {
  feature: {
    type: 'Feature',
    id: 'route',
    geometry: {
      type: 'LineString',
      coordinates: [
        [2.0, 41.0],
        [3.0, 42.0],
      ],
    },
    properties: null,
  },
  bbox: [2.0, 41.0, 3.0, 42.0],
};

const features = [point('a', 2.1, 41.1), point('b', 2.9, 41.9), point('c', 1.0, 41.5), line];

describe('createSqliteDatasetStore', () => {
  let db: DatabaseSync;
  let dispose: () => void;

  beforeEach(() => {
    ({ db, dispose } = openTestDatabase());
  });

  afterEach(() => {
    dispose();
  });

  const store = () => createSqliteDatasetStore(db);
  const ids = (bbox: BBox, viewerId = 'demo') =>
    store()
      .findIntersecting(viewerId, bbox)
      .map((feature) => feature.id);

  it('remembers the fingerprint of the last import', () => {
    expect(store().importedFingerprint('demo')).toBeUndefined();

    store().replace('demo', {
      fingerprint: 'abc',
      importedAt: '2026-11-23T10:00:00.000Z',
      features,
    });

    expect(store().importedFingerprint('demo')).toBe('abc');
  });

  it('answers the features whose bbox intersects the query, in file order', () => {
    store().replace('demo', {
      fingerprint: 'abc',
      importedAt: '2026-11-23T10:00:00.000Z',
      features,
    });

    // The line's bbox covers the area between its ends, so it intersects too.
    expect(ids([2.05, 41.05, 2.15, 41.15])).toEqual(['a', 'route']);
    expect(ids([0.5, 41.4, 1.5, 41.6])).toEqual(['c']);
    expect(ids([3.5, 42.5, 4, 43])).toEqual([]);
  });

  it('gives back the stored features unchanged', () => {
    store().replace('demo', {
      fingerprint: 'abc',
      importedAt: '2026-11-23T10:00:00.000Z',
      features,
    });

    expect(store().findIntersecting('demo', [0, 40, 4, 43])).toEqual(
      features.map((f) => f.feature),
    );
  });

  it('agrees with an in-memory bbox intersection for many query boxes', () => {
    store().replace('demo', {
      fingerprint: 'abc',
      importedAt: '2026-11-23T10:00:00.000Z',
      features,
    });
    // A deterministic grid of query boxes, including ones that only touch a point.
    for (let west = 0.9; west <= 3.1; west += 0.2) {
      for (let south = 40.9; south <= 42.1; south += 0.2) {
        const query: BBox = [west, south, west + 0.2, south + 0.2];
        const expected = features
          .filter((f) => bboxIntersects(f.bbox, query))
          .map((f) => f.feature.id);
        expect(ids(query)).toEqual(expected);
      }
    }
  });

  it('replaces a previous import and keeps other viewers apart', () => {
    const replace = (viewerId: string, list: PreparedFeature[]) =>
      store().replace(viewerId, {
        fingerprint: viewerId,
        importedAt: '2026-11-23T10:00:00.000Z',
        features: list,
      });
    replace('demo', features);
    replace('other', [point('z', 2.1, 41.1)]);

    replace('demo', [point('d', 2.1, 41.1)]);

    expect(ids([2, 41, 2.2, 41.2])).toEqual(['d']);
    expect(ids([2, 41, 2.2, 41.2], 'other')).toEqual(['z']);
    expect(db.prepare('SELECT COUNT(*) AS n FROM dataset_feature_bounds').get()).toEqual({ n: 2 });
  });
});
