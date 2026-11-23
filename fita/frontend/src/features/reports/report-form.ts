import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  NewReportSchema,
  type NewReport,
} from '@fita/contracts';
import { isInsideCatalonia, type Position } from '@fita/geo';

export interface ReportFormValues {
  category: string;
  description: string;
}

export interface ReportFormErrors {
  category?: string;
  description?: string;
  location?: string;
}

export type ReportFormResult =
  { ok: true; report: NewReport } | { ok: false; errors: ReportFormErrors };

/**
 * Validates the form with the shared contract and the Catalonia boundary, the same checks
 * the API runs, and turns each failing field into a Catalan message.
 */
export function validateReportForm(values: ReportFormValues, location: Position): ReportFormResult {
  const errors: ReportFormErrors = {};
  if (!isInsideCatalonia(location)) {
    errors.location = 'Només es poden reportar errors de punts dins de Catalunya.';
  }

  const parsed = NewReportSchema.safeParse({ ...values, location: [location[0], location[1]] });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'category') errors.category = 'Tria una categoria.';
      if (field === 'description') {
        errors.description =
          values.description.length > DESCRIPTION_MAX_LENGTH
            ? `Com a màxim ${DESCRIPTION_MAX_LENGTH} caràcters.`
            : `Descriu l'error amb almenys ${DESCRIPTION_MIN_LENGTH} caràcters.`;
      }
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, report: parsed.data };
}
