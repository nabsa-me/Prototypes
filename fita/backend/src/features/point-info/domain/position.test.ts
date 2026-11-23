import { describe, expect, it } from 'vitest';
import { describePosition } from './position.ts';

describe('describePosition', () => {
  it('pairs the WGS84 point with its UTM 31N coordinates rounded to the centimetre', () => {
    // PROJ 9.5.1: (1.8377, 41.5933) -> (403129.7818, 4605274.6984)
    expect(describePosition([1.8377, 41.5933])).toEqual({
      wgs84: [1.8377, 41.5933],
      utm31n: [403129.78, 4605274.7],
    });
  });
});
