import type { ViewerConfig } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { initialState, parsePermalink, serializePermalink } from './permalink.ts';

const view = {
  center: [1.8377, 41.5933] as [number, number],
  zoom: 13.25,
  bearing: -20.5,
  pitch: 60,
};

describe('serializePermalink', () => {
  it('writes zoom/lat/lon/bearing/pitch and the layer', () => {
    expect(serializePermalink({ view, layer: 'orto' })).toBe(
      'map=13.25/41.5933/1.8377/-20.5/60&layer=orto',
    );
  });

  it('rounds to a useful precision and drops negative zero', () => {
    const noisy = {
      center: [1.123456789, 41.987654321] as [number, number],
      zoom: 7.123,
      bearing: -0,
      pitch: 0.04,
    };

    expect(serializePermalink({ view: noisy, layer: 'map' })).toBe(
      'map=7.12/41.98765/1.12346/0/0&layer=map',
    );
  });
});

describe('parsePermalink', () => {
  it('reads what serializePermalink writes', () => {
    expect(parsePermalink(`#${serializePermalink({ view, layer: 'orto' })}`)).toEqual({
      view,
      layer: 'orto',
    });
  });

  it('accepts a hash without layer', () => {
    expect(parsePermalink('#map=8/41.7/1.75/0/0')).toEqual({
      view: { center: [1.75, 41.7], zoom: 8, bearing: 0, pitch: 0 },
      layer: undefined,
    });
  });

  it.each([
    ['empty', ''],
    ['no map parameter', '#layer=orto'],
    ['too few parts', '#map=8/41.7/1.75'],
    ['too many parts', '#map=8/41.7/1.75/0/0/0'],
    ['a non-numeric part', '#map=8/41.7/abc/0/0'],
    ['an empty part', '#map=8//1.75/0/0'],
    ['a latitude out of range', '#map=8/95/1.75/0/0'],
    ['a pitch out of range', '#map=8/41.7/1.75/0/90'],
    ['a malformed layer', '#map=8/41.7/1.75/0/0&layer=../x'],
  ])('rejects %s as a whole', (_label, hash) => {
    expect(parsePermalink(hash)).toBeNull();
  });
});

describe('initialState', () => {
  const config = {
    initialView: { center: [1.75, 41.7], zoom: 7.6, bearing: 0, pitch: 0 },
    basemaps: [
      { id: 'map', label: 'Mapa', kind: 'style' },
      { id: 'orto', label: 'Ortofoto', kind: 'style' },
    ],
  } as unknown as ViewerConfig;

  it('uses the permalink when it is valid for this viewer', () => {
    expect(initialState(config, '#map=13.25/41.5933/1.8377/-20.5/60&layer=orto')).toEqual({
      view,
      basemapId: 'orto',
    });
  });

  it('keeps the first basemap when the permalink has no layer', () => {
    expect(initialState(config, '#map=13.25/41.5933/1.8377/-20.5/60').basemapId).toBe('map');
  });

  it('falls back to the configured view when the permalink names an unknown layer', () => {
    expect(initialState(config, '#map=13.25/41.5933/1.8377/-20.5/60&layer=satellite')).toEqual({
      view: config.initialView,
      basemapId: 'map',
    });
  });

  it('falls back to the configured view without a permalink', () => {
    expect(initialState(config, '')).toEqual({ view: config.initialView, basemapId: 'map' });
  });
});
