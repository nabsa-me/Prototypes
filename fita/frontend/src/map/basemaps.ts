import type { Basemap } from '@fita/contracts';

export function rasterLayerId(basemapId: string): string {
  return `fita-basemap-${basemapId}`;
}

export function isBasemapId(basemaps: readonly Basemap[], id: string): boolean {
  return basemaps.some((basemap) => basemap.id === id);
}

/** Visibility of every raster layer when `activeId` is selected. A style basemap hides them all. */
export function rasterVisibility(
  basemaps: readonly Basemap[],
  activeId: string,
): Array<{ layerId: string; visible: boolean }> {
  return basemaps
    .filter((basemap) => basemap.kind === 'raster')
    .map((basemap) => ({ layerId: rasterLayerId(basemap.id), visible: basemap.id === activeId }));
}

/**
 * Id of the first symbol layer in drawing order. Imagery is inserted before it, so it covers
 * the style's fills and lines but leaves labels on top.
 */
export function firstSymbolLayerId(
  layers: ReadonlyArray<{ id: string; type: string }>,
): string | undefined {
  return layers.find((layer) => layer.type === 'symbol')?.id;
}
