import type { NewReport, ReportCreated } from '@fita/contracts';
import { openReport } from '../domain/report.ts';
import { generateTrackingCode, type RandomIndex } from '../domain/tracking-code.ts';
import { DuplicateTrackingCodeError, type Clock, type ReportStore } from '../ports.ts';

/** A collision is about one in 10^8 per attempt; three attempts make failure negligible. */
const MAX_ATTEMPTS = 3;

export interface CreateReportDeps {
  store: ReportStore;
  clock: Clock;
  randomIndex: RandomIndex;
}

/** Opens a report with a fresh tracking code, drawing a new code if one is already taken. */
export function createReport(deps: CreateReportDeps, input: NewReport): ReportCreated {
  for (let attempt = 1; ; attempt++) {
    const report = openReport(input, {
      code: generateTrackingCode(deps.randomIndex),
      now: deps.clock(),
    });
    try {
      deps.store.insert(report);
      return { code: report.code };
    } catch (error) {
      if (!(error instanceof DuplicateTrackingCodeError) || attempt === MAX_ATTEMPTS) throw error;
    }
  }
}
