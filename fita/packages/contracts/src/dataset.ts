import { z } from 'zod';
import { BoundsTextSchema } from './geo.ts';

/** The features of a viewer are always asked for an area: `bbox` is required. */
export const DatasetFeaturesQuerySchema = z.strictObject({ bbox: BoundsTextSchema });

const PositionSchema = z.array(z.number()).min(2).max(3);
const LineSchema = z.array(PositionSchema).min(2);
const RingSchema = z.array(PositionSchema).min(4);

type GeometryShape =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'MultiPoint'; coordinates: number[][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'GeometryCollection'; geometries: GeometryShape[] };

/** RFC 7946 geometry as served by the API, always in EPSG:4326. */
export const GeometrySchema: z.ZodType<GeometryShape> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('Point'), coordinates: PositionSchema }),
    z.strictObject({ type: z.literal('MultiPoint'), coordinates: z.array(PositionSchema) }),
    z.strictObject({ type: z.literal('LineString'), coordinates: LineSchema }),
    z.strictObject({ type: z.literal('MultiLineString'), coordinates: z.array(LineSchema) }),
    z.strictObject({ type: z.literal('Polygon'), coordinates: z.array(RingSchema) }),
    z.strictObject({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(RingSchema)) }),
    z.strictObject({ type: z.literal('GeometryCollection'), geometries: z.array(GeometrySchema) }),
  ]),
);

export const DatasetFeatureSchema = z.strictObject({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: GeometrySchema,
  properties: z.record(z.string(), z.unknown()).nullable(),
});
export type DatasetFeature = z.infer<typeof DatasetFeatureSchema>;

export const DatasetFeatureCollectionSchema = z.strictObject({
  type: z.literal('FeatureCollection'),
  features: z.array(DatasetFeatureSchema),
});
export type DatasetFeatureCollection = z.infer<typeof DatasetFeatureCollectionSchema>;
