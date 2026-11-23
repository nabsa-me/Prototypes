import { z } from 'zod';
import { LonLatSchema } from './geo.ts';

export const SEARCH_MIN_LENGTH = 3;

export const SearchQuerySchema = z.strictObject({
  text: z
    .string()
    .max(100)
    .refine((text) => text.trim().length >= SEARCH_MIN_LENGTH, {
      message: `Must contain at least ${SEARCH_MIN_LENGTH} characters`,
    }),
});

export const PlaceKindSchema = z.enum(['address', 'place', 'kilometre-point']);
export type PlaceKind = z.infer<typeof PlaceKindSchema>;

export const SearchResultSchema = z.strictObject({
  label: z.string().min(1),
  kind: PlaceKindSchema,
  position: LonLatSchema,
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.strictObject({
  results: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
