import { describe, expect, it } from 'vitest';
import { SearchQuerySchema } from './search.ts';

describe('SearchQuerySchema', () => {
  it.each(['mon', 'Monistrol', 'c-25 143'])('accepts %j', (text) => {
    expect(SearchQuerySchema.parse({ text })).toEqual({ text });
  });

  it.each([
    ['missing text', {}],
    ['two characters', { text: 'mo' }],
    ['spaces around two characters', { text: '  mo  ' }],
    ['more than 100 characters', { text: 'a'.repeat(101) }],
    ['an unknown parameter', { text: 'mon', size: '50' }],
  ])('rejects %s', (_label, query) => {
    expect(SearchQuerySchema.safeParse(query).success).toBe(false);
  });
});
