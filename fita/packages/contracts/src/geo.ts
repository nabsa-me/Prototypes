import { z } from 'zod';

export const LongitudeSchema = z.number().min(-180).max(180);
export const LatitudeSchema = z.number().min(-90).max(90);

/** [lon, lat] in EPSG:4326. */
export const LonLatSchema = z.tuple([LongitudeSchema, LatitudeSchema]);
export type LonLat = z.infer<typeof LonLatSchema>;

/** [west, south, east, north] in EPSG:4326. */
export const BoundsSchema = z
  .tuple([LongitudeSchema, LatitudeSchema, LongitudeSchema, LatitudeSchema])
  .refine(([west, south, east, north]) => west < east && south < north, {
    message: 'Bounds must be [west, south, east, north]',
  });
export type Bounds = z.infer<typeof BoundsSchema>;

/** A decimal number sent as text, as in query strings. Empty or padded text is rejected. */
export const DecimalTextSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal number')
  .transform(Number);

/** Bounds sent as text in a query string: `west,south,east,north`. */
export const BoundsTextSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/, 'Must be west,south,east,north')
  .transform((text) => text.split(',').map(Number))
  .pipe(BoundsSchema);
