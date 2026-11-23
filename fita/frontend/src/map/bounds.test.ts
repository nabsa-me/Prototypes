import { describe, expect, it } from 'vitest';
import { clampBounds } from './bounds.ts';

describe('clampBounds', () => {
  it('keeps bounds that are already valid', () => {
    expect(clampBounds(0.1, 40.5, 3.3, 42.9)).toEqual([0.1, 40.5, 3.3, 42.9]);
  });

  it('clamps a world view wider than ±180 degrees', () => {
    expect(clampBounds(-250, -95, 260, 95)).toEqual([-180, -90, 180, 90]);
  });
});
