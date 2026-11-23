import { z } from 'zod';
import { getUpstreamJson } from '../../../shared/upstream.ts';
import type { GeocoderPort } from '../ports.ts';

const SERVICE = 'ICGC Geocodificador (invers)';

// Only the fields this adapter reads are validated; the service may add others.
const ResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      properties: z.object({
        etiqueta: z.string().min(1),
        distancia: z.number().min(0),
      }),
    }),
  ),
});

/** `GET {baseUrl}/invers?lon=&lat=&layers=address&size=1`: the nearest postal address. */
export function createIcgcReverseGeocoder(options: {
  baseUrl: string;
  timeoutMs: number;
}): GeocoderPort {
  return {
    async reverse([lon, lat]) {
      const url = new URL(`${options.baseUrl}/invers`);
      url.searchParams.set('lon', lon.toFixed(8));
      url.searchParams.set('lat', lat.toFixed(8));
      url.searchParams.set('layers', 'address');
      url.searchParams.set('size', '1');

      const body = await getUpstreamJson(url.href, ResponseSchema, {
        service: SERVICE,
        timeoutMs: options.timeoutMs,
      });

      const first = body.features[0];
      if (!first) return null;
      return { label: first.properties.etiqueta, distanceKm: first.properties.distancia };
    },
  };
}
