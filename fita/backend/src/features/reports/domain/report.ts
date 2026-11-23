import type { NewReport, ReportAdminView } from '@fita/contracts';
import { isInsideCatalonia } from '@fita/geo';

/**
 * A report as the domain keeps it. It has exactly the fields of the internal view, so the
 * contract type is used as is. `publicNote` is `null` until the team writes one.
 */
export type Report = ReportAdminView;

export class OutsideCataloniaError extends Error {
  constructor() {
    super('The reported point is outside Catalonia');
    this.name = 'OutsideCataloniaError';
  }
}

/** A new report: open, without a note, at version 1. The point must be inside Catalonia. */
export function openReport(input: NewReport, owned: { code: string; now: Date }): Report {
  if (!isInsideCatalonia(input.location)) throw new OutsideCataloniaError();
  const timestamp = owned.now.toISOString();
  return {
    code: owned.code,
    category: input.category,
    description: input.description,
    location: [input.location[0], input.location[1]],
    status: 'open',
    publicNote: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  };
}
