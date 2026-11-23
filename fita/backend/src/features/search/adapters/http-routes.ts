import { SearchQuerySchema, type SearchResponse } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { sendInvalidRequest } from '../../../http/replies.ts';
import type { PlaceSearchPort } from '../ports.ts';

/**
 * No use case sits between the route and the port: search has no rule of its own beyond
 * the minimum length, which the query schema enforces at the boundary.
 */
export function registerSearchRoutes(app: FastifyInstance, deps: { places: PlaceSearchPort }) {
  app.get('/api/search', async (request, reply) => {
    const query = SearchQuerySchema.safeParse(request.query);
    if (!query.success) return sendInvalidRequest(reply, query.error);

    const response: SearchResponse = { results: await deps.places.autocomplete(query.data.text) };
    return response;
  });
}
