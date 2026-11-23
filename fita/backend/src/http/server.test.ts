import { describe, expect, it } from 'vitest';
import { buildServer } from './server.ts';

describe('buildServer', () => {
  it('answers the health check', async () => {
    const app = buildServer({ logger: false });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('answers 404 for unknown routes', async () => {
    const app = buildServer({ logger: false });

    const response = await app.inject({ method: 'GET', url: '/api/unknown' });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
