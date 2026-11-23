import { buildServer, type ServerDeps } from './server.ts';

const notUsed = async (): Promise<never> => {
  throw new Error('This port is not used by the test');
};

/** Test-only: a server whose ports fail loudly unless the test provides them. */
export function buildTestServer(overrides: Partial<Omit<ServerDeps, 'logger'>> = {}) {
  return buildServer({
    logger: false,
    viewers: { store: { read: notUsed } },
    pointInfo: { territory: { locate: notUsed }, geocoder: { reverse: notUsed } },
    search: { places: { autocomplete: notUsed } },
    ...overrides,
  });
}
