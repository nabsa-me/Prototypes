import { loadConfig } from './config.ts';
import { buildServer } from './http/server.ts';

const config = loadConfig();
const app = buildServer({ logger: true });

await app.listen({ host: '127.0.0.1', port: config.apiPort });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
