import {
  FINAL_STATUSES,
  PUBLIC_NOTE_MAX_LENGTH,
  REPORT_TRANSITIONS,
  ReportStatusChangeSchema,
  type ReportAdminView,
  type ReportStatus,
  type ReportStatusChange,
} from '@fita/contracts';

export function nextStatuses(status: ReportStatus): readonly ReportStatus[] {
  return REPORT_TRANSITIONS[status];
}

export function needsNote(status: ReportStatus | ''): boolean {
  return status !== '' && FINAL_STATUSES.includes(status);
}

export interface StatusChangeValues {
  status: ReportStatus | '';
  note: string;
}

export type StatusChangeResult =
  | { ok: true; change: ReportStatusChange }
  | { ok: false; errors: { status?: string; note?: string } };

/**
 * Builds the change the API expects, with the version the user is looking at. An empty
 * note field means "no note"; a note made only of spaces is an error, not an absence.
 */
export function validateStatusChange(
  values: StatusChangeValues,
  report: Pick<ReportAdminView, 'status' | 'version'>,
): StatusChangeResult {
  const errors: { status?: string; note?: string } = {};
  if (values.status === '' || !nextStatuses(report.status).includes(values.status)) {
    errors.status = 'Tria el nou estat.';
  }

  const candidate = {
    status: values.status,
    ...(values.note === '' ? {} : { publicNote: values.note }),
    version: report.version,
  };
  const parsed = ReportStatusChangeSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (issue.path[0] !== 'publicNote') continue;
      errors.note =
        values.note.length > PUBLIC_NOTE_MAX_LENGTH
          ? `Com a màxim ${PUBLIC_NOTE_MAX_LENGTH} caràcters.`
          : "Escriu una nota per a qui va reportar l'error.";
    }
  }

  if (!parsed.success || errors.status) return { ok: false, errors };
  return { ok: true, change: parsed.data };
}
