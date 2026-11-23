import { randomInt } from 'node:crypto';
import { loadConfig } from './config.ts';
import { createIcgcReverseGeocoder } from './features/point-info/adapters/icgc-reverse-geocoder.ts';
import { createIcgcTerritory } from './features/point-info/adapters/icgc-territory.ts';
import { createSqliteReportStore } from './features/reports/adapters/sqlite-report-store.ts';
import { createIcgcAutocomplete } from './features/search/adapters/icgc-autocomplete.ts';
import { createJsonFileViewerStore } from './features/viewers/adapters/json-file-store.ts';
import { buildServer } from './http/server.ts';
import { openDatabase } from './shared/db.ts';

/** Per call to an ICGC service. No retries: the user retries by tapping or typing again. */
const UPSTREAM_TIMEOUT_MS = 4000;

const config = loadConfig();
const db = openDatabase(config.databasePath);

const app = buildServer({
  logger: true,
  viewers: {
    store: createJsonFileViewerStore(new URL('../data/viewers/', import.meta.url)),
  },
  pointInfo: {
    territory: createIcgcTerritory({
      baseUrl: config.icgcTerritoriUrl,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    }),
    geocoder: createIcgcReverseGeocoder({
      baseUrl: config.icgcGeocoderUrl,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    }),
  },
  search: {
    places: createIcgcAutocomplete({
      baseUrl: config.icgcGeocoderUrl,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    }),
  },
  reports: {
    store: createSqliteReportStore(db),
    clock: () => new Date(),
    randomIndex: (max) => randomInt(max),
  },
  adminToken: config.adminToken,
});

await app.listen({ host: '127.0.0.1', port: config.apiPort });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      db.close();
      process.exit(0);
    });
  });
}
