import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../../shared/test-database.ts';
import { getViewerConfig } from '../application/get-viewer-config.ts';
import { importDatasets } from '../application/import-datasets.ts';
import { createDatasetFiles, createJsonFileViewerStore } from './json-file-store.ts';
import { createSqliteDatasetStore } from './sqlite-dataset-store.ts';

describe('createJsonFileViewerStore', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'fita-viewers-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const store = () => createJsonFileViewerStore(pathToFileURL(`${directory}/`));

  it('reads and parses the JSON file named after the id', async () => {
    await writeFile(join(directory, 'demo.json'), '{"id":"demo"}');

    await expect(store().read('demo')).resolves.toEqual({ id: 'demo' });
  });

  it('resolves undefined when the file does not exist', async () => {
    await expect(store().read('missing')).resolves.toBeUndefined();
  });

  it('fails loudly on a file that is not JSON', async () => {
    await writeFile(join(directory, 'broken.json'), '{ not json');

    await expect(store().read('broken')).rejects.toBeInstanceOf(SyntaxError);
  });

  it('lists the configuration ids, ignoring dataset files', async () => {
    await writeFile(join(directory, 'b.json'), '{}');
    await writeFile(join(directory, 'a.json'), '{}');
    await writeFile(join(directory, 'a.geojson'), '{}');

    await expect(store().listIds()).resolves.toEqual(['a', 'b']);
  });

  it('reads a dataset file and fails loudly when it is missing', async () => {
    await writeFile(join(directory, 'route.geojson'), '{"type":"FeatureCollection"}');
    const files = createDatasetFiles(pathToFileURL(`${directory}/`));

    await expect(files.read('route.geojson')).resolves.toBe('{"type":"FeatureCollection"}');
    await expect(files.read('missing.geojson')).rejects.toThrow(/ENOENT/);
  });
});

describe('shipped viewer configurations and datasets', () => {
  const directory = new URL('../../../../data/viewers/', import.meta.url);
  const configs = createJsonFileViewerStore(directory);

  it('all configurations satisfy the contract', async () => {
    const ids = await configs.listIds();

    expect(ids).toEqual(['intern', 'miradors', 'public']);
    for (const id of ids) {
      await expect(getViewerConfig({ store: configs }, id)).resolves.toMatchObject({ id });
    }
  });

  it('every dataset imports cleanly, and only once', async () => {
    const { db, dispose } = openTestDatabase();
    const deps = {
      configs,
      files: createDatasetFiles(directory),
      store: createSqliteDatasetStore(db),
      clock: () => new Date('2026-11-23T10:00:00.000Z'),
      digest: (text: string) => createHash('sha256').update(text).digest('hex'),
    };

    await expect(importDatasets(deps)).resolves.toEqual([
      { viewerId: 'miradors', outcome: 'imported' },
    ]);
    await expect(importDatasets(deps)).resolves.toEqual([
      { viewerId: 'miradors', outcome: 'unchanged' },
    ]);
    expect(
      db.prepare("SELECT feature_count FROM datasets WHERE viewer_id = 'miradors'").get(),
    ).toEqual({
      feature_count: 13,
    });
    dispose();
  });
});
