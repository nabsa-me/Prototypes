import { InvalidDatasetError, prepareDataset } from '../domain/dataset.ts';
import type { Clock, DatasetFiles, DatasetStore, ViewerConfigStore } from '../ports.ts';
import { getViewerConfig } from './get-viewer-config.ts';

export interface ImportDatasetsDeps {
  configs: ViewerConfigStore;
  files: DatasetFiles;
  store: DatasetStore;
  clock: Clock;
  /** A stable digest of the text (SHA-256 in production). */
  digest: (text: string) => string;
}

export interface ImportOutcome {
  viewerId: string;
  outcome: 'imported' | 'unchanged';
}

/**
 * Imports the dataset of every viewer that declares one. Idempotent: a dataset is imported
 * again only when its file or its declared CRS changed. An invalid file stops the import
 * with an error listing every problem; nothing is stored for it.
 */
export async function importDatasets(deps: ImportDatasetsDeps): Promise<ImportOutcome[]> {
  const outcomes: ImportOutcome[] = [];
  for (const viewerId of await deps.configs.listIds()) {
    const config = await getViewerConfig({ store: deps.configs }, viewerId);
    if (!config.dataset) continue;

    const { file, crs } = config.dataset;
    const text = await deps.files.read(file);
    // The CRS is part of the fingerprint: the same file read in another CRS is new data.
    const fingerprint = deps.digest(`${crs}\n${text}`);
    if (deps.store.importedFingerprint(viewerId) === fingerprint) {
      outcomes.push({ viewerId, outcome: 'unchanged' });
      continue;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new InvalidDatasetError([`${file}: is not valid JSON`]);
    }
    const features = prepareDataset(raw, crs);
    deps.store.replace(viewerId, { fingerprint, importedAt: deps.clock().toISOString(), features });
    outcomes.push({ viewerId, outcome: 'imported' });
  }
  return outcomes;
}
