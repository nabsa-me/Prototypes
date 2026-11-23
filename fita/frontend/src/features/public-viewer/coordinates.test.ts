import { describe, expect, it } from 'vitest';
import { utmMetres } from './coordinates.ts';

describe('utmMetres', () => {
  it('rounds ETRS89 UTM 31N coordinates to the metre', () => {
    // PROJ 9.5.1: (1.8377, 41.5933) -> (403129.7818, 4605274.6984)
    expect(utmMetres([1.8377, 41.5933])).toEqual({ x: '403130', y: '4605275' });
  });
});
