import type { NewReport } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { OutsideCataloniaError, type Report } from '../domain/report.ts';
import { DuplicateTrackingCodeError, type ReportStore } from '../ports.ts';
import { createReport } from './create-report.ts';

const input: NewReport = {
  category: 'building',
  description: 'This building was demolished last year.',
  location: [2.1701, 41.387],
};
const now = new Date('2026-11-23T10:00:00.000Z');

/** Index sequence: every call returns the next value; 0 -> '2', 1 -> '3', ... */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

function storeTaking(taken: Set<string>) {
  const saved: Report[] = [];
  const store: ReportStore = {
    insert(report) {
      if (taken.has(report.code)) throw new DuplicateTrackingCodeError(report.code);
      saved.push(report);
    },
    findByCode: () => undefined,
  };
  return { store, saved };
}

describe('createReport', () => {
  it('stores an open report and answers its code', () => {
    const { store, saved } = storeTaking(new Set());

    const result = createReport({ store, clock: () => now, randomIndex: sequence(0) }, input);

    expect(result).toEqual({ code: 'FIT-222222' });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ code: 'FIT-222222', status: 'open', version: 1 });
  });

  it('draws a new code when the first one is taken', () => {
    const { store, saved } = storeTaking(new Set(['FIT-222222']));

    const result = createReport(
      { store, clock: () => now, randomIndex: sequence(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1) },
      input,
    );

    expect(result).toEqual({ code: 'FIT-333333' });
    expect(saved.map((r) => r.code)).toEqual(['FIT-333333']);
  });

  it('gives up after three taken codes', () => {
    const { store } = storeTaking(new Set(['FIT-222222']));

    expect(() =>
      createReport({ store, clock: () => now, randomIndex: sequence(0) }, input),
    ).toThrow(DuplicateTrackingCodeError);
  });

  it('does not store a report outside Catalonia', () => {
    const { store, saved } = storeTaking(new Set());

    expect(() =>
      createReport(
        { store, clock: () => now, randomIndex: sequence(0) },
        { ...input, location: [2.8956, 42.6986] },
      ),
    ).toThrow(OutsideCataloniaError);
    expect(saved).toEqual([]);
  });

  it('lets other store failures through', () => {
    const failure = new Error('disk I/O error');
    const store: ReportStore = {
      insert() {
        throw failure;
      },
      findByCode: () => undefined,
    };

    expect(() =>
      createReport({ store, clock: () => now, randomIndex: sequence(0) }, input),
    ).toThrow(failure);
  });
});
