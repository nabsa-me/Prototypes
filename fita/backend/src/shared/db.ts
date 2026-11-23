import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** Opens (or creates) the SQLite file and applies the idempotent schema. */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  return db;
}

/** Runs `work` inside a transaction: committed if it returns, rolled back if it throws. */
export function inTransaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** SQLITE_CONSTRAINT_UNIQUE, as reported by node:sqlite in `errcode`. */
const SQLITE_CONSTRAINT_UNIQUE = 2067;

export function isUniqueViolation(error: unknown, column: string): boolean {
  return (
    error instanceof Error &&
    'errcode' in error &&
    error.errcode === SQLITE_CONSTRAINT_UNIQUE &&
    error.message.includes(column)
  );
}
