import { describe, expect, it } from 'vitest';
import { buildServer } from '../../../http/server.ts';
import type { ViewerConfigStore } from '../ports.ts';

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
  };
  return { app: buildServer({ logger: false, viewers: { store } }), reads };
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
