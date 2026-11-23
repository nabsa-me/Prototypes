import { describe, expect, it } from 'vitest';
import { NewReportSchema, TrackingCodeSchema } from './report.ts';

const valid = {
  category: 'toponym',
  description: 'The name of this hill is misspelt.',
  location: [1.8377, 41.5933],
};

describe('NewReportSchema', () => {
  it('accepts a complete report', () => {
    expect(NewReportSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['an unknown category', { ...valid, category: 'tree' }],
    ['a description under 10 characters', { ...valid, description: 'Too short' }],
    ['a description of spaces', { ...valid, description: ' '.repeat(20) }],
    ['a description over 1000 characters', { ...valid, description: 'a'.repeat(1001) }],
    ['a location out of range', { ...valid, location: [1.8, 95] }],
    ['a status set by the client', { ...valid, status: 'resolved' }],
    ['a code set by the client', { ...valid, code: 'FIT-AAAAAA' }],
  ])('rejects %s', (_label, report) => {
    expect(NewReportSchema.safeParse(report).success).toBe(false);
  });
});

describe('TrackingCodeSchema', () => {
  it.each(['FIT-7K3Q9X', 'FIT-222222'])('accepts %s', (code) => {
    expect(TrackingCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each(['fit-7k3q9x', 'FIT-7K3Q9', 'FIT-7K3Q9XX', 'FIT-0K3Q9X', 'FIT-IK3Q9X', 'ABC-7K3Q9X'])(
    'rejects %s',
    (code) => {
      expect(TrackingCodeSchema.safeParse(code).success).toBe(false);
    },
  );
});
