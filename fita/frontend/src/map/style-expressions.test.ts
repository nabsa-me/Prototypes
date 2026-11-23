import { describe, expect, it } from 'vitest';
import { featureStateSwitch, matchExpression } from './style-expressions.ts';

describe('matchExpression', () => {
  it('builds a match on a feature property with a fallback', () => {
    expect(matchExpression('status', { open: '#8a4b00', resolved: '#166534' }, '#000000')).toEqual([
      'match',
      ['get', 'status'],
      'open',
      '#8a4b00',
      'resolved',
      '#166534',
      '#000000',
    ]);
  });
});

it('refuses an empty set of cases, which MapLibre would reject', () => {
  expect(() => matchExpression('status', {}, '#000000')).toThrow(/at least one case/);
});

describe('featureStateSwitch', () => {
  it('reads a boolean feature state, false when unset', () => {
    expect(featureStateSwitch('hover', 10, 7)).toEqual([
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      10,
      7,
    ]);
  });
});
