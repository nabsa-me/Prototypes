import { afterEach, describe, expect, it } from 'vitest';
import { fixture, startFakeUpstream, type FakeUpstream } from '../../../shared/fake-upstream.ts';
import { UpstreamUnavailableError } from '../../../shared/upstream.ts';
import { createIcgcReverseGeocoder } from './icgc-reverse-geocoder.ts';

// Recorded from https://eines.icgc.cat/geocodificador/invers?lon=&lat=&layers=address&size=1
const fixtures = new URL('./fixtures/', import.meta.url);

describe('createIcgcReverseGeocoder', () => {
  let upstream: FakeUpstream;

  afterEach(async () => {
    await upstream.close();
  });

  async function geocoderAnswering(status: number, body: string) {
    upstream = await startFakeUpstream(() => ({ status, body }));
    return createIcgcReverseGeocoder({
      baseUrl: `${upstream.baseUrl}/geocodificador`,
      timeoutMs: 1000,
    });
  }

  it('asks for the nearest address and maps its label and distance', async () => {
    const geocoder = await geocoderAnswering(200, fixture(fixtures, 'invers-barcelona.json'));

    const result = await geocoder.reverse([2.16687, 41.385965]);

    expect(upstream.requests).toEqual([
      '/geocodificador/invers?lon=2.16687000&lat=41.38596500&layers=address&size=1',
    ]);
    expect(result).toEqual({ label: 'Carrer de Balmes 1, Barcelona', distanceKm: 0 });
  });

  it('answers null when there is no address nearby', async () => {
    const geocoder = await geocoderAnswering(200, fixture(fixtures, 'invers-no-address.json'));

    await expect(geocoder.reverse([1.8377, 41.5933])).resolves.toBeNull();
  });

  it('reports a server error as unavailable', async () => {
    const geocoder = await geocoderAnswering(502, '{}');

    await expect(geocoder.reverse([1.8377, 41.5933])).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
