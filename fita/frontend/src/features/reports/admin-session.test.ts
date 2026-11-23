import { describe, expect, it } from 'vitest';
import { createAdminSession } from './admin-session.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('createAdminSession', () => {
  it('writes, reads and clears the token', () => {
    const storage = memoryStorage();
    const session = createAdminSession(() => storage);

    session.write('local-admin-token');
    expect(session.read()).toBe('local-admin-token');

    session.clear();
    expect(session.read()).toBeUndefined();
  });

  it('works without storage: nothing is kept and nothing throws', () => {
    const session = createAdminSession(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(() => session.write('local-admin-token')).not.toThrow();
    expect(session.read()).toBeUndefined();
    expect(() => session.clear()).not.toThrow();
  });
});
