import type { DatabaseSync } from 'node:sqlite';
import { inTransaction, isUniqueViolation } from '../../../shared/db.ts';
import type { Report } from '../domain/report.ts';
import { DuplicateTrackingCodeError, type ReportStore } from '../ports.ts';

export function createSqliteReportStore(db: DatabaseSync): ReportStore {
  const insertReport = db.prepare(`
    INSERT INTO reports
      (code, category, description, lon, lat, status, public_note, created_at, updated_at, version)
    VALUES
      (:code, :category, :description, :lon, :lat, :status, :publicNote, :createdAt, :updatedAt, :version)
  `);
  const selectByCode = db.prepare(`SELECT ${COLUMNS} FROM reports WHERE code = ?`);
  const insertLocation = db.prepare(`
    INSERT INTO report_locations (id, min_lon, max_lon, min_lat, max_lat)
    VALUES (:id, :lon, :lon, :lat, :lat)
  `);

  return {
    insert(report) {
      const [lon, lat] = report.location;
      try {
        inTransaction(db, () => {
          const { lastInsertRowid } = insertReport.run({
            code: report.code,
            category: report.category,
            description: report.description,
            lon,
            lat,
            status: report.status,
            publicNote: report.publicNote,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            version: report.version,
          });
          insertLocation.run({ id: lastInsertRowid, lon, lat });
        });
      } catch (error) {
        if (isUniqueViolation(error, 'reports.code')) {
          throw new DuplicateTrackingCodeError(report.code);
        }
        throw error;
      }
    },

    findByCode(code) {
      const row = selectByCode.get(code) as ReportRow | undefined;
      return row && toReport(row);
    },
  };
}

const COLUMNS =
  'code, category, description, lon, lat, status, public_note, created_at, updated_at, version';

interface ReportRow {
  code: string;
  category: Report['category'];
  description: string;
  lon: number;
  lat: number;
  status: Report['status'];
  public_note: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

function toReport(row: ReportRow): Report {
  return {
    code: row.code,
    category: row.category,
    description: row.description,
    location: [row.lon, row.lat],
    status: row.status,
    publicNote: row.public_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
