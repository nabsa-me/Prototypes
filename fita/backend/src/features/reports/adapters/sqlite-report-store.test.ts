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

  describe('list', () => {
    // Barcelona, Girona and Lleida, created in this order.
    const barcelona = aReport({
      code: 'FIT-BBBBBB',
      location: [2.1701, 41.387],
      createdAt: '2026-11-01T10:00:00.000Z',
    });
    const girona = aReport({
      code: 'FIT-GGGGGG',
      location: [2.8214, 41.9794],
      status: 'in_review',
      createdAt: '2026-11-02T10:00:00.000Z',
    });
    const lleida = aReport({
      code: 'FIT-KKKKKK',
      location: [0.62, 41.6176],
      createdAt: '2026-11-03T10:00:00.000Z',
    });

    beforeEach(() => {
      const store = createSqliteReportStore(db);
      for (const report of [barcelona, girona, lleida]) store.insert(report);
    });

    const codes = (filter: Parameters<ReturnType<typeof createSqliteReportStore>['list']>[0]) =>
      createSqliteReportStore(db)
        .list(filter)
        .map((report) => report.code);

    it('lists every report, newest first', () => {
      expect(codes({})).toEqual(['FIT-KKKKKK', 'FIT-GGGGGG', 'FIT-BBBBBB']);
    });

    it('filters by status', () => {
      expect(codes({ status: 'in_review' })).toEqual(['FIT-GGGGGG']);
    });

    it('filters by bounding box', () => {
      // East of Lleida: Barcelona and Girona.
      expect(codes({ bbox: [1.5, 41, 3.5, 42.5] })).toEqual(['FIT-GGGGGG', 'FIT-BBBBBB']);
    });

    it('combines both filters', () => {
      expect(codes({ status: 'open', bbox: [1.5, 41, 3.5, 42.5] })).toEqual(['FIT-BBBBBB']);
    });

    it('includes a point on the edge and excludes one a hair outside it', () => {
      // The index rounds outwards to 32-bit floats; the exact columns decide.
      expect(codes({ bbox: [2.1701, 41.387, 2.2, 41.4] })).toEqual(['FIT-BBBBBB']);
      expect(codes({ bbox: [2.17010001, 41.387, 2.2, 41.4] })).toEqual([]);
    });
  });

  describe('update', () => {
    it('writes the change when the stored version is the expected one', () => {
      const store = createSqliteReportStore(db);
      store.insert(aReport());
      const changed = aReport({
        status: 'in_review',
        publicNote: 'We are checking it.',
        updatedAt: '2026-11-24T09:30:00.000Z',
        version: 2,
      });

      expect(store.update(changed, 1)).toBe(true);
      expect(store.findByCode('FIT-7K3Q9X')).toEqual(changed);
    });

    it('writes nothing when the stored version moved on', () => {
      const store = createSqliteReportStore(db);
      store.insert(aReport({ version: 3 }));

      expect(store.update(aReport({ status: 'dismissed', version: 3 }), 2)).toBe(false);
      expect(store.findByCode('FIT-7K3Q9X')).toMatchObject({ status: 'open', version: 3 });
    });

    it('answers false for a code that does not exist', () => {
      expect(createSqliteReportStore(db).update(aReport({ code: 'FIT-222222' }), 1)).toBe(false);
    });
  });

  it('lets the schema reject values the domain should never produce', () => {
    expect(() =>
      createSqliteReportStore(db).insert(aReport({ status: 'archived' as Report['status'] })),
    ).toThrow(/CHECK constraint failed/);
  });
});
