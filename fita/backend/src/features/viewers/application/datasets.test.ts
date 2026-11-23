import type { DatasetFeature } from '@fita/contracts';
import { describe, expect, it } from 'vitest';
import { InvalidDatasetError, type PreparedFeature } from '../domain/dataset.ts';
import type { DatasetStore, ViewerConfigStore } from '../ports.ts';
import { DatasetNotFoundError, getDatasetFeatures } from './get-dataset-features.ts';
import { ViewerNotFoundError } from './get-viewer-config.ts';
import { importDatasets } from './import-datasets.ts';

const base = {
  initialView: { center: [2.4, 41.77], zoom: 12, bearing: 0, pitch: 0 },
  style: 'https://example.test/style.json',
  basemaps: [{ id: 'map', label: 'Mapa', kind: 'style' }],
};
const withDataset = {
  ...base,
  id: 'route',
  title: 'Route',
  dataset: { file: 'route.geojson', crs: 'EPSG:4326' },
};
const withoutDataset = { ...base, id: 'plain', title: 'Plain' };

const geojson = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'p',
      geometry: { type: 'Point', coordinates: [2.4, 41.77] },
      properties: null,
    },
  ],
});

function configs(...documents: Array<{ id: string; [key: string]: unknown }>): ViewerConfigStore {
  return {
    read: async (id) => documents.find((d) => d.id === id),
    listIds: async () => documents.map((d) => d.id),
  };
}

function memoryDatasets() {
  const imports = new Map<string, { fingerprint: string; features: readonly PreparedFeature[] }>();
  const store: DatasetStore = {
    importedFingerprint: (viewerId) => imports.get(viewerId)?.fingerprint,
    replace: (viewerId, { fingerprint, features }) =>
      void imports.set(viewerId, { fingerprint, features }),
    findIntersecting: (viewerId) =>
      (imports.get(viewerId)?.features ?? []).map((f) => f.feature as DatasetFeature),
  };
  return { store, imports };
}

const deps = (overrides: { text?: string; configs?: ViewerConfigStore } = {}) => {
  const datasets = memoryDatasets();
  return {
    datasets,
    deps: {
      configs: overrides.configs ?? configs(withDataset, withoutDataset),
      files: { read: async () => overrides.text ?? geojson },
      store: datasets.store,
      clock: () => new Date('2026-11-23T10:00:00.000Z'),
      digest: (text: string) => `digest(${text.length})`,
    },
  };
};

describe('importDatasets', () => {
  it('imports the viewers that declare a dataset and skips the rest', async () => {
    const { deps: d, datasets } = deps();

    await expect(importDatasets(d)).resolves.toEqual([{ viewerId: 'route', outcome: 'imported' }]);
    expect(datasets.imports.get('route')?.features).toHaveLength(1);
  });

  it('does nothing the second time when neither the file nor the CRS changed', async () => {
    const { deps: d } = deps();
    await importDatasets(d);

    await expect(importDatasets(d)).resolves.toEqual([{ viewerId: 'route', outcome: 'unchanged' }]);
  });

  it('imports again when the declared CRS changes, even with the same file', async () => {
    const { deps: d, datasets } = deps();
    await importDatasets(d);
    const before = datasets.imports.get('route')?.fingerprint;

    const changed = {
      ...d,
      configs: configs({ ...withDataset, dataset: { file: 'route.geojson', crs: 'EPSG:25831' } }),
    };
    // The same numbers read as UTM fall outside Catalonia, so the new import is rejected.
    await expect(importDatasets(changed)).rejects.toBeInstanceOf(InvalidDatasetError);
    expect(datasets.imports.get('route')?.fingerprint).toBe(before);
  });

  it('rejects a file that is not JSON and stores nothing', async () => {
    const { deps: d, datasets } = deps({ text: '{ not json' });

    await expect(importDatasets(d)).rejects.toThrow(/route.geojson: is not valid JSON/);
    expect(datasets.imports.size).toBe(0);
  });
});

describe('getDatasetFeatures', () => {
  it('answers a feature collection with what the store finds', async () => {
    const { deps: d, datasets } = deps();
    await importDatasets(d);

    const result = await getDatasetFeatures(
      { configs: d.configs, datasets: datasets.store },
      'route',
      [2, 41, 3, 42],
    );

    expect(result).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'p',
          geometry: { type: 'Point', coordinates: [2.4, 41.77] },
          properties: null,
        },
      ],
    });
  });

  it('fails for a viewer without dataset and for an unknown viewer', async () => {
    const { deps: d, datasets } = deps();
    const query = (id: string) =>
      getDatasetFeatures({ configs: d.configs, datasets: datasets.store }, id, [2, 41, 3, 42]);

    await expect(query('plain')).rejects.toBeInstanceOf(DatasetNotFoundError);
    await expect(query('missing')).rejects.toBeInstanceOf(ViewerNotFoundError);
  });
});
