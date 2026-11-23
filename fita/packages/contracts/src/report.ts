import { z } from 'zod';
import { LonLatSchema } from './geo.ts';

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
