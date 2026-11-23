import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getViewerConfig } from '../application/get-viewer-config.ts';
import { createJsonFileViewerStore } from './json-file-store.ts';

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
});

describe('shipped viewer configurations', () => {
  const directory = new URL('../../../../data/viewers/', import.meta.url);

  it('all satisfy the contract', async () => {
    const files = (await readdir(directory)).filter((name) => name.endsWith('.json'));
    const store = createJsonFileViewerStore(directory);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const id = file.slice(0, -'.json'.length);
      await expect(getViewerConfig({ store }, id)).resolves.toMatchObject({ id });
    }
  });
});
