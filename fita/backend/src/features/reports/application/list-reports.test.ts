import { describe, expect, it } from 'vitest';
import type { ReportFilter, ReportStore } from '../ports.ts';
import { aReport } from '../test-report.ts';
import { listReports } from './list-reports.ts';

describe('listReports', () => {
  it('passes the filter to the store and answers its reports', () => {
    const filters: ReportFilter[] = [];
    const report = aReport();
    const store: ReportStore = {
      insert: () => undefined,
      findByCode: () => undefined,
      list: (filter) => {
        filters.push(filter);
        return [report];
      },
    };

    const result = listReports({ store }, { status: 'open', bbox: [0, 40, 4, 43] });

    expect(result).toEqual([report]);
    expect(filters).toEqual([{ status: 'open', bbox: [0, 40, 4, 43] }]);
  });
});
