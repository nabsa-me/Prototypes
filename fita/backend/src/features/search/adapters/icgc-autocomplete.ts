import { LonLatSchema, type PlaceKind } from '@fita/contracts';
import { z } from 'zod';
import { getUpstreamJson } from '../../../shared/upstream.ts';
import type { PlaceSearchPort } from '../ports.ts';

const SERVICE = 'ICGC Geocodificador (autocompletar)';

/** Results per element type; the geocoder has four types, so at most 8 results. */
const RESULTS_PER_TYPE = 2;

// The documented layers. Any other value breaks the contract and is rejected, not guessed.
const LAYER_KIND = {
  address: 'address',
  topo1: 'place',
  topo2: 'place',
  pk: 'kilometre-point',
} as const satisfies Record<string, PlaceKind>;

const ResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      geometry: z.object({ type: z.literal('Point'), coordinates: LonLatSchema }),
      properties: z.object({
        etiqueta: z.string().min(1),
        layer: z.enum(['address', 'topo1', 'topo2', 'pk']),
      }),
    }),
  ),
});

/** `GET {baseUrl}/autocompletar?text=&size=2`. */
export function createIcgcAutocomplete(options: {
  baseUrl: string;
  timeoutMs: number;
}): PlaceSearchPort {
  return {
    async autocomplete(text) {
      const url = new URL(`${options.baseUrl}/autocompletar`);
      url.searchParams.set('text', text);
      url.searchParams.set('size', String(RESULTS_PER_TYPE));

      const body = await getUpstreamJson(url.href, ResponseSchema, {
        service: SERVICE,
        timeoutMs: options.timeoutMs,
      });

      return body.features.map((feature) => ({
        label: feature.properties.etiqueta,
        kind: LAYER_KIND[feature.properties.layer],
        position: feature.geometry.coordinates,
      }));
    },
  };
}
