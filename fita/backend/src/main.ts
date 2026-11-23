import { loadConfig } from './config.ts';
import { createJsonFileViewerStore } from './features/viewers/adapters/json-file-store.ts';
import { buildServer } from './http/server.ts';

const config = loadConfig();

const app = buildServer({
  logger: true,
  viewers: {
    store: createJsonFileViewerStore(new URL('../data/viewers/', import.meta.url)),
  },
});

await app.listen({ host: '127.0.0.1', port: config.apiPort });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
