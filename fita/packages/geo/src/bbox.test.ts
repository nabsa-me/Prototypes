import { describe, expect, it } from 'vitest';
import { containsPosition, type BBox } from './bbox.ts';

const catalonia: BBox = [0, 40.5, 4.2, 42.86];

describe('containsPosition', () => {
  it.each([
    ['inside', [1.8377, 41.5933]],
    ['on the west edge', [0, 41]],
    ['on the north-east corner', [4.2, 42.86]],
  ] as const)('accepts a position %s', (_label, position) => {
    expect(containsPosition(catalonia, position)).toBe(true);
  });

  it.each([
    ['west', [-0.1, 41]],
    ['east', [4.3, 41]],
    ['south', [1, 40.4]],
    ['north', [1, 43]],
  ] as const)('rejects a position to the %s', (_label, position) => {
    expect(containsPosition(catalonia, position)).toBe(false);
  });
});
