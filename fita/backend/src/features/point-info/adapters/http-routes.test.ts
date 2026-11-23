import { describe, expect, it } from 'vitest';
import { buildTestServer } from '../../../http/test-server.ts';
import { UpstreamUnavailableError } from '../../../shared/upstream.ts';
import type { GeocoderPort, TerritoryPort } from '../ports.ts';

function serverWith(ports: { territory: TerritoryPort; geocoder: GeocoderPort }) {
  return buildTestServer({ pointInfo: ports });
}

const working = {
  territory: {
    locate: async () => ({
      municipality: { code: '081271', name: 'Monistrol de Montserrat' },
      county: { code: '07', name: 'Bages' },
    }),
  },
  geocoder: { reverse: async () => null },
};

describe('GET /api/point-info', () => {
  it('answers the aggregated point information', async () => {
    const response = await serverWith(working).inject({
      method: 'GET',
      url: '/api/point-info?lon=1.8377&lat=41.5933',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      position: { wgs84: [1.8377, 41.5933], utm31n: [403129.78, 4605274.7] },
      territory: {
        status: 'ok',
        data: {
          municipality: { code: '081271', name: 'Monistrol de Montserrat' },
          county: { code: '07', name: 'Bages' },
        },
      },
      address: { status: 'ok', data: null },
    });
  });

  it('answers 200 with the failed source marked when one source is down', async () => {
    const response = await serverWith({
      ...working,
      geocoder: {
        reverse: async () => {
          throw new UpstreamUnavailableError('Geocodificador', 'timed out');
        },
      },
    }).inject({ method: 'GET', url: '/api/point-info?lon=1.8377&lat=41.5933' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      territory: { status: 'ok' },
      address: { status: 'unavailable' },
    });
  });

  it.each(['', '?lon=1.8', '?lon=1.8&lat=95', '?lon=abc&lat=41.5', '?lon=&lat=41.5'])(
    'answers 400 for the query %j',
    async (query) => {
      const response = await serverWith(working).inject({
        method: 'GET',
        url: `/api/point-info${query}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: 'invalid_request' } });
    },
  );
});
