import { createHash, randomInt } from 'node:crypto';
import { loadConfig } from './config.ts';
import { createIcgcReverseGeocoder } from './features/point-info/adapters/icgc-reverse-geocoder.ts';
import { createIcgcTerritory } from './features/point-info/adapters/icgc-territory.ts';
import { createSqliteReportStore } from './features/reports/adapters/sqlite-report-store.ts';
import { createIcgcAutocomplete } from './features/search/adapters/icgc-autocomplete.ts';
import {
  createDatasetFiles,
  createJsonFileViewerStore,
} from './features/viewers/adapters/json-file-store.ts';
import { createSqliteDatasetStore } from './features/viewers/adapters/sqlite-dataset-store.ts';
import { importDatasets } from './features/viewers/application/import-datasets.ts';
import { buildServer } from './http/server.ts';
import { openDatabase } from './shared/db.ts';

/** Per call to an ICGC service. No retries: the user retries by tapping or typing again. */
const UPSTREAM_TIMEOUT_MS = 4000;

const config = loadConfig();
const db = openDatabase(config.databasePath);

const viewersDirectory = new URL('../data/viewers/', import.meta.url);
const viewerConfigs = createJsonFileViewerStore(viewersDirectory);
const datasets = createSqliteDatasetStore(db);

// Client datasets are imported before serving. An invalid one stops the start-up: the
// files ship with the code, so a broken file is a defect to fix, not data to hide.
const imports = await importDatasets({
  configs: viewerConfigs,
  files: createDatasetFiles(viewersDirectory),
  store: datasets,
  clock: () => new Date(),
  digest: (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
});

const app = buildServer({
  logger: true,
  viewers: { store: viewerConfigs, datasets },
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

for (const { viewerId, outcome } of imports) {
  app.log.info({ viewerId, outcome }, 'Dataset import');
}

await app.listen({ host: '127.0.0.1', port: config.apiPort });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => {
      db.close();
      process.exit(0);
    });
  });
}
