import { describe, expect, it } from 'vitest';
import type { ReportStore } from '../ports.ts';
import { aReport } from '../test-report.ts';
import { ReportNotFoundError, getPublicReport } from './get-public-report.ts';

function storeWith(...reports: ReturnType<typeof aReport>[]): ReportStore {
  return {
    insert: () => undefined,
    findByCode: (code) => reports.find((report) => report.code === code),
    list: () => reports,
    update: () => false,
  };
}

describe('getPublicReport', () => {
  it('answers the public view, without location or version', () => {
    const report = aReport({ status: 'resolved', publicNote: 'Corrected in the next edition.' });

    expect(getPublicReport({ store: storeWith(report) }, 'FIT-7K3Q9X')).toEqual({
      code: 'FIT-7K3Q9X',
      category: 'toponym',
      description: 'The name of this hill is misspelt.',
      status: 'resolved',
      publicNote: 'Corrected in the next edition.',
      createdAt: '2026-11-23T10:00:00.000Z',
      updatedAt: '2026-11-23T10:00:00.000Z',
    });
  });

  it('fails with not found for an unknown code', () => {
    expect(() => getPublicReport({ store: storeWith() }, 'FIT-222222')).toThrow(
      ReportNotFoundError,
    );
  });
});
