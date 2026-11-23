import { describe, expect, it } from 'vitest';
import { ViewerConfigSchema, ViewerIdSchema } from './viewer-config.ts';

const valid = {
  id: 'public',
  title: 'Visor',
  initialView: { center: [1.75, 41.7], zoom: 7.5, bearing: 0, pitch: 0 },
  style: 'https://example.test/style.json',
  basemaps: [
    { id: 'map', label: 'Mapa', kind: 'style' },
    {
      id: 'ortho',
      label: 'Ortofoto',
      kind: 'raster',
      tiles: ['https://example.test/ortho/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 20,
      attribution: 'Ortho',
    },
  ],
  terrain: {
    tiles: ['https://example.test/dem/{z}/{x}/{y}.png'],
    tileSize: 512,
    minzoom: 7,
    maxzoom: 14,
    encoding: 'mapbox',
    bounds: [0, 40.5, 4.2, 42.86],
    attribution: 'DEM',
  },
};

describe('ViewerConfigSchema', () => {
  it('accepts a complete configuration', () => {
    expect(ViewerConfigSchema.parse(valid)).toEqual(valid);
  });

  it('accepts branding and a dataset in either supported CRS', () => {
    for (const crs of ['EPSG:25831', 'EPSG:4326']) {
      const config = {
        ...valid,
        branding: { primaryColor: '#b4462b', brandText: 'Client' },
        dataset: { file: 'route-points.geojson', crs },
      };
      expect(ViewerConfigSchema.safeParse(config).success).toBe(true);
    }
  });

  it.each([
    ['an unsupported CRS', { dataset: { file: 'a.geojson', crs: 'EPSG:3857' } }],
    ['a dataset path with folders', { dataset: { file: '../a.geojson', crs: 'EPSG:4326' } }],
    ['a dataset that is not .geojson', { dataset: { file: 'a.json', crs: 'EPSG:4326' } }],
    ['a colour name', { branding: { primaryColor: 'red', brandText: 'Client' } }],
  ])('rejects %s', (_label, extra) => {
    expect(ViewerConfigSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
  });

  it('accepts a configuration without terrain', () => {
    const { terrain: _terrain, ...withoutTerrain } = valid;
    expect(ViewerConfigSchema.safeParse(withoutTerrain).success).toBe(true);
  });

  it.each([
    ['an unknown key', { ...valid, extra: true }],
    ['an http style', { ...valid, style: 'http://example.test/style.json' }],
    ['no basemaps', { ...valid, basemaps: [] }],
    ['duplicate basemap ids', { ...valid, basemaps: [valid.basemaps[0], valid.basemaps[0]] }],
    [
      'a tile URL without placeholders',
      { ...valid, terrain: { ...valid.terrain, tiles: ['https://example.test/dem.png'] } },
    ],
    ['inverted bounds', { ...valid, terrain: { ...valid.terrain, bounds: [4.2, 40.5, 0, 42.86] } }],
    ['minzoom above maxzoom', { ...valid, terrain: { ...valid.terrain, minzoom: 15 } }],
    [
      'a longitude out of range',
      { ...valid, initialView: { ...valid.initialView, center: [181, 41] } },
    ],
  ])('rejects %s', (_label, config) => {
    expect(ViewerConfigSchema.safeParse(config).success).toBe(false);
  });
});

describe('ViewerIdSchema', () => {
  it.each(['public', 'ruta-miradors', 'v2'])('accepts %s', (id) => {
    expect(ViewerIdSchema.safeParse(id).success).toBe(true);
  });

  it.each(['', '../secret', 'Public', 'a.json', 'a/b', '-a', 'a--b'])('rejects %j', (id) => {
    expect(ViewerIdSchema.safeParse(id).success).toBe(false);
  });
});
