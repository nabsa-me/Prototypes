import Fastify, { type FastifyInstance } from 'fastify';
import { registerViewerRoutes } from '../features/viewers/adapters/http-routes.ts';
import type { ViewerConfigStore } from '../features/viewers/ports.ts';
import { sendError } from './replies.ts';

export interface ServerDeps {
  logger: boolean;
  viewers: { store: ViewerConfigStore };
}

/** Builds the HTTP app without listening, so tests can drive it with `inject`. */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger });

  app.get('/api/health', async () => ({ status: 'ok' }));
  registerViewerRoutes(app, deps.viewers);

  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, 'not_found', `No route for ${request.method} ${request.url}`),
  );

  app.setErrorHandler((error, request, reply) => {
    // Errors Fastify raises itself for malformed requests (bad JSON, oversized body...).
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return sendError(reply, status, 'invalid_request', (error as Error).message);
    }
    request.log.error({ err: error }, 'Unhandled error');
    return sendError(reply, 500, 'internal_error', 'Internal server error');
  });

  return app;
}
