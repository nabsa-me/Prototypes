import { z } from 'zod';
import { DecimalTextSchema, LatitudeSchema, LonLatSchema, LongitudeSchema } from './geo.ts';

export const PointInfoQuerySchema = z.strictObject({
  lon: DecimalTextSchema.pipe(LongitudeSchema),
  lat: DecimalTextSchema.pipe(LatitudeSchema),
});

const NamedCodeSchema = z.strictObject({ code: z.string().min(1), name: z.string().min(1) });

export const TerritorySchema = z.strictObject({
  municipality: NamedCodeSchema,
  county: NamedCodeSchema,
});
export type Territory = z.infer<typeof TerritorySchema>;

export const AddressSchema = z.strictObject({
  label: z.string().min(1),
  /** Distance from the queried point to the address, in kilometres. */
  distanceKm: z.number().min(0),
});
export type Address = z.infer<typeof AddressSchema>;

/** Outcome of one data source: its data, or the fact that it could not answer. */
function sourceResult<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('ok'), data }),
    z.strictObject({ status: z.literal('unavailable') }),
  ]);
}

export const PointInfoSchema = z.strictObject({
  position: z.strictObject({
    wgs84: LonLatSchema,
    /** [x, y] in EPSG:25831, rounded to the centimetre. */
    utm31n: z.tuple([z.number(), z.number()]),
  }),
  /** `null` data: the point is not in any Catalan municipality. */
  territory: sourceResult(TerritorySchema.nullable()),
  /** `null` data: no address near the point. */
  address: sourceResult(AddressSchema.nullable()),
});
export type PointInfo = z.infer<typeof PointInfoSchema>;
export type SourceResult<T> = { status: 'ok'; data: T } | { status: 'unavailable' };
