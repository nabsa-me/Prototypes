import { ReportCreatedSchema, type NewReport, type ReportCreated } from '@fita/contracts';
import { requestJson } from '../../http.ts';

export function submitReport(report: NewReport): Promise<ReportCreated> {
  return requestJson('/api/reports', ReportCreatedSchema, { method: 'POST', body: report });
}
