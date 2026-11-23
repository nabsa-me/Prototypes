import type { Address, Territory } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import {
  UpstreamContractError,
  UpstreamRequestError,
  UpstreamUnavailableError,
} from '../../../shared/upstream.ts';
import { getPointInfo, type PointInfoDeps } from './get-point-info.ts';

const territory: Territory = {
  municipality: { code: '081271', name: 'Monistrol de Montserrat' },
  county: { code: '07', name: 'Bages' },
};
const address: Address = { label: 'Carrer de Balmes 1, Barcelona', distanceKm: 0 };
const point = [1.8377, 41.5933] as const;

function deps(overrides: Partial<PointInfoDeps> = {}) {
  const failures: string[] = [];
  const all: PointInfoDeps = {
    territory: { locate: async () => territory },
    geocoder: { reverse: async () => address },
    onSourceFailure: (source) => failures.push(source),
    ...overrides,
  };
  return { deps: all, failures };
}

describe('getPointInfo', () => {
  it('aggregates territory, address and both coordinate systems', async () => {
    const { deps: d } = deps();

    await expect(getPointInfo(d, point)).resolves.toEqual({
      position: { wgs84: [1.8377, 41.5933], utm31n: [403129.78, 4605274.7] },
      territory: { status: 'ok', data: territory },
      address: { status: 'ok', data: address },
    });
  });

  it('keeps empty answers apart from failures', async () => {
    const { deps: d } = deps({
      territory: { locate: async () => null },
      geocoder: { reverse: async () => null },
    });

    const info = await getPointInfo(d, point);

    expect([info.territory, info.address]).toEqual([
      { status: 'ok', data: null },
      { status: 'ok', data: null },
    ]);
  });

  it('degrades a source that is unavailable and keeps the other one', async () => {
    const { deps: d, failures } = deps({
      territory: {
        locate: async () => {
          throw new UpstreamUnavailableError('API Territorial', 'timed out');
        },
      },
    });

    const info = await getPointInfo(d, point);

    expect(info.territory).toEqual({ status: 'unavailable' });
    expect(info.address).toEqual({ status: 'ok', data: address });
    expect(failures).toEqual(['territory']);
  });

  it('degrades a source that answers outside its contract', async () => {
    const { deps: d, failures } = deps({
      geocoder: {
        reverse: async () => {
          throw new UpstreamContractError('Geocodificador', 'bad body');
        },
      },
    });

    const info = await getPointInfo(d, point);

    expect(info.address).toEqual({ status: 'unavailable' });
    expect(failures).toEqual(['address']);
  });

  it.each([
    ['a request the provider rejected', new UpstreamRequestError('API Territorial', 400)],
    ['a programming error', new TypeError('undefined is not a function')],
  ])('propagates %s instead of hiding it', async (_label, error) => {
    const { deps: d } = deps({
      territory: {
        locate: async () => {
          throw error;
        },
      },
    });

    await expect(getPointInfo(d, point)).rejects.toBe(error);
  });
});
