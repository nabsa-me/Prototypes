import { DatasetFeatureCollectionSchema, type DatasetFeatureCollection } from '@fita/contracts';
import type { BBox } from '@fita/geo';
import { getJson } from '../../http.ts';

export function fetchDatasetFeatures(
  viewerId: string,
  bbox: BBox,
  signal: AbortSignal,
): Promise<DatasetFeatureCollection> {
  const query = new URLSearchParams({
    bbox: bbox.map((value) => Number(value.toFixed(6))).join(','),
  });
  return getJson(
    `/api/viewers/${encodeURIComponent(viewerId)}/features?${query}`,
    DatasetFeatureCollectionSchema,
    signal,
  );
}
