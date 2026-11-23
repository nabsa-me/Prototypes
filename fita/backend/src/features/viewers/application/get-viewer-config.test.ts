import { describe, expect, it } from 'vitest';
import type { ViewerConfigStore } from '../ports.ts';
import {
  InvalidViewerConfigError,
  ViewerNotFoundError,
  getViewerConfig,
} from './get-viewer-config.ts';

const config = {
  id: 'demo',
  title: 'Demo',
  initialView: { center: [1.75, 41.7], zoom: 8, bearing: 0, pitch: 0 },
  style: 'https://example.test/style.json',
  basemaps: [{ id: 'map', label: 'Mapa', kind: 'style' }],
};

function storeWith(documents: Record<string, unknown>): ViewerConfigStore {
  return { read: async (id) => documents[id], listIds: async () => Object.keys(documents) };
}

describe('getViewerConfig', () => {
  it('returns the validated configuration', async () => {
    const result = await getViewerConfig({ store: storeWith({ demo: config }) }, 'demo');

    expect(result).toEqual(config);
  });

  it('fails with not found when the store has no document', async () => {
    await expect(getViewerConfig({ store: storeWith({}) }, 'demo')).rejects.toBeInstanceOf(
      ViewerNotFoundError,
    );
  });

  it('rejects a document that breaks the contract instead of repairing it', async () => {
    const broken = { ...config, initialView: { ...config.initialView, zoom: 30 } };

    await expect(
      getViewerConfig({ store: storeWith({ demo: broken }) }, 'demo'),
    ).rejects.toBeInstanceOf(InvalidViewerConfigError);
  });

  it('rejects a document whose id does not match the requested one', async () => {
    await expect(getViewerConfig({ store: storeWith({ other: config }) }, 'other')).rejects.toThrow(
      /declares id "demo"/,
    );
  });
});
