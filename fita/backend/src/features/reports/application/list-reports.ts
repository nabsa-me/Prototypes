import type { ReportAdminView } from '@fita/contracts';
import type { ReportFilter, ReportStore } from '../ports.ts';

/** Reports for the internal tray, newest first. The domain type is already the admin view. */
export function listReports(deps: { store: ReportStore }, filter: ReportFilter): ReportAdminView[] {
  return deps.store.list(filter);
}
