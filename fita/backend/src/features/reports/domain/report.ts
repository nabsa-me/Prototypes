import type { NewReport, ReportCategory, ReportStatus } from '@fita/contracts';
import { isInsideCatalonia } from '@fita/geo';

export interface Report {
  code: string;
  category: ReportCategory;
  description: string;
  location: [number, number];
  status: ReportStatus;
  /** Note the technician leaves for the person who reported; `null` until one is written. */
  publicNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Starts at 1 and grows with every change, for optimistic concurrency. */
  version: number;
}

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
