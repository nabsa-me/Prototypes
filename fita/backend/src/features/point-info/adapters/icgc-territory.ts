import { z } from 'zod';
import { getUpstreamJson } from '../../../shared/upstream.ts';
import type { TerritoryPort } from '../ports.ts';

const SERVICE = 'ICGC API Territorial';

// Only the fields this adapter reads are validated; the service may add others.
const ResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      properties: z.object({
        CODIMUNI: z.string().min(1),
        NOMMUNI: z.string().min(1),
        CODICOMAR: z.string().min(1),
        NOMCOMAR: z.string().min(1),
      }),
    }),
  ),
});

/**
 * `GET {baseUrl}/elements/municipis/{lon},{lat}?skipgeometry=true`. The municipality layer
 * already carries its county, so one request answers both.
 */
export function createIcgcTerritory(options: {
  baseUrl: string;
  timeoutMs: number;
}): TerritoryPort {
  return {
    async locate([lon, lat]) {
      const url = `${options.baseUrl}/elements/municipis/${lon.toFixed(8)},${lat.toFixed(8)}?skipgeometry=true`;
      const body = await getUpstreamJson(url, ResponseSchema, {
        service: SERVICE,
        timeoutMs: options.timeoutMs,
      });

      // A point exactly on a boundary can fall in two municipalities; the first is kept.
      const first = body.features[0];
      if (!first) return null;
      return {
        municipality: { code: first.properties.CODIMUNI, name: first.properties.NOMMUNI },
        county: { code: first.properties.CODICOMAR, name: first.properties.NOMCOMAR },
      };
    },
  };
}
