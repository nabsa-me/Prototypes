import { describe, expect, it } from 'vitest';
import { reportListQuery } from './admin-client.ts';

describe('reportListQuery', () => {
  it('is empty without filters', () => {
    expect(reportListQuery({ status: undefined, bbox: undefined })).toBe('');
  });

  it('sends status and bbox, the bbox rounded to 6 decimals (about 10 cm)', () => {
    expect(reportListQuery({ status: 'open', bbox: [1.123456789, 41.1, 2.987654321, 42.2] })).toBe(
      '?status=open&bbox=1.123457%2C41.1%2C2.987654%2C42.2',
    );
  });
});
