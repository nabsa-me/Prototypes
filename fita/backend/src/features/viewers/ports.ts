import type { DatasetFeature } from '@fita/contracts';
import type { BBox } from '@fita/geo';
import type { PreparedFeature } from './domain/dataset.ts';

/** Where viewer configurations are kept. Returns the raw document, unvalidated. */
export interface ViewerConfigStore {
  /** Resolves to `undefined` when no configuration exists for `id`. */
  read(id: string): Promise<unknown>;
  /** Ids of every stored configuration. */
  listIds(): Promise<string[]>;
}

/** The dataset files that configurations point to. */
export interface DatasetFiles {
  /** The file's text. A missing file is a broken configuration and throws. */
  read(file: string): Promise<string>;
}

/** Imported datasets, in EPSG:4326, indexed by bounding box. Synchronous: node:sqlite. */
export interface DatasetStore {
  /** Fingerprint of the source last imported for the viewer, if any. */
  importedFingerprint(viewerId: string): string | undefined;
  /** Replaces everything stored for the viewer in one transaction. */
  replace(
    viewerId: string,
    import_: { fingerprint: string; importedAt: string; features: readonly PreparedFeature[] },
  ): void;
  /** Features whose bounding box intersects `bbox` (edges included), in file order. */
  findIntersecting(viewerId: string, bbox: BBox): DatasetFeature[];
}

export type Clock = () => Date;
