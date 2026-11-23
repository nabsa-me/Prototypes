import { PointInfoQuerySchema } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { sendInvalidRequest } from '../../../http/replies.ts';
import { getPointInfo } from '../application/get-point-info.ts';
import type { GeocoderPort, TerritoryPort } from '../ports.ts';

export function registerPointInfoRoutes(
  app: FastifyInstance,
  deps: { territory: TerritoryPort; geocoder: GeocoderPort },
) {
  app.get('/api/point-info', async (request, reply) => {
    const query = PointInfoQuerySchema.safeParse(request.query);
    if (!query.success) return sendInvalidRequest(reply, query.error);

    return getPointInfo(
      {
        ...deps,
        onSourceFailure: (source, error) =>
          request.log.warn({ err: error, source }, 'Point info source unavailable'),
      },
      [query.data.lon, query.data.lat],
    );
  });
}
