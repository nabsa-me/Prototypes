import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.ts';

const root = resolve('/repo');

const valid = {
  API_PORT: '4791',
  ICGC_TERRITORI_URL: 'https://api.icgc.cat/territorial',
  ICGC_GEOCODER_URL: 'https://eines.icgc.cat/geocodificador',
  DATABASE_PATH: 'backend/data/fita.sqlite',
  ADMIN_TOKEN: 'local-admin-token',
};

describe('parseConfig', () => {
  it('reads the configuration from the environment', () => {
    expect(parseConfig(valid, root)).toEqual({
      apiPort: 4791,
      icgcTerritoriUrl: 'https://api.icgc.cat/territorial',
      icgcGeocoderUrl: 'https://eines.icgc.cat/geocodificador',
      databasePath: resolve(root, 'backend/data/fita.sqlite'),
      adminToken: 'local-admin-token',
    });
  });

  it('keeps an absolute database path as it is', () => {
    const absolute = resolve('/var/fita/reports.sqlite');

    expect(parseConfig({ ...valid, DATABASE_PATH: absolute }, root).databasePath).toBe(absolute);
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
    expect(() => parseConfig({ ...valid, API_PORT: value }, root)).toThrow(/API_PORT/);
  });

  it.each([
    ['missing', undefined],
    ['plain http', 'http://api.icgc.cat/territorial'],
    ['ending with a slash', 'https://api.icgc.cat/territorial/'],
    ['not a URL', 'api.icgc.cat'],
  ])('rejects a service URL that is %s', (_label, value) => {
    expect(() => parseConfig({ ...valid, ICGC_TERRITORI_URL: value }, root)).toThrow(
      /ICGC_TERRITORI_URL/,
    );
  });

  it.each([
    ['missing', undefined],
    ['not a .sqlite file', 'backend/data/fita.db'],
    ['a name that only contains sqlite', 'backend/data/fitaXsqlite'],
  ])('rejects a database path that is %s', (_label, value) => {
    expect(() => parseConfig({ ...valid, DATABASE_PATH: value }, root)).toThrow(/DATABASE_PATH/);
  });

  it.each([
    ['missing', undefined],
    ['shorter than 16 characters', 'short-token'],
  ])('rejects an admin token that is %s', (_label, value) => {
    expect(() => parseConfig({ ...valid, ADMIN_TOKEN: value }, root)).toThrow(/ADMIN_TOKEN/);
  });
});
