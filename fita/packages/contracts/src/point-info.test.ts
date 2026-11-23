import { describe, expect, it } from 'vitest';
import { PointInfoQuerySchema } from './point-info.ts';

describe('PointInfoQuerySchema', () => {
  it('parses decimal coordinates sent as text', () => {
    expect(PointInfoQuerySchema.parse({ lon: '1.8377', lat: '41.5933' })).toEqual({
      lon: 1.8377,
      lat: 41.5933,
    });
  });

  it.each([
    ['a missing latitude', { lon: '1.8' }],
    ['an empty longitude', { lon: '', lat: '41.5' }],
    ['a padded value', { lon: ' 1.8', lat: '41.5' }],
    ['exponent notation', { lon: '1e1', lat: '41.5' }],
    ['a longitude out of range', { lon: '180.5', lat: '41.5' }],
    ['a latitude out of range', { lon: '1.8', lat: '-91' }],
    ['an unknown parameter', { lon: '1.8', lat: '41.5', zoom: '3' }],
  ])('rejects %s', (_label, query) => {
    expect(PointInfoQuerySchema.safeParse(query).success).toBe(false);
  });
});
