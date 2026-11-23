import Fastify, { type FastifyInstance } from 'fastify';
import { registerPointInfoRoutes } from '../features/point-info/adapters/http-routes.ts';
import type { GeocoderPort, TerritoryPort } from '../features/point-info/ports.ts';
import { registerAdminReportRoutes } from '../features/reports/adapters/admin-http-routes.ts';
import {
  registerReportRoutes,
  type ReportRoutesDeps,
} from '../features/reports/adapters/http-routes.ts';
import { registerSearchRoutes } from '../features/search/adapters/http-routes.ts';
import type { PlaceSearchPort } from '../features/search/ports.ts';
import { registerViewerRoutes } from '../features/viewers/adapters/http-routes.ts';
import type { ViewerConfigStore } from '../features/viewers/ports.ts';
import { UpstreamContractError, UpstreamUnavailableError } from '../shared/upstream.ts';
import { sendError } from './replies.ts';

export interface ServerDeps {
  logger: boolean;
  viewers: { store: ViewerConfigStore };
  pointInfo: { territory: TerritoryPort; geocoder: GeocoderPort };
  search: { places: PlaceSearchPort };
  reports: ReportRoutesDeps;
  /** Shared secret for /api/admin routes. */
  adminToken: string;
}

/** Builds the HTTP app without listening, so tests can drive it with `inject`. */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger });

  app.get('/api/health', async () => ({ status: 'ok' }));
  registerViewerRoutes(app, deps.viewers);
  registerPointInfoRoutes(app, deps.pointInfo);
  registerSearchRoutes(app, deps.search);
  registerReportRoutes(app, deps.reports);
  registerAdminReportRoutes(app, { ...deps.reports, adminToken: deps.adminToken });

  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, 'not_found', `No route for ${request.method} ${request.url}`),
  );

  app.setErrorHandler((error, request, reply) => {
    // Errors Fastify raises itself for malformed requests (bad JSON, oversized body...).
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return sendError(reply, status, 'invalid_request', (error as Error).message);
    }
    // Third-party failures: whose fault (theirs) and whether retrying helps decide the code.
    if (error instanceof UpstreamUnavailableError) {
      request.log.warn({ err: error }, 'Upstream unavailable');
      return sendError(reply, 503, 'upstream_unavailable', 'An external service is not responding');
    }
    if (error instanceof UpstreamContractError) {
      request.log.error({ err: error }, 'Upstream broke its contract');
      return sendError(
        reply,
        502,
        'upstream_bad_response',
        'An external service answered incorrectly',
      );
    }
    request.log.error({ err: error }, 'Unhandled error');
    return sendError(reply, 500, 'internal_error', 'Internal server error');
  });

  return app;
}
