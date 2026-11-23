import type { ReportStatus } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { aReport } from '../test-report.ts';
import {
  InvalidTransitionError,
  PublicNoteRequiredError,
  VersionConflictError,
  changeStatus,
} from './report.ts';

const now = new Date('2026-11-24T09:30:00.000Z');

describe('changeStatus', () => {
  it('moves the report, stamps the time and bumps the version', () => {
    const report = aReport();

    expect(changeStatus(report, { status: 'in_review', version: 1 }, now)).toEqual({
      ...report,
      status: 'in_review',
      updatedAt: '2026-11-24T09:30:00.000Z',
      version: 2,
    });
  });

  it('replaces the public note when a new one is given and keeps it otherwise', () => {
    const reviewing = changeStatus(
      aReport(),
      { status: 'in_review', publicNote: 'We are checking it.', version: 1 },
      now,
    );
    expect(reviewing.publicNote).toBe('We are checking it.');

    const resolved = changeStatus(
      reviewing,
      { status: 'resolved', publicNote: 'Fixed in the next edition.', version: 2 },
      now,
    );
    expect(resolved.publicNote).toBe('Fixed in the next edition.');
  });

  it.each<[ReportStatus, ReportStatus]>([
    ['open', 'in_review'],
    ['open', 'dismissed'],
    ['in_review', 'resolved'],
    ['in_review', 'dismissed'],
  ])('allows %s -> %s', (from, to) => {
    const change = { status: to, publicNote: 'Note.', version: 1 };

    expect(changeStatus(aReport({ status: from }), change, now).status).toBe(to);
  });

  it.each<[ReportStatus, ReportStatus]>([
    ['open', 'resolved'],
    ['open', 'open'],
    ['in_review', 'open'],
    ['resolved', 'in_review'],
    ['resolved', 'dismissed'],
    ['dismissed', 'open'],
  ])('refuses %s -> %s', (from, to) => {
    const change = { status: to, publicNote: 'Note.', version: 1 };

    expect(() => changeStatus(aReport({ status: from }), change, now)).toThrow(
      InvalidTransitionError,
    );
  });

  it('refuses a final status without a public note', () => {
    expect(() =>
      changeStatus(aReport({ status: 'in_review' }), { status: 'resolved', version: 1 }, now),
    ).toThrow(PublicNoteRequiredError);
  });

  it('refuses a change prepared against another version', () => {
    expect(() =>
      changeStatus(aReport({ version: 3 }), { status: 'in_review', version: 2 }, now),
    ).toThrow(VersionConflictError);
  });
});
