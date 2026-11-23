import { DatasetFeaturesQuerySchema, ViewerIdSchema } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendError, sendInvalidRequest } from '../../../http/replies.ts';
import { DatasetNotFoundError, getDatasetFeatures } from '../application/get-dataset-features.ts';
import { ViewerNotFoundError, getViewerConfig } from '../application/get-viewer-config.ts';
import type { DatasetStore, ViewerConfigStore } from '../ports.ts';

const ParamsSchema = z.strictObject({ id: ViewerIdSchema });

export interface ViewerRoutesDeps {
  store: ViewerConfigStore;
  datasets: DatasetStore;
}

export function registerViewerRoutes(app: FastifyInstance, deps: ViewerRoutesDeps) {
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

  app.get('/api/viewers/:id/features', async (request, reply) => {
    const params = ParamsSchema.safeParse(request.params);
    if (!params.success) return sendInvalidRequest(reply, params.error);
    const query = DatasetFeaturesQuerySchema.safeParse(request.query);
    if (!query.success) return sendInvalidRequest(reply, query.error);

    try {
      return await getDatasetFeatures(
        { configs: deps.store, datasets: deps.datasets },
        params.data.id,
        query.data.bbox,
      );
    } catch (error) {
      if (error instanceof ViewerNotFoundError) {
        return sendError(reply, 404, 'viewer_not_found', error.message);
      }
      if (error instanceof DatasetNotFoundError) {
        return sendError(reply, 404, 'dataset_not_found', error.message);
      }
      throw error;
    }
  });
}
