import type { ReportPublicView } from '@fita/contracts';
import type { Report } from '../domain/report.ts';
import type { ReportStore } from '../ports.ts';

export class ReportNotFoundError extends Error {
  constructor(code: string) {
    super(`No report with code ${code}`);
    this.name = 'ReportNotFoundError';
  }
}

/** The public view hides the exact location and the internal version. */
export function toPublicView(report: Report): ReportPublicView {
  return {
    code: report.code,
    category: report.category,
    description: report.description,
    status: report.status,
    publicNote: report.publicNote,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export function getPublicReport(deps: { store: ReportStore }, code: string): ReportPublicView {
  const report = deps.store.findByCode(code);
  if (!report) throw new ReportNotFoundError(code);
  return toPublicView(report);
}
