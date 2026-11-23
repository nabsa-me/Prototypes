import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.ts';

const valid = {
  API_PORT: '4791',
  ICGC_TERRITORI_URL: 'https://api.icgc.cat/territorial',
  ICGC_GEOCODER_URL: 'https://eines.icgc.cat/geocodificador',
};

describe('parseConfig', () => {
  it('reads the configuration from the environment', () => {
    expect(parseConfig(valid)).toEqual({
      apiPort: 4791,
      icgcTerritoriUrl: 'https://api.icgc.cat/territorial',
      icgcGeocoderUrl: 'https://eines.icgc.cat/geocodificador',
    });
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a number', 'abc'],
    ['decimal', '4791.5'],
    ['padded', ' 4791'],
    ['zero', '0'],
    ['above the TCP range', '65536'],
  ])('rejects an API port that is %s', (_label, value) => {
    expect(() => parseConfig({ ...valid, API_PORT: value })).toThrow(/API_PORT/);
  });

  it.each([
    ['missing', undefined],
    ['plain http', 'http://api.icgc.cat/territorial'],
    ['ending with a slash', 'https://api.icgc.cat/territorial/'],
    ['not a URL', 'api.icgc.cat'],
  ])('rejects a service URL that is %s', (_label, value) => {
    expect(() => parseConfig({ ...valid, ICGC_TERRITORI_URL: value })).toThrow(
      /ICGC_TERRITORI_URL/,
    );
  });
});
