import { z } from 'zod';
import { BoundsTextSchema, LonLatSchema } from './geo.ts';

export const REPORT_CATEGORIES = ['toponym', 'road', 'building', 'boundary', 'other'] as const;
export const ReportCategorySchema = z.enum(REPORT_CATEGORIES);
export type ReportCategory = z.infer<typeof ReportCategorySchema>;

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 1000;

/** Readable codes: no 0/O, 1/I/L, so a code read aloud or copied by hand stays unambiguous. */
export const TRACKING_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TRACKING_CODE_LENGTH = 6;
export const TrackingCodeSchema = z
  .string()
  .regex(
    new RegExp(`^FIT-[${TRACKING_CODE_ALPHABET}]{${TRACKING_CODE_LENGTH}}$`),
    'Must be a tracking code such as FIT-7K3Q9X',
  );

export const NewReportSchema = z.strictObject({
  category: ReportCategorySchema,
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH)
    .refine((text) => text.trim().length >= DESCRIPTION_MIN_LENGTH, {
      message: `Must contain at least ${DESCRIPTION_MIN_LENGTH} characters`,
    }),
  location: LonLatSchema,
});
export type NewReport = z.infer<typeof NewReportSchema>;

export const ReportCreatedSchema = z.strictObject({ code: TrackingCodeSchema });
export type ReportCreated = z.infer<typeof ReportCreatedSchema>;

/** What anyone holding the tracking code may see: no location, no internal version. */
export const ReportPublicViewSchema = z.strictObject({
  code: TrackingCodeSchema,
  category: ReportCategorySchema,
  description: z.string(),
  status: ReportStatusSchema,
  publicNote: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ReportPublicView = z.infer<typeof ReportPublicViewSchema>;

/** What the internal team sees: the public view plus the location and the version. */
export const ReportAdminViewSchema = ReportPublicViewSchema.extend({
  location: LonLatSchema,
  /** Starts at 1 and grows with every change; a change must name the version it read. */
  version: z.number().int().min(1),
});
export type ReportAdminView = z.infer<typeof ReportAdminViewSchema>;

export const ReportListQuerySchema = z.strictObject({
  status: ReportStatusSchema.optional(),
  bbox: BoundsTextSchema.optional(),
});

export const ReportListSchema = z.strictObject({ reports: z.array(ReportAdminViewSchema) });
export type ReportList = z.infer<typeof ReportListSchema>;

/** Allowed moves: open → in_review → resolved | dismissed, and open → dismissed. */
export const REPORT_TRANSITIONS: Readonly<Record<ReportStatus, readonly ReportStatus[]>> = {
  open: ['in_review', 'dismissed'],
  in_review: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
};

/** Final statuses: no way out, and reaching one requires a public note. */
export const FINAL_STATUSES: readonly ReportStatus[] = ['resolved', 'dismissed'];

export const PUBLIC_NOTE_MAX_LENGTH = 1000;

export const ReportStatusChangeSchema = z
  .strictObject({
    status: ReportStatusSchema,
    publicNote: z
      .string()
      .max(PUBLIC_NOTE_MAX_LENGTH)
      .refine((note) => note.trim().length > 0, { message: 'Must not be blank' })
      .optional(),
    /** The version the client read; the change is refused if the report moved on. */
    version: z.number().int().min(1),
  })
  .refine((change) => !FINAL_STATUSES.includes(change.status) || change.publicNote !== undefined, {
    message: 'A public note is required to resolve or dismiss a report',
    path: ['publicNote'],
  });
export type ReportStatusChange = z.infer<typeof ReportStatusChangeSchema>;
