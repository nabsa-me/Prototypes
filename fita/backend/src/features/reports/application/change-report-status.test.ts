import { describe, expect, it } from 'vitest';
import { InvalidTransitionError, VersionConflictError, type Report } from '../domain/report.ts';
import type { ReportStore } from '../ports.ts';
import { aReport } from '../test-report.ts';
import { changeReportStatus } from './change-report-status.ts';
import { ReportNotFoundError } from './get-public-report.ts';

const clock = () => new Date('2026-11-24T09:30:00.000Z');

/** In-memory store whose `update` honours the expected version, like the SQLite one. */
function memoryStore(...initial: Report[]) {
  const reports = new Map(initial.map((report) => [report.code, report]));
  const store: ReportStore = {
    insert: (report) => void reports.set(report.code, report),
    findByCode: (code) => reports.get(code),
    list: () => [...reports.values()],
    update: (report, expectedVersion) => {
      if (reports.get(report.code)?.version !== expectedVersion) return false;
      reports.set(report.code, report);
      return true;
    },
  };
  return { store, reports };
}

describe('changeReportStatus', () => {
  it('stores and answers the changed report', () => {
    const { store, reports } = memoryStore(aReport());

    const result = changeReportStatus({ store, clock }, 'FIT-7K3Q9X', {
      status: 'in_review',
      version: 1,
    });

    expect(result).toMatchObject({ status: 'in_review', version: 2 });
    expect(reports.get('FIT-7K3Q9X')).toEqual(result);
  });

  it('fails with not found for an unknown code', () => {
    const { store } = memoryStore();

    expect(() =>
      changeReportStatus({ store, clock }, 'FIT-222222', { status: 'in_review', version: 1 }),
    ).toThrow(ReportNotFoundError);
  });

  it('lets domain rule violations through untouched', () => {
    const { store } = memoryStore(aReport());

    expect(() =>
      changeReportStatus({ store, clock }, 'FIT-7K3Q9X', {
        status: 'resolved',
        publicNote: 'x',
        version: 1,
      }),
    ).toThrow(InvalidTransitionError);
  });

  it('reports a conflict when another change lands between the read and the write', () => {
    const { store, reports } = memoryStore(aReport());
    // Someone else moves the report to version 2 right after this call reads version 1.
    const racingStore: ReportStore = {
      ...store,
      update: (report, expectedVersion) => {
        reports.set(
          'FIT-7K3Q9X',
          aReport({ status: 'dismissed', publicNote: 'Duplicate.', version: 2 }),
        );
        return store.update(report, expectedVersion);
      },
    };

    const attempt = () =>
      changeReportStatus({ store: racingStore, clock }, 'FIT-7K3Q9X', {
        status: 'in_review',
        version: 1,
      });

    expect(attempt).toThrow(VersionConflictError);
    expect(reports.get('FIT-7K3Q9X')).toMatchObject({ status: 'dismissed', version: 2 });
  });
});
