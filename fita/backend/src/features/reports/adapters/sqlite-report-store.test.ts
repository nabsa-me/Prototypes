import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../../shared/test-database.ts';
import type { Report } from '../domain/report.ts';
import { DuplicateTrackingCodeError } from '../ports.ts';
import { aReport } from '../test-report.ts';
import { createSqliteReportStore } from './sqlite-report-store.ts';

describe('createSqliteReportStore', () => {
  let db: DatabaseSync;
  let dispose: () => void;

  beforeEach(() => {
    ({ db, dispose } = openTestDatabase());
  });

  afterEach(() => {
    dispose();
  });

  it('stores the report and its location in the spatial index', () => {
    createSqliteReportStore(db).insert(aReport());

    expect(db.prepare('SELECT code, lon, lat, status, version FROM reports').all()).toEqual([
      { code: 'FIT-7K3Q9X', lon: 1.8377, lat: 41.5933, status: 'open', version: 1 },
    ]);
    const location = db
      .prepare('SELECT min_lon, max_lon, min_lat, max_lat FROM report_locations')
      .get() as Record<string, number>;
    // The spatial index keeps 32-bit floats rounded outwards around the exact point.
    expect(location['min_lon']).toBeLessThanOrEqual(1.8377);
    expect(location['max_lon']).toBeGreaterThanOrEqual(1.8377);
    expect(location['min_lat']).toBeLessThanOrEqual(41.5933);
    expect(location['max_lat']).toBeGreaterThanOrEqual(41.5933);
  });

  it('reports a taken code and leaves nothing half written', () => {
    const store = createSqliteReportStore(db);
    store.insert(aReport());

    expect(() => store.insert(aReport({ location: [2.17, 41.38] }))).toThrow(
      DuplicateTrackingCodeError,
    );
    expect(db.prepare('SELECT COUNT(*) AS n FROM report_locations').get()).toEqual({ n: 1 });
  });

  it('reads back exactly what it stored', () => {
    const store = createSqliteReportStore(db);
    const report = aReport({ status: 'in_review', publicNote: 'We are checking it.', version: 2 });
    store.insert(report);

    expect(store.findByCode('FIT-7K3Q9X')).toEqual(report);
    expect(store.findByCode('FIT-222222')).toBeUndefined();
  });

  it('lets the schema reject values the domain should never produce', () => {
    expect(() =>
      createSqliteReportStore(db).insert(aReport({ status: 'archived' as Report['status'] })),
    ).toThrow(/CHECK constraint failed/);
  });
});
