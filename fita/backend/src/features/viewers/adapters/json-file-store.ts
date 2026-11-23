import { readdir, readFile } from 'node:fs/promises';
import type { DatasetFiles, ViewerConfigStore } from '../ports.ts';

/**
 * Reads `<directory>/<id>.json`. The caller must pass a validated slug as `id`;
 * the store does not guard against path traversal itself.
 */
export function createJsonFileViewerStore(directory: URL): ViewerConfigStore {
  return {
    async read(id) {
      let text: string;
      try {
        text = await readFile(new URL(`${id}.json`, directory), 'utf8');
      } catch (error) {
        if (isMissingFile(error)) return undefined;
        throw error;
      }
      return JSON.parse(text) as unknown;
    },

    async listIds() {
      const names = await readdir(directory);
      return names
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length))
        .sort();
    },
  };
}

/** Reads dataset files next to the configurations. `file` comes from a validated config. */
export function createDatasetFiles(directory: URL): DatasetFiles {
  return {
    read: (file) => readFile(new URL(file, directory), 'utf8'),
  };
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
