import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestServer } from '../../../http/test-server.ts';
import { openTestDatabase } from '../../../shared/test-database.ts';
import { aReport } from '../test-report.ts';
import { createSqliteReportStore } from './sqlite-report-store.ts';

const TOKEN = 'test-admin-token-0123';
const auth = { 'x-admin-token': TOKEN };

describe('admin report routes', () => {
  let db: DatabaseSync;
  let dispose: () => void;

  beforeEach(() => {
    ({ db, dispose } = openTestDatabase());
    const store = createSqliteReportStore(db);
    store.insert(aReport({ code: 'FIT-BBBBBB', location: [2.1701, 41.387] }));
    store.insert(aReport({ code: 'FIT-LLLLLL', location: [0.62, 41.6176], status: 'in_review' }));
  });

  afterEach(() => {
    dispose();
  });

  const app = () =>
    buildTestServer({
      adminToken: TOKEN,
      reports: {
        store: createSqliteReportStore(db),
        clock: () => new Date('2026-11-23T10:00:00.000Z'),
        randomIndex: () => 0,
      },
    });

  describe('GET /api/admin/reports', () => {
    it.each([
      ['without a token', {}],
      ['with a wrong token', { 'x-admin-token': 'test-admin-token-0124' }],
    ])('answers 401 %s', async (_label, headers) => {
      const response = await app().inject({ method: 'GET', url: '/api/admin/reports', headers });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: 'unauthorized' } });
    });

    it('answers every report with its location and version', async () => {
      const response = await app().inject({
        method: 'GET',
        url: '/api/admin/reports',
        headers: auth,
      });

      expect(response.statusCode).toBe(200);
      const { reports } = response.json<{ reports: Array<Record<string, unknown>> }>();
      expect(reports.map((r) => r['code']).sort()).toEqual(['FIT-BBBBBB', 'FIT-LLLLLL']);
      expect(reports[0]).toHaveProperty('location');
      expect(reports[0]).toHaveProperty('version', 1);
    });

    it('filters by status and bbox', async () => {
      const byStatus = await app().inject({
        method: 'GET',
        url: '/api/admin/reports?status=in_review',
        headers: auth,
      });
      const byBbox = await app().inject({
        method: 'GET',
        url: '/api/admin/reports?bbox=1.5,41,3.5,42.5',
        headers: auth,
      });

      expect(
        byStatus.json<{ reports: Array<{ code: string }> }>().reports.map((r) => r.code),
      ).toEqual(['FIT-LLLLLL']);
      expect(
        byBbox.json<{ reports: Array<{ code: string }> }>().reports.map((r) => r.code),
      ).toEqual(['FIT-BBBBBB']);
    });

    it.each(['?status=closed', '?bbox=1,2,3', '?bbox=3.5,41,1.5,42.5', '?page=2'])(
      'answers 400 for %s',
      async (query) => {
        const response = await app().inject({
          method: 'GET',
          url: `/api/admin/reports${query}`,
          headers: auth,
        });

        expect(response.statusCode).toBe(400);
      },
    );
  });

  it('leaves public routes open', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/reports/FIT-BBBBBB' });

    expect(response.statusCode).toBe(200);
  });
});
