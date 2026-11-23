import type { PointInfo } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { pointInfoRows } from './point-info-rows.ts';

const base: PointInfo = {
  position: { wgs84: [1.8377, 41.5933], utm31n: [403129.78, 4605274.7] },
  territory: {
    status: 'ok',
    data: {
      municipality: { code: '081271', name: 'Monistrol de Montserrat' },
      county: { code: '07', name: 'Bages' },
    },
  },
  address: { status: 'ok', data: { label: 'Carrer de Balmes 1, Barcelona', distanceKm: 0.137 } },
};

const valueOf = (rows: ReturnType<typeof pointInfoRows>, term: string) =>
  rows.find((row) => row.term === term);

describe('pointInfoRows', () => {
  it('lists every field of a complete answer', () => {
    expect(pointInfoRows(base, 717)).toEqual([
      { term: 'Municipi', value: 'Monistrol de Montserrat' },
      { term: 'Comarca', value: 'Bages' },
      { term: 'Adreça més propera', value: 'Carrer de Balmes 1, Barcelona (a 137 m)' },
      { term: 'Altitud aproximada', value: '717 m' },
      { term: 'ETRS89 UTM 31N', value: 'X 403130 m · Y 4605275 m' },
      { term: 'WGS84 (lat, lon)', value: '41.593300, 1.837700' },
    ]);
  });

  it('omits the distance of an address at the point itself', () => {
    const info: PointInfo = {
      ...base,
      address: { status: 'ok', data: { label: 'Carrer de Balmes 1, Barcelona', distanceKm: 0 } },
    };

    expect(valueOf(pointInfoRows(info, 0), 'Adreça més propera')?.value).toBe(
      'Carrer de Balmes 1, Barcelona',
    );
  });

  it('says which ICGC service failed', () => {
    const info: PointInfo = {
      ...base,
      territory: { status: 'unavailable' },
      address: { status: 'unavailable' },
    };
    const rows = pointInfoRows(info, 717);

    expect(valueOf(rows, 'Municipi')).toMatchObject({
      value: expect.stringContaining('API Territorial'),
      muted: true,
    });
    expect(valueOf(rows, 'Adreça més propera')).toMatchObject({
      value: expect.stringContaining('Geocodificador'),
      muted: true,
    });
  });

  it('shows that the altitude is still loading', () => {
    expect(valueOf(pointInfoRows(base, 'pending'), 'Altitud aproximada')).toMatchObject({
      value: 'Carregant el relleu…',
      muted: true,
    });
  });

  it('tells empty answers apart from failures', () => {
    const info: PointInfo = {
      ...base,
      territory: { status: 'ok', data: null },
      address: { status: 'ok', data: null },
    };
    const rows = pointInfoRows(info, null);

    expect(valueOf(rows, 'Comarca')).toEqual({
      term: 'Comarca',
      value: 'Fora de Catalunya',
      muted: true,
    });
    expect(valueOf(rows, 'Adreça més propera')?.value).toBe('Cap adreça a prop');
    expect(valueOf(rows, 'Altitud aproximada')?.value).toBe("Fora del model d'elevacions");
  });
});
