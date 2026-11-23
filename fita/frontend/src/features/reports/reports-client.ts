import {
  ReportCreatedSchema,
  ReportPublicViewSchema,
  type NewReport,
  type ReportCreated,
  type ReportPublicView,
} from '@fita/contracts';
import { getJson, requestJson } from '../../http.ts';

export function submitReport(report: NewReport): Promise<ReportCreated> {
  return requestJson('/api/reports', ReportCreatedSchema, { method: 'POST', body: report });
}

export function fetchPublicReport(code: string, signal?: AbortSignal): Promise<ReportPublicView> {
  return getJson(`/api/reports/${encodeURIComponent(code)}`, ReportPublicViewSchema, signal);
}
