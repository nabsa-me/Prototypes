import type { DatasetFeatureCollection } from '@fita/contracts';
import type { BBox } from '@fita/geo';
import type { DatasetStore, ViewerConfigStore } from '../ports.ts';
import { getViewerConfig } from './get-viewer-config.ts';

export class DatasetNotFoundError extends Error {
  constructor(readonly viewerId: string) {
    super(`Viewer "${viewerId}" has no dataset`);
    this.name = 'DatasetNotFoundError';
  }
}

/** The viewer's features in EPSG:4326 whose bounding box intersects `bbox`. */
export async function getDatasetFeatures(
  deps: { configs: ViewerConfigStore; datasets: DatasetStore },
  viewerId: string,
  bbox: BBox,
): Promise<DatasetFeatureCollection> {
  const config = await getViewerConfig({ store: deps.configs }, viewerId);
  if (!config.dataset) throw new DatasetNotFoundError(viewerId);
  return { type: 'FeatureCollection', features: deps.datasets.findIntersecting(viewerId, bbox) };
}
