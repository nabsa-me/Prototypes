import type { SearchResult } from '@fita/contracts';

/** Places matching a partial text, in the provider's order (ICGC Geocoder, autocomplete). */
export interface PlaceSearchPort {
  autocomplete(text: string): Promise<SearchResult[]>;
}
