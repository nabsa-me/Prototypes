import type { ReportAdminView, ReportStatus } from '@fita/contracts';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { featureStateSwitch, matchExpression } from '../../map/style-expressions.ts';

export const REPORTS_SOURCE = 'fita-reports';
export const REPORTS_LAYER = 'fita-reports-circles';

/** Design token behind each status colour, the same tones as the status badges. */
export const STATUS_COLOR_TOKEN: Record<ReportStatus, string> = {
  open: '--color-warning',
  in_review: '--color-info',
  resolved: '--color-success',
  dismissed: '--color-neutral',
};

export interface ReportFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { code: string; status: ReportStatus };
  }>;
}

/** One point per report. `promoteId: 'code'` makes the code the feature id for feature-state. */
export function reportsToFeatureCollection(
  reports: readonly ReportAdminView[],
): ReportFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [report.location[0], report.location[1]] },
      properties: { code: report.code, status: report.status },
    })),
  };
}

/** Resolves each status colour from the design tokens (MapLibre cannot read CSS variables). */
export function statusColors(readToken: (token: string) => string): Record<ReportStatus, string> {
  const entries = Object.entries(STATUS_COLOR_TOKEN).map(([status, token]) => [
    status,
    readToken(token),
  ]);
  return Object.fromEntries(entries) as Record<ReportStatus, string>;
}

/** Adds the reports source and its circle layer, coloured by status with a `match`. */
export function addReportLayer(map: MapLibreMap, colors: Record<ReportStatus, string>): void {
  map.addSource(REPORTS_SOURCE, {
    type: 'geojson',
    data: reportsToFeatureCollection([]),
    promoteId: 'code',
  });
  map.addLayer({
    id: REPORTS_LAYER,
    type: 'circle',
    source: REPORTS_SOURCE,
    paint: {
      'circle-color': matchExpression('status', colors, '#000000'),
      'circle-radius': featureStateSwitch('hover', 10, 7),
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': featureStateSwitch('selected', 4, 2),
    },
  });
}

export function showReports(map: MapLibreMap, reports: readonly ReportAdminView[]): void {
  map.getSource<GeoJSONSource>(REPORTS_SOURCE)?.setData(reportsToFeatureCollection(reports));
}

/** Moves a boolean feature-state flag from one report to another (either may be absent). */
export function moveFlag(
  map: MapLibreMap,
  flag: 'hover' | 'selected',
  from: string | undefined,
  to: string | undefined,
): void {
  if (from === to) return;
  if (from) map.setFeatureState({ source: REPORTS_SOURCE, id: from }, { [flag]: false });
  if (to) map.setFeatureState({ source: REPORTS_SOURCE, id: to }, { [flag]: true });
}

/** The code of the report under the pointer, from a layer mouse event. */
export function codeAt(event: MapLayerMouseEvent): string | undefined {
  const code: unknown = event.features?.[0]?.properties['code'];
  return typeof code === 'string' ? code : undefined;
}
