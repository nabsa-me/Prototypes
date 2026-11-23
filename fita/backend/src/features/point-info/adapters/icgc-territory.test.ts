import { afterEach, describe, expect, it } from 'vitest';
import { fixture, startFakeUpstream, type FakeUpstream } from '../../../shared/fake-upstream.ts';
import { UpstreamContractError, UpstreamRequestError } from '../../../shared/upstream.ts';
import { createIcgcTerritory } from './icgc-territory.ts';

// Recorded from https://api.icgc.cat/territorial/elements/municipis/{lon},{lat}?skipgeometry=true
const fixtures = new URL('./fixtures/', import.meta.url);

describe('createIcgcTerritory', () => {
  let upstream: FakeUpstream;

  afterEach(async () => {
    await upstream.close();
  });

  async function territoryAnswering(status: number, file: string) {
    upstream = await startFakeUpstream(() => ({ status, body: fixture(fixtures, file) }));
    return createIcgcTerritory({ baseUrl: `${upstream.baseUrl}/territorial`, timeoutMs: 1000 });
  }

  it('asks for the municipality layer without geometry and maps it', async () => {
    const territory = await territoryAnswering(200, 'territorial-monistrol.json');

    const result = await territory.locate([1.8377, 41.5933]);

    expect(upstream.requests).toEqual([
      '/territorial/elements/municipis/1.83770000,41.59330000?skipgeometry=true',
    ]);
    expect(result).toEqual({
      municipality: { code: '081271', name: 'Monistrol de Montserrat' },
      county: { code: '07', name: 'Bages' },
    });
  });

  it('answers null outside Catalonia', async () => {
    const territory = await territoryAnswering(200, 'territorial-outside-catalonia.json');

    await expect(territory.locate([2.3522, 48.8566])).resolves.toBeNull();
  });

  it('treats the recorded 400 for invalid coordinates as a rejected request', async () => {
    const territory = await territoryAnswering(400, 'territorial-invalid-coordinates.json');

    await expect(territory.locate([1.8, 41.5])).rejects.toBeInstanceOf(UpstreamRequestError);
  });

  it('rejects a feature without the fields it reads', async () => {
    upstream = await startFakeUpstream(() => ({
      status: 200,
      body: '{"type":"FeatureCollection","features":[{"properties":{"NOMMUNI":"X"}}]}',
    }));
    const territory = createIcgcTerritory({ baseUrl: upstream.baseUrl, timeoutMs: 1000 });

    await expect(territory.locate([1.8, 41.5])).rejects.toBeInstanceOf(UpstreamContractError);
  });
});
