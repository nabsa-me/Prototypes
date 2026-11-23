const KEY = 'fita.admin-token';

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Keeps the admin token for this browser tab only (sessionStorage). Storage can be missing
 * or blocked (private mode, disabled site data): then the token simply is not kept.
 */
export function createAdminSession(storage: () => TokenStorage = () => sessionStorage) {
  return {
    read(): string | undefined {
      try {
        return storage().getItem(KEY) ?? undefined;
      } catch {
        return undefined;
      }
    },
    write(token: string): void {
      try {
        storage().setItem(KEY, token);
      } catch {
        // Not kept: the user is asked again next time.
      }
    },
    clear(): void {
      try {
        storage().removeItem(KEY);
      } catch {
        // Nothing was kept.
      }
    },
  };
}
