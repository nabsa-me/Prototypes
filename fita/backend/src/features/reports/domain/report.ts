import {
  FINAL_STATUSES,
  REPORT_TRANSITIONS,
  type NewReport,
  type ReportAdminView,
  type ReportStatus,
  type ReportStatusChange,
} from '@fita/contracts';
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

/** The change was prepared against a version that is no longer the current one. */
export class VersionConflictError extends Error {
  constructor(readonly expected: number) {
    super(`The report is no longer at version ${expected}`);
    this.name = 'VersionConflictError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ReportStatus,
    readonly to: ReportStatus,
  ) {
    super(`A report cannot go from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class PublicNoteRequiredError extends Error {
  constructor(status: ReportStatus) {
    super(`A public note is required to move a report to ${status}`);
    this.name = 'PublicNoteRequiredError';
  }
}

/**
 * Applies a status change: the version must match, the move must be allowed and a final
 * status needs a public note. A note given on any change replaces the previous one.
 */
export function changeStatus(report: Report, change: ReportStatusChange, now: Date): Report {
  if (change.version !== report.version) {
    throw new VersionConflictError(change.version);
  }
  if (!REPORT_TRANSITIONS[report.status].includes(change.status)) {
    throw new InvalidTransitionError(report.status, change.status);
  }
  if (FINAL_STATUSES.includes(change.status) && change.publicNote === undefined) {
    throw new PublicNoteRequiredError(change.status);
  }
  return {
    ...report,
    status: change.status,
    publicNote: change.publicNote ?? report.publicNote,
    updatedAt: now.toISOString(),
    version: report.version + 1,
  };
}
