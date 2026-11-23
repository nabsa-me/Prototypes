import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestServer } from '../../../http/test-server.ts';
import { openTestDatabase } from '../../../shared/test-database.ts';
import { importDatasets } from '../application/import-datasets.ts';
import type { ViewerConfigStore } from '../ports.ts';
import { createDatasetFiles, createJsonFileViewerStore } from './json-file-store.ts';
import { createSqliteDatasetStore } from './sqlite-dataset-store.ts';

const config = {
  id: 'demo',
  title: 'Demo',
  initialView: { center: [1.75, 41.7], zoom: 8, bearing: 0, pitch: 0 },
  style: 'https://example.test/style.json',
  basemaps: [{ id: 'map', label: 'Mapa', kind: 'style' }],
};

function serverWith(documents: Record<string, unknown>) {
  const reads: string[] = [];
  const store: ViewerConfigStore = {
    read: async (id) => {
      reads.push(id);
      return documents[id];
    },
    listIds: async () => Object.keys(documents),
  };
  const datasets = {
    importedFingerprint: () => undefined,
    replace: () => undefined,
    findIntersecting: () => [],
  };
  return { app: buildTestServer({ viewers: { store, datasets } }), reads };
}

describe('GET /api/viewers/:id', () => {
  it('answers the configuration', async () => {
    const { app } = serverWith({ demo: config });

    const response = await app.inject({ method: 'GET', url: '/api/viewers/demo' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(config);
  });

  it('answers 404 for an unknown viewer', async () => {
    const { app } = serverWith({});

    const response = await app.inject({ method: 'GET', url: '/api/viewers/demo' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'viewer_not_found' } });
  });

  it.each(['..%2Fsecret', 'Demo', 'demo.json'])(
    'answers 400 for the id %s without touching the store',
    async (id) => {
      const { app, reads } = serverWith({ demo: config });

      const response = await app.inject({ method: 'GET', url: `/api/viewers/${id}` });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'invalid_request' } });
      expect(reads).toEqual([]);
    },
  );

  it('answers 500 without details when a stored configuration is broken', async () => {
    const { app } = serverWith({ demo: { ...config, style: 'not a url' } });

    const response = await app.inject({ method: 'GET', url: '/api/viewers/demo' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'internal_error', message: 'Internal server error' },
    });
  });
});

describe('GET /api/viewers/:id/features', () => {
  const directory = new URL('../../../../data/viewers/', import.meta.url);
  let dispose: () => void;
  let app: ReturnType<typeof buildTestServer>;

  beforeAll(async () => {
    const opened = openTestDatabase();
    dispose = opened.dispose;
    const configs = createJsonFileViewerStore(directory);
    const datasets = createSqliteDatasetStore(opened.db);
    await importDatasets({
      configs,
      files: createDatasetFiles(directory),
      store: datasets,
      clock: () => new Date('2026-11-23T10:00:00.000Z'),
      digest: (text) => String(text.length),
    });
    app = buildTestServer({ viewers: { store: configs, datasets } });
  });

  afterAll(() => {
    dispose();
  });

  const get = (url: string) => app.inject({ method: 'GET', url });

  it('answers the shipped dataset in EPSG:4326, filtered by bbox', async () => {
    // Around the first viewpoint only: it and the circular route that passes there.
    const response = await get('/api/viewers/miradors/features?bbox=2.379,41.764,2.381,41.766');

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      type: string;
      features: Array<{ id: string; geometry: { coordinates: number[] } }>;
    }>();
    expect(body.type).toBe('FeatureCollection');
    expect(body.features.map((f) => f.id)).toEqual(['mirador-01', 'ruta']);
    const [lon = 0, lat = 0] = body.features[0]?.geometry.coordinates ?? [];
    expect(Math.abs(lon - 2.38)).toBeLessThan(2e-6);
    expect(Math.abs(lat - 41.765)).toBeLessThan(2e-6);
  });

  it('answers every feature for a bbox around the whole route', async () => {
    const response = await get('/api/viewers/miradors/features?bbox=2.3,41.7,2.5,41.8');

    expect(response.json<{ features: unknown[] }>().features).toHaveLength(13);
  });

  it('answers an empty collection far from the data', async () => {
    const response = await get('/api/viewers/miradors/features?bbox=0.5,40.6,0.6,40.7');

    expect(response.json()).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it.each([
    ['/api/viewers/public/features?bbox=2,41,3,42', 404, 'dataset_not_found'],
    ['/api/viewers/nope/features?bbox=2,41,3,42', 404, 'viewer_not_found'],
    ['/api/viewers/miradors/features', 400, 'invalid_request'],
    ['/api/viewers/miradors/features?bbox=3,41,2,42', 400, 'invalid_request'],
    ['/api/viewers/Miradors/features?bbox=2,41,3,42', 400, 'invalid_request'],
  ])('%s -> %i %s', async (url, status, code) => {
    const response = await get(url);

    expect(response.statusCode).toBe(status);
    expect(response.json()).toMatchObject({ error: { code } });
  });
});
