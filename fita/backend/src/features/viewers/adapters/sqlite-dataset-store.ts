import type { DatasetFeature } from '@fita/contracts';
import type { DatabaseSync } from 'node:sqlite';
import { inTransaction } from '../../../shared/db.ts';
import type { DatasetStore } from '../ports.ts';

export function createSqliteDatasetStore(db: DatabaseSync): DatasetStore {
  const selectFingerprint = db.prepare('SELECT fingerprint FROM datasets WHERE viewer_id = ?');
  const deleteBounds = db.prepare(`
    DELETE FROM dataset_feature_bounds
    WHERE id IN (SELECT id FROM dataset_features WHERE viewer_id = ?)
  `);
  const deleteFeatures = db.prepare('DELETE FROM dataset_features WHERE viewer_id = ?');
  const upsertDataset = db.prepare(`
    INSERT INTO datasets (viewer_id, fingerprint, imported_at, feature_count)
    VALUES (:viewerId, :fingerprint, :importedAt, :count)
    ON CONFLICT (viewer_id) DO UPDATE SET
      fingerprint = excluded.fingerprint,
      imported_at = excluded.imported_at,
      feature_count = excluded.feature_count
  `);
  const insertFeature = db.prepare(`
    INSERT INTO dataset_features (viewer_id, position, feature, minx, miny, maxx, maxy)
    VALUES (:viewerId, :position, :feature, :minx, :miny, :maxx, :maxy)
  `);
  const insertBounds = db.prepare(`
    INSERT INTO dataset_feature_bounds (id, minx, maxx, miny, maxy)
    VALUES (:id, :minx, :maxx, :miny, :maxy)
  `);
  // The R*Tree narrows the candidates; its 32-bit bounds are rounded outwards, so the
  // exact columns decide the edge cases.
  const selectIntersecting = db.prepare(`
    SELECT f.feature FROM dataset_feature_bounds b
    JOIN dataset_features f ON f.id = b.id
    WHERE b.minx <= :east AND b.maxx >= :west
      AND b.miny <= :north AND b.maxy >= :south
      AND f.viewer_id = :viewerId
      AND f.minx <= :east AND f.maxx >= :west
      AND f.miny <= :north AND f.maxy >= :south
    ORDER BY f.position
  `);

  return {
    importedFingerprint(viewerId) {
      const row = selectFingerprint.get(viewerId) as { fingerprint: string } | undefined;
      return row?.fingerprint;
    },

    replace(viewerId, { fingerprint, importedAt, features }) {
      inTransaction(db, () => {
        deleteBounds.run(viewerId);
        deleteFeatures.run(viewerId);
        upsertDataset.run({ viewerId, fingerprint, importedAt, count: features.length });
        features.forEach(({ feature, bbox }, position) => {
          const [minx, miny, maxx, maxy] = bbox;
          const { lastInsertRowid } = insertFeature.run({
            viewerId,
            position,
            feature: JSON.stringify(feature),
            minx,
            miny,
            maxx,
            maxy,
          });
          insertBounds.run({ id: lastInsertRowid, minx, maxx, miny, maxy });
        });
      });
    },

    findIntersecting(viewerId, [west, south, east, north]) {
      const rows = selectIntersecting.all({ viewerId, west, south, east, north }) as Array<{
        feature: string;
      }>;
      // Written by this adapter from validated features: parsed back as they were.
      return rows.map((row) => JSON.parse(row.feature) as DatasetFeature);
    },
  };
}
