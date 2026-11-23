import { describe, expect, it } from 'vitest';
import { isAdminToken } from './admin-token.ts';

const token = 'local-admin-token';

describe('isAdminToken', () => {
  it('accepts the configured token', () => {
    expect(isAdminToken('local-admin-token', token)).toBe(true);
  });

  it.each([
    ['a different token of the same length', 'local-admin-tokeX'],
    ['a prefix of the token', 'local-admin'],
    ['a longer token', 'local-admin-token-2'],
    ['an empty header', ''],
    ['a missing header', undefined],
    ['a repeated header', ['local-admin-token', 'local-admin-token']],
  ])('rejects %s', (_label, provided) => {
    expect(isAdminToken(provided, token)).toBe(false);
  });
});
