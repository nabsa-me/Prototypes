import { describe, expect, it } from 'vitest';
import { approximateElevation } from './elevation.ts';

describe('approximateElevation', () => {
  it('rounds the queried elevation to the metre', () => {
    expect(approximateElevation(717.06, 1, true)).toBe(717);
  });

  it('removes the terrain exaggeration', () => {
    expect(approximateElevation(1434, 2, true)).toBe(717);
  });

  it('gives no altitude without terrain', () => {
    expect(approximateElevation(null, 1, true)).toBeNull();
  });

  it('gives no altitude outside the DEM, where MapLibre answers 0', () => {
    expect(approximateElevation(0, 1, false)).toBeNull();
  });
});
