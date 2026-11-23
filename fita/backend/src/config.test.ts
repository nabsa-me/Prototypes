import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.ts';

describe('parseConfig', () => {
  it('reads the API port from the environment', () => {
    expect(parseConfig({ API_PORT: '4791' })).toEqual({ apiPort: 4791 });
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a number', 'abc'],
    ['decimal', '4791.5'],
    ['padded', ' 4791'],
    ['zero', '0'],
    ['above the TCP range', '65536'],
  ])('rejects an API port that is %s', (_label, value) => {
    expect(() => parseConfig({ API_PORT: value })).toThrow(/API_PORT/);
  });
});
