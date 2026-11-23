import { describe, expect, it } from 'vitest';
import { buildServer } from './server.ts';

const app = () =>
  buildServer({ logger: false, viewers: { store: { read: async () => undefined } } });

describe('buildServer', () => {
  it('answers the health check', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('answers 404 in the API error format for unknown routes', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/unknown' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});
