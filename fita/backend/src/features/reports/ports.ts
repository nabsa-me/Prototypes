import type { Report } from './domain/report.ts';

/** The tracking code is already taken. */
export class DuplicateTrackingCodeError extends Error {
  constructor(code: string) {
    super(`Tracking code ${code} already exists`);
    this.name = 'DuplicateTrackingCodeError';
  }
}

/** Persistence of reports. Synchronous: the only implementation is node:sqlite. */
export interface ReportStore {
  /** @throws DuplicateTrackingCodeError when the code is taken. */
  insert(report: Report): void;
  findByCode(code: string): Report | undefined;
}

export type Clock = () => Date;
