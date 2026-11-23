import type { ReportAdminView, ReportStatusChange } from '@fita/contracts';
import { VersionConflictError, changeStatus } from '../domain/report.ts';
import type { Clock, ReportStore } from '../ports.ts';
import { ReportNotFoundError } from './get-public-report.ts';

/**
 * Reads the report, applies the change and writes it only if nobody changed it meanwhile:
 * the domain checks the version the client read, the store checks it again on write.
 */
export function changeReportStatus(
  deps: { store: ReportStore; clock: Clock },
  code: string,
  change: ReportStatusChange,
): ReportAdminView {
  const report = deps.store.findByCode(code);
  if (!report) throw new ReportNotFoundError(code);

  const updated = changeStatus(report, change, deps.clock());
  if (!deps.store.update(updated, report.version)) throw new VersionConflictError(change.version);
  return updated;
}
