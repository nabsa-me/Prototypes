import { PointInfoSchema, type PointInfo } from '@fita/contracts';
import type { Position } from '@fita/geo';
import { getJson } from '../../http.ts';

export function fetchPointInfo([lon, lat]: Position, signal: AbortSignal): Promise<PointInfo> {
  const query = new URLSearchParams({ lon: lon.toFixed(7), lat: lat.toFixed(7) });
  return getJson(`/api/point-info?${query}`, PointInfoSchema, signal);
}
