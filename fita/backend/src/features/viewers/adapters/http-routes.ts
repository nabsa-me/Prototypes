import { ViewerIdSchema } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendError, sendInvalidRequest } from '../../../http/replies.ts';
import { ViewerNotFoundError, getViewerConfig } from '../application/get-viewer-config.ts';
import type { ViewerConfigStore } from '../ports.ts';

const ParamsSchema = z.strictObject({ id: ViewerIdSchema });

export function registerViewerRoutes(app: FastifyInstance, deps: { store: ViewerConfigStore }) {
  app.get('/api/viewers/:id', async (request, reply) => {
    const params = ParamsSchema.safeParse(request.params);
    if (!params.success) return sendInvalidRequest(reply, params.error);

    try {
      return await getViewerConfig(deps, params.data.id);
    } catch (error) {
      if (error instanceof ViewerNotFoundError) {
        return sendError(reply, 404, 'viewer_not_found', error.message);
      }
      throw error;
    }
  });
}
