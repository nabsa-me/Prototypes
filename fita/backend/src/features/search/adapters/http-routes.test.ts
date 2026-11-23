import type { SearchResult } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { buildTestServer } from '../../../http/test-server.ts';
import {
  UpstreamContractError,
  UpstreamRequestError,
  UpstreamUnavailableError,
} from '../../../shared/upstream.ts';
import type { PlaceSearchPort } from '../ports.ts';

const result: SearchResult = {
  label: 'Montserrat, Collbató, el Bruc',
  kind: 'place',
  position: [1.84, 41.58],
};

function serverWith(places: PlaceSearchPort) {
  return buildTestServer({ search: { places } });
}

describe('GET /api/search', () => {
  it('answers the matching places', async () => {
    const texts: string[] = [];
    const app = serverWith({
      autocomplete: async (text) => {
        texts.push(text);
        return [result];
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/search?text=montserrat' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ results: [result] });
    expect(texts).toEqual(['montserrat']);
  });

  it.each(['', '?text=mo', '?text=%20%20mo%20'])(
    'answers 400 for %j without calling the geocoder',
    async (query) => {
      let called = false;
      const app = serverWith({
        autocomplete: async () => {
          called = true;
          return [];
        },
      });

      const response = await app.inject({ method: 'GET', url: `/api/search${query}` });

      expect(response.statusCode).toBe(400);
      expect(called).toBe(false);
    },
  );

  it.each([
    [
      '503 when the geocoder is unavailable',
      new UpstreamUnavailableError('G', 'timed out'),
      503,
      'upstream_unavailable',
    ],
    [
      '502 when the geocoder answers outside its contract',
      new UpstreamContractError('G', 'bad'),
      502,
      'upstream_bad_response',
    ],
    [
      '500 when the geocoder rejects our request',
      new UpstreamRequestError('G', 400),
      500,
      'internal_error',
    ],
  ])('answers %s', async (_label, error, status, code) => {
    const app = serverWith({
      autocomplete: async () => {
        throw error;
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/search?text=montserrat' });

    expect(response.statusCode).toBe(status);
    expect(response.json()).toMatchObject({ error: { code } });
  });
});
