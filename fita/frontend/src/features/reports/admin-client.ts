import {
  ReportAdminViewSchema,
  ReportListSchema,
  type ReportAdminView,
  type ReportStatus,
  type ReportStatusChange,
} from '@fita/contracts';
import type { BBox } from '@fita/geo';
import { requestJson } from '../../http.ts';

export interface AdminFilter {
  status: ReportStatus | undefined;
  bbox: BBox | undefined;
}

/** Query string for the admin list: only the filters that are set. Bbox to 6 decimals. */
export function reportListQuery({ status, bbox }: AdminFilter): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (bbox) params.set('bbox', bbox.map((value) => Number(value.toFixed(6))).join(','));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchAdminReports(
  token: string,
  filter: AdminFilter,
  signal?: AbortSignal,
): Promise<ReportAdminView[]> {
  const { reports } = await requestJson(
    `/api/admin/reports${reportListQuery(filter)}`,
    ReportListSchema,
    {
      headers: { 'x-admin-token': token },
      signal,
    },
  );
  return reports;
}

export function changeReportStatus(
  token: string,
  code: string,
  change: ReportStatusChange,
): Promise<ReportAdminView> {
  return requestJson(`/api/admin/reports/${encodeURIComponent(code)}`, ReportAdminViewSchema, {
    method: 'PATCH',
    body: change,
    headers: { 'x-admin-token': token },
  });
}
