import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestServer } from '../../../http/test-server.ts';
import { openTestDatabase } from '../../../shared/test-database.ts';
import { createSqliteReportStore } from './sqlite-report-store.ts';

const valid = {
  category: 'toponym',
  description: 'The name of this hill is misspelt.',
  location: [1.8377, 41.5933],
};

describe('report routes', () => {
  let db: DatabaseSync;
  let dispose: () => void;

  beforeEach(() => {
    ({ db, dispose } = openTestDatabase());
  });

  afterEach(() => {
    dispose();
  });

  const app = () =>
    buildTestServer({
      reports: {
        store: createSqliteReportStore(db),
        clock: () => new Date('2026-11-23T10:00:00.000Z'),
        randomIndex: () => 0,
      },
    });

  describe('POST /api/reports', () => {
    it('answers 201 with the tracking code and where to find the report', async () => {
      const response = await app().inject({ method: 'POST', url: '/api/reports', payload: valid });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ code: 'FIT-222222' });
      expect(response.headers.location).toBe('/api/reports/FIT-222222');
      expect(db.prepare('SELECT status FROM reports').all()).toEqual([{ status: 'open' }]);
    });

    it('answers 422 for a point outside Catalonia and stores nothing', async () => {
      const response = await app().inject({
        method: 'POST',
        url: '/api/reports',
        payload: { ...valid, location: [1.5218, 42.5063] },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ error: { code: 'outside_catalonia' } });
      expect(db.prepare('SELECT COUNT(*) AS n FROM reports').get()).toEqual({ n: 0 });
    });

    it.each([
      ['a short description', { ...valid, description: 'short' }],
      ['an unknown category', { ...valid, category: 'tree' }],
      ['fields the server owns', { ...valid, status: 'resolved', code: 'FIT-AAAAAA' }],
      ['no body', undefined],
    ])('answers 400 for %s', async (_label, payload) => {
      const response = await app().inject({ method: 'POST', url: '/api/reports', payload });

      expect(response.statusCode).toBe(400);
      expect(db.prepare('SELECT COUNT(*) AS n FROM reports').get()).toEqual({ n: 0 });
    });

    it('answers 400 for a body that is not JSON', async () => {
      const response = await app().inject({
        method: 'POST',
        url: '/api/reports',
        headers: { 'content-type': 'application/json' },
        payload: '{ not json',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'invalid_request' } });
    });
  });
});
