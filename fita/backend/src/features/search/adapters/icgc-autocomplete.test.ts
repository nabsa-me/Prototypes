import { afterEach, describe, expect, it } from 'vitest';
import { fixture, startFakeUpstream, type FakeUpstream } from '../../../shared/fake-upstream.ts';
import { UpstreamContractError } from '../../../shared/upstream.ts';
import { createIcgcAutocomplete } from './icgc-autocomplete.ts';

// Recorded from https://eines.icgc.cat/geocodificador/autocompletar?text=&size=3
const fixtures = new URL('./fixtures/', import.meta.url);

describe('createIcgcAutocomplete', () => {
  let upstream: FakeUpstream;

  afterEach(async () => {
    await upstream.close();
  });

  async function searchAnswering(body: string) {
    upstream = await startFakeUpstream(() => ({ status: 200, body }));
    return createIcgcAutocomplete({
      baseUrl: `${upstream.baseUrl}/geocodificador`,
      timeoutMs: 1000,
    });
  }

  it('sends the text as typed and maps every documented layer', async () => {
    const search = await searchAnswering(fixture(fixtures, 'autocompletar-pk.json'));

    const results = await search.autocomplete('c-25 143');

    expect(upstream.requests).toEqual(['/geocodificador/autocompletar?text=c-25+143&size=2']);
    expect(results.map((r) => r.kind)).toEqual([
      'address',
      'address',
      'address',
      'place',
      'place',
      'place',
      'kilometre-point',
      'kilometre-point',
      'kilometre-point',
    ]);
    expect(results[6]).toEqual({
      label: 'C-25 143.0',
      kind: 'kilometre-point',
      position: [1.90750462, 41.78388114],
    });
  });

  it('maps populated places and other toponyms to places', async () => {
    const search = await searchAnswering(fixture(fixtures, 'autocompletar-montserrat.json'));

    const results = await search.autocomplete('montserrat');

    expect(results.filter((r) => r.kind === 'place').map((r) => r.label)).toContain(
      'Montserrat, Collbató, el Bruc',
    );
  });

  it('answers an empty list when nothing matches', async () => {
    const search = await searchAnswering(fixture(fixtures, 'autocompletar-no-results.json'));

    await expect(search.autocomplete('qzxqzxqzx')).resolves.toEqual([]);
  });

  it('rejects an undocumented layer instead of guessing its kind', async () => {
    const search = await searchAnswering(
      '{"type":"FeatureCollection","features":[{"geometry":{"type":"Point","coordinates":[1,41]},"properties":{"etiqueta":"X","layer":"parcel"}}]}',
    );

    await expect(search.autocomplete('xyz')).rejects.toBeInstanceOf(UpstreamContractError);
  });
});
