import { describe, expect, it } from 'vitest';
import { utmMetres, wgs84Degrees } from './coordinates.ts';

describe('utmMetres', () => {
  it('rounds ETRS89 UTM 31N coordinates to the metre', () => {
    // PROJ 9.5.1: (1.8377, 41.5933) -> (403129.7818, 4605274.6984)
    expect(utmMetres([1.8377, 41.5933])).toEqual({ x: '403130', y: '4605275' });
  });
});

describe('wgs84Degrees', () => {
  it('keeps six decimals', () => {
    expect(wgs84Degrees([1.83770241, 41.5933117])).toEqual({ lon: '1.837702', lat: '41.593312' });
  });
});
