import { describe, expect, it } from 'vitest';
import {
  isInMultiPolygon,
  isInPolygon,
  isInRing,
  type PolygonCoordinates,
  type RingCoordinates,
} from './point-in-polygon.ts';

const square: RingCoordinates = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const hole: RingCoordinates = [
  [4, 4],
  [6, 4],
  [6, 6],
  [4, 6],
  [4, 4],
];
const squareWithHole: PolygonCoordinates = [square, hole];
const farSquare: PolygonCoordinates = [
  [
    [20, 20],
    [30, 20],
    [30, 30],
    [20, 30],
    [20, 20],
  ],
];

describe('isInRing', () => {
  it.each([
    ['inside', [5, 5], true],
    ['outside to the right', [15, 5], false],
    ['outside to the left', [-1, 5], false],
    ['above', [5, 11], false],
  ] as const)('%s', (_label, point, expected) => {
    expect(isInRing(point, square)).toBe(expected);
  });

  it('counts a ray through a vertex once', () => {
    const diamond: RingCoordinates = [
      [5, 0],
      [10, 5],
      [5, 10],
      [0, 5],
      [5, 0],
    ];
    // The ray from (2, 5) passes exactly through the vertex (10, 5).
    expect(isInRing([2, 5], diamond)).toBe(true);
    expect(isInRing([-2, 5], diamond)).toBe(false);
  });

  it('handles a concave ring', () => {
    const u: RingCoordinates = [
      [0, 0],
      [10, 0],
      [10, 10],
      [7, 10],
      [7, 3],
      [3, 3],
      [3, 10],
      [0, 10],
      [0, 0],
    ];
    expect(isInRing([5, 6], u)).toBe(false);
    expect(isInRing([1, 6], u)).toBe(true);
  });
});

describe('isInPolygon', () => {
  it('excludes points inside a hole', () => {
    expect(isInPolygon([5, 5], squareWithHole)).toBe(false);
  });

  it('includes points between the outer ring and the hole', () => {
    expect(isInPolygon([2, 2], squareWithHole)).toBe(true);
  });
});

describe('isInMultiPolygon', () => {
  it('accepts a point in any of its polygons', () => {
    expect(isInMultiPolygon([25, 25], [squareWithHole, farSquare])).toBe(true);
    expect(isInMultiPolygon([2, 2], [squareWithHole, farSquare])).toBe(true);
  });

  it('rejects points in a hole or outside every polygon', () => {
    expect(isInMultiPolygon([5, 5], [squareWithHole, farSquare])).toBe(false);
    expect(isInMultiPolygon([15, 15], [squareWithHole, farSquare])).toBe(false);
  });
});
