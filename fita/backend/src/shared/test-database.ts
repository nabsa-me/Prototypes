import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './db.ts';

/** Test-only: a database in a fresh temporary file, and a function that deletes it. */
export function openTestDatabase(): { db: DatabaseSync; dispose: () => void } {
  const directory = mkdtempSync(join(tmpdir(), 'fita-db-'));
  const db = openDatabase(join(directory, 'test.sqlite'));
  return {
    db,
    dispose: () => {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
