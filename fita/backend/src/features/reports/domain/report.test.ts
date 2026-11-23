import { describe, expect, it } from 'vitest';
import { OutsideCataloniaError, openReport } from './report.ts';

const now = new Date('2026-11-23T10:00:00.000Z');

describe('openReport', () => {
  it('opens a report at version 1 with the owned code and time', () => {
    const report = openReport(
      {
        category: 'road',
        description: 'This road has the wrong number.',
        location: [1.8377, 41.5933],
      },
      { code: 'FIT-7K3Q9X', now },
    );

    expect(report).toEqual({
      code: 'FIT-7K3Q9X',
      category: 'road',
      description: 'This road has the wrong number.',
      location: [1.8377, 41.5933],
      status: 'open',
      publicNote: null,
      createdAt: '2026-11-23T10:00:00.000Z',
      updatedAt: '2026-11-23T10:00:00.000Z',
      version: 1,
    });
  });

  it('rejects a point outside Catalonia', () => {
    expect(() =>
      openReport(
        {
          category: 'road',
          description: 'This road has the wrong number.',
          location: [1.5218, 42.5063],
        },
        { code: 'FIT-7K3Q9X', now },
      ),
    ).toThrow(OutsideCataloniaError);
  });
});
