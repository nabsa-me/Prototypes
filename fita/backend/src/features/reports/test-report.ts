import type { Report } from './domain/report.ts';

/** Test-only: a valid stored report, overridable field by field. */
export function aReport(overrides: Partial<Report> = {}): Report {
  return {
    code: 'FIT-7K3Q9X',
    category: 'toponym',
    description: 'The name of this hill is misspelt.',
    location: [1.8377, 41.5933],
    status: 'open',
    publicNote: null,
    createdAt: '2026-11-23T10:00:00.000Z',
    updatedAt: '2026-11-23T10:00:00.000Z',
    version: 1,
    ...overrides,
  };
}
