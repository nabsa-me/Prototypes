import { buildServer, type ServerDeps } from './server.ts';

const notUsed = async (): Promise<never> => {
  throw new Error('This port is not used by the test');
};

const notUsedSync = (): never => {
  throw new Error('This port is not used by the test');
};

/** Test-only: a server whose ports fail loudly unless the test provides them. */
export function buildTestServer(overrides: Partial<Omit<ServerDeps, 'logger'>> = {}) {
  return buildServer({
    logger: false,
    viewers: {
      store: { read: notUsed, listIds: notUsed },
      datasets: {
        importedFingerprint: notUsedSync,
        replace: notUsedSync,
        findIntersecting: notUsedSync,
      },
    },
    pointInfo: { territory: { locate: notUsed }, geocoder: { reverse: notUsed } },
    search: { places: { autocomplete: notUsed } },
    reports: {
      store: {
        insert: notUsedSync,
        findByCode: notUsedSync,
        list: notUsedSync,
        update: notUsedSync,
      },
      clock: notUsedSync,
      randomIndex: notUsedSync,
    },
    adminToken: 'test-admin-token-not-used',
    ...overrides,
  });
}
