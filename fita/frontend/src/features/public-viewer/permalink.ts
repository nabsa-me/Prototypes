import {
  DecimalTextSchema,
  InitialViewSchema,
  ViewerIdSchema,
  type InitialView,
  type ViewerConfig,
} from '@fita/contracts';
import { isBasemapId } from '../../map/basemaps.ts';

export interface Permalink {
  view: InitialView;
  layer: string | undefined;
}

/** Rounds and turns -0 into 0, so the URL stays short and stable. */
function fixed(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals));
  return (Object.is(rounded, -0) ? 0 : rounded).toString();
}

/** `map=zoom/lat/lon/bearing/pitch&layer=id`, without the leading `#`. */
export function serializePermalink({ view, layer }: Permalink): string {
  const [lon, lat] = view.center;
  const map = [
    fixed(view.zoom, 2),
    fixed(lat, 5),
    fixed(lon, 5),
    fixed(view.bearing, 1),
    fixed(view.pitch, 1),
  ].join('/');
  return layer === undefined ? `map=${map}` : `map=${map}&layer=${encodeURIComponent(layer)}`;
}

/** Parses a location hash. Anything malformed or out of range rejects the whole hash. */
export function parsePermalink(hash: string): Permalink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const parts = params.get('map')?.split('/');
  if (parts?.length !== 5) return null;

  const numbers: number[] = [];
  for (const part of parts) {
    const parsed = DecimalTextSchema.safeParse(part);
    if (!parsed.success) return null;
    numbers.push(parsed.data);
  }
  const [zoom, lat, lon, bearing, pitch] = numbers as [number, number, number, number, number];

  const view = InitialViewSchema.safeParse({ center: [lon, lat], zoom, bearing, pitch });
  if (!view.success) return null;

  const rawLayer = params.get('layer');
  if (rawLayer === null) return { view: view.data, layer: undefined };
  const layer = ViewerIdSchema.safeParse(rawLayer);
  if (!layer.success) return null;
  return { view: view.data, layer: layer.data };
}

/** The view and basemap to open with: the permalink if it fits this viewer, else the config. */
export function initialState(
  config: Pick<ViewerConfig, 'initialView' | 'basemaps'>,
  hash: string,
): { view: InitialView; basemapId: string } {
  const defaultBasemap = config.basemaps[0]?.id;
  if (defaultBasemap === undefined) throw new Error('A viewer config always has a basemap');

  const permalink = parsePermalink(hash);
  if (!permalink) return { view: config.initialView, basemapId: defaultBasemap };
  if (permalink.layer === undefined) return { view: permalink.view, basemapId: defaultBasemap };
  if (!isBasemapId(config.basemaps, permalink.layer)) {
    return { view: config.initialView, basemapId: defaultBasemap };
  }
  return { view: permalink.view, basemapId: permalink.layer };
}
