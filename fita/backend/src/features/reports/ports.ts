import type { ReportStatus } from '@fita/contracts';
import type { BBox } from '@fita/geo';
import type { Report } from './domain/report.ts';

/** The tracking code is already taken. */
export class DuplicateTrackingCodeError extends Error {
  constructor(code: string) {
    super(`Tracking code ${code} already exists`);
    this.name = 'DuplicateTrackingCodeError';
  }
}

export interface ReportFilter {
  status?: ReportStatus | undefined;
  /** Only reports whose location lies inside these bounds (edges included). */
  bbox?: BBox | undefined;
}

/** Persistence of reports. Synchronous: the only implementation is node:sqlite. */
export interface ReportStore {
  /** @throws DuplicateTrackingCodeError when the code is taken. */
  insert(report: Report): void;
  findByCode(code: string): Report | undefined;
  /** Newest first. */
  list(filter: ReportFilter): Report[];
  /**
   * Writes status, note, time and version only if the stored version is still
   * `expectedVersion`. Returns false when it is not (someone else changed it).
   */
  update(report: Report, expectedVersion: number): boolean;
}

export type Clock = () => Date;
