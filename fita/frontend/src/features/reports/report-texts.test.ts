import { describe, expect, it } from 'vitest';
import { formatDateTime } from './report-texts.ts';

describe('formatDateTime', () => {
  it('shows the time in Catalonia, not in UTC', () => {
    // 10:00 UTC is 11:00 in Catalonia in November (CET).
    const text = formatDateTime('2026-11-23T10:00:00.000Z');

    expect(text).toContain('novembre');
    expect(text).toContain('2026');
    expect(text).toContain('11:00');
  });
});
