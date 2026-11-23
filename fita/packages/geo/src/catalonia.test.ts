import { describe, expect, it } from 'vitest';
import { CATALONIA_BBOX, isInsideCatalonia } from './catalonia.ts';

describe('isInsideCatalonia', () => {
  it.each([
    ['Barcelona, Plaça de Catalunya', [2.1701, 41.387]],
    ['Montserrat', [1.8377, 41.5933]],
    ['Vielha, Val d’Aran', [0.7956, 42.7019]],
    ['Tortosa', [0.5216, 40.8125]],
    ['Puigcerdà', [1.928, 42.4318]],
    ['Llívia, the exclave inside France', [1.9806, 42.4637]],
  ] as const)('accepts %s', (_label, point) => {
    expect(isInsideCatalonia(point)).toBe(true);
  });

  it.each([
    ['Andorra la Vella', [1.5218, 42.5063]],
    ['Perpignan', [2.8956, 42.6986]],
    ['Bourg-Madame, between Puigcerdà and Llívia', [1.9466, 42.4327]],
    ['Fraga, Aragon', [0.3486, 41.5226]],
    ['Vinaròs, Valencian Country', [0.4743, 40.4705]],
    ['the open sea off Barcelona', [2.6, 41.2]],
    ['a point far away', [-3.7038, 40.4168]],
  ] as const)('rejects %s', (_label, point) => {
    expect(isInsideCatalonia(point)).toBe(false);
  });
});

describe('CATALONIA_BBOX', () => {
  it('fits inside the extent the ICGC publishes for the collection', () => {
    // Published extent, rounded outwards to multiples of 1/48 degree:
    // [0.145833, 40.520833, 3.354167, 42.875]. The islets left out of the simplified
    // boundary reach further east, hence the 0.05 degree margin.
    const [west, south, east, north] = CATALONIA_BBOX;
    expect(west).toBeGreaterThanOrEqual(0.145833);
    expect(south).toBeGreaterThanOrEqual(40.520833);
    expect(east).toBeLessThanOrEqual(3.354167);
    expect(north).toBeLessThanOrEqual(42.875);
    expect(
      Math.max(west - 0.145833, south - 40.520833, 3.354167 - east, 42.875 - north),
    ).toBeLessThan(0.05);
  });
});
