import type { ExpressionSpecification } from 'maplibre-gl';

/**
 * Data-driven value: `['match', ['get', property], key1, value1, ..., fallback]`.
 * Keys keep the order of `cases`.
 */
export function matchExpression(
  property: string,
  cases: Readonly<Record<string, string | number>>,
  fallback: string | number,
): ExpressionSpecification {
  const [first, ...rest] = Object.entries(cases);
  if (!first) throw new Error('A match expression needs at least one case');
  return ['match', ['get', property], first[0], first[1], ...rest.flat(), fallback];
}

/** `whenTrue` while the feature state flag is set, `otherwise` when unset or false. */
export function featureStateSwitch(
  flag: string,
  whenTrue: number,
  otherwise: number,
): ExpressionSpecification {
  return ['case', ['boolean', ['feature-state', flag], false], whenTrue, otherwise];
}
