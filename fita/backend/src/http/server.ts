import Fastify, { type FastifyInstance } from 'fastify';

export interface ServerDeps {
  logger: boolean;
}

/** Builds the HTTP app without listening, so tests can drive it with `inject`. */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger });

  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
