import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { inTransaction, isUniqueViolation, openDatabase } from './db.ts';
import { openTestDatabase } from './test-database.ts';

describe('openDatabase', () => {
  const directories: string[] = [];

  afterEach(() => {
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true });
  });

  it('can open the same file twice: the schema is idempotent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'fita-db-'));
    directories.push(directory);
    const path = join(directory, 'twice.sqlite');

    openDatabase(path).close();
    const db = openDatabase(path);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reports'")
      .all();
    db.close();
    expect(tables).toHaveLength(1);
  });
});

describe('inTransaction', () => {
  it('rolls back everything when the work throws', () => {
    const { db, dispose } = openTestDatabase();
    db.exec('CREATE TABLE t (code TEXT UNIQUE)');

    expect(() =>
      inTransaction(db, () => {
        db.prepare('INSERT INTO t VALUES (?)').run('A');
        db.prepare('INSERT INTO t VALUES (?)').run('A');
      }),
    ).toThrow();

    expect(db.prepare('SELECT COUNT(*) AS n FROM t').get()).toEqual({ n: 0 });
    dispose();
  });
});

describe('isUniqueViolation', () => {
  it('recognises the unique constraint of a given column only', () => {
    const { db, dispose } = openTestDatabase();
    db.exec('CREATE TABLE t (code TEXT UNIQUE)');
    db.prepare('INSERT INTO t VALUES (?)').run('A');

    let error: unknown;
    try {
      db.prepare('INSERT INTO t VALUES (?)').run('A');
    } catch (caught) {
      error = caught;
    }

    expect(isUniqueViolation(error, 't.code')).toBe(true);
    expect(isUniqueViolation(error, 't.other')).toBe(false);
    expect(isUniqueViolation(new Error('t.code'), 't.code')).toBe(false);
    dispose();
  });
});
