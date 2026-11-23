import type { DatabaseSync } from 'node:sqlite';
import { inTransaction, isUniqueViolation } from '../../../shared/db.ts';
import type { Report } from '../domain/report.ts';
import { DuplicateTrackingCodeError, type ReportStore } from '../ports.ts';

const COLUMNS = `r.code, r.category, r.description, r.lon, r.lat, r.status, r.public_note,
  r.created_at, r.updated_at, r.version`;

const NEWEST_FIRST = 'ORDER BY r.created_at DESC, r.id DESC';

export function createSqliteReportStore(db: DatabaseSync): ReportStore {
  const insertReport = db.prepare(`
    INSERT INTO reports
      (code, category, description, lon, lat, status, public_note, created_at, updated_at, version)
    VALUES
      (:code, :category, :description, :lon, :lat, :status, :publicNote, :createdAt, :updatedAt, :version)
  `);
  const insertLocation = db.prepare(`
    INSERT INTO report_locations (id, min_lon, max_lon, min_lat, max_lat)
    VALUES (:id, :lon, :lon, :lat, :lat)
  `);
  const selectByCode = db.prepare(`SELECT ${COLUMNS} FROM reports r WHERE r.code = ?`);
  const selectAll = db.prepare(`
    SELECT ${COLUMNS} FROM reports r
    WHERE (:status IS NULL OR r.status = :status)
    ${NEWEST_FIRST}
  `);
  // The R*Tree narrows the candidates with its index; it stores 32-bit floats rounded
  // outwards, so the exact lon/lat columns decide the edge cases.
  const selectInBbox = db.prepare(`
    SELECT ${COLUMNS} FROM report_locations l
    JOIN reports r ON r.id = l.id
    WHERE l.min_lon <= :east AND l.max_lon >= :west
      AND l.min_lat <= :north AND l.max_lat >= :south
      AND r.lon BETWEEN :west AND :east
      AND r.lat BETWEEN :south AND :north
      AND (:status IS NULL OR r.status = :status)
    ${NEWEST_FIRST}
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

    list({ status, bbox }) {
      const rows = bbox
        ? selectInBbox.all({
            west: bbox[0],
            south: bbox[1],
            east: bbox[2],
            north: bbox[3],
            status: status ?? null,
          })
        : selectAll.all({ status: status ?? null });
      return (rows as unknown as ReportRow[]).map(toReport);
    },
  };
}

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
