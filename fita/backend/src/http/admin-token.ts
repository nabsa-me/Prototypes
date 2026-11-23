import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_TOKEN_HEADER = 'x-admin-token';

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

/**
 * Compares the header with the configured token in constant time. Both sides are hashed
 * first, so `timingSafeEqual` always gets equal lengths and the comparison does not leak
 * the token length either. A shared token is not user authentication: see the README.
 */
export function isAdminToken(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
