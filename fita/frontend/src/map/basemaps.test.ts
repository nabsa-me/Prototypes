import type { Basemap } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { firstSymbolLayerId, isBasemapId, rasterLayerId, rasterVisibility } from './basemaps.ts';

const raster = (id: string): Basemap => ({
  id,
  label: id,
  kind: 'raster',
  tiles: ['https://example.test/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 20,
  attribution: 'x',
});

const basemaps: Basemap[] = [
  { id: 'map', label: 'Mapa', kind: 'style' },
  raster('ortho'),
  raster('old'),
];

describe('rasterVisibility', () => {
  it('shows only the selected raster', () => {
    expect(rasterVisibility(basemaps, 'ortho')).toEqual([
      { layerId: rasterLayerId('ortho'), visible: true },
      { layerId: rasterLayerId('old'), visible: false },
    ]);
  });

  it('hides every raster when the style basemap is selected', () => {
    expect(rasterVisibility(basemaps, 'map').every((layer) => !layer.visible)).toBe(true);
  });
});

describe('isBasemapId', () => {
  it('recognises configured ids only', () => {
    expect([isBasemapId(basemaps, 'ortho'), isBasemapId(basemaps, 'satellite')]).toEqual([
      true,
      false,
    ]);
  });
});

describe('firstSymbolLayerId', () => {
  it('finds the first label layer in drawing order', () => {
    const layers = [
      { id: 'background', type: 'background' },
      { id: 'roads', type: 'line' },
      { id: 'road-labels', type: 'symbol' },
      { id: 'place-labels', type: 'symbol' },
    ];

    expect(firstSymbolLayerId(layers)).toBe('road-labels');
  });

  it('returns undefined for a style without labels', () => {
    expect(firstSymbolLayerId([{ id: 'background', type: 'background' }])).toBeUndefined();
  });
});
