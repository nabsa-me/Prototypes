import { ViewerConfigSchema, type ViewerConfig } from '@fita/contracts';
import { getJson } from '../http.ts';

export function loadViewerConfig(id: string, signal?: AbortSignal): Promise<ViewerConfig> {
  return getJson(`/api/viewers/${encodeURIComponent(id)}`, ViewerConfigSchema, signal);
}
