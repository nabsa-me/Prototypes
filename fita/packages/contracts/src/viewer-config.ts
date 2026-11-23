import { z } from 'zod';
import { BoundsSchema, LonLatSchema } from './geo.ts';

/** Lowercase slug: used in URLs and as a file name, so it never contains dots or slashes. */
export const ViewerIdSchema = z
  .string()
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase slug');

const HttpsUrlSchema = z.url({ protocol: /^https$/ });

const TileUrlSchema = HttpsUrlSchema.refine(
  (url) => ['{z}', '{x}', '{y}'].every((token) => url.includes(token)),
  { message: 'Tile URL must contain {z}, {x} and {y}' },
);

const TileSizeSchema = z.union([z.literal(256), z.literal(512)]);
const ZoomSchema = z.number().int().min(0).max(24);
const LabelSchema = z.string().min(1).max(40);

export const InitialViewSchema = z.strictObject({
  center: LonLatSchema,
  zoom: z.number().min(0).max(22),
  bearing: z.number().min(-180).max(180),
  pitch: z.number().min(0).max(85),
});
export type InitialView = z.infer<typeof InitialViewSchema>;

/** The vector style itself, with no imagery on top. */
const StyleBasemapSchema = z.strictObject({
  id: ViewerIdSchema,
  label: LabelSchema,
  kind: z.literal('style'),
});

/** Raster imagery drawn under the style's labels. */
const RasterBasemapSchema = z.strictObject({
  id: ViewerIdSchema,
  label: LabelSchema,
  kind: z.literal('raster'),
  tiles: z.array(TileUrlSchema).min(1),
  tileSize: TileSizeSchema,
  maxzoom: ZoomSchema,
  attribution: z.string().min(1),
});

export const BasemapSchema = z.discriminatedUnion('kind', [
  StyleBasemapSchema,
  RasterBasemapSchema,
]);
export type Basemap = z.infer<typeof BasemapSchema>;

export const TerrainSchema = z
  .strictObject({
    tiles: z.array(TileUrlSchema).min(1),
    tileSize: TileSizeSchema,
    minzoom: ZoomSchema,
    maxzoom: ZoomSchema,
    encoding: z.enum(['mapbox', 'terrarium']),
    bounds: BoundsSchema,
    attribution: z.string().min(1),
  })
  .refine((terrain) => terrain.minzoom <= terrain.maxzoom, {
    message: 'minzoom must not exceed maxzoom',
  });
export type Terrain = z.infer<typeof TerrainSchema>;

/** A client's look inside an embedded viewer. */
export const BrandingSchema = z.strictObject({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a #RRGGBB colour'),
  brandText: z.string().min(1).max(80),
});
export type Branding = z.infer<typeof BrandingSchema>;

/**
 * GeoJSON data a viewer shows. RFC 7946 removed the `crs` member, so the CRS of the file
 * is declared here. The file lives next to the viewer configurations.
 */
export const DatasetSourceSchema = z.strictObject({
  file: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.geojson$/, 'Must be a <slug>.geojson file name'),
  crs: z.enum(['EPSG:25831', 'EPSG:4326']),
});
export type DatasetSource = z.infer<typeof DatasetSourceSchema>;

export const ViewerConfigSchema = z.strictObject({
  id: ViewerIdSchema,
  title: z.string().min(1).max(80),
  initialView: InitialViewSchema,
  style: HttpsUrlSchema,
  basemaps: z
    .array(BasemapSchema)
    .min(1)
    .refine((basemaps) => new Set(basemaps.map((b) => b.id)).size === basemaps.length, {
      message: 'Basemap ids must be unique',
    }),
  terrain: TerrainSchema.optional(),
  branding: BrandingSchema.optional(),
  dataset: DatasetSourceSchema.optional(),
});
export type ViewerConfig = z.infer<typeof ViewerConfigSchema>;
